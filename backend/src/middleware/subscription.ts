import type { NextFunction, Response } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "./auth.js";
import { HttpError } from "./errorHandler.js";

/** Requires an ACTIVE subscription for gated product features. */
export async function requireSubscription(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  const userId = req.userId;
  if (!userId) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!sub || sub.status !== "ACTIVE") {
    next(new HttpError(402, "Active subscription required", "SUBSCRIPTION"));
    return;
  }
  next();
}
