import type { Page } from "@playwright/test";

export async function installAvaAudioMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const events: { frequency: number; waveform: string }[] = [];

    class MockAudioParam {
      value = 0;

      setValueAtTime(value: number): void {
        this.value = value;
      }

      exponentialRampToValueAtTime(value: number): void {
        this.value = value;
      }
    }

    class MockOscillator {
      type = "sine";
      frequency = new MockAudioParam();

      connect(): void {}

      start(): void {
        events.push({ frequency: this.frequency.value, waveform: this.type });
      }

      stop(): void {}
    }

    class MockGain {
      gain = new MockAudioParam();

      connect(): void {}
    }

    class MockAudioContext {
      currentTime = 0;
      destination = {};
      state = "running";

      createOscillator(): MockOscillator {
        return new MockOscillator();
      }

      createGain(): MockGain {
        return new MockGain();
      }

      async resume(): Promise<void> {}
    }

    Object.defineProperty(window, "AudioContext", { configurable: true, value: MockAudioContext });
    Object.defineProperty(window, "__avaAudioEvents", { configurable: true, value: events });
  });
}
