export const INTERVIEW_TYPES = [
  'TECHNICAL',
  'BEHAVIORAL',
  'SYSTEM_DESIGN',
  'CODING_CHALLENGE',
  'MOCK_INTERVIEW'
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const MATCHING_WEIGHTS = {
  profession: 0.4,
  techStack: 0.3,
  language: 0.15,
  level: 0.1,
  timezone: 0.05
} as const;

export const MINIMUM_CRITERIA_MATCHED = 3;
