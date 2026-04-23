import { Router } from "express";
import { scoreCreateSchema } from "@orbit/utils";
import { prisma } from "../lib/prisma.js";
import { upsertScoreWindow } from "../lib/scoreService.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { requireSubscription } from "../middleware/subscription.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

router.get("/", requireAuth, requireSubscription, async (req: AuthedRequest, res, next) => {
  try {
    const scores = await prisma.score.findMany({
      where: { userId: req.userId },
      orderBy: { playedOn: "desc" },
      take: 5,
    });
    res.json({
      scores: scores.map((s) => ({
        id: s.id,
        value: s.value,
        playedOn: s.playedOn.toISOString().slice(0, 10),
      })),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", requireAuth, requireSubscription, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = scoreCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.flatten().formErrors.join("; ")));
      return;
    }
    const playedOn = new Date(parsed.data.playedOn + "T12:00:00.000Z");
    await upsertScoreWindow(prisma, {
      userId: req.userId!,
      value: parsed.data.value,
      playedOn,
    });
    const scores = await prisma.score.findMany({
      where: { userId: req.userId },
      orderBy: { playedOn: "desc" },
      take: 5,
    });
    res.status(201).json({
      scores: scores.map((s) => ({
        id: s.id,
        value: s.value,
        playedOn: s.playedOn.toISOString().slice(0, 10),
      })),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_SCORE_RANGE") {
      next(new HttpError(400, "Score out of range"));
      return;
    }
    next(e);
  }
});

export default router;
