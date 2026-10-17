import { Router } from "express";
import { prisma } from "../prisma";
import { HttpError } from "../errors";
import { asyncHandler } from "../middleware/error";
import { requireUser } from "../middleware/auth";
import { saveAnswerSchema } from "../utils/validators";
import { assertFormEditable, formState, getConfig } from "../utils/recruitment";

const router = Router();
router.use(...requireUser);

// GET /api/form -> questions for the chosen domains + saved answers + deadline + lock state
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const config = await getConfig();

    const [domains, answers] = await Promise.all([
      prisma.domain.findMany({
        where: { id: { in: user.preferredDomainIds }, isActive: true },
        orderBy: { name: "asc" },
        include: {
          subsections: { orderBy: { order: "asc" } },
          questions: { orderBy: { order: "asc" } },
        },
      }),
      prisma.answer.findMany({ where: { userId: user.id } }),
    ]);

    const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
    let requiredTotal = 0;
    let requiredAnswered = 0;

    const payload = domains.map((d) => ({
      id: d.id,
      name: d.name,
      subsections: d.subsections.map((s) => ({ id: s.id, name: s.name })),
      questions: d.questions.map((q) => {
        const a = byQuestion.get(q.id);
        if (q.required) {
          requiredTotal++;
          if (a && a.text.trim()) requiredAnswered++;
        }
        return {
          id: q.id,
          subsectionId: q.subsectionId,
          text: q.text,
          required: q.required,
          maxLength: q.maxLength,
          answer: a?.text ?? "",
          savedAt: a?.updatedAt ?? null,
        };
      }),
    }));

    const now = Date.now();
    res.json({
      ...formState(config, user),
      isOpen: config.isOpen,
      formDeadline: config.formDeadline,
      serverTime: new Date(now).toISOString(),
      msRemaining: Math.max(0, config.formDeadline.getTime() - now),
      progress: { requiredAnswered, requiredTotal },
      domains: payload,
    });
  })
);

// PUT /api/form/answers   body: { questionId, text }  -> save button under each question
router.put(
  "/answers",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const config = await getConfig();
    assertFormEditable(config, user);

    const { questionId, text } = saveAnswerSchema.parse(req.body);

    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question || !user.preferredDomainIds.includes(question.domainId)) {
      throw new HttpError(404, "Question not found", "QUESTION_NOT_FOUND");
    }
    if (text.length > question.maxLength) {
      throw new HttpError(400, `Answer exceeds ${question.maxLength} characters`, "ANSWER_TOO_LONG");
    }

    const answer = await prisma.answer.upsert({
      where: { userId_questionId: { userId: user.id, questionId } },
      create: { userId: user.id, questionId, text },
      update: { text },
    });
    res.json({ questionId, savedAt: answer.updatedAt });
  })
);

// POST /api/form/submit -> final submit at the bottom of the form
router.post(
  "/submit",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const config = await getConfig();
    assertFormEditable(config, user);

    const [required, answers] = await Promise.all([
      prisma.question.findMany({
        where: { domainId: { in: user.preferredDomainIds }, required: true },
        select: { id: true, text: true },
      }),
      prisma.answer.findMany({ where: { userId: user.id } }),
    ]);

    const answered = new Set(answers.filter((a) => a.text.trim()).map((a) => a.questionId));
    const missing = required.filter((q) => !answered.has(q.id));
    if (missing.length) {
      throw new HttpError(422, "Some required questions are unanswered", "INCOMPLETE_FORM", { missing });
    }

    // protects against double submits
    const result = await prisma.user.updateMany({
      where: { id: user.id, formSubmittedAt: null },
      data: { formSubmittedAt: new Date() },
    });
    if (result.count === 0) {
      throw new HttpError(409, "Form already submitted", "ALREADY_SUBMITTED");
    }
    res.json({ submitted: true });
  })
);

export default router;