import "dotenv/config";
import { DomainType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DATA: Record<DomainType, { subsections: string[]; questions: { text: string; sub: number | null }[] }> = {
  TECHNICAL: {
    subsections: ["Web", "Software"],
    questions: [
      { text: "Tell us about a technical project you have built.", sub: 0 },
      { text: "How would you debug a program that crashes only sometimes?", sub: 1 },
      { text: "Why do you want to join the Technical domain?", sub: null },
    ],
  },
  MANAGEMENT: {
    subsections: ["Events", "Operations"],
    questions: [
      { text: "Describe an event or activity you organised.", sub: 0 },
      { text: "How would you split work in a team of ten?", sub: 1 },
      { text: "Why do you want to join the Management domain?", sub: null },
    ],
  },
  DESIGN: {
    subsections: ["UI/UX", "Graphic Design"],
    questions: [
      { text: "Share a design you are proud of and explain your process.", sub: 0 },
      { text: "Which tools do you use for graphic design?", sub: 1 },
      { text: "Why do you want to join the Design domain?", sub: null },
    ],
  },
  MARKETING: {
    subsections: ["Social Media", "Outreach"],
    questions: [
      { text: "Write a short post announcing a club event.", sub: 0 },
      { text: "How would you get 500 students to attend a workshop?", sub: 1 },
      { text: "Why do you want to join the Marketing domain?", sub: null },
    ],
  },
  R_AND_D: {
    subsections: ["Research", "Prototyping"],
    questions: [
      { text: "Describe a topic you researched on your own.", sub: 0 },
      { text: "How would you test whether a new idea works?", sub: 1 },
      { text: "Why do you want to join the R&D domain?", sub: null },
    ],
  },
  EDITORIAL: {
    subsections: ["Writing", "Editing"],
    questions: [
      { text: "Share a piece of writing you are proud of.", sub: 0 },
      { text: "How would you improve a weak first draft?", sub: 1 },
      { text: "Why do you want to join the Editorial domain?", sub: null },
    ],
  },
};

const istDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

async function main() {
  await prisma.recruitmentConfig.upsert({
    where: { key: "main" },
    update: {},
    create: {
      key: "main",
      isOpen: true,
      formDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  if ((await prisma.question.count()) > 0) {
    console.log("Questions already exist, skipping seed.");
    return;
  }

  // placeholder interviewer so the sample slots have an owner
  const admin = await prisma.admin.upsert({
    where: { email: "seed.admin@example.com" },
    update: {},
    create: { email: "seed.admin@example.com", name: "Seed Admin", role: "ROOT_ADMIN" },
  });

  for (const domain of Object.values(DomainType)) {
    const d = DATA[domain];

    const subs = [];
    for (const [i, name] of d.subsections.entries()) {
      subs.push(await prisma.subsection.create({ data: { domain, name, order: i } }));
    }

    for (const [i, q] of d.questions.entries()) {
      await prisma.question.create({
        data: {
          domain,
          subsectionId: q.sub === null ? null : subs[q.sub].id,
          text: q.text,
          order: i,
        },
      });
    }

    // hourly slots, 10:00 to 16:00 IST, for the next 5 days
    const slots = [];
    for (let day = 1; day <= 5; day++) {
      const date = istDate(new Date(Date.now() + day * 24 * 60 * 60 * 1000));
      for (let hour = 10; hour < 16; hour++) {
        const a = String(hour).padStart(2, "0");
        const b = String(hour + 1).padStart(2, "0");
        slots.push({
          domain,
          startTime: new Date(`${date}T${a}:00:00+05:30`),
          endTime: new Date(`${date}T${b}:00:00+05:30`),
          capacity: 2,
          interviewerId: admin.id,
        });
      }
    }
    await prisma.slot.createMany({ data: slots });
  }
  console.log("Seeded.");
}

main().finally(() => prisma.$disconnect());