-- Add seniority and department fields to Prospect
ALTER TABLE "Prospect" ADD COLUMN "seniority" TEXT;
ALTER TABLE "Prospect" ADD COLUMN "department" TEXT;

-- Indexes on Prospect for fast search
CREATE INDEX "Prospect_industry_idx" ON "Prospect"("industry");
CREATE INDEX "Prospect_jobTitle_idx" ON "Prospect"("jobTitle");
CREATE INDEX "Prospect_location_idx" ON "Prospect"("location");
CREATE INDEX "Prospect_seniority_idx" ON "Prospect"("seniority");
CREATE INDEX "Prospect_department_idx" ON "Prospect"("department");

-- Deduplicate GlobalLead by email (keep the oldest record per email)
-- so we can safely add a unique constraint.
DELETE FROM "GlobalLead"
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt" ASC) AS rn
    FROM "GlobalLead"
    WHERE email IS NOT NULL
  ) sub
  WHERE rn > 1
);

-- Add unique constraint on GlobalLead.email (partial — NULLs are still allowed)
CREATE UNIQUE INDEX "GlobalLead_email_key" ON "GlobalLead"("email") WHERE "email" IS NOT NULL;
