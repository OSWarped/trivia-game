-- AlterTable
CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE "User" ALTER COLUMN "email" SET DATA TYPE CITEXT;
