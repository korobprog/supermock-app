-- AlterTable
ALTER TABLE "InterviewMatch" ADD COLUMN     "roomId" TEXT,
ADD COLUMN     "roomToken" TEXT;

-- AlterTable
ALTER TABLE "InterviewerAvailability" ADD COLUMN     "language" TEXT DEFAULT '🇺🇸 English';
