-- CreateEnum
CREATE TYPE "RealtimeSessionStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionParticipantRole" AS ENUM ('HOST', 'INTERVIEWER', 'CANDIDATE', 'OBSERVER');

-- CreateTable
CREATE TABLE "RealtimeSession" (
    "id" TEXT NOT NULL,
    "matchId" TEXT,
    "hostId" TEXT NOT NULL,
    "status" "RealtimeSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastHeartbeat" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealtimeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RealtimeSessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "role" "SessionParticipantRole" NOT NULL DEFAULT 'OBSERVER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "connectionId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "RealtimeSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RealtimeSessionParticipant_sessionId_idx" ON "RealtimeSessionParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "RealtimeSessionParticipant_sessionId_userId_idx" ON "RealtimeSessionParticipant"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "RealtimeSessionParticipant" ADD CONSTRAINT "RealtimeSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RealtimeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
