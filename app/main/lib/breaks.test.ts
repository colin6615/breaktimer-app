import moment from "moment";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultSettings,
  NotificationType,
  Settings,
} from "../../types/settings";

const harness = vi.hoisted(() => ({
  buildTray: vi.fn(),
  createBreakWindows: vi.fn(),
  settings: {} as Settings,
}));

vi.mock("electron", () => ({}));
vi.mock("electron-log", () => ({ default: { info: vi.fn() } }));
vi.mock("./ipc", () => ({ sendIpc: vi.fn() }));
vi.mock("./notifications", () => ({ showNotification: vi.fn() }));
vi.mock("./store", () => ({ getSettings: () => harness.settings }));
vi.mock("./tray", () => ({ buildTray: harness.buildTray }));
vi.mock("./windows", () => ({
  createBreakWindows: harness.createBreakWindows,
}));

describe("manual breaks", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    harness.settings = {
      ...defaultSettings,
      notificationType: NotificationType.Popup,
    };
  });

  it("starts immediately without waiting for the automatic scheduler", async () => {
    const breaks = await import("./breaks.js");

    breaks.startBreakNow();

    expect(harness.createBreakWindows).toHaveBeenCalledOnce();
    expect(breaks.isHavingBreak()).toBe(true);
    expect(breaks.wasStartedFromTray()).toBe(true);
    expect(
      Math.abs(breaks.getBreakTime()?.diff(moment()) ?? Infinity),
    ).toBeLessThan(1000);
  });
});
