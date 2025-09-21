-- CreateEnum
CREATE TYPE "SlotParticipantRole" AS ENUM ('CANDIDATE', 'INTERVIEWER', 'OBSERVER');

-- AlterTable
ALTER TABLE "InterviewerAvailability" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "hostId" TEXT,
ADD COLUMN     "hostName" TEXT;

-- CreateTable
CREATE TABLE "SlotParticipant" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "role" "SlotParticipantRole" NOT NULL,
    "candidateId" TEXT,
    "interviewerId" TEXT,
    "waitlistPosition" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlotParticipant_slotId_waitlistPosition_idx" ON "SlotParticipant"("slotId", "waitlistPosition");

-- CreateIndex
CREATE UNIQUE INDEX "SlotParticipant_slotId_candidateId_key" ON "SlotParticipant"("slotId", "candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "SlotParticipant_slotId_interviewerId_key" ON "SlotParticipant"("slotId", "interviewerId");

-- AddForeignKey
ALTER TABLE "InterviewerAvailability" ADD CONSTRAINT "InterviewerAvailability_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "InterviewerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotParticipant" ADD CONSTRAINT "SlotParticipant_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "InterviewerAvailability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotParticipant" ADD CONSTRAINT "SlotParticipant_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotParticipant" ADD CONSTRAINT "SlotParticipant_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "InterviewerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

