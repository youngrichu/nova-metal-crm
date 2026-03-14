ALTER TABLE "user" ALTER COLUMN "email_verified" SET DEFAULT true;--> statement-breakpoint
-- Backfills existing rows so pre-migration users (created by Better Auth with email_verified=false)
-- can log in without requiring email verification. NOTE: if any users were intentionally deactivated
-- via the admin panel before this migration runs, they will be reactivated. Review user accounts
-- after applying this migration and deactivate any that should remain inactive.
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;