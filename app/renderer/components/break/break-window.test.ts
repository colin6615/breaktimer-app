import { describe, expect, it } from "vitest";
import { isPrimaryBreakWindow } from "./break-window";

describe("isPrimaryBreakWindow", () => {
  it("treats the first window as primary", () => {
    expect(isPrimaryBreakWindow("?windowId=0")).toBe(true);
  });

  it("supports the single-window URL", () => {
    expect(isPrimaryBreakWindow("")).toBe(true);
  });

  it("does not let another display start the break again", () => {
    expect(isPrimaryBreakWindow("?windowId=1")).toBe(false);
  });
});
