// Les cinq étapes de « Notre méthode », communes aux variantes 05b, 05c et 05d.
export const METHOD = ["audit", "analyse", "proposition", "implantation", "maintenance"] as const;
export type MethodId = (typeof METHOD)[number];
export const METHOD_LABEL: Record<MethodId, string> = { audit: "audit", analyse: "analyse", proposition: "proposition", implantation: "implantation", maintenance: "maintenance" };
export const METHOD_BUTTONS = ["01 Audit", "02 Analyse", "03 Proposition", "04 Implantation", "05 Maintenance"] as const;
