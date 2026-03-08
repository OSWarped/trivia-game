-- AlterTable
ALTER TABLE "TeamGame" ADD COLUMN     "pendingApprovalDeviceId" TEXT,
ADD COLUMN     "pendingApprovalRequestedAt" TIMESTAMP(3);
