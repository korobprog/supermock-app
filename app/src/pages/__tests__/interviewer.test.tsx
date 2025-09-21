import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  deleteInterviewerAvailabilitySlot: vi.fn(),
  joinRealtimeSession: vi.fn(async () => ({ id: 'participant-join' }))
}));

vi.mock('@/data/slots', () => ({
  fetchSlotDetails: vi.fn()
}));

import InterviewerDashboardPage from '../interviewer';
import { mockRouter } from '@/test/router-mock';
import { renderWithQueryClient } from '@/test/test-utils';
import { fetchSlotDetails } from '@/data/slots';
import { joinRealtimeSession } from '@/lib/api';

afterEach(() => {
  vi.mocked(fetchSlotDetails).mockReset();
  vi.mocked(joinRealtimeSession).mockClear();
});

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
      (screen.getByLabelText(/Show last/i) as HTMLSelectElement).value
    ).toBe('20');
  });

  it('renders join summary and posts join intent', async () => {
    vi.mocked(fetchSlotDetails).mockResolvedValue({
      id: 'slot-frontend-01',
      title: 'Frontend Senior Mock',
      status: 'upcoming',
      language: '🇺🇸 English',
      professionId: 'frontend-developer',
      start: '2024-07-24T15:00:00Z',
      end: '2024-07-24T16:00:00Z',
      sessionFormat: 'Mock interview',
      capacity: 2,
      participants: [
        {
          id: 'participant-anna',
          name: 'Anna Smith',
          role: 'interviewer',
          stack: ['React', 'TypeScript'],
          timezone: 'Europe/Moscow',
          avatarColor: 'bg-rose-500'
        }
      ],
      focusAreas: ['UI performance'],
      tools: ['React', 'Next.js'],
      hostName: 'Host Example',
      waitlistCount: 1
    });

    mockRouter.query = {
      slotId: 'slot-frontend-01',
      slotTitle: 'Frontend Senior Mock',
      slotStart: '2024-07-24T15:00:00Z',
      slotEnd: '2024-07-24T16:00:00Z',
      slotLanguage: '🇺🇸 English',
      slotTools: ['React'],
      slotFocus: ['UI performance'],
      slotHost: 'Host Example',
      slotInterviewerId: 'int-2'
    };

    renderWithQueryClient(<InterviewerDashboardPage />);

    await waitFor(() => expect(fetchSlotDetails).toHaveBeenCalledWith('slot-frontend-01'));

    expect(await screen.findByText('Frontend Senior Mock')).toBeInTheDocument();
    expect(screen.getByText('Host Example')).toBeInTheDocument();
    expect(screen.getByText('Anna Smith')).toBeInTheDocument();
    expect(
      (screen.getByLabelText('Interviewer profile') as HTMLSelectElement).value
    ).toBe('int-2');

    const joinButton = await screen.findByRole('button', { name: 'Join slot as interviewer' });
    await userEvent.click(joinButton);

    await waitFor(() => expect(joinRealtimeSession).toHaveBeenCalledTimes(1));
    expect(joinRealtimeSession).toHaveBeenCalledWith(
      'slot-frontend-01',
      expect.objectContaining({
        role: 'INTERVIEWER',
        metadata: expect.objectContaining({
          slotTitle: 'Frontend Senior Mock',
          interviewerId: 'int-2'
        })
      })
    );

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    const replaceArgs = mockRouter.replace.mock.calls[0][0] as { query?: Record<string, unknown> };
    expect(replaceArgs?.query?.slotId).toBeUndefined();
  });
});
