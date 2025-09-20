import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  fetchMatchOverview: vi.fn(async () => ({
    queuedRequests: 0,
    scheduledMatches: 0,
    completedMatches: 0
  })),
  fetchCandidateSummaries: vi.fn(async () => [
    {
      id: 'cand-1',
      displayName: 'Alice',
      timezone: 'UTC',
      experienceYears: 5,
      preferredRoles: ['Frontend Developer'],
      preferredLanguages: ['English']
    }
  ]),
  fetchInterviewers: vi.fn(async () => [
    {
      id: 'int-1',
      displayName: 'Bob',
      timezone: 'Europe/Berlin',
      experienceYears: 10,
      languages: ['English', 'German'],
      specializations: ['React', 'TypeScript'],
      rating: 4.8
    }
  ]),
  fetchRecentSessions: vi.fn(async () => []),
  fetchInterviewerAvailability: vi.fn(async () => []),
  fetchInterviewerSessions: vi.fn(async () => []),
  createMatchRequest: vi.fn(),
  scheduleMatch: vi.fn(),
  completeMatch: vi.fn(),
  createInterviewerAvailabilitySlot: vi.fn(),
  deleteInterviewerAvailabilitySlot: vi.fn(),
  fetchMatchRequest: vi.fn(),
  fetchMatchPreviews: vi.fn(async () => ({ requestId: 'req-1', previews: [] }))
}));

import InterviewMatchingPage from '../interview';
import { mockRouter } from '@/test/router-mock';
import { renderWithQueryClient } from '@/test/test-utils';

describe('InterviewMatchingPage', () => {
  it('prefills form fields from slot intent query parameters', async () => {
    mockRouter.query = {
      language: '🇬🇧 English',
      profession: 'frontend-developer',
      tools: ['React', 'TypeScript'],
      onlyFree: 'true',
      onlyWithParticipants: 'false',
      tab: 'live',
      showUtc: 'true'
    };

    renderWithQueryClient(<InterviewMatchingPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('Target role')).toHaveValue('Frontend Developer')
    );

    expect(screen.getByLabelText('Focus areas (comma separated)')).toHaveValue('React, TypeScript');
    expect(screen.getByLabelText('Preferred languages')).toHaveValue('🇬🇧 English');
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue(
      expect.stringContaining('Нужны свободные места')
    );
    expect(screen.getByLabelText('Notes (optional)')).toHaveValue(
      expect.stringContaining('Исходный таб: live')
    );
  });
});
