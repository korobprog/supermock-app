import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  fetchMatchPreviews: vi.fn(async () => ({ requestId: 'req-1', previews: [] })),
  fetchSlotDetails: vi.fn(),
  joinSlot: vi.fn()
}));

import InterviewMatchingPage from '../interview';
import { mockRouter } from '@/test/router-mock';
import { renderWithQueryClient } from '@/test/test-utils';
import * as api from '@/lib/api';

const fetchSlotDetailsMock = vi.mocked(api.fetchSlotDetails);
const joinSlotMock = vi.mocked(api.joinSlot);

beforeEach(() => {
  vi.clearAllMocks();
  mockRouter.query = {};
  fetchSlotDetailsMock.mockReset();
  joinSlotMock.mockReset();
  fetchSlotDetailsMock.mockResolvedValue({
    id: 'slot-default',
    interviewerId: 'int-1',
    start: new Date('2024-01-01T10:00:00Z').toISOString(),
    end: new Date('2024-01-01T11:00:00Z').toISOString(),
    isRecurring: false,
    createdAt: new Date('2023-12-31T10:00:00Z').toISOString(),
    participantCapacity: 2,
    participantCount: 0
  });
  joinSlotMock.mockResolvedValue({
    id: 'req-joined',
    candidateId: 'cand-1',
    targetRole: 'Frontend Developer',
    focusAreas: ['React'],
    preferredLanguages: ['English'],
    sessionFormat: 'CODING',
    status: 'PENDING',
    createdAt: '2024-05-30T12:00:00.000Z',
    updatedAt: '2024-05-30T12:00:00.000Z'
  } as any);
});

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
    const notesValue = (screen.getByLabelText('Notes (optional)') as HTMLTextAreaElement).value;
    expect(notesValue).toContain('Нужны свободные места');
    expect(notesValue).toContain('Исходный таб: live');
  });

  it('locks onto the candidate when a slot join intent is present', async () => {
    fetchSlotDetailsMock.mockResolvedValue({
      id: 'slot-1',
      interviewerId: 'int-1',
      start: '2024-06-01T09:00:00.000Z',
      end: '2024-06-01T10:00:00.000Z',
      isRecurring: false,
      createdAt: '2024-05-30T12:00:00.000Z',
      participantCapacity: 3,
      participantCount: 1,
      candidateId: 'cand-1',
      language: '🇬🇧 English',
      profession: 'frontend-developer'
    });

    mockRouter.query = {
      slotId: 'slot-1',
      candidateId: 'cand-1',
      slotStart: '2024-06-01T09:00:00.000Z',
      slotEnd: '2024-06-01T10:00:00.000Z',
      slotLanguage: '🇬🇧 English',
      slotProfession: 'frontend-developer'
    };

    renderWithQueryClient(<InterviewMatchingPage />);

    await waitFor(() => expect(fetchSlotDetailsMock).toHaveBeenCalledWith('slot-1'));

    expect(screen.getByText('Joining existing slot')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    const candidateSelect = screen.getByRole('combobox', { name: /candidate/i }) as HTMLSelectElement;
    expect(candidateSelect).toBeDisabled();
    expect(candidateSelect.value).toBe('');

    expect(screen.getByText(/Slot intent locks this field/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join slot' })).toBeInTheDocument();
  });

  it('joins slot with candidate payload', async () => {
    fetchSlotDetailsMock.mockResolvedValue({
      id: 'slot-1',
      interviewerId: 'int-1',
      start: '2024-06-01T09:00:00.000Z',
      end: '2024-06-01T10:00:00.000Z',
      isRecurring: false,
      createdAt: '2024-05-30T12:00:00.000Z',
      participantCapacity: 2,
      participantCount: 0
    });

    mockRouter.query = {
      slotId: 'slot-1',
      candidateId: 'cand-1'
    };

    renderWithQueryClient(<InterviewMatchingPage />);

    await waitFor(() =>
      expect(screen.getByLabelText('Target role')).toHaveValue('Frontend Developer')
    );

    const joinButton = await screen.findByRole('button', { name: 'Join slot' });
    fireEvent.click(joinButton);

    await waitFor(() =>
      expect(joinSlotMock).toHaveBeenCalledWith('slot-1', {
        role: 'CANDIDATE',
        candidateId: 'cand-1'
      })
    );
  });
});
