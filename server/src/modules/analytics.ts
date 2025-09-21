import { MatchStatus, Prisma } from '@prisma/client';

import type { InterviewAiInsightDto, PlatformStatsDto } from '../../../shared/src/types/analytics.js';
import { prisma } from './prisma.js';
import {
  getActiveSessionCount,
  getCompletedSessionCount
} from './realtime-sessions.js';

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function countStrings(values: Iterable<string>): Array<{ value: string; count: number }> {
  const map = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }

    map.set(normalized, (map.get(normalized) ?? 0) + 1);
  }

  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function generateInterviewAiInsights(matchId: string): Promise<InterviewAiInsightDto | null> {
  const match = await prisma.interviewMatch.findUnique({
    where: { id: matchId },
    include: {
      interviewer: true,
      summary: true,
      request: true
    }
  });

  if (!match || !match.request) {
    return null;
  }

  const highlights: string[] = [];
  const recommendations: string[] = [];
  const riskSignals: string[] = [];

  if (match.summary) {
    if (match.summary.strengths.length > 0) {
      highlights.push(`Key strengths: ${match.summary.strengths.join(', ')}`);
    }

    if (match.summary.improvements.length > 0) {
      recommendations.push(`Growth areas: ${match.summary.improvements.join(', ')}`);
    }

    const aiHighlights = toRecord(match.summary.aiHighlights) ?? {};
    const notable = aiHighlights.highlights;
    if (Array.isArray(notable) && notable.length > 0) {
      highlights.push(...notable.slice(0, 3).map((item) => String(item)));
    }

    const risks = aiHighlights.risks;
    if (Array.isArray(risks)) {
      riskSignals.push(...risks.slice(0, 3).map((item) => String(item)));
    }
  }

  const focusSummary = match.request.focusAreas.slice(0, 3).join(', ');
  if (focusSummary) {
    highlights.push(`Focus areas covered: ${focusSummary}`);
  }

  if (match.effectivenessScore < 60) {
    riskSignals.push('Effectiveness score below target threshold (60).');
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain current strengths and schedule a follow-up practice session.');
  }

  return {
    matchId: match.id,
    effectivenessScore: match.effectivenessScore,
    interviewerName: match.interviewer.displayName,
    candidateId: match.request.candidateId,
    sessionFormat: match.request.sessionFormat,
    highlights: Array.from(new Set(highlights)).slice(0, 5),
    recommendations: Array.from(new Set(recommendations)).slice(0, 5),
    riskSignals: Array.from(new Set(riskSignals)).slice(0, 5),
    summary: match.summary?.interviewerNotes
  };
}

export async function getPlatformStats(): Promise<PlatformStatsDto> {
  const [
    totalUsers,
    totalCandidates,
    totalInterviewers,
    totalMatches,
    completedMatches,
    matchEffectiveness,
    interviewerRating
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.candidateProfile.count(),
    prisma.interviewerProfile.count(),
    prisma.interviewMatch.count(),
    prisma.interviewMatch.count({ where: { status: MatchStatus.COMPLETED } }),
    prisma.interviewMatch.aggregate({ _avg: { effectivenessScore: true } }),
    prisma.interviewerProfile.aggregate({ _avg: { rating: true } })
  ]);

  const recentRequests = await prisma.matchRequest.findMany({
    select: { focusAreas: true },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const interviewerSpecializations = await prisma.interviewerProfile.findMany({
    select: { specializations: true },
    orderBy: { updatedAt: 'desc' },
    take: 200
  });

  const onboardingTools = await prisma.onboardingDraft.findMany({
    select: { expertiseTools: true },
    orderBy: { updatedAt: 'desc' },
    take: 200
  });

  const focusAreaCounts = countStrings(recentRequests.flatMap((request) => request.focusAreas));
  const specializationCounts = countStrings(
    interviewerSpecializations.flatMap((profile) => profile.specializations)
  );
  const toolCounts = countStrings(onboardingTools.flatMap((draft) => draft.expertiseTools));

  const topFocusAreas = focusAreaCounts.length > 0 ? focusAreaCounts : specializationCounts;

  const [activeRealtimeSessions, completedRealtimeSessions] = await Promise.all([
    getActiveSessionCount(),
    getCompletedSessionCount()
  ]);

  return {
    totalUsers,
    totalCandidates,
    totalInterviewers,
    totalMatches,
    activeSessions: activeRealtimeSessions,
    completedSessions: completedMatches + completedRealtimeSessions,
    averageEffectivenessScore: Number(matchEffectiveness._avg.effectivenessScore ?? 0),
    averageInterviewerRating: Number(interviewerRating._avg.rating ?? 0),
    topFocusAreas: topFocusAreas.map(({ value, count }) => ({ focusArea: value, count })),
    topTools: toolCounts.map(({ value, count }) => ({ tool: value, count }))
  };
}
