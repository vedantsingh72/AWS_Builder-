// Hard-coded T1-shape mock — build UI before api/ai are ready (T3 rule).
import type { StartupContext } from "@ai-office/shared-types";

export const mockStartupContext: StartupContext = {
  industry: "B2B SaaS",
  goal: "Launch an MVP in 8 weeks",
  constraints: ["budget $10k", "3 engineers"],
  priorities: ["speed"],
  stage: "MVP",
};
