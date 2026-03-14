ALTER TABLE "user" ALTER COLUMN "email_verified" SET DEFAULT true;--> statement-breakpoint
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;