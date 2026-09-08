import type { PowerMonitor } from "electron";
import moment from "moment";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  defaultSettings,
  NotificationType,
  Settings,
} from "../../types/settings";

type TestPowerMonitor = Pick<PowerMonitor, "getSystemIdleState"> & {
  on?: PowerMonitor["on"];
};

const harness = vi.hoisted(() => ({
  buildTray: vi.fn(),
  createBreakWindows: vi.fn(),
  getSystemIdleState: vi.fn<PowerMonitor["getSystemIdleState"]>(() => "active"),
  powerMonitor: {} as TestPowerMonitor,
  settings: {} as Settings,
  sendIpc: vi.fn(),
}));

vi.mock("electron", () => ({}));
vi.mock("electron-log", () => ({ default: { info: vi.fn() } }));
vi.mock("./ipc", () => ({ sendIpc: harness.sendIpc }));
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
      breakFrequencySeconds: 15,
      breakLengthSeconds: 15 * 60,
      idleResetLengthSeconds: 5,
      workingHoursEnabled: false,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts a break when the scheduled break becomes due during suspension", async () => {
    const breaks = await import("./breaks.js");
    breaks.initBreaks(harness.powerMonitor);
    vi.advanceTimersByTime(1000);

    vi.setSystemTime(new Date("2026-08-24T09:00:30Z"));
    vi.advanceTimersByTime(1000);

    expect(harness.createBreakWindows).toHaveBeenCalledOnce();
    expect(breaks.isHavingBreak()).toBe(true);
    expect(breaks.getBreakStartInfo()).toEqual({
      startImmediately: true,
      breakEndTime: new Date("2026-08-24T09:15:15Z").getTime(),
    });
  });

  it("keeps the remaining break time after a 90-second suspension", async () => {
    harness.settings.breakFrequencySeconds = 60;
    harness.settings.breakLengthSeconds = 60;
    const breaks = await import("./breaks.js");

    breaks.initBreaks(harness.powerMonitor);
    vi.advanceTimersByTime(1000);

    vi.setSystemTime(new Date("2026-08-24T09:01:30Z"));
    vi.advanceTimersByTime(1000);

    expect(harness.createBreakWindows).toHaveBeenCalledOnce();
    expect(breaks.getBreakStartInfo()).toEqual({
      startImmediately: true,
      breakEndTime: new Date("2026-08-24T09:02:00Z").getTime(),
    });
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
});

describe("break completion while locked", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    harness.settings = {
      ...defaultSettings,
      notificationType: NotificationType.Popup,
    };
    harness.getSystemIdleState.mockReturnValue("locked");
    harness.powerMonitor = {
      getSystemIdleState: harness.getSystemIdleState,
    };
  });

  it("defers the break end until the system unlocks", async () => {
    const breaks = await import("./breaks.js");

    breaks.initBreaks(harness.powerMonitor);
    breaks.requestBreakEnd();

    expect(harness.sendIpc).not.toHaveBeenCalled();
  });

  it("ends normally when the system is unlocked", async () => {
    harness.getSystemIdleState.mockReturnValue("active");
    const breaks = await import("./breaks.js");

    breaks.initBreaks(harness.powerMonitor);
    breaks.requestBreakEnd();

    expect(harness.sendIpc).toHaveBeenCalledOnce();
  });

  it("releases the deferred break end after unlock", async () => {
    const unlockHandlers: Array<() => void> = [];
    harness.powerMonitor = {
      getSystemIdleState: harness.getSystemIdleState,
      on: vi.fn((_event: string, handler: () => void) => {
        unlockHandlers.push(handler);
        return harness.powerMonitor as never;
      }),
    };
    const breaks = await import("./breaks.js");

    breaks.initBreaks(harness.powerMonitor);
    breaks.requestBreakEnd();
    unlockHandlers[1]();

    expect(harness.sendIpc).toHaveBeenCalledOnce();
  });
});
