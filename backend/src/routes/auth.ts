import { Router } from "express";
import type { Response } from "express";
import {
  loginSchema,
  signupSchema,
} from "@orbit/utils";
import { config } from "../config.js";
import {
  sendSignupConfirmation,
} from "../lib/email.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { prisma } from "../lib/prisma.js";
import { sha256Hex } from "../lib/cryptoHash.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

const REFRESH_COOKIE = "refreshToken";

function refreshCookieOptions() {
  const maxAge = config.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge,
  };
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: "lax",
    path: "/api/auth",
  });
}

router.post("/signup", async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.flatten().formErrors.join("; ")));
      return;
    }
    const { email, password, name, charityId } = parsed.data;

    const charity = await prisma.charity.findFirst({
      where: { id: charityId, active: true },
    });
    if (!charity) {
      next(new HttpError(400, "Invalid charity"));
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      next(new HttpError(409, "Email already registered"));
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        charityId,
        subscription: {
          create: {
            plan: "MONTHLY",
            status: "INACTIVE",
          },
        },
      },
      include: { charity: true },
    });

    await sendSignupConfirmation(email, name);

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(
          Date.now() + config.jwtRefreshExpiresDays * 86400000,
        ),
      },
    });
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

    res.status(201).json({
      user: publicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, "Invalid credentials"));
      return;
    }
    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { charity: true },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      next(new HttpError(401, "Invalid credentials"));
      return;
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(
          Date.now() + config.jwtRefreshExpiresDays * 86400000,
        ),
      },
    });
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());

    res.json({
      user: publicUser(user),
      accessToken,
      refreshToken,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const body =
      typeof req.body?.refreshToken === "string"
        ? req.body.refreshToken
        : null;
    const refreshToken =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? body;
    if (!refreshToken) {
      throw new HttpError(401, "Unauthorized");
    }
    const { sub } = verifyRefreshToken(refreshToken);
    const hash = sha256Hex(refreshToken);
    const existing = await prisma.refreshToken.findFirst({
      where: {
        userId: sub,
        tokenHash: hash,
        expiresAt: { gt: new Date() },
      },
    });
    if (!existing) {
      throw new HttpError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
      where: { id: sub },
      include: { charity: true },
    });
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
    });
    const nextRefresh = signRefreshToken(user.id);
    await prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        tokenHash: sha256Hex(refreshToken),
      },
    });
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(nextRefresh),
        expiresAt: new Date(
          Date.now() + config.jwtRefreshExpiresDays * 86400000,
        ),
      },
    });
    res.cookie(REFRESH_COOKIE, nextRefresh, refreshCookieOptions());

    res.json({
      user: publicUser(user),
      accessToken,
      refreshToken: nextRefresh,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const bodyRt =
      typeof req.body?.refreshToken === "string"
        ? req.body.refreshToken
        : null;
    const refreshToken =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? bodyRt;
    if (refreshToken) {
      try {
        const { sub } = verifyRefreshToken(refreshToken);
        await prisma.refreshToken.deleteMany({
          where: {
            userId: sub,
            tokenHash: sha256Hex(refreshToken),
          },
        });
      } catch {
        /* ignore */
      }
    }
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { charity: true, subscription: true },
    });
    if (!user) {
      next(new HttpError(401, "Unauthorized"));
      return;
    }
    res.json({ user: publicUser(user) });
  } catch (e) {
    next(e);
  }
});

function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  charityId: string | null;
  charity?: {
    id: string;
    name: string;
    basisPoints: number;
  } | null;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    charityId: user.charityId,
    charity: user.charity
      ? {
          id: user.charity.id,
          name: user.charity.name,
          basisPoints: user.charity.basisPoints,
        }
      : null,
    subscription: user.subscription
      ? {
          plan: user.subscription.plan,
          status: user.subscription.status,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
        }
      : null,
  };
}

export default router;
