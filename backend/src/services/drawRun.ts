import type { DrawMode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  allocatePrizes,
  computeWinningNumbers,
  countMatches,
  nextMonthRolloverCents,
  type DrawModeApi,
} from "../lib/drawEngine.js";
import { sendDrawResults, sendWinnerNotification } from "../lib/email.js";

function parseNumbers(json: unknown): number[] {
  if (!Array.isArray(json)) return [];
  return json.map((n) => Number(n)).filter((n) => Number.isFinite(n));
}

export async function runMonthlyDraw(params: {
  year: number;
  month: number;
  mode: DrawModeApi;
}) {
  const { year, month, mode } = params;

  const summary = await prisma.$transaction(async (tx) => {
    const draw = await tx.draw.findUnique({
      where: { year_month: { year, month } },
      include: { entries: true },
    });
    if (!draw) {
      throw new Error("DRAW_NOT_FOUND");
    }
    if (draw.executedAt) {
      throw new Error("DRAW_ALREADY_EXECUTED");
    }
    if (draw.entries.length === 0) {
      throw new Error("DRAW_NO_ENTRIES");
    }

    const participantSeeds: string[] = [];
    for (const e of draw.entries) {
      const scores = await tx.score.findMany({
        where: { userId: e.userId },
        orderBy: { playedOn: "desc" },
        take: 5,
      });
      const avg =
        scores.length === 0
          ? 0
          : scores.reduce((s, x) => s + x.value, 0) / scores.length;
      participantSeeds.push(`${e.userId}:${avg.toFixed(2)}`);
    }

    const winning = computeWinningNumbers(
      mode,
      `${draw.id}:${year}-${month}`,
      participantSeeds,
    );

    const rawClaims: { userId: string; matchCount: number }[] = [];
    for (const e of draw.entries) {
      const nums = parseNumbers(e.numbers);
      const matchCount = countMatches(nums, winning);
      if (matchCount >= 3) {
        rawClaims.push({ userId: e.userId, matchCount });
      }
    }

    const hadMatch5Winner = rawClaims.some((c) => c.matchCount === 5);
    const prizes = allocatePrizes({
      jackpotCents: draw.jackpotCents,
      claims: rawClaims,
    });

    await tx.draw.update({
      where: { id: draw.id },
      data: {
        winningNumbers: winning,
        executedAt: new Date(),
        mode: mode as DrawMode,
      },
    });

    for (const p of prizes) {
      await tx.winnerClaim.create({
        data: {
          drawId: draw.id,
          userId: p.userId,
          matchCount: p.matchCount,
          prizeCents: p.prizeCents,
          paymentStatus: "PENDING",
        },
      });
    }

    const next = nextMonth(year, month);
    const nextJackpot = nextMonthRolloverCents({
      currentJackpotCents: draw.jackpotCents,
      hadMatch5Winner,
    });

    const existsNext = await tx.draw.findUnique({
      where: { year_month: { year: next.y, month: next.m } },
    });
    if (!existsNext) {
      await tx.draw.create({
        data: {
          year: next.y,
          month: next.m,
          mode: "RANDOM",
          jackpotCents: nextJackpot,
          winningNumbers: [],
          rolloverFromDrawId: draw.id,
        },
      });
    }

    return {
      drawId: draw.id,
      winningNumbers: winning,
      winnerCount: prizes.length,
      nextJackpotCents: nextJackpot,
      hadMatch5Winner,
    };
  });

  const claims = await prisma.winnerClaim.findMany({
    where: { drawId: summary.drawId },
    include: { user: { select: { email: true, name: true } } },
  });

  const textSummary = `Draw ${year}-${String(month).padStart(2, "0")} complete. Winning numbers: ${JSON.stringify(summary.winningNumbers)}.`;

  const emailed = new Set<string>();
  for (const c of claims) {
    if (!emailed.has(c.user.email)) {
      emailed.add(c.user.email);
      await sendDrawResults(c.user.email, textSummary);
      await sendWinnerNotification(
        c.user.email,
        `You matched ${c.matchCount}. Prize (pending verification): ${(c.prizeCents / 100).toFixed(2)}.`,
      );
    }
  }

  return summary;
}

function nextMonth(year: number, month: number) {
  if (month === 12) return { y: year + 1, m: 1 };
  return { y: year, m: month + 1 };
}
