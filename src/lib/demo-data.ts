export const teams = [
  { id: "nova", name: "Nova Circuit", short: "NVC", color: "#1677FF", wins: 12, losses: 4, games: "42–25", diff: 17, points: 355, major: 300, status: "LOCKED #1" },
  { id: "vanguard", name: "Vanguard", short: "VGD", color: "#6D5DFC", wins: 11, losses: 5, games: "39–27", diff: 12, points: 330, major: 260, status: "LOCKED #2" },
  { id: "kinetic", name: "Kinetic", short: "KIN", color: "#16A34A", wins: 10, losses: 6, games: "37–29", diff: 8, points: 290, major: 240, status: "LAST CHANCE" },
  { id: "apex", name: "Apex Union", short: "APX", color: "#F59E0B", wins: 9, losses: 7, games: "35–31", diff: 4, points: 255, major: 210, status: "LAST CHANCE" },
  { id: "orbit", name: "Orbit", short: "ORB", color: "#06B6D4", wins: 7, losses: 9, games: "32–34", diff: -2, points: 210, major: 175, status: "LAST CHANCE" },
  { id: "forge", name: "Forge", short: "FRG", color: "#DC2626", wins: 6, losses: 10, games: "29–37", diff: -8, points: 180, major: 150, status: "LAST CHANCE" },
  { id: "sentinel", name: "Sentinel", short: "SNT", color: "#64748B", wins: 5, losses: 11, games: "26–40", diff: -14, points: 145, major: 120, status: "LAST CHANCE" },
  { id: "velocity", name: "Velocity", short: "VEL", color: "#EC4899", wins: 4, losses: 12, games: "23–42", diff: -19, points: 115, major: 95, status: "LAST CHANCE" },
] as const;

export const upcomingMatches = [
  { id: "RLCA-S1-057", time: "8:00 PM", home: teams[0], away: teams[3] },
  { id: "RLCA-S1-058", time: "8:00 PM", home: teams[1], away: teams[2] },
  { id: "RLCA-S1-059", time: "After Series 1", home: teams[4], away: teams[7] },
  { id: "RLCA-S1-060", time: "After Series 1", home: teams[5], away: teams[6] },
];
