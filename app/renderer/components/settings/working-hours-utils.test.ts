import { describe, expect, it } from "vitest";
import {
  getMinutesFromTime,
  getTimeFromMinutes,
  minutesToSeconds,
  secondsToMinutes,
} from "./working-hours-utils";

describe("working-hours-utils", () => {
  it("converts between minutes and seconds", () => {
    expect(minutesToSeconds(90)).toBe(5400);
    expect(secondsToMinutes(5459)).toBe(90);
  });

  it("round-trips a time of day through minutes", () => {
    expect(getMinutesFromTime(getTimeFromMinutes(9 * 60 + 30))).toBe(570);
  });
});
