ALTER TABLE "divisions" ALTER COLUMN "code" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."division_code";--> statement-breakpoint
CREATE TYPE "public"."division_code" AS ENUM('CONTENDER', 'CHALLENGER', 'MASTER', 'PREMIER');--> statement-breakpoint
ALTER TABLE "divisions" ALTER COLUMN "code" SET DATA TYPE "public"."division_code" USING "code"::"public"."division_code";
--> statement-breakpoint
UPDATE "divisions"
SET
  "ordinal" = CASE "code"::text
    WHEN 'CONTENDER' THEN 1
    WHEN 'CHALLENGER' THEN 2
    WHEN 'MASTER' THEN 3
    WHEN 'PREMIER' THEN 4
  END,
  "color" = CASE "code"::text
    WHEN 'CONTENDER' THEN '#8A2BE2'
    WHEN 'CHALLENGER' THEN '#168BFF'
    WHEN 'MASTER' THEN '#FF2A2A'
    WHEN 'PREMIER' THEN '#FFC928'
  END,
  "icon_path" = '/branding/tiers/' || lower("code"::text) || '.png';