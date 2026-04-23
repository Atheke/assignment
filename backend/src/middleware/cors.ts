import cors from "cors";
import type { CorsOptions } from "cors";
import { config } from "../config.js";

const LOCAL = "http://localhost:3000";
const LOCAL_ALT = "http://127.0.0.1:3000";

export function buildCors(): CorsOptions {
  const allowed = new Set([
    ...config.frontendOrigins,
    // Local frontend defaults for dev
    LOCAL,
    LOCAL_ALT,
  ]);

  return {
    origin(origin, callback) {
      if (!origin) {
        // Allow non-browser and same-origin calls.
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
