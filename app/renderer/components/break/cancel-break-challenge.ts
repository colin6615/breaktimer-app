const CHALLENGE_LENGTH = 32;
const CHALLENGE_CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generateCancelBreakChallenge(): string {
  const challenge: string[] = [];
  const randomValues = new Uint8Array(CHALLENGE_LENGTH);
  const maxValidValue =
    Math.floor(256 / CHALLENGE_CHARACTERS.length) * CHALLENGE_CHARACTERS.length;

  while (challenge.length < CHALLENGE_LENGTH) {
    globalThis.crypto.getRandomValues(randomValues);

    for (const randomValue of randomValues) {
      if (randomValue >= maxValidValue) continue;

      challenge.push(
        CHALLENGE_CHARACTERS[randomValue % CHALLENGE_CHARACTERS.length],
      );

      if (challenge.length === CHALLENGE_LENGTH) break;
    }
  }

  return challenge.join("");
}

export function isCancelBreakChallengeCorrect(
  challenge: string,
  answer: string,
): boolean {
  return challenge === answer;
}
