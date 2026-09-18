import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database operations");
  }

  client ??= postgres(connectionString, {
    max: 1,
    prepare: false,
  });

  return drizzle(client, { schema });
}
