from __future__ import annotations

import math
from pathlib import Path
from typing import Callable, Iterable, Sequence

from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas


OUTPUT_PATH = Path(__file__).with_name("bevy_blender_coordinate_plane.pdf")

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN = 36

AXIS_X = HexColor("#d7352f")
AXIS_Y = HexColor("#2f9e44")
AXIS_Z = HexColor("#2f6fca")
INK = HexColor("#20232a")
MUTED = HexColor("#5f6673")
PANEL_LINE = HexColor("#cfd6df")
GRID = HexColor("#dfe4ec")
LIGHT_GRID = HexColor("#eef2f7")
CAMERA = HexColor("#6f42c1")
ORIGIN = HexColor("#f59f00")
CUBE_FACE = HexColor("#e8eef7")


Point2 = tuple[float, float]
Point3 = tuple[float, float, float]
Projector = Callable[[Point3], Point2]


def set_alpha(c: canvas.Canvas, fill: float | None = None, stroke: float | None = None) -> None:
    if fill is not None and hasattr(c, "setFillAlpha"):
        c.setFillAlpha(fill)
    if stroke is not None and hasattr(c, "setStrokeAlpha"):
        c.setStrokeAlpha(stroke)


def reset_alpha(c: canvas.Canvas) -> None:
    set_alpha(c, fill=1, stroke=1)


def draw_wrapped(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str = "Helvetica",
    size: float = 8.5,
    leading: float = 10.5,
    color: colors.Color = INK,
) -> float:
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        probe = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(probe, font, size) <= width:
            current = probe
            continue
        if current:
            lines.append(current)
        current = word
    if current:
        lines.append(current)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def draw_panel(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str, subtitle: str) -> None:
    c.saveState()
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(0.8)
    c.setFillColor(colors.white)
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(x + 12, y + h - 22, title)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.7)
    c.drawString(x + 12, y + h - 35, subtitle)
    c.restoreState()


def arrow_head(c: canvas.Canvas, start: Point2, end: Point2, color: colors.Color, size: float = 7) -> None:
    sx, sy = start
    ex, ey = end
    angle = math.atan2(ey - sy, ex - sx)
    left = angle + math.pi * 0.82
    right = angle - math.pi * 0.82
    points = [
        (ex, ey),
        (ex + math.cos(left) * size, ey + math.sin(left) * size),
        (ex + math.cos(right) * size, ey + math.sin(right) * size),
    ]
    path = c.beginPath()
    path.moveTo(*points[0])
    path.lineTo(*points[1])
    path.lineTo(*points[2])
    path.close()
    c.setFillColor(color)
    c.drawPath(path, fill=1, stroke=0)


def draw_arrow(
    c: canvas.Canvas,
    start: Point2,
    end: Point2,
    color: colors.Color,
    width: float = 2,
    dashed: bool = False,
) -> None:
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(width)
    if dashed:
        c.setDash(3, 3)
    c.line(start[0], start[1], end[0], end[1])
    c.setDash()
    arrow_head(c, start, end, color, size=6.5)
    c.restoreState()


def label(
    c: canvas.Canvas,
    text: str,
    p: Point2,
    color: colors.Color = INK,
    font: str = "Helvetica-Bold",
    size: float = 7.5,
    dx: float = 0,
    dy: float = 0,
) -> None:
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(p[0] + dx, p[1] + dy, text)


def draw_poly(
    c: canvas.Canvas,
    points: Sequence[Point2],
    fill: colors.Color | None = None,
    stroke: colors.Color | None = INK,
    stroke_width: float = 0.8,
    fill_alpha: float | None = None,
) -> None:
    c.saveState()
    if fill is not None:
        c.setFillColor(fill)
        set_alpha(c, fill=fill_alpha if fill_alpha is not None else 1)
    if stroke is not None:
        c.setStrokeColor(stroke)
        c.setLineWidth(stroke_width)
    path = c.beginPath()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    path.close()
    c.drawPath(path, fill=1 if fill else 0, stroke=1 if stroke else 0)
    c.restoreState()


def build_projector(
    cx: float,
    cy: float,
    scale: float,
    basis_x: Point2,
    basis_y: Point2,
    basis_z: Point2,
) -> Projector:
    def project(p: Point3) -> Point2:
        x, y, z = p
        return (
            cx + scale * (x * basis_x[0] + y * basis_y[0] + z * basis_z[0]),
            cy + scale * (x * basis_x[1] + y * basis_y[1] + z * basis_z[1]),
        )

    return project


