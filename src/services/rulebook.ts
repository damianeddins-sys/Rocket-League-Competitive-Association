export type RulebookSection = readonly [
  title: string,
  paragraphs: readonly string[],
];

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
      "Week 1: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
      "Week 2: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
      "Week 3: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
      "Week 4: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
    ],
  ],
  [
    "Major 1",
    [
      "All eight teams qualify. Seeding is determined using each team's record and points.",
      "The bracket awards 240 Qualification Points to the winner. Normal roster transactions close during this event unless a documented exception is approved.",
    ],
  ],
  [
    "Second regular-season stage — Weeks 7–9",
    [
      "Week 7: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
      "Week 8: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
      "Week 9: One hour of scrimmages, followed by two normal league matches. Each match is Best of 5.",
    ],
  ],
  [
    "Major 2",
    [
      "All eight teams qualify. Seeding is determined using each team's record and points.",
      "The bracket awards 240 Qualification Points to the winner. Normal roster transactions close during this event unless a documented exception is approved.",
    ],
  ],
  [
    "Last Chance Major",
    [
      "The lower six teams qualify. The top two teams do not participate. Seeding for the participating teams is determined using their record and points.",
      "The participating teams compete for half-value Major points.",
    ],
  ],
  [
    "Championship Major",
    [
      "All eight teams qualify.",
      "The #1 and #2 seeds are locked before the Last Chance Major. The teams ranked #1 and #2 immediately before the Last Chance Major retain those Championship Major seeds.",
      "Seeding for the remaining teams is determined using the applicable record and points rules.",
    ],
  ],
  [
    "Qualification Points",
    [
      "A regular-season win awards 5 points. An official staff-recorded tie awards 2.5 points to each franchise. Verified Major and Last Chance placement points join the same season total.",
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
