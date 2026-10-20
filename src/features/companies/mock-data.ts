import type { Company } from "@/features/companies/types";

export const companies = [
  { id: "operia-central", legalName: "Operia Central S.R.L.", name: "Operia Central" },
  { id: "operia-hogar", legalName: "Operia Hogar S.A.", name: "Operia Hogar" },
] as const satisfies readonly Company[];
