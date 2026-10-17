import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../prisma";
import { HttpError } from "../errors";
import { asyncHandler } from "../middleware/error";
import { requireUser } from "../middleware/auth";
import {
  bookSlotSchema,
  calendarQuerySchema,
  objectId,
  slotsQuerySchema,
} from "../utils/validators";
import { assertSlotAccess } from "../utils/recruitment";
import { istDateKey, istDayRange, istMonthRange } from "../utils/time";

const router = Router();
router.use(...requireUser);

const MAX_RETRIES = 4;
const CANCEL_CUTOFF_MS = 12 * 60 * 60 * 1000; // no cancelling within 12h of the slot

class RetryError extends Error {}

// GET /api/slots/calendar?domainId=&subsectionId=&month=2026-11 -> availability per date
router.get(
  "/calendar",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const q = calendarQuerySchema.parse(req.query);
    assertSlotAccess(user, q.domainId);

    const [from, to] = istMonthRange(q.month);
    const now = new Date();

    const slots = await prisma.slot.findMany({
      where: {
        domainId: q.domainId,
        ...(q.subsectionId ? { subsectionId: q.subsectionId } : {}),
        startTime: { gte: from > now ? from : now, lt: to },
      },
      select: { startTime: true, capacity: true, bookedCount: true },
      orderBy: { startTime: "asc" },
    });

    const days = new Map<string, { date: string; totalSlots: number; availableSlots: number }>();
    for (const s of slots) {
      const key = istDateKey(s.startTime);
      const day = days.get(key) ?? { date: key, totalSlots: 0, availableSlots: 0 };
      day.totalSlots++;
      if (s.bookedCount < s.capacity) day.availableSlots++;
      days.set(key, day);
    }
    res.json({ month: q.month, days: [...days.values()] });
  })
);

// GET /api/slots?domainId=&subsectionId=&date=2026-11-03 -> slots for the clicked date
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const q = slotsQuerySchema.parse(req.query);
    assertSlotAccess(user, q.domainId);

    const [from, to] = istDayRange(q.date);
    const now = new Date();

    const slots = await prisma.slot.findMany({
      where: {
        domainId: q.domainId,
        ...(q.subsectionId ? { subsectionId: q.subsectionId } : {}),
        startTime: { gte: from > now ? from : now, lt: to },
      },
      orderBy: { startTime: "asc" },
    });

    const mine = await prisma.slotBooking.findMany({
      where: { userId: user.id, slotId: { in: slots.map((s) => s.id) } },
      select: { slotId: true },
    });
    const mineSet = new Set(mine.map((m) => m.slotId));

    res.json({
      date: q.date,
      slots: slots.map((s) => ({
        id: s.id,
        subsectionId: s.subsectionId,
        startTime: s.startTime,
        endTime: s.endTime,
        remaining: Math.max(0, s.capacity - s.bookedCount),
        bookedByMe: mineSet.has(s.id),
      })),
    });
  })
);

// GET /api/slots/book -> my bookings
router.get(
  "/book",
  asyncHandler(async (req, res) => {
    const bookings = await prisma.slotBooking.findMany({
      where: { userId: req.user!.id },
      include: { slot: { select: { startTime: true, endTime: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ bookings });
  })
);

// POST /api/slots/book   body: { slotId } -> book a slot
router.post(
  "/book",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { slotId } = bookSlotSchema.parse(req.body);

    const first = await prisma.slot.findUnique({ where: { id: slotId } });
    if (!first) throw new HttpError(404, "Slot not found", "SLOT_NOT_FOUND");
    assertSlotAccess(user, first.domainId);

    const existing = await prisma.slotBooking.findUnique({
      where: { userId_domainId: { userId: user.id, domainId: first.domainId } },
    });
    if (existing) {
      throw new HttpError(
        409,
        "You already booked a slot for this domain. Cancel it to pick another.",
        "ALREADY_BOOKED"
      );
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const slot = await prisma.slot.findUnique({ where: { id: slotId } });
      if (!slot) throw new HttpError(404, "Slot not found", "SLOT_NOT_FOUND");
      if (slot.startTime <= new Date()) {
        throw new HttpError(409, "This slot has already started", "SLOT_PAST");
      }
      if (slot.bookedCount >= slot.capacity) {
        throw new HttpError(409, "This slot is full", "SLOT_FULL");
      }

      try {
        const booking = await prisma.$transaction(async (tx) => {
          // only works if nobody else changed bookedCount since we read it
          const updated = await tx.slot.updateMany({
            where: { id: slot.id, bookedCount: slot.bookedCount },
            data: { bookedCount: { increment: 1 } },
          });
          if (updated.count === 0) throw new RetryError();

          const created = await tx.slotBooking.create({
            data: {
              userId: user.id,
              slotId: slot.id,
              domainId: slot.domainId,
              subsectionId: slot.subsectionId,
            },
          });
          // stage 3 (slot choosing) -> stage 4 (interview)
          await tx.user.updateMany({
            where: { id: user.id, stage: { in: ["SHORTLISTED", "SLOT_CHOOSING"] } },
            data: { stage: "INTERVIEW" },
          });
          return created;
        });
        res.status(201).json({ booking });
        return;
      } catch (e) {
        const writeConflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
        if (e instanceof RetryError || writeConflict) continue;
        throw e;
      }
    }
    throw new HttpError(409, "Slot is being booked by others, please try again", "CONTENTION");
  })
);

// DELETE /api/slots/book?bookingId=...  -> cancel a booking
router.delete(
  "/book",
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { bookingId } = z.object({ bookingId: objectId }).parse(req.query);

    const booking = await prisma.slotBooking.findUnique({
      where: { id: bookingId },
      include: { slot: true },
    });
    if (!booking || booking.userId !== user.id) {
      throw new HttpError(404, "Booking not found", "BOOKING_NOT_FOUND");
    }
    if (booking.slot.startTime.getTime() - Date.now() < CANCEL_CUTOFF_MS) {
      throw new HttpError(409, "Too late to cancel this booking", "CANCEL_TOO_LATE");
    }

    await prisma.$transaction(async (tx) => {
      await tx.slotBooking.delete({ where: { id: booking.id } });
      await tx.slot.updateMany({
        where: { id: booking.slotId, bookedCount: { gt: 0 } },
        data: { bookedCount: { decrement: 1 } },
      });
      const remaining = await tx.slotBooking.count({ where: { userId: user.id } });
      if (remaining === 0) {
        await tx.user.updateMany({
          where: { id: user.id, stage: "INTERVIEW" },
          data: { stage: "SLOT_CHOOSING" },
        });
      }
    });
    res.json({ cancelled: true });
  })
);

export default router;