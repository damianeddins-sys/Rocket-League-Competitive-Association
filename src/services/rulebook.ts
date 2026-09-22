export type RulebookSection = readonly [
  title: string,
  paragraphs: readonly string[],
];

export const RULEBOOK_TITLE = "RLCA Season 1 Rule Book";
export const RULEBOOK_VERSION = "Season 1 | Version 5.4";

export const SEASON_ONE_TIMELINE = [
  { label: "Week 1", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Week 2", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Week 3", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Week 4", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Major 1", detail: "All 8 Teams", format: "BO7" },
  { label: "Week 7", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Week 8", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Week 9", detail: "Regular Season", format: "1 Hour Scrimmage Window + 2 Official BO5 Matches" },
  { label: "Major 2", detail: "All 8 Teams", format: "BO7" },
  { label: "Last Chance Major", detail: "Lower 6 Teams", format: "BO7" },
  { label: "Championship Major", detail: "All 8 Teams", format: "BO7" },
] as const;

export const RULEBOOK_SECTIONS: readonly RulebookSection[] = [
  [
    "Roster construction",
    [
      "Each franchise fields a separate three-player roster in Contender, Challenger, Master, and Premier. Every rostered player must match that season entry's tier. Two players start each game; substitutions happen only between games.",
    ],
  ],
  [
    "Regular season — Weeks 1–4",
    [
      "Week 1: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
      "Week 2: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
      "Week 3: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
      "Week 4: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
    ],
  ],
  [
    "Major 1",
    [
      "All eight teams qualify. Seeding uses the applicable record and Qualification Points from the first regular-season stage.",
      "Every match in Major 1 is Best of 7.",
      "The bracket awards 240 Qualification Points to the winner. Normal roster transactions close during this event unless a documented exception is approved.",
    ],
  ],
  [
    "Second regular-season stage — Weeks 7–9",
    [
      "Week 7: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
      "Week 8: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
      "Week 9: One hour of scrimmages, followed by two normal official matches. Each official match is Best of 5.",
    ],
  ],
  [
    "Major 2",
    [
      "All eight teams qualify. Seeding uses the applicable record and Qualification Points from the regular-season stage.",
      "Every match in Major 2 is Best of 7.",
      "The bracket awards 240 Qualification Points to the winner. Normal roster transactions close during this event unless a documented exception is approved.",
    ],
  ],
  [
    "Last Chance Major",
    [
      "The lower six teams qualify. The top two teams do not participate in the Last Chance Major. Teams are seeded using the applicable record and Qualification Points.",
      "Every match in the Last Chance Major is Best of 7.",
      "The participating teams compete for half-value Major points.",
    ],
  ],
  [
    "Championship Major",
    [
      "All eight teams qualify.",
      "The #1 and #2 seeds are locked before the Last Chance Major. The teams that were #1 and #2 immediately before the Last Chance Major keep those Championship seeds.",
      "The remaining Championship teams are seeded using the applicable record and Qualification Points.",
      "Every match in the Championship Major is Best of 7.",
    ],
  ],
  [
    "Match formats",
    [
      "Every regular-season official match is Best of 5.",
      "Every Major 1, Major 2, Last Chance Major, and Championship Major match is Best of 7.",
    ],
  ],
  [
    "Scrimmage window",
    [
      "Weeks 1–4 and Weeks 7–9 each include a one-hour scrimmage window plus two official Best-of-5 matches.",
      "Scrimmages are separate from the two official matches and are not counted as official matches.",
    ],
  ],
  [
    "Qualification Points",
    [
      "A regular-season win awards 5 points. An official staff-recorded tie awards 2.5 points to each franchise. Verified Major and Last Chance placement points join the same season total.",
      "Regular-season record and Qualification Points determine seeding where applicable.",
    ],
  ],
  [
    "Player eligibility",
    [
      "A player must participate in at least one game in two official regular-season series before entering a Major, Last Chance Major, or Championship Major, unless an audited staff exception is approved.",
    ],
  ],
  [
    "Waivers and free agency",
    [
      "A released player completes a full 168-hour waiver period based on server time before unrestricted movement, unless a rules-authorized and audited exception applies.",
    ],
  ],
  [
    "Official records",
    [
      "Only verified match reports, approved transactions, and server-side league decisions alter standings, rosters, eligibility, or qualification. Discord and the website use the same backend record.",
    ],
  ],
  [
    "Conduct and integrity",
    [
      "Impersonation, alternate-account concealment, replay manipulation, bypassing holds, or attempting unauthorized staff actions may result in restriction, suspension, or removal.",
    ],
  ],
] as const;
