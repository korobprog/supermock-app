export interface InterviewAiInsightDto {
  matchId: string;
  effectivenessScore: number;
  interviewerName: string;
  candidateId: string;
  sessionFormat: string;
  highlights: string[];
  recommendations: string[];
  riskSignals: string[];
  summary?: string;
}

export interface PlatformStatsDto {
  totalUsers: number;
  totalCandidates: number;
  totalInterviewers: number;
  totalMatches: number;
  activeSessions: number;
  completedSessions: number;
  averageEffectivenessScore: number;
  averageInterviewerRating: number;
  topFocusAreas: Array<{ focusArea: string; count: number }>;
  topTools: Array<{ tool: string; count: number }>;
}
