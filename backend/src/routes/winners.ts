import { Router } from "express";
import { winnerProofSchema } from "@orbit/utils";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

router.post("/:claimId/proof", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const parsed = winnerProofSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new HttpError(400, parsed.error.flatten().formErrors.join("; ")));
      return;
    }
    const claim = await prisma.winnerClaim.findFirst({
      where: {
        id: req.params.claimId,
        userId: req.userId,
      },
    });
    if (!claim) {
      next(new HttpError(404, "Claim not found"));
      return;
    }
    if (claim.paymentStatus !== "PENDING") {
      next(new HttpError(400, "Claim not awaiting proof"));
      return;
    }
    const updated = await prisma.winnerClaim.update({
      where: { id: claim.id },
      data: { proofUrl: parsed.data.proofUrl },
    });
    res.json({
      claim: {
        id: updated.id,
        proofUrl: updated.proofUrl,
        paymentStatus: updated.paymentStatus,
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
