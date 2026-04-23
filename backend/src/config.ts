import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  nodeEnv: optional("NODE_ENV", "development"),
  port: Number(optional("PORT", "4000")),
  databaseUrl: optional("DATABASE_URL", ""),
  jwtAccessSecret: optional("JWT_ACCESS_SECRET", "dev-access-change-me"),
  jwtRefreshSecret: optional("JWT_REFRESH_SECRET", "dev-refresh-change-me"),
  jwtAccessExpires: optional("JWT_ACCESS_EXPIRES", "15m"),
  jwtRefreshExpiresDays: Number(optional("JWT_REFRESH_EXPIRES_DAYS", "30")),
  frontendOrigin: optional("FRONTEND_URL", "http://localhost:3000"),
  stripeSecretKey: optional("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET", ""),
  stripePriceMonthly: optional("STRIPE_PRICE_MONTHLY", ""),
  stripePriceYearly: optional("STRIPE_PRICE_YEARLY", ""),
  smtpHost: optional("SMTP_HOST", ""),
  smtpPort: Number(optional("SMTP_PORT", "587")),
  smtpUser: optional("SMTP_USER", ""),
  smtpPass: optional("SMTP_PASS", ""),
  smtpFrom: optional("SMTP_FROM", "Orbit <noreply@localhost>"),
  drawSecret: optional("DRAW_SECRET", "change-me-draw-seed"),
};

export function assertProductionSecrets() {
  if (config.nodeEnv !== "production") return;
  required("DATABASE_URL");
  required("JWT_ACCESS_SECRET");
  required("JWT_REFRESH_SECRET");
  required("FRONTEND_URL");
}
