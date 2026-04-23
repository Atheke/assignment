import { describe, expect, it } from "vitest";
import {
  allocatePrizes,
  computeWinningNumbers,
  countMatches,
  nextMonthRolloverCents,
  randomDistinct,
} from "./drawEngine.js";

describe("drawEngine", () => {
  it("randomDistinct returns sorted unique numbers in range", () => {
    const nums = randomDistinct(1, 45, 5);
    expect(nums.length).toBe(5);
    expect(new Set(nums).size).toBe(5);
    nums.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(45);
    });
    const sorted = [...nums].sort((a, b) => a - b);
    expect(nums).toEqual(sorted);
  });

  it("countMatches counts intersection", () => {
    expect(countMatches([1, 2, 3, 4, 5], [3, 4, 5, 6, 7])).toBe(3);
  });

  it("algorithmic mode is deterministic for same inputs", () => {
    const a = computeWinningNumbers(
      "ALGORITHMIC",
      "draw-key",
      ["u1:22.00", "u2:31.50"],
    );
    const b = computeWinningNumbers(
      "ALGORITHMIC",
      "draw-key",
      ["u1:22.00", "u2:31.50"],
    );
    expect(a).toEqual(b);
  });

  it("allocatePrizes splits jackpot for multiple match-5", () => {
    const out = allocatePrizes({
      jackpotCents: 100_000,
      claims: [
        { userId: "a", matchCount: 5 },
        { userId: "b", matchCount: 5 },
      ],
    });
    const five = out.filter((x) => x.matchCount === 5);
    expect(five.length).toBe(2);
    expect(five[0]!.prizeCents).toBe(five[1]!.prizeCents);
  });

  it("nextMonthRolloverCents rolls when no tier-5 winner", () => {
    const next = nextMonthRolloverCents({
      currentJackpotCents: 50_000,
      hadMatch5Winner: false,
    });
    expect(next).toBeGreaterThan(50_000);
  });
});