def draw_grid(
    c: canvas.Canvas,
    project: Projector,
    plane: str,
    extent: int = 2,
) -> None:
    c.saveState()
    c.setLineWidth(0.45)
    for i in range(-extent, extent + 1):
        c.setStrokeColor(GRID if i == 0 else LIGHT_GRID)
        if plane == "xy":
            a, b = project((-extent, i, 0)), project((extent, i, 0))
            c.line(a[0], a[1], b[0], b[1])
            a, b = project((i, -extent, 0)), project((i, extent, 0))
            c.line(a[0], a[1], b[0], b[1])
        elif plane == "xz":
            a, b = project((-extent, 0, i)), project((extent, 0, i))
            c.line(a[0], a[1], b[0], b[1])
            a, b = project((i, 0, -extent)), project((i, 0, extent))
            c.line(a[0], a[1], b[0], b[1])
    c.restoreState()


def draw_cube(c: canvas.Canvas, project: Projector, size: float = 0.9) -> None:
    s = size / 2
    vertices = {
        "000": (-s, -s, -s),
        "100": (s, -s, -s),
        "110": (s, s, -s),
        "010": (-s, s, -s),
        "001": (-s, -s, s),
        "101": (s, -s, s),
        "111": (s, s, s),
        "011": (-s, s, s),
    }
    faces = [
        ["000", "100", "110", "010"],
        ["001", "101", "111", "011"],
        ["000", "100", "101", "001"],
        ["100", "110", "111", "101"],
        ["110", "010", "011", "111"],
        ["010", "000", "001", "011"],
    ]
    face_order = sorted(
        faces,
        key=lambda face: sum(project(vertices[name])[1] for name in face) / len(face),
    )
    for face in face_order:
        draw_poly(
            c,
            [project(vertices[name]) for name in face],
            fill=CUBE_FACE,
            stroke=HexColor("#8b99ad"),
            stroke_width=0.55,
            fill_alpha=0.55,
        )
    edges = [
        ("000", "100"),
        ("100", "110"),
        ("110", "010"),
        ("010", "000"),
        ("001", "101"),
        ("101", "111"),
        ("111", "011"),
        ("011", "001"),
        ("000", "001"),
        ("100", "101"),
        ("110", "111"),
        ("010", "011"),
    ]
    c.saveState()
    c.setStrokeColor(HexColor("#4f5b6b"))
    c.setLineWidth(1.1)
    for a, b in edges:
        pa, pb = project(vertices[a]), project(vertices[b])
        c.line(pa[0], pa[1], pb[0], pb[1])
    c.restoreState()


def draw_origin_icon(c: canvas.Canvas, p: Point2) -> None:
    c.saveState()
    c.setStrokeColor(ORIGIN)
    c.setFillColor(colors.white)
    c.setLineWidth(1)
    c.circle(p[0], p[1], 6, fill=1, stroke=1)
    c.setStrokeColor(ORIGIN)
    c.line(p[0] - 4, p[1], p[0] + 4, p[1])
    c.line(p[0], p[1] - 4, p[0], p[1] + 4)
    c.restoreState()


