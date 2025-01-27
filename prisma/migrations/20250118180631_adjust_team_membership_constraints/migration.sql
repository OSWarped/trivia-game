/*
  Warnings:

  - A unique constraint covering the columns `[userId,teamId]` on the table `TeamMembership` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeamMembership_userId_key";

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_userId_teamId_key" ON "TeamMembership"("userId", "teamId");
