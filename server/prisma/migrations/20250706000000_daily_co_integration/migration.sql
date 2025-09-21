-- Create room fields for Daily.co integration
ALTER TABLE "InterviewMatch" ADD COLUMN "roomId" TEXT;
ALTER TABLE "InterviewMatch" ADD COLUMN "roomToken" TEXT;