def draw_camera(c: canvas.Canvas, project: Projector, cam: Point3, target: Point3, label_text: str) -> None:
    cam_2d = project(cam)
    target_2d = project(target)
    c.saveState()
    c.setStrokeColor(CAMERA)
    c.setLineWidth(0.8)
    c.setDash(3, 3)
    c.line(cam_2d[0], cam_2d[1], target_2d[0], target_2d[1])
    c.setDash()
    c.setFillColor(CAMERA)
    c.circle(cam_2d[0], cam_2d[1], 6.2, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.circle(cam_2d[0], cam_2d[1], 2.4, fill=1, stroke=0)
    c.setStrokeColor(CAMERA)
    c.setLineWidth(1.1)
    c.line(cam_2d[0] - 8, cam_2d[1] - 6, cam_2d[0] + 8, cam_2d[1] - 6)
    c.line(cam_2d[0] + 8, cam_2d[1] - 6, target_2d[0], target_2d[1])
    c.line(cam_2d[0] - 8, cam_2d[1] - 6, target_2d[0], target_2d[1])
    c.restoreState()
    label(c, label_text, cam_2d, CAMERA, "Helvetica-Bold", 7.2, dx=8, dy=3)


def draw_axis_labels(c: canvas.Canvas, project: Projector, axes: dict[str, Point3]) -> None:
    origin = project((0, 0, 0))
    for name, end_3d in axes.items():
        color = {"X": AXIS_X, "Y": AXIS_Y, "Z": AXIS_Z}[name]
        end = project(end_3d)
        neg = tuple(-v * 0.55 for v in end_3d)
        draw_arrow(c, project(neg), end, color, width=2.2)
        label(c, f"+{name} {format_vec(end_3d)}", end, color, dx=5, dy=1)
    draw_origin_icon(c, origin)
    label(c, "(0,0,0)", origin, ORIGIN, "Helvetica-Bold", 7.2, dx=7, dy=-2)


def format_vec(p: Point3) -> str:
    return f"({int(p[0])},{int(p[1])},{int(p[2])})"


def draw_scene(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    mode: str,
) -> None:
    if mode == "blender":
        project = build_projector(
            x + w * 0.43,
            y + h * 0.39,
            33,
            (1.0, -0.36),
            (0.72, 0.33),
            (0.0, 1.0),
        )
        draw_grid(c, project, "xy")
        draw_axis_labels(
            c,
            project,
            {"X": (2.25, 0, 0), "Y": (0, 2.25, 0), "Z": (0, 0, 2.25)},
        )
        draw_cube(c, project, size=0.9)
        draw_camera(c, project, (1.45, -1.65, 1.85), (0, 0, 0), "camera (right + above)")
        label(c, "grid: X-Y floor, Z is up", (x + 14, y + 18), MUTED, "Helvetica", 7.2)
    elif mode == "bevy":
        project = build_projector(
            x + w * 0.54,
            y + h * 0.38,
            33,
            (1.0, -0.36),
            (0.0, 1.0),
            (-0.72, -0.36),
        )
        draw_grid(c, project, "xz")
        draw_axis_labels(
            c,
            project,
            {"X": (2.25, 0, 0), "Y": (0, 2.25, 0), "Z": (0, 0, 2.25)},
        )
        draw_cube(c, project, size=0.9)
        draw_camera(c, project, (1.45, 1.75, 2.05), (0, 0, 0), "camera (+X,+Y,+Z)")
        label(c, "grid: X-Z floor, Y is up", (x + 14, y + 18), MUTED, "Helvetica", 7.2)


def draw_legend(c: canvas.Canvas, x: float, y: float) -> None:
    entries = [("X", AXIS_X), ("Y", AXIS_Y), ("Z", AXIS_Z)]
    c.setFont("Helvetica-Bold", 7.8)
    for index, (name, color) in enumerate(entries):
        offset = index * 42
        c.setStrokeColor(color)
        c.setLineWidth(2.8)
        c.line(x + offset, y, x + offset + 16, y)
        c.setFillColor(color)
        c.drawString(x + offset + 20, y - 3, name)


def draw_conversion_panel(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    draw_panel(
        c,
        x,
        y,
        w,
        h,
        "3. Mental rotation between them",
        "Keep red X pinned. Move Blender's blue Z-up axis into Bevy's green Y-up axis.",
    )
    left_x = x + 22
    base_y = y + 78
    arrow_y = y + h - 74
    c.setFont("Helvetica-Bold", 8.5)
    c.setFillColor(INK)
    c.drawString(left_x, y + h - 62, "Blender basis")
    c.drawString(left_x + 188, y + h - 62, "Bevy basis")

    def triad(cx: float, cy: float, blender: bool) -> None:
        if blender:
            ends = {
                "X": ((56, -18), AXIS_X, "+X"),
                "Y": ((42, 24), AXIS_Y, "+Y depth"),
                "Z": ((0, 62), AXIS_Z, "+Z up"),
            }
        else:
            ends = {
                "X": ((56, -18), AXIS_X, "+X"),
                "Y": ((0, 62), AXIS_Y, "+Y up"),
                "Z": ((-42, -24), AXIS_Z, "+Z near"),
            }
        c.setFillColor(ORIGIN)
        c.circle(cx, cy, 4, fill=1, stroke=0)
        for _, (delta, color, text) in ends.items():
            end = (cx + delta[0], cy + delta[1])
            draw_arrow(c, (cx, cy), end, color, width=2.1)
            label(c, text, end, color, "Helvetica-Bold", 7.2, dx=4, dy=0)
        label(c, "(0,0,0)", (cx + 6, cy - 4), ORIGIN, "Helvetica-Bold", 7.0)

    triad(left_x + 68, base_y, blender=True)
    triad(left_x + 254, base_y, blender=False)

    c.setStrokeColor(MUTED)
    c.setLineWidth(1)
    c.setDash(4, 3)
    c.bezier(left_x + 142, arrow_y, left_x + 170, arrow_y + 34, left_x + 205, arrow_y + 34, left_x + 236, arrow_y)
    c.setDash()
    arrow_head(c, (left_x + 208, arrow_y + 15), (left_x + 236, arrow_y), MUTED, size=6)
    c.setFillColor(colors.white)
    c.rect(left_x + 132, arrow_y + 18, 112, 13, fill=1, stroke=0)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(left_x + 188, arrow_y + 24, "rotate -90 deg around X")

    formula_x = x + w - 224
    formula_y = y + h - 78
    c.setFillColor(HexColor("#f7f9fc"))
    c.setStrokeColor(PANEL_LINE)
    c.roundRect(formula_x, formula_y - 58, 198, 78, 6, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8.4)
    c.drawString(formula_x + 10, formula_y + 4, "Coordinate conversion")
    c.setFont("Helvetica", 7.8)
    c.drawString(formula_x + 10, formula_y - 13, "B -> V: (x, y, z) -> (x, z, -y)")
    c.drawString(formula_x + 10, formula_y - 28, "V -> B: (x, y, z) -> (x, -z, y)")
    c.setFont("Helvetica", 7.4)
    c.setFillColor(MUTED)
    c.drawString(formula_x + 10, formula_y - 43, "Same red X. Blender Z-up becomes Bevy Y-up.")

    text_x = formula_x
    text_y = y
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8.4)
    c.drawString(text_x, text_y + 42, "Quick diagnostic")
    c.setFont("Helvetica", 7.6)
    c.setFillColor(MUTED)
    c.drawString(text_x, text_y + 27, "Sideways model: rotate -90 deg around X.")
    c.drawString(text_x, text_y + 14, "Backward model: flip forward, not the up axis.")


def draw_notes(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    c.saveState()
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(0.8)
    c.setFillColor(HexColor("#fbfcfe"))
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 12, y + h - 18, "How to read the sheet")
    columns = [
        (
            "Blender: X is left/right, Y is the front/back depth axis, Z is vertical. The default grid you model on is X-Y, with the cube centered at (0,0,0).",
            x + 12,
            w * 0.31,
        ),
        (
            "Bevy: X is right, Y is up, and +Z is toward the viewer. A 3D camera commonly sits at positive Z and looks back toward the origin along -Z.",
            x + 188,
            w * 0.31,
        ),
        (
            "The useful memory hook is simple: keep red X fixed, turn Blender Z-up into Bevy Y-up, then make Bevy +Z point opposite Blender +Y.",
            x + 364,
            w * 0.30,
        ),
    ]
    for text, col_x, col_w in columns:
        draw_wrapped(c, text, col_x, y + h - 33, col_w, size=7.4, leading=9.2, color=MUTED)
    c.restoreState()


def draw_value_box(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    rows: Sequence[str],
    mono: bool = False,
) -> None:
    c.saveState()
    c.setFillColor(HexColor("#f7f9fc"))
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(0.8)
    c.roundRect(x, y, w, h, 6, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawString(x + 9, y + h - 15, title)
    c.setFont("Courier" if mono else "Helvetica", 8)
    ry = y + h - 30
    for row in rows:
        c.setFillColor(INK)
        c.drawString(x + 9, ry, row)
        ry -= 12.5
    c.restoreState()


def draw_angle_wheel(c: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    c.saveState()
    c.setStrokeColor(GRID)
    c.setLineWidth(1.0)
    c.circle(cx, cy, r, fill=0, stroke=1)
    c.setStrokeColor(INK)
    c.line(cx, cy, cx + r, cy)
    # one-radian arc (arc length equals the radius)
    c.setStrokeColor(AXIS_Z)
    c.setLineWidth(2.6)
    p = c.beginPath()
    p.arc(cx - r, cy - r, cx + r, cy + r, 0, math.degrees(1.0))
    c.drawPath(p, stroke=1, fill=0)
    label(c, "1 rad", (cx + (r + 5) * math.cos(0.5), cy + (r + 5) * math.sin(0.5)), AXIS_Z, "Helvetica-Bold", 6.8)
    marks = [
        ((cx + r, cy), "0", 4, -2),
        ((cx, cy + r), "PI/2", -8, 6),
        ((cx - r, cy), "PI", -16, -2),
        ((cx, cy - r), "3PI/2", -12, -10),
    ]
    for (mx, my), text, dx, dy in marks:
        c.setFillColor(INK)
        c.circle(mx, my, 2.2, fill=1, stroke=0)
        label(c, text, (mx, my), MUTED, "Helvetica", 6.6, dx=dx, dy=dy)
    c.setFillColor(ORIGIN)
    c.circle(cx, cy, 2.6, fill=1, stroke=0)
    c.restoreState()


def draw_frame_lanes(c: canvas.Canvas, x: float, y: float, w: float) -> None:
    c.saveState()
    lanes = [("60 Hz", "dt = 0.0166", AXIS_Z, 4, y), ("120 Hz", "dt = 0.0083", AXIS_Y, 7, y - 30)]
    for name, dt, color, n, ly in lanes:
        label(c, name, (x, ly - 3), INK, "Helvetica-Bold", 7)
        c.setStrokeColor(GRID)
        c.setLineWidth(0.9)
        c.line(x + 42, ly, x + w, ly)
        c.setFillColor(color)
        for i in range(n):
            dx = x + 42 + i * (w - 42) / (n - 1)
            c.circle(dx, ly, 2.4, fill=1, stroke=0)
        label(c, dt, (x + 50, ly + 6), MUTED, "Helvetica", 6.6)
    label(c, "delta = 1 / fps  (more frames -> smaller step)", (x, y - 48), MUTED, "Helvetica", 6.8)
    c.restoreState()


def draw_rotation_topdown(c: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    c.saveState()
    c.setStrokeColor(GRID)
    c.setLineWidth(0.8)
    c.line(cx - r - 8, cy, cx + r + 12, cy)
    c.line(cx, cy - r - 12, cx, cy + r + 12)
    label(c, "+X", (cx + r + 9, cy - 2), AXIS_X, "Helvetica-Bold", 7)
    label(c, "-Z", (cx - 5, cy + r + 7), AXIS_Z, "Helvetica-Bold", 7)
    label(c, "+Z", (cx - 5, cy - r - 14), AXIS_Z, "Helvetica-Bold", 7)
    # start vector on +X
    draw_arrow(c, (cx, cy), (cx + r, cy), INK, width=2.6)
    label(c, "start +X", (cx + 4, cy - 13), INK, "Helvetica", 6.6)
    # rotated result on -Z (up in this top view)
    draw_arrow(c, (cx, cy), (cx, cy + r), CAMERA, width=2.6)
    label(c, "Ry*v", (cx + 5, cy + r - 8), CAMERA, "Helvetica-Bold", 6.8)
    # CCW arc from +X to -Z
    c.setStrokeColor(MUTED)
    c.setLineWidth(1.1)
    ar = r * 0.52
    p = c.beginPath()
    p.arc(cx - ar, cy - ar, cx + ar, cy + ar, 0, 88)
    c.drawPath(p, stroke=1, fill=0)
    arrow_head(c, (cx + ar * 0.35, cy + ar * 0.95), (cx - 1, cy + ar), MUTED, size=5.5)
    label(c, "+90 deg", (cx + ar * 0.5, cy + ar * 0.5), MUTED, "Helvetica-Bold", 6.4)
    c.setFillColor(ORIGIN)
    c.circle(cx, cy, 3, fill=1, stroke=0)
    c.restoreState()


def draw_turntable_notes(c: canvas.Canvas, x: float, y: float, w: float, h: float) -> None:
    c.saveState()
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(0.8)
    c.setFillColor(HexColor("#fbfcfe"))
    c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x + 12, y + h - 18, "Reading the turntable line")
    c.setFont("Courier-Bold", 8.6)
    c.setFillColor(AXIS_Z)
    c.drawString(x + 12, y + h - 34, "transform.rotate_y(0.1 * TAU * time.delta_secs());")
    cols = [
        ("0.1 * TAU is a tenth of a turn, so one full lap takes ten seconds.", x + 12, w * 0.30),
        (
            "* delta_secs() keeps the speed identical at 60 or 120 fps. Drop it and a 120 Hz screen spins about 120x too fast.",
            x + 12 + w * 0.34,
            w * 0.30,
        ),
        (
            "rotate_y spins it upright, like a turntable. rotate_x or rotate_z make it tumble instead.",
            x + 12 + w * 0.68,
            w * 0.29,
        ),
    ]
    for text, col_x, col_w in cols:
        draw_wrapped(c, text, col_x, y + h - 52, col_w, size=7.4, leading=9.2, color=MUTED)
    c.restoreState()


def draw_page_two(c: canvas.Canvas) -> None:
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(MARGIN, PAGE_HEIGHT - 52, "Rotation: Angles, Time & rotate_y")
    c.setFont("Helvetica", 9.2)
    c.setFillColor(MUTED)
    c.drawString(
        MARGIN,
        PAGE_HEIGHT - 68,
        "How angles, frame time, and a Y-axis spin actually work under transform.rotate_y.",
    )
    draw_legend(c, PAGE_WIDTH - MARGIN - 130, PAGE_HEIGHT - 55)

    panel_w = (PAGE_WIDTH - 2 * MARGIN - 14) / 2
    top_h = 250
    top_y = PAGE_HEIGHT - 92 - top_h

    draw_panel(
        c,
        MARGIN,
        top_y,
        panel_w,
        top_h,
        "1. Angles: degrees, radians, TAU",
        "Radians are the natural unit; one full turn = TAU = 2*PI.",
    )
    draw_angle_wheel(c, MARGIN + 74, top_y + 152, 44)
    draw_value_box(
        c,
        MARGIN + 150,
        top_y + 130,
        panel_w - 168,
        66,
        "Key turns",
        ["TAU = 2*PI = 6.28", "PI = 3.14  (half)", "PI/2 = 1.57  (qtr)"],
    )
    draw_wrapped(
        c,
        "Think in turns: 0.1 * TAU reads as a tenth of a turn, far clearer than 0.628 radians. Use TAU for spins, PI for half-flips; convert human degrees at the edge with to_radians().",
        MARGIN + 14,
        top_y + 58,
        panel_w - 28,
        size=7.4,
        leading=9.4,
        color=MUTED,
    )

    px = MARGIN + panel_w + 14
    draw_panel(
        c,
        px,
        top_y,
        panel_w,
        top_h,
        "2. Hz, frames & delta time",
        "Scale motion by delta so the speed is frame-rate independent.",
    )
    draw_frame_lanes(c, px + 16, top_y + top_h - 74, panel_w - 40)
    draw_value_box(
        c,
        px + 16,
        top_y + 22,
        panel_w - 32,
        84,
        "rotate_y(0.1 * TAU * dt)",
        [
            "0.1 = turns per second  (0.1 Hz)",
            "TAU = turns -> radians",
            "dt  = this frame's slice of a second",
            "angular speed  w = TAU * f",
        ],
    )

    mid_h = 196
    mid_y = top_y - 14 - mid_h
    mid_w = PAGE_WIDTH - 2 * MARGIN
    draw_panel(
        c,
        MARGIN,
        mid_y,
        mid_w,
        mid_h,
        "3. Under the hood: rebuilding rotate_y",
        "Rotating about Y leaves Y fixed and spins X and Z in the plane -- the 2D rotation, applied to X and Z.",
    )
    fx = MARGIN + 16
    c.setFont("Courier", 8.6)
    c.setFillColor(INK)
    c.drawString(fx, mid_y + mid_h - 58, "x' = x*cos t + z*sin t")
    c.drawString(fx, mid_y + mid_h - 74, "y' = y            (axis stays)")
    c.drawString(fx, mid_y + mid_h - 90, "z' = -x*sin t + z*cos t")
    draw_wrapped(
        c,
        "glam ships this as Mat3::from_rotation_y(t), or the quaternion Quat::from_rotation_y(t) = (0, sin(t/2), 0, cos(t/2)).",
        fx,
        mid_y + mid_h - 108,
        212,
        size=7.4,
        leading=9.4,
        color=MUTED,
    )
    draw_wrapped(
        c,
        "rotate_y composes it about the world Y; rotate_local_y spins about the object's own Y. (t = the angle, in radians.)",
        fx,
        mid_y + 42,
        212,
        size=7.4,
        leading=9.4,
        color=MUTED,
    )
    label(c, "looking straight down +Y (top view)", (MARGIN + 250, mid_y + mid_h - 22), MUTED, "Helvetica", 6.8)
    draw_rotation_topdown(c, MARGIN + 300, mid_y + 86, 42)
    draw_value_box(
        c,
        MARGIN + mid_w - 178,
        mid_y + 62,
        162,
        78,
        "Ry(t)",
        ["[ cos t   0   sin t ]", "[   0     1     0   ]", "[ -sin t  0   cos t ]"],
        mono=True,
    )
    label(c, "quarter turn:  +X -> -Z", (MARGIN + mid_w - 178, mid_y + 46), INK, "Helvetica-Bold", 7.4)

    draw_turntable_notes(c, MARGIN, 78, mid_w, 128)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.4)
    c.drawString(
        MARGIN,
        45,
        "Verified against Bevy Transform docs (rotate_y = world Y), glam rotation output, and the radian definition. Print on Letter at 100% scale.",
    )


def draw_radian_hero(c: canvas.Canvas, cx: float, cy: float, R: float) -> None:
    c.saveState()
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(1.2)
    c.circle(cx, cy, R, fill=0, stroke=1)
    # radius to angle 0 (right) -- the "r" we will walk
    a_pt = (cx + R, cy)
    c.setStrokeColor(INK)
    c.setLineWidth(1.7)
    c.line(cx, cy, a_pt[0], a_pt[1])
    label(c, "r", (cx + R * 0.46, cy + 5), INK, "Helvetica-Bold", 8.5)
    # arc of length r == 1 radian
    c.setStrokeColor(AXIS_Z)
    c.setLineWidth(3.2)
    p = c.beginPath()
    p.arc(cx - R, cy - R, cx + R, cy + R, 0, math.degrees(1.0))
    c.drawPath(p, stroke=1, fill=0)
    # radius to angle 1 rad
    b_pt = (cx + R * math.cos(1.0), cy + R * math.sin(1.0))
    c.setStrokeColor(INK)
    c.setLineWidth(1.7)
    c.line(cx, cy, b_pt[0], b_pt[1])
    label(c, "arc = r", (cx + (R + 11) * math.cos(0.5) - 8, cy + (R + 11) * math.sin(0.5)), AXIS_Z, "Helvetica-Bold", 8.5)
    # angle wedge at the centre
    c.setStrokeColor(ORIGIN)
    c.setLineWidth(1.3)
    p2 = c.beginPath()
    p2.arc(cx - 19, cy - 19, cx + 19, cy + 19, 0, math.degrees(1.0))
    c.drawPath(p2, stroke=1, fill=0)
    label(c, "1 rad", (cx + 25 * math.cos(0.5), cy + 25 * math.sin(0.5) - 2), ORIGIN, "Helvetica-Bold", 7.6)
    c.setFillColor(ORIGIN)
    c.circle(cx, cy, 3, fill=1, stroke=0)
    c.setFillColor(INK)
    c.circle(a_pt[0], a_pt[1], 2.6, fill=1, stroke=0)
    c.circle(b_pt[0], b_pt[1], 2.6, fill=1, stroke=0)
    c.restoreState()


def draw_radian_walk(c: canvas.Canvas, cx: float, cy: float, R: float) -> None:
    c.saveState()
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(1.0)
    c.circle(cx, cy, R, fill=0, stroke=1)
    # alternating unit-radian arcs: each chunk of rim is one radius long
    bounds = [(k, min(k + 1, 2 * math.pi)) for k in range(0, 7)]
    for i, (a0, a1) in enumerate(bounds):
        c.setStrokeColor(AXIS_Z if i % 2 == 0 else HexColor("#a9c2e8"))
        c.setLineWidth(3.4)
        p = c.beginPath()
        p.arc(cx - R, cy - R, cx + R, cy + R, math.degrees(a0), math.degrees(a1 - a0))
        c.drawPath(p, stroke=1, fill=0)
    # tick + number at each whole radian
    for k in range(0, 7):
        ang = float(k)
        outer = (cx + R * math.cos(ang), cy + R * math.sin(ang))
        inner = (cx + (R - 6) * math.cos(ang), cy + (R - 6) * math.sin(ang))
        c.setStrokeColor(INK)
        c.setLineWidth(1.2)
        c.line(inner[0], inner[1], outer[0], outer[1])
        lp = (cx + (R + 10) * math.cos(ang), cy + (R + 10) * math.sin(ang))
        label(c, str(k), (lp[0] - 2.5, lp[1] - 3), INK, "Helvetica-Bold", 7)
    c.setFillColor(ORIGIN)
    c.circle(cx, cy, 3, fill=1, stroke=0)
    c.restoreState()


def draw_page_three(c: canvas.Canvas) -> None:
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(MARGIN, PAGE_HEIGHT - 52, "What a Radian Really Is")
    c.setFont("Helvetica", 9.2)
    c.setFillColor(MUTED)
    c.drawString(
        MARGIN,
        PAGE_HEIGHT - 68,
        "A radian is a walk around the rim, measured in radius-lengths -- the natural way to size a turn.",
    )

    top_h = 340
    top_y = PAGE_HEIGHT - 92 - top_h
    left_w = 316
    right_w = PAGE_WIDTH - 2 * MARGIN - 14 - left_w

    draw_panel(
        c,
        MARGIN,
        top_y,
        left_w,
        top_h,
        "1. One radian = one radius, walked",
        "Bend the radius r onto the rim. The angle it covers is one radian.",
    )
    draw_radian_hero(c, MARGIN + 128, top_y + 196, 84)
    draw_wrapped(
        c,
        "The distance from the centre to the edge is the radius r. Walk that exact length along the curved edge, and the angle you have swept is ONE radian (about 57.3 degrees). No 360, no magic number -- just the radius laid onto its own rim.",
        MARGIN + 16,
        top_y + 88,
        left_w - 32,
        size=8.0,
        leading=10.4,
        color=INK,
    )

    px = MARGIN + left_w + 14
    draw_panel(
        c,
        px,
        top_y,
        right_w,
        top_h,
        "2. Why a full turn is TAU",
        "Keep walking radius-lengths around the rim.",
    )
    draw_radian_walk(c, px + right_w / 2, top_y + 200, 78)
    draw_wrapped(
        c,
        "Each coloured chunk of rim is one radius long = one radian. It takes 2*PI = 6.28 of them to get all the way around. That is why one full turn = TAU = 2*PI radians, and a half turn = PI.",
        px + 16,
        top_y + 96,
        right_w - 32,
        size=8.0,
        leading=10.4,
        color=INK,
    )

    bot_h = 176
    bot_y = top_y - 14 - bot_h
    bot_w = PAGE_WIDTH - 2 * MARGIN
    c.saveState()
    c.setStrokeColor(PANEL_LINE)
    c.setLineWidth(0.8)
    c.setFillColor(HexColor("#fbfcfe"))
    c.roundRect(MARGIN, bot_y, bot_w, bot_h, 8, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(MARGIN + 14, bot_y + bot_h - 20, "Radians vs degrees -- and why the difference matters")
    columns = [
        (
            "Degrees chop a turn into 360 equal slices -- a number the Babylonians chose (near the days in a year). It has nothing to do with the circle itself.",
            MARGIN + 14,
            bot_w * 0.30,
        ),
        (
            "Radians measure the actual walk along the rim, counted in radius-lengths. One radius walked = one radian ~ 57.3 deg. The whole rim is 2*PI ~ 6.28 radii, so 360 deg = TAU.",
            MARGIN + 14 + bot_w * 0.34,
            bot_w * 0.29,
        ),
        (
            "The payoff: arc length = r * angle, and sin / cos come out clean -- but only when the angle is in radians. That is why Bevy, glam, and WGSL all expect radians, never degrees.",
            MARGIN + 14 + bot_w * 0.67,
            bot_w * 0.285,
        ),
    ]
    for text, col_x, col_w in columns:
        draw_wrapped(c, text, col_x, bot_y + bot_h - 40, col_w, size=7.6, leading=9.6, color=MUTED)
    # conversion strip
    strip = ["180 deg = PI", "360 deg = TAU", "1 rad ~ 57.3 deg", "deg -> rad:  x PI/180"]
    c.setFont("Courier-Bold", 8.2)
    for i, item in enumerate(strip):
        sx = MARGIN + 16 + i * (bot_w - 32) / len(strip)
        c.setFillColor(HexColor("#eef2f7"))
        c.roundRect(sx, bot_y + 16, (bot_w - 32) / len(strip) - 12, 20, 4, fill=1, stroke=0)
        c.setFillColor(INK)
        c.drawString(sx + 10, bot_y + 22, item)
    c.restoreState()

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.4)
    c.drawString(
        MARGIN,
        45,
        "One radian is the angle whose arc equals the radius (~57.3 deg); a full circle is 2*PI radii around. Print on Letter at 100% scale.",
    )


def generate() -> None:
    c = canvas.Canvas(str(OUTPUT_PATH), pagesize=letter)
    c.setTitle("Blender and Bevy Coordinate Plane Cheat Sheet")
    c.setAuthor("OpenAI Codex")

    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(MARGIN, PAGE_HEIGHT - 52, "Blender -> Bevy Coordinate Plane")
    c.setFont("Helvetica", 9.2)
    c.setFillColor(MUTED)
    c.drawString(
        MARGIN,
        PAGE_HEIGHT - 68,
        "One-page sketch for visualizing origin, axes, cube placement, camera placement, and the up-axis conversion.",
    )
    draw_legend(c, PAGE_WIDTH - MARGIN - 130, PAGE_HEIGHT - 55)

    panel_w = (PAGE_WIDTH - 2 * MARGIN - 14) / 2
    panel_h = 286
    top_y = PAGE_HEIGHT - 92 - panel_h
    draw_panel(
        c,
        MARGIN,
        top_y,
        panel_w,
        panel_h,
        "1. Blender default world",
        "Right-handed, Z-up. Axis colors match the Blender viewport.",
    )
    draw_panel(
        c,
        MARGIN + panel_w + 14,
        top_y,
        panel_w,
        panel_h,
        "2. Bevy default world",
        "Right-handed, Y-up. Colors here reuse Blender's X/Y/Z colors.",
    )
    draw_scene(c, MARGIN + 7, top_y + 44, panel_w - 14, panel_h - 82, "blender")
    draw_scene(c, MARGIN + panel_w + 21, top_y + 44, panel_w - 14, panel_h - 82, "bevy")

    conversion_y = 176
    draw_conversion_panel(c, MARGIN, conversion_y, PAGE_WIDTH - 2 * MARGIN, 211)
    draw_notes(c, MARGIN, 75, PAGE_WIDTH - 2 * MARGIN, 88)

    c.setFillColor(MUTED)
    c.setFont("Helvetica", 6.4)
    footer = (
        "Sources: Blender Manual Viewpoint and Viewport Gizmos; "
        "Bevy coordinate example; Bevy Camera3d docs. Print on Letter at 100% scale."
    )
    c.drawString(MARGIN, 45, footer)

    c.showPage()
    draw_page_two(c)
    c.showPage()
    draw_page_three(c)
    c.showPage()
    c.save()


if __name__ == "__main__":
    generate()
