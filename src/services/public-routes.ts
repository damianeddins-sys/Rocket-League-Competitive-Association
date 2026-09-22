export const PUBLIC_NAVIGATION_GROUPS = [
  {
    label: "League",
    href: "/league",
    items: [
      { label: "League Home", href: "/league", description: "Format, season, and competition overview" },
      { label: "Tiers", href: "/tiers", description: "The four competitive divisions" },
      { label: "Standings", href: "/standings", description: "Tier-isolated qualification tables" },
      { label: "Matches", href: "/matches", description: "Upcoming and completed series" },
      { label: "Statistics", href: "/statistics", description: "Official player and team metrics" },
    ],
  },
  {
    label: "Competition",
    href: "/teams",
    items: [
      { label: "Teams", href: "/teams", description: "Franchises and active rosters" },
      { label: "Players", href: "/players", description: "Search the official player directory" },
      { label: "Rankings", href: "/rankings", description: "MMR and competitive rankings" },
      { label: "Match Center", href: "/matches", description: "Schedules, live status, and results" },
    ],
  },
  {
    label: "Media",
    href: "/news",
    items: [
      { label: "News", href: "/news", description: "League stories and announcements" },
      { label: "Events", href: "/events", description: "Broadcasts and featured competition" },
    ],
  },
  {
    label: "Resources",
    href: "/rules",
    items: [
      { label: "Rules", href: "/rules", description: "The official RLCA rulebook" },
      { label: "League Format", href: "/league", description: "Season structure and qualification" },
      { label: "FAQ", href: "/league#faq", description: "Common competition and application questions" },
      { label: "Applications", href: "/applications", description: "Player, team, staff, and franchise paths" },
    ],
  },
] as const;

// Stable top-level route contract used by route validation and compact surfaces.
// The grouped navigation above provides the richer desktop/mobile information architecture.
export const PUBLIC_NAVIGATION = [
  { label: "League", href: "/league" },
  { label: "Tiers", href: "/tiers" },
  { label: "Teams", href: "/teams" },
  { label: "Players", href: "/players" },
  { label: "Standings", href: "/standings" },
  { label: "Matches", href: "/matches" },
  { label: "Statistics", href: "/statistics" },
  { label: "News", href: "/news" },
  { label: "Rules", href: "/rules" },
] as const;

export const PUBLIC_ACTIONS = [
  { label: "Apply", href: "/apply" },
  { label: "Profile", href: "/profile" },
] as const;
