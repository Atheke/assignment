import { randomInt } from "node:crypto";
import {
  DEFAULT_JACKPOT_SEED_CENTS,
  DRAW_MATCH_TIERS,
  DRAW_NUMBERS_COUNT,
  SCORE_MAX,
  SCORE_MIN,
} from "@orbit/utils";
import { config } from "../config.js";
import { sha256Hex } from "./cryptoHash.js";

export type DrawModeApi = "RANDOM" | "ALGORITHMIC";

/** Pick `count` distinct integers in [min, max] uniformly at random. */
export function randomDistinct(
  min: number,
  max: number,
  count: number,
): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const out: number[] = [];
  while (out.length < count && pool.length) {
    const idx = randomInt(0, pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out.sort((a, b) => a - b);
}

/** Deterministic shuffle from hex seed → reproducible winning line for audits. */
export function seededDistinctFromPool(
  seed: string,
  min: number,
  max: number,
  count: number,
): number[] {
  const pool = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  let state = seed;
  const out: number[] = [];
  while (out.length < count && pool.length) {
    state = sha256Hex(state + String(out.length));
    const idx = Number.parseInt(state.slice(0, 8), 16) % pool.length;
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out.sort((a, b) => a - b);
}

export function computeWinningNumbers(
  mode: DrawModeApi,
  drawKey: string,
  participantSeeds: string[],
): number[] {
  if (mode === "RANDOM") {
    return randomDistinct(SCORE_MIN, SCORE_MAX, DRAW_NUMBERS_COUNT);
  }
  const combined = [
    config.drawSecret,
    drawKey,
    ...participantSeeds.sort(),
  ].join("|");
  const seed = sha256Hex(combined);
  return seededDistinctFromPool(seed, SCORE_MIN, SCORE_MAX, DRAW_NUMBERS_COUNT);
}

export function countMatches(a: number[], b: number[]): number {
  const setB = new Set(b);
  return a.filter((n) => setB.has(n)).length;
}

export const PRIZE_MATCH_5_SHARE = 0.85; // of jackpot to match-5 pool
export const PRIZE_MATCH_4_FIXED_CENTS = 25_000;
export const PRIZE_MATCH_3_FIXED_CENTS = 5_000;

export function allocatePrizes(params: {
  jackpotCents: number;
  claims: { userId: string; matchCount: number }[];
}): { userId: string; matchCount: number; prizeCents: number }[] {
  const { jackpotCents, claims } = params;
  const five = claims.filter((c) => c.matchCount === 5);
  const four = claims.filter((c) => c.matchCount === 4);
  const three = claims.filter((c) => c.matchCount === 3);

  const result: { userId: string; matchCount: number; prizeCents: number }[] =
    [];

  const pool5 = Math.floor(jackpotCents * PRIZE_MATCH_5_SHARE);
  if (five.length > 0) {
    const each = Math.floor(pool5 / five.length);
    for (const c of five) {
      result.push({ userId: c.userId, matchCount: 5, prizeCents: each });
    }
  }

  for (const c of four) {
    result.push({
      userId: c.userId,
      matchCount: 4,
      prizeCents: PRIZE_MATCH_4_FIXED_CENTS,
    });
  }
  for (const c of three) {
    result.push({
      userId: c.userId,
      matchCount: 3,
      prizeCents: PRIZE_MATCH_3_FIXED_CENTS,
    });
  }
  return result;
}

export function nextMonthRolloverCents(params: {
  currentJackpotCents: number;
  hadMatch5Winner: boolean;
}): number {
  if (params.hadMatch5Winner) return DEFAULT_JACKPOT_SEED_CENTS;
  return params.currentJackpotCents + DEFAULT_JACKPOT_SEED_CENTS;
}

export { DRAW_MATCH_TIERS, DEFAULT_JACKPOT_SEED_CENTS };
