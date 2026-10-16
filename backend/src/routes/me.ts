import { Router } from "express";
import { prisma } from "../prisma";
import { HttpError } from "../errors";
import { asyncHandler } from "../middleware/error";
import { requireAuth, requireUser } from "../middleware/auth";
import { profileSchema, profileUpdateSchema } from "../utils/validators";
import { assertDomainsValid, formState, getConfig } from "../utils/recruitment";

const router = Router();

// POST /api/signup   body: { name, phone, regNumber, preferredDomainIds[] }
// Email comes from the Google login token.
router.post(
  "/signup",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { email, picture } = req.auth!;
    const body = profileSchema.parse(req.body);

    if (await prisma.user.findUnique({ where: { email } })) {
      throw new HttpError(409, "You are already registered", "ALREADY_REGISTERED");
    }
    const config = await getConfig();
    if (!config.isOpen) throw new HttpError(403, "Applications are closed", "FORM_CLOSED");

    await assertDomainsValid(body.preferredDomainIds);

    const user = await prisma.user.create({ data: { ...body, email, image: picture } });
    res.status(201).json({ user });
  })
);

// GET /api/me -> profile page. Returns registered:false if sign up isn't finished.
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.auth!.email } });
    if (!user) {
      res.json({ registered: false, google: req.auth });
      return;
    }
    const preferredDomains = await prisma.domain.findMany({
      where: { id: { in: user.preferredDomainIds } },
      select: { id: true, name: true, slug: true },
    });
    res.json({ registered: true, user, preferredDomains });
  })
);

// PUT /api/me -> edit profile (email can't be changed)
router.put(
  "/me",
  ...requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const body = profileUpdateSchema.parse(req.body);

    if (body.preferredDomainIds) {
      const ids = body.preferredDomainIds;
      const changed =
        ids.length !== user.preferredDomainIds.length ||
        ids.some((id) => !user.preferredDomainIds.includes(id));
      if (changed) {
        const config = await getConfig();
        if (!formState(config, user).editable) {
          throw new HttpError(
            403,
            "Domains can't be changed after submitting or after the deadline",
            "DOMAINS_LOCKED"
          );
        }
        await assertDomainsValid(ids);
      }
    }

    const updated = await prisma.user.update({ where: { id: user.id }, data: body });
    res.json({ user: updated });
  })
);

export default router;