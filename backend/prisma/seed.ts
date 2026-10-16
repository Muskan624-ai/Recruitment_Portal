import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DOMAINS = [
  {
    name: "Web Development",
    slug: "web-dev",
    subsections: ["Frontend", "Backend"],
    questions: [
      { text: "Tell us about a web project you have built.", sub: 0 },
      { text: "How would you design a REST API for a library system?", sub: 1 },
      { text: "Why do you want to join this domain?", sub: null },
    ],
  },
  {
    name: "Design",
    slug: "design",
    subsections: ["UI/UX", "Graphic Design"],
    questions: [
      { text: "Share a design you are proud of and explain your process.", sub: 0 },
      { text: "Which tools do you use for graphic design?", sub: 1 },
      { text: "Why do you want to join this domain?", sub: null },
    ],
  },
  {
    name: "Content",
    slug: "content",
    subsections: ["Writing", "Social Media"],
    questions: [
      { text: "Share a piece of writing you are proud of.", sub: 0 },
      { text: "Write a short post announcing a club event.", sub: 1 },
      { text: "Why do you want to join this domain?", sub: null },
    ],
  },
];

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

  if ((await prisma.domain.count()) > 0) {
    console.log("Domains already exist, skipping seed.");
    return;
  }

  for (const d of DOMAINS) {
    const domain = await prisma.domain.create({ data: { name: d.name, slug: d.slug } });

    const subs = [];
    for (const [i, name] of d.subsections.entries()) {
      subs.push(await prisma.subsection.create({ data: { name, order: i, domainId: domain.id } }));
    }

    for (const [i, q] of d.questions.entries()) {
      await prisma.question.create({
        data: {
          domainId: domain.id,
          subsectionId: q.sub === null ? null : subs[q.sub].id,
          text: q.text,
          order: i,
        },
      });
    }

    // hourly slots, 10:00 to 16:00 IST, for the next 5 days
    for (const sub of subs) {
      for (let day = 1; day <= 5; day++) {
        const date = istDate(new Date(Date.now() + day * 24 * 60 * 60 * 1000));
        for (let hour = 10; hour < 16; hour++) {
          const a = String(hour).padStart(2, "0");
          const b = String(hour + 1).padStart(2, "0");
          await prisma.slot.create({    
            data: {
              domainId: domain.id,
              subsectionId: sub.id,
              startTime: new Date(`${date}T${a}:00:00+05:30`),
              endTime: new Date(`${date}T${b}:00:00+05:30`),
              capacity: 2,
            },
          });
        }
      }
    }
  }
  console.log("Seeded.");
}

main().finally(() => prisma.$disconnect());