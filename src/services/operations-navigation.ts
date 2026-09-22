export const OPERATIONS_SECTION_GROUPS = [
  { label: "Overview", keys: ["overview"] },
  { label: "People", keys: ["applications", "players", "staff"] },
  { label: "Teams", keys: ["teams", "transactions", "franchise"] },
  { label: "Competition", keys: ["seasons", "tiers", "matches", "standings", "statistics", "mmr", "production"] },
  { label: "Content", keys: ["news", "content", "media", "site-info", "rules", "documents"] },
  { label: "System", keys: ["permissions", "settings", "health", "storage", "bot", "audit"] },
] as const;

export const OPERATIONS_QUICK_ACTIONS = [
  ["Create Season", "seasons", "Create and review the next isolated competition season."],
  ["Review Applications", "applications", "Open the current application review queue."],
  ["Manage Players", "players", "Review official member and player records."],
  ["Manage Teams", "teams", "Manage franchises and season entries."],
  ["Manage Rosters", "transactions", "Review roster requests and audited decisions."],
  ["Manage MMR", "mmr", "Inspect verification and rating history."],
  ["Enter Results", "matches", "Schedule matches and verify official results."],
  ["View Standings", "standings", "Review published tier-isolated standings."],
  ["Manage News", "news", "Publish official league updates."],
  ["System Health", "health", "Review production service health."],
  ["View Audit Log", "audit", "Trace protected actions and record changes."],
] as const;
