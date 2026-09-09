import { describe, expect, it } from "vitest";
import {
  generateCancelBreakChallenge,
  isCancelBreakChallengeCorrect,
} from "./cancel-break-challenge";

describe("cancel break challenge", () => {
  it("generates a 32-character alphanumeric challenge", () => {
    const challenge = generateCancelBreakChallenge();

    expect(challenge).toHaveLength(32);
    expect(challenge).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("requires an exact match", () => {
    const challenge = "A".repeat(32);

    expect(isCancelBreakChallengeCorrect(challenge, challenge)).toBe(true);
    expect(isCancelBreakChallengeCorrect(challenge, "a".repeat(32))).toBe(
      false,
    );
    expect(
      isCancelBreakChallengeCorrect(challenge, challenge.slice(0, -1)),
    ).toBe(false);
    expect(isCancelBreakChallengeCorrect(challenge, "wrong")).toBe(false);
  });
});
