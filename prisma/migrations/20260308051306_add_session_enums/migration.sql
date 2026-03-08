-- CreateEnum
CREATE TYPE "TeamGameSessionControlMode" AS ENUM ('NORMAL', 'HOST_APPROVAL', 'LOCKED');

-- AlterTable
ALTER TABLE "TeamGame" ADD COLUMN     "sessionControlMode" "TeamGameSessionControlMode" NOT NULL DEFAULT 'NORMAL';
