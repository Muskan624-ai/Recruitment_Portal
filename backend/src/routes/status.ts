import { Router } from "express";
import { asyncHandler } from "../middleware/error";
import { requireUser } from "../middleware/auth";
import { SLOT_ACCESS_STAGES, STAGES } from "../utils/stages";
import { formState, getConfig } from "../utils/recruitment";

const router = Router();
router.use(...requireUser);

// GET /api/status -> data for the flowchart
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const config = await getConfig();
    const index = STAGES.findIndex((s) => s.key === user.stage);

    res.json({
      stages: STAGES,
      currentStage: user.stage,
      currentIndex: index === -1 ? null : index, // null if rejected
      rejected: user.stage === "REJECTED",
      formSubmitted: !!user.formSubmittedAt,
      canChooseSlots: SLOT_ACCESS_STAGES.includes(user.stage),
      formDeadline: config.formDeadline,
      ...formState(config, user),
    });
  })
);

export default router;