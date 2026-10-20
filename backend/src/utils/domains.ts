import { DomainType } from "@prisma/client";

export const ALL_DOMAINS = Object.values(DomainType);

export const DOMAIN_LABELS: Record<DomainType, string> = {
  TECHNICAL: "Technical",
  MANAGEMENT: "Management",
  DESIGN: "Design",
  MARKETING: "Marketing",
  R_AND_D: "R&D",
  EDITORIAL: "Editorial",
};