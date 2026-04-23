import cors from "cors";
import type { CorsOptions } from "cors";
import { config } from "../config.js";

const LOCAL = "http://localhost:3000";

export function buildCors(): CorsOptions {
  const frontend = config.frontendOrigin.replace(/\/$/, "");
  const allowed = new Set([frontend, LOCAL]);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.has(origin)) {
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };
}
