import { seedSeasonOne } from "../src/db/seed-season-one";

const rawStart = process.env.RLCA_SEASON_ONE_STARTS_AT;
if (!rawStart) {
  console.error("RLCA_SEASON_ONE_STARTS_AT is required as an ISO timestamp.");
  process.exit(1);
}

const result = await seedSeasonOne(new Date(rawStart));
console.log(
  `Season 1 ready: ${result.weeks} weeks, ${result.events} events, ${result.channels} Discord channels.`,
);
