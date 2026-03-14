ALTER TABLE "user" ALTER COLUMN "email_verified" SET DEFAULT true;
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;