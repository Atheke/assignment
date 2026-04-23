/** Rolling window of scores (1–45), one entry per calendar date per user. */
export const SCORE_MIN = 1;
export const SCORE_MAX = 45;
export const SCORE_WINDOW = 5;

export const DRAW_NUMBERS_COUNT = 5;
export const DRAW_MATCH_TIERS = [3, 4, 5] as const;

/** Default jackpot seed in cents (display); rollover adds to next month. */
export const DEFAULT_JACKPOT_SEED_CENTS = 100_000;
