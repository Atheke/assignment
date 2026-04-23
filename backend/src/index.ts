import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "./config.js";
import { buildCors } from "./middleware/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import adminRoutes from "./routes/admin.js";
import authRoutes from "./routes/auth.js";
import charitiesRoutes from "./routes/charities.js";
import drawsRoutes from "./routes/draws.js";
import scoresRoutes from "./routes/scores.js";
import stripeRoutes from "./routes/stripe.js";
import { handleStripeWebhook } from "./routes/stripeWebhook.js";
import winnersRoutes from "./routes/winners.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(buildCors()));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/charities", charitiesRoutes);
app.use("/api/scores", scoresRoutes);
app.use("/api/draws", drawsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/winners", winnersRoutes);

app.use(errorHandler);

const port = config.port;
app.listen(port, () => {
  console.info(`API listening on ${port}`);
});
