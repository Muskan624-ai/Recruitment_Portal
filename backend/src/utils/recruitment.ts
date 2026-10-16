import type { RecruitmentConfig, User } from "@prisma/client";
import { prisma } from "../prisma";
import { HttpError } from "../errors";
import { SLOT_ACCESS_STAGES } from "./stages";

export async function getConfig(): Promise<RecruitmentConfig> {
  const config = await prisma.recruitmentConfig.findUnique({ where: { key: "main" } });
  if (!config) throw new HttpError(503, "Recruitment is not configured yet", "NOT_CONFIGURED");
  return config;
}

export function formState(config: RecruitmentConfig, user: User) {
  const deadlinePassed = new Date() > config.formDeadline;
  const submitted = !!user.formSubmittedAt;
  return {
    submitted,
    deadlinePassed,
    editable: config.isOpen && !deadlinePassed && !submitted,
  };
}

export function assertFormEditable(config: RecruitmentConfig, user: User) {
  const s = formState(config, user);
  if (!config.isOpen) throw new HttpError(403, "Applications are closed", "FORM_CLOSED");
  if (s.deadlinePassed) throw new HttpError(403, "The deadline has passed", "DEADLINE_PASSED");
  if (s.submitted) throw new HttpError(409, "Form already submitted", "ALREADY_SUBMITTED");
}

export async function assertDomainsValid(ids: string[]) {
  const count = await prisma.domain.count({ where: { id: { in: ids }, isActive: true } });
  if (count !== ids.length) {
    throw new HttpError(400, "One or more domains are invalid", "INVALID_DOMAIN");
  }
}

// Role based access: only shortlisted candidates can use slot choosing
export function assertSlotAccess(user: User, domainId?: string) {
  if (!SLOT_ACCESS_STAGES.includes(user.stage)) {
    throw new HttpError(403, "Slot choosing opens after you are shortlisted", "NOT_SHORTLISTED");
  }
  if (domainId && !user.preferredDomainIds.includes(domainId)) {
    throw new HttpError(403, "This domain is not in your preferred domains", "DOMAIN_NOT_ALLOWED");
  }
}