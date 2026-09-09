import type { PowerMonitor } from "electron";
import moment from "moment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultSettings,
  NotificationType,
  Settings,
} from "../../types/settings";

const harness = vi.hoisted(() => ({
  buildTray: vi.fn(),
  createBreakWindows: vi.fn(),
  getSystemIdleState: vi.fn<PowerMonitor["getSystemIdleState"]>(() => "active"),
  powerMonitor: {} as Pick<PowerMonitor, "getSystemIdleState">,
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

describe("system suspension", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T09:00:00Z"));
    vi.resetModules();
    vi.clearAllMocks();
    harness.getSystemIdleState.mockReturnValue("active");
    harness.powerMonitor = {
      getSystemIdleState: harness.getSystemIdleState,
    };
    harness.settings = {
      ...defaultSettings,
      breakFrequencySeconds: 60,
      idleResetLengthSeconds: 5,
      workingHoursEnabled: false,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not count a long suspension as active time", async () => {
    const breaks = await import("./breaks.js");
    breaks.initBreaks(harness.powerMonitor);
    vi.advanceTimersByTime(1000);

    vi.setSystemTime(new Date("2026-08-24T09:02:00Z"));
    vi.advanceTimersByTime(1000);

    expect(breaks.getTimeSinceLastCompletedBreak()).toBe(0);
    expect(breaks.getBreakTime()?.diff(moment(), "seconds")).toBe(60);
  });

  it("detects suspension even if the machine was already locked", async () => {
    harness.getSystemIdleState.mockReturnValue("locked");
    const breaks = await import("./breaks.js");
    breaks.initBreaks(harness.powerMonitor);
    vi.advanceTimersByTime(1000);

    vi.setSystemTime(new Date("2026-08-24T09:02:00Z"));
    vi.advanceTimersByTime(1000);

    expect(breaks.getTimeSinceLastCompletedBreak()).toBe(0);
  });

  it("starts a due break after unlock using its original deadline", async () => {
    harness.settings.breakFrequencySeconds = 120;
    const breaks = await import("./breaks.js");
    breaks.initBreaks(harness.powerMonitor);
    vi.advanceTimersByTime(1000);

    harness.getSystemIdleState.mockReturnValue("locked");
    vi.advanceTimersByTime(121000);

    harness.getSystemIdleState.mockReturnValue("active");
    vi.advanceTimersByTime(1000);

    expect(breaks.isHavingBreak()).toBe(true);
    expect(harness.createBreakWindows).toHaveBeenCalledOnce();
    expect(breaks.getBreakTime()?.diff(moment(), "seconds")).toBe(-3);
    expect(breaks.getBreakState().breakEndTime).toBe(
      new Date("2026-08-24T09:02:00Z").getTime() +
        harness.settings.breakLengthSeconds * 1000,
    );
  });

  it("starts a full work interval after an open break ends while locked", async () => {
    harness.settings.breakFrequencySeconds = 120;
    const breaks = await import("./breaks.js");
    breaks.initBreaks(harness.powerMonitor);
    vi.advanceTimersByTime(1000);

    breaks.startBreakNow();
    harness.createBreakWindows.mockClear();
    harness.getSystemIdleState.mockReturnValue("locked");
    vi.advanceTimersByTime(1000);
    breaks.endPopupBreak();

    harness.getSystemIdleState.mockReturnValue("active");
    vi.advanceTimersByTime(1000);

    expect(breaks.isHavingBreak()).toBe(false);
    expect(breaks.getTimeSinceLastCompletedBreak()).toBe(0);
    expect(breaks.getBreakTime()?.diff(moment(), "seconds")).toBe(120);
    expect(harness.createBreakWindows).not.toHaveBeenCalled();
  });
});
