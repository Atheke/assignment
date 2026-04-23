import { DEFAULT_JACKPOT_SEED_CENTS } from "@orbit/utils";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";

async function main() {
  const charities = await Promise.all([
    prisma.charity.upsert({
      where: { id: "seed_charity_orbit" },
      update: {},
      create: {
        id: "seed_charity_orbit",
        name: "Orbit Youth STEM",
        description: "Scholarships for students pursuing aerospace careers.",
        basisPoints: 500,
        active: true,
      },
    }),
    prisma.charity.upsert({
      where: { id: "seed_charity_stars" },
      update: {},
      create: {
        id: "seed_charity_stars",
        name: "Starlight Community Fund",
        description: "Local grant programs for community launchpads.",
        basisPoints: 750,
        active: true,
      },
    }),
  ]);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@orbit.local";
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "AdminAdmin123!";
  const adminHash = await hashPassword(adminPass);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminHash,
      role: "ADMIN",
      charityId: charities[0]!.id,
    },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: "Mission Control",
      role: "ADMIN",
      charityId: charities[0]!.id,
      subscription: {
        create: {
          plan: "YEARLY",
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 86400000 * 365),
        },
      },
    },
  });

  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;

  await prisma.draw.upsert({
    where: { year_month: { year: y, month: m } },
    update: {},
    create: {
      year: y,
      month: m,
      mode: "RANDOM",
      jackpotCents: DEFAULT_JACKPOT_SEED_CENTS,
      winningNumbers: [],
    },
  });

  console.info("Seed complete. Admin:", adminEmail);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
