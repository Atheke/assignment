import jwt from "jsonwebtoken";
import { config } from "../config.js";

export type AccessPayload = {
  sub: string;
  role: "USER" | "ADMIN";
};

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpires,
    issuer: "orbit-backend",
    audience: "orbit-frontend",
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, config.jwtAccessSecret, {
    issuer: "orbit-backend",
    audience: "orbit-frontend",
  }) as AccessPayload & { sub: string };
  return { sub: decoded.sub, role: decoded.role };
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtRefreshSecret, {
    expiresIn: `${config.jwtRefreshExpiresDays}d`,
    issuer: "orbit-backend",
    audience: "orbit-refresh",
  });
}

export function verifyRefreshToken(token: string): { sub: string } {
  const decoded = jwt.verify(token, config.jwtRefreshSecret, {
    issuer: "orbit-backend",
    audience: "orbit-refresh",
  }) as { sub: string };
  return { sub: decoded.sub };
}
