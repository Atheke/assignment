import nodemailer from "nodemailer";
import { config } from "../config.js";

let transporter: nodemailer.Transporter | null = null;

function getTransport() {
  if (!config.smtpHost) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth:
        config.smtpUser && config.smtpPass
          ? { user: config.smtpUser, pass: config.smtpPass }
          : undefined,
    });
  }
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const t = getTransport();
  const body = opts.html ?? opts.text;
  if (!t) {
    console.info("[email:fallback]", opts.to, opts.subject, opts.text);
    return;
  }
  await t.sendMail({
    from: config.smtpFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: body,
  });
}

export async function sendSignupConfirmation(email: string, name: string) {
  await sendMail({
    to: email,
    subject: "Welcome to Orbit",
    text: `Hi ${name},\n\nYour account is ready. Launch your dashboard anytime.\n`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your account is ready. Launch your dashboard anytime.</p>`,
  });
}

export async function sendDrawResults(
  email: string,
  summary: string,
) {
  await sendMail({
    to: email,
    subject: "Monthly draw results",
    text: summary,
  });
}

export async function sendWinnerNotification(
  email: string,
  prizeLabel: string,
) {
  await sendMail({
    to: email,
    subject: "You matched — next steps",
    text: `Congratulations. ${prizeLabel}\nPlease upload verification proof in your dashboard.\n`,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
