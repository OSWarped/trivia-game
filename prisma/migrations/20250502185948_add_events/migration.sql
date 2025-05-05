/*
  Warnings:

  - You are about to drop the column `date` on the `Game` table. All the data in the column will be lost.
  - You are about to drop the column `hasFinal` on the `Season` table. All the data in the column will be lost.
  - You are about to drop the column `siteId` on the `Season` table. All the data in the column will be lost.
  - Added the required column `eventId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventId` to the `Season` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScheduleFreq" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Season" DROP CONSTRAINT "Season_siteId_fkey";

-- AlterTable
ALTER TABLE "Game" DROP COLUMN "date",
ADD COLUMN     "eventId" TEXT NOT NULL,
ADD COLUMN     "special" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tag" TEXT,
ALTER COLUMN "siteId" DROP NOT NULL,
ALTER COLUMN "seasonId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Season" DROP COLUMN "hasFinal",
DROP COLUMN "siteId",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "eventId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventSchedule" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "freq" "ScheduleFreq" NOT NULL,
    "dow" INTEGER,
    "nthDow" INTEGER,
    "dayOfMonth" INTEGER,
    "timeUTC" TEXT NOT NULL,

    CONSTRAINT "EventSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventSchedule_eventId_freq_dow_nthDow_dayOfMonth_timeUTC_key" ON "EventSchedule"("eventId", "freq", "dow", "nthDow", "dayOfMonth", "timeUTC");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventSchedule" ADD CONSTRAINT "EventSchedule_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
