/*
  Warnings:

  - Added the required column `pointsUsed` to the `Answer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "pointsUsed" INTEGER NOT NULL;
