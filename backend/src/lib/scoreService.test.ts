import { afterAll, beforeAll, describe, expect, it } from "vitest";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
import { PrismaClient } from "@prisma/client";
import { upsertScoreWindow } from "./scoreService.js";

const prisma = new PrismaClient();

describeDb("scoreService", () => {
  let userId: string;

  beforeAll(async () => {
    const u = await prisma.user.create({
      data: {
        email: `score-test-${Date.now()}@test.local`,
        passwordHash: "x",
        subscription: {
          create: { plan: "MONTHLY", status: "INACTIVE" },
        },
      },
    });
    userId = u.id;
  });

  afterAll(async () => {
    await prisma.score.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("keeps only last 5 distinct dates", async () => {
    await prisma.score.deleteMany({ where: { userId } });
    const base = new Date("2025-01-15T12:00:00.000Z");
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setUTCDate(base.getUTCDate() + i);
      await upsertScoreWindow(prisma, {
        userId,
        value: 10 + i,
        playedOn: d,
      });
    }
    const scores = await prisma.score.findMany({
      where: { userId },
      orderBy: { playedOn: "desc" },
    });
    expect(scores.length).toBe(5);
  });
});
