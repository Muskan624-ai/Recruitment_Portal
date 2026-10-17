import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler } from "../middleware/error";
import { getConfig } from "../utils/recruitment";

const router = Router();

// GET /api/domains -> domain checklist on the sign up page
router.get(
  "/domains",
  asyncHandler(async (_req, res) => {
    const domains = await prisma.domain.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        subsections: { orderBy: { order: "asc" }, select: { id: true, name: true } },
      },
    });
    res.json({ domains });
  })
);

// GET /api/config -> countdown timer data
router.get(
  "/config",
  asyncHandler(async (_req, res) => {
    const config = await getConfig();
    const now = Date.now();
    res.json({
      isOpen: config.isOpen,
      formDeadline: config.formDeadline,
      serverTime: new Date(now).toISOString(),
      msRemaining: Math.max(0, config.formDeadline.getTime() - now),
    });
  })
);

export default router;