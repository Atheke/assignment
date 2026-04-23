import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { HttpError } from "./errorHandler.js";

export type AuthedRequest = Request & {
  userId?: string;
  role?: "USER" | "ADMIN";
};

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });
    if (!user) {
      next(new HttpError(401, "Unauthorized"));
      return;
    }
    req.userId = user.id;
    req.role = user.role;
    next();
  } catch {
    next(new HttpError(401, "Unauthorized"));
  }
}

export function requireAdmin(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
) {
  if (req.role !== "ADMIN") {
    next(new HttpError(403, "Forbidden"));
    return;
  }
  next();
}
