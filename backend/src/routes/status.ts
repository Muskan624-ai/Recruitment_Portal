import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { requireUser } from "../middleware/auth";
import { SLOT_ACCESS_STAGES, STAGES } from "../utils/stages";
import { applicationState, getConfig } from "../utils/recruitment";
import { DOMAIN_LABELS } from "../utils/domains";

const router = Router();
router.use(...requireUser);

// GET /api/status -> flowchart data, one entry per domain applied to
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const config = await getConfig();

    const applications = await prisma.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        booking: {
          include: { slot: { select: { startTime: true, endTime: true, meetingLink: true } } },
        },
      },
    });

    res.json({
      stages: STAGES,
      formDeadline: config.formDeadline,
      applications: applications.map((app) => {
        const index = STAGES.findIndex((s) => s.key === app.stage);
        return {
          domain: app.domain,
          label: DOMAIN_LABELS[app.domain],
          stage: app.stage,
          currentIndex: index === -1 ? null : index, // null if rejected
          rejected: app.stage === "REJECTED",
          ...applicationState(config, app),
          canChooseSlots: SLOT_ACCESS_STAGES.includes(app.stage),
          booking: app.booking ? { id: app.booking.id, slot: app.booking.slot } : null,
        };
      }),
    });
  })
);

export default router;