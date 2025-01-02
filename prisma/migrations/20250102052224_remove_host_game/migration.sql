/*
  Warnings:

  - You are about to drop the `HostGame` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `hostId` to the `Game` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "HostGame" DROP CONSTRAINT "HostGame_gameId_fkey";

-- DropForeignKey
ALTER TABLE "HostGame" DROP CONSTRAINT "HostGame_hostId_fkey";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "hostId" TEXT NOT NULL;

-- DropTable
DROP TABLE "HostGame";
