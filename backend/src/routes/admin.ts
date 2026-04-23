import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { runMonthlyDraw } from "../services/drawRun.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/analytics", async (_req, res, next) => {
  try {
    const [users, activeSubs, drawsRun, pendingClaims] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.draw.count({ where: { executedAt: { not: null } } }),
      prisma.winnerClaim.count({
        where: { paymentStatus: "PENDING", proofUrl: { not: null } },
      }),
    ]);
    res.json({
      users,
      activeSubscriptions: activeSubs,
      completedDraws: drawsRun,
      pendingWinnerReviews: pendingClaims,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        charity: true,
        subscription: true,
      },
    });
    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        charity: u.charity,
        subscription: u.subscription,
        createdAt: u.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

const patchUserSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
});

router.patch("/users/:id", async (req, res, next) => {
  try {
    const parsed = patchUserSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, "Invalid body"));
      return;
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/charities", async (_req, res, next) => {
  try {
    const charities = await prisma.charity.findMany({
      orderBy: { name: "asc" },
    });
    res.json({ charities });
  } catch (e) {
    next(e);
  }
});

const charitySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  basisPoints: z.number().int().min(0).max(10000),
  active: z.boolean().optional(),
});

router.post("/charities", async (req, res, next) => {
  try {
    const parsed = charitySchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.message));
      return;
    }
    const c = await prisma.charity.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        logoUrl: parsed.data.logoUrl || null,
        basisPoints: parsed.data.basisPoints,
        active: parsed.data.active ?? true,
      },
    });
    res.status(201).json({ charity: c });
  } catch (e) {
    next(e);
  }
});

router.patch("/charities/:id", async (req, res, next) => {
  try {
    const parsed = charitySchema.partial().safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.message));
      return;
    }
    const c = await prisma.charity.update({
      where: { id: req.params.id },
      data: {
        ...parsed.data,
        logoUrl: parsed.data.logoUrl === "" ? null : parsed.data.logoUrl,
      },
    });
    res.json({ charity: c });
  } catch (e) {
    next(e);
  }
});

const runDrawSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  mode: z.enum(["RANDOM", "ALGORITHMIC"]),
});

router.post("/draws/run", async (req: AuthedRequest, res, next) => {
  try {
    const parsed = runDrawSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.message));
      return;
    }
    const result = await runMonthlyDraw(parsed.data);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "DRAW_ERROR";
    if (msg === "DRAW_NOT_FOUND") {
      next(new HttpError(404, "Draw not found for period"));
      return;
    }
    if (msg === "DRAW_ALREADY_EXECUTED") {
      next(new HttpError(400, "Draw already executed"));
      return;
    }
    if (msg === "DRAW_NO_ENTRIES") {
      next(new HttpError(400, "No entries for this draw"));
      return;
    }
    next(e);
  }
});

const verifySchema = z.object({
  paymentStatus: z.enum(["APPROVED", "REJECTED", "PAID"]),
  adminNote: z.string().max(2000).optional(),
});

router.patch("/winners/:claimId", async (req, res, next) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.message));
      return;
    }
    const claim = await prisma.winnerClaim.update({
      where: { id: req.params.claimId },
      data: {
        paymentStatus: parsed.data.paymentStatus,
        adminNote: parsed.data.adminNote,
      },
    });
    res.json({ claim });
  } catch (e) {
    next(e);
  }
});

router.get("/winners/pending", async (_req, res, next) => {
  try {
    const claims = await prisma.winnerClaim.findMany({
      where: {
        paymentStatus: "PENDING",
        proofUrl: { not: null },
      },
      include: {
        user: { select: { email: true, name: true } },
        draw: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ claims });
  } catch (e) {
    next(e);
  }
});

export default router;
