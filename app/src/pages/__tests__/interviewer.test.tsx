import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  fetchInterviewers: vi.fn(async () => [
    {
      id: 'int-1',
      displayName: 'Alex',
      timezone: 'Europe/London',
      experienceYears: 6,
      languages: ['English'],
      specializations: ['React'],
      rating: 4.5
    },
    {
      id: 'int-2',
      displayName: 'Greta',
      timezone: 'Europe/Berlin',
      experienceYears: 8,
      languages: ['German', 'English'],
      specializations: ['Docker', 'Kubernetes'],
      rating: 4.7
    }
  ]),
  fetchInterviewerAvailability: vi.fn(async () => []),
  fetchInterviewerSessions: vi.fn(async () => []),
  fetchCandidateSummaries: vi.fn(async () => []),
  createInterviewerAvailabilitySlot: vi.fn(),
  deleteInterviewerAvailabilitySlot: vi.fn()
}));

import InterviewerDashboardPage from '../interviewer';
import { mockRouter } from '@/test/router-mock';
import { renderWithQueryClient } from '@/test/test-utils';

describe('InterviewerDashboardPage', () => {
  it('applies slot intent defaults to interviewer context', async () => {
    mockRouter.query = {
      language: '🇩🇪 German',
      tools: ['Docker'],
      onlyFree: 'true',
      tab: 'completed'
    };

    renderWithQueryClient(<InterviewerDashboardPage />);

    await waitFor(() =>
      expect(
        (screen.getByLabelText('Interviewer profile') as HTMLSelectElement).value
      ).toBe('int-2')
    );

    expect(screen.getByLabelText('Recurring slot')).toBeChecked();
    expect(
      (screen.getByLabelText('Show last') as HTMLSelectElement).value
    ).toBe('20');
  });
});
