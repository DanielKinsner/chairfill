import type { Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  strategy: "batch",
  batchSize: 3,
  offerWindowMin: 10,
  ruleOrder: ["procedure", "urgency", "window", "waiting"],
  moveUpsFirst: true,
  allowFits: true,
  cooldownHours: 24,
  dailyCap: 2,
  quietHours: { enabled: true, start: "20:00", end: "08:00" },
  minLeadMinutes: 60,
  demoPace: 2,
};
