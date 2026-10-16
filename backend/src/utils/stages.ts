import { Stage } from "@prisma/client";

// Flowchart on the status page
export const STAGES = [
  { key: Stage.FORM_FILLING, label: "Form filling", order: 1 },
  { key: Stage.SHORTLISTED, label: "Shortlisted", order: 2 },
  { key: Stage.SLOT_CHOOSING, label: "Slot choosing", order: 3 },
  { key: Stage.INTERVIEW, label: "Interview", order: 4 },
  { key: Stage.SELECTED, label: "Selected", order: 5 },
] as const;

// Slot choosing is only open once the candidate is shortlisted
export const SLOT_ACCESS_STAGES: Stage[] = [Stage.SHORTLISTED, Stage.SLOT_CHOOSING, Stage.INTERVIEW];