export const PUBLIC_NAVIGATION_GROUPS = [
  {
    label: "League",
    href: "/league",
    items: [
      { label: "League Home", href: "/league", description: "Format, season, and competition overview" },
      { label: "Tiers", href: "/tiers", description: "The four competitive divisions" },
      { label: "Standings", href: "/standings", description: "Tier-isolated qualification tables" },
      { label: "Matches", href: "/matches", description: "Upcoming and completed series" },
    ],
  },
  {
    label: "Competition",
    href: "/teams",
    items: [
      { label: "Teams", href: "/teams", description: "Franchises and active rosters" },
      { label: "Players", href: "/players", description: "Search the official player directory" },
      { label: "Statistics", href: "/statistics", description: "Official performance and MMR rankings" },
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
      { label: "Rulebook", href: "/rules", description: "The official RLCA rulebook" },
      { label: "FAQ", href: "/league#faq", description: "Common competition and application questions" },
      { label: "Applications", href: "/applications", description: "Player, team, staff, and franchise paths" },
    ],
  },
] as const;

// Stable top-level route contract used by route validation and compact surfaces.
// The grouped navigation above provides the richer desktop/mobile information architecture.
export const PUBLIC_NAVIGATION = [
  { label: "Home", href: "/" },
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
  { label: "Apply", href: "/applications" },
  { label: "Sign In", href: "/login" },
] as const;

export const FEATURE_ROUTE_OWNERSHIP = {
  home: { route: "/", component: "Home" },
  tiers: { route: "/tiers", component: "TiersPage" },
  teams: { route: "/teams", component: "TeamsPage" },
  players: { route: "/players", component: "PlayersPage" },
  standings: { route: "/standings", component: "StandingsPage" },
  matches: { route: "/matches", component: "MatchesPage" },
  statistics: { route: "/statistics", component: "StatisticsPage" },
  news: { route: "/news", component: "NewsPage" },
  rulebook: { route: "/rules", component: "RulesPage" },
  applications: { route: "/applications", component: "ApplicationsPage" },
  playerDashboard: { route: "/dashboard", component: "DashboardPage" },
  playerTeam: { route: "/dashboard/team", component: "MyTeamPage" },
  playerStatistics: { route: "/dashboard/stats", component: "MyStatsPage" },
  coach: { route: "/coach", component: "CoachPage" },
  operations: { route: "/operations", component: "OperationsPage" },
  seasons: { route: "/operations/seasons", component: "SeasonManager" },
  mmr: { route: "/operations/mmr", component: "MmrManager" },
} as const;
