-- DropIndex
DROP INDEX "Notification_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "InterviewMatch" ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "roomToken" TEXT;

-- AlterTable
ALTER TABLE "InterviewerAvailability" ADD COLUMN     "language" TEXT DEFAULT '🇺🇸 English';

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RealtimeSession" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
