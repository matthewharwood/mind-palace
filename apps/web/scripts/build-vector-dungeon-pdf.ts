import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const PORT = Number.parseInt(process.env.VECTOR_DUNGEON_PDF_PORT ?? "5174", 10);
const APP_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUTPUT_PATH = resolve(APP_ROOT, "public/vector-dungeon/dean-vector-dungeon.pdf");
const PRINT_URL = `http://127.0.0.1:${PORT}/apps/vector-dungeon/print`;
const LETTER_WIDTH = 612;
const LETTER_HEIGHT = 792;
const SCREEN_LETTER_WIDTH = 816;
const SCREEN_LETTER_HEIGHT = 1056;

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await Bun.sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function readUint16(bytes: Uint8Array, offset: number): number {
  const hi = bytes[offset];
  const lo = bytes[offset + 1];
  if (hi === undefined || lo === undefined) throw new Error("Unexpected end of JPEG");
  return (hi << 8) | lo;
}

function jpegSize(bytes: Uint8Array): { width: number; height: number } {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error("Expected a JPEG image");
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Invalid JPEG marker");
    const marker = bytes[offset + 1];
    if (marker === undefined) throw new Error("Unexpected end of JPEG");
    offset += 2;
    if (marker === 0xd9 || marker === 0xda) break;
    const length = readUint16(bytes, offset);
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame) {
      return {
        height: readUint16(bytes, offset + 3),
        width: readUint16(bytes, offset + 5),
      };
    }
    offset += length;
  }
  throw new Error("JPEG size marker was not found");
}

function pdfObject(id: number, body: Uint8Array[]): Uint8Array[] {
  return [Buffer.from(`${id} 0 obj\n`), ...body, Buffer.from("\nendobj\n")];
}

function buildSingleImagePdf(jpegBytes: Uint8Array): Uint8Array {
  const { width, height } = jpegSize(jpegBytes);
  const content = Buffer.from(`q\n${LETTER_WIDTH} 0 0 ${LETTER_HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`);
  const objects = [
    pdfObject(1, [Buffer.from("<< /Type /Catalog /Pages 2 0 R >>")]),
    pdfObject(2, [Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>")]),
    pdfObject(3, [
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LETTER_WIDTH} ${LETTER_HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      ),
    ]),
    pdfObject(4, [
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.byteLength} >>\nstream\n`,
      ),
      jpegBytes,
      Buffer.from("\nendstream"),
    ]),
    pdfObject(5, [
      Buffer.from(`<< /Length ${content.byteLength} >>\nstream\n`),
      content,
      Buffer.from("endstream"),
    ]),
  ];

  const header = Buffer.from("%PDF-1.4\n");
  const parts: Uint8Array[] = [header];
  const offsets = [0];
  let byteOffset = header.byteLength;
  for (const object of objects) {
    offsets.push(byteOffset);
    parts.push(...object);
    byteOffset += object.reduce((total, part) => total + part.byteLength, 0);
  }

  const xrefOffset = byteOffset;
  const entries = offsets
    .map((offset, index) =>
      index === 0 ? "0000000000 65535 f " : `${String(offset).padStart(10, "0")} 00000 n `,
    )
    .join("\n");
  parts.push(
    Buffer.from(
      `xref\n0 ${offsets.length}\n${entries}\ntrailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
    ),
  );

  return Buffer.concat(parts.map((part) => Buffer.from(part)));
}

const server = Bun.spawn(
  ["bun", "x", "vite", "dev", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"],
  {
    cwd: APP_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  },
);

try {
  await waitForServer(PRINT_URL);
  await mkdir(resolve(APP_ROOT, "public/vector-dungeon"), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: SCREEN_LETTER_WIDTH, height: SCREEN_LETTER_HEIGHT },
    deviceScaleFactor: 2,
  });

  await page.goto(PRINT_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.emulateMedia({ media: "print" });
  const screenshot = await page.screenshot({ type: "jpeg", quality: 95 });
  await Bun.write(OUTPUT_PATH, buildSingleImagePdf(screenshot));
  await browser.close();
  process.stdout.write(`Wrote ${OUTPUT_PATH}\n`);
} finally {
  server.kill();
  await server.exited;
}
