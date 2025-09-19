import { MATCHING_WEIGHTS, MINIMUM_CRITERIA_MATCHED } from '../constants/interview.js';

export interface MatchingInput {
  professionMatched: boolean;
  techStackOverlap: number; // value between 0 and 1 representing shared stack ratio
  languageMatched: boolean;
  levelMatched: boolean;
  timezoneMatched: boolean;
}

export interface MatchingScore {
  percentage: number;
  meetsThreshold: boolean;
}

export function calculateMatchingScore(input: MatchingInput): MatchingScore {
  const criteria = [
    input.professionMatched,
    input.techStackOverlap >= 0.2,
    input.languageMatched,
    input.levelMatched,
    input.timezoneMatched
  ];

  const matchedCount = criteria.filter(Boolean).length;

  const weightedScore =
    (input.professionMatched ? MATCHING_WEIGHTS.profession : 0) +
    input.techStackOverlap * MATCHING_WEIGHTS.techStack +
    (input.languageMatched ? MATCHING_WEIGHTS.language : 0) +
    (input.levelMatched ? MATCHING_WEIGHTS.level : 0) +
    (input.timezoneMatched ? MATCHING_WEIGHTS.timezone : 0);

  return {
    percentage: Math.round(weightedScore * 100),
    meetsThreshold: matchedCount >= MINIMUM_CRITERIA_MATCHED
  };
}
