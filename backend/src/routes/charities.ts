import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const rows = await prisma.charity.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        basisPoints: true,
      },
    });
    res.json({
      charities: rows.map((c) => ({
        ...c,
        contributionPercent: c.basisPoints / 100,
      })),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
