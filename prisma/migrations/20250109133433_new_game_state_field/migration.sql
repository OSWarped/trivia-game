-- AlterTable
ALTER TABLE "GameState" ADD COLUMN     "adEmbedCode" TEXT,
ADD COLUMN     "isTransitioning" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transitionMedia" TEXT,
ADD COLUMN     "transitionMessage" TEXT;
