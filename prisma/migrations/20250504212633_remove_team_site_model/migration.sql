/*
  Warnings:

  - You are about to drop the `TeamSite` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,pin]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `pin` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TeamSite" DROP CONSTRAINT "TeamSite_siteId_fkey";

-- DropForeignKey
ALTER TABLE "TeamSite" DROP CONSTRAINT "TeamSite_teamId_fkey";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "pin" TEXT NOT NULL;

-- DropTable
DROP TABLE "TeamSite";

-- CreateTable
CREATE TABLE "TeamEvent" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamName" TEXT NOT NULL,

    CONSTRAINT "TeamEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamEvent_eventId_teamId_key" ON "TeamEvent"("eventId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamEvent_eventId_teamName_key" ON "TeamEvent"("eventId", "teamName");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_pin_key" ON "Team"("name", "pin");

-- AddForeignKey
ALTER TABLE "TeamEvent" ADD CONSTRAINT "TeamEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEvent" ADD CONSTRAINT "TeamEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
