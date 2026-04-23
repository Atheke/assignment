import { SCORE_MAX, SCORE_MIN, SCORE_WINDOW } from "@orbit/utils";
import type { PrismaClient } from "@prisma/client";

export async function upsertScoreWindow(
  prisma: PrismaClient,
  params: {
    userId: string;
    value: number;
    playedOn: Date;
  },
) {
  const { userId, value, playedOn } = params;
  if (value < SCORE_MIN || value > SCORE_MAX) {
    throw new Error("INVALID_SCORE_RANGE");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.score.findUnique({
      where: {
        userId_playedOn: { userId, playedOn },
      },
    });
    if (existing && existing.value !== value) {
      await tx.score.update({
        where: { id: existing.id },
        data: { value },
      });
    } else if (!existing) {
      await tx.score.create({
        data: { userId, value, playedOn },
      });
    }

    const all = await tx.score.findMany({
      where: { userId },
      orderBy: { playedOn: "desc" },
    });
    if (all.length > SCORE_WINDOW) {
      const toRemove = all.slice(SCORE_WINDOW);
      await tx.score.deleteMany({
        where: { id: { in: toRemove.map((s) => s.id) } },
      });
    }
  });
}

export async function listScores(prisma: PrismaClient, userId: string) {
  return prisma.score.findMany({
    where: { userId },
    orderBy: { playedOn: "desc" },
    take: SCORE_WINDOW,
  });
}
