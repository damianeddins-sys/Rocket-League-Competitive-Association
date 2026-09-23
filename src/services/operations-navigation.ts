export const OPERATIONS_SECTION_GROUPS = [
  { label: "Overview", keys: ["overview"] },
  { label: "Competition", keys: ["seasons", "schedule", "matches", "brackets", "standings", "statistics", "replays"] },
  { label: "People", keys: ["applications", "players", "teams", "rosters", "transactions"] },
  { label: "Player Management", keys: ["mmr", "tiers", "player-history"] },
  { label: "League Operations", keys: ["franchise", "documents", "league-logs", "audit"] },
  { label: "Content", keys: ["content", "media", "rules", "site-info"] },
  { label: "System", keys: ["permissions", "health", "storage", "bot", "settings"] },
] as const;

export const OPERATIONS_QUICK_ACTIONS = [
  ["Create Season", "seasons", "Create and review the next isolated competition season."],
  ["Add Franchise", "franchise", "Create and manage an official franchise record."],
  ["Add Team", "teams", "Create a team and assign it to the correct season and tier."],
  ["Add Player", "players", "Open canonical player and member management."],
  ["Review Applications", "applications", "Open the current application review queue."],
  ["Manage MMR", "mmr", "Inspect verification and rating history."],
  ["Create Match", "matches", "Schedule an official series and enter its result."],
  ["Build Bracket", "brackets", "Create and manage a Major event bracket."],
  ["Manage Schedule", "schedule", "Configure weeks, match nights, and league events."],
  ["Publish News", "content", "Publish an official league update."],
] as const;
