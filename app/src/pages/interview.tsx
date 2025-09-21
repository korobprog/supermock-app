import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  completeMatch,
  createInterviewerAvailabilitySlot,
  createMatchRequest,
  deleteInterviewerAvailabilitySlot,
  fetchCandidateSummaries,
  fetchInterviewerAvailability,
  fetchInterviewers,
  fetchMatchOverview,
  fetchMatchPreviews,
  fetchMatchRequest,
  fetchSlotDetails,
  fetchRecentSessions,
  joinSlot,
  scheduleMatch
} from '@/lib/api';
import type {
  CandidateSummaryDto,
  InterviewerSummaryDto,
  CreateMatchRequestPayload,
  MatchPreviewDto,
  MatchRequestWithResultDto,
  CompletedSessionDto
} from '../../../shared/src/types/matching.js';
import { PROFESSION_OPTIONS } from '@/data/professions';

const SESSION_FORMAT_OPTIONS: { value: CreateMatchRequestPayload['sessionFormat']; label: string }[] = [
  { value: 'CODING', label: 'Coding interview' },
  { value: 'SYSTEM_DESIGN', label: 'System design' },
  { value: 'BEHAVIORAL', label: 'Behavioral' },
  { value: 'MIXED', label: 'Mixed format' }
];

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

const PROFESSION_TITLES = new Map(PROFESSION_OPTIONS.map((option) => [option.id, option.title]));

export default function InterviewMatchingPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    language: intentLanguage,
    profession: intentProfession,
    tools: intentTools,
    onlyFree: intentOnlyFree,
    onlyWithParticipants: intentOnlyWithParticipants,
    tab: intentTab,
    candidateId: intentCandidateId,
    slotId: intentSlotId,
    slotStart: intentSlotStart,
    slotEnd: intentSlotEnd,
    slotLanguage: intentSlotLanguage,
    slotProfession: intentSlotProfession
  } = router.query;
  const isSlotJoinIntent = typeof intentSlotId === 'string';
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [targetRole, setTargetRole] = useState('');
  const [focusAreasInput, setFocusAreasInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [sessionFormat, setSessionFormat] = useState<CreateMatchRequestPayload['sessionFormat']>('CODING');
  const [notes, setNotes] = useState('');
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [availabilityStart, setAvailabilityStart] = useState('');
  const [availabilityEnd, setAvailabilityEnd] = useState('');
  const [availabilityRecurring, setAvailabilityRecurring] = useState(false);
  const [effectivenessScore, setEffectivenessScore] = useState(85);
  const [interviewerNotes, setInterviewerNotes] = useState('');
  const [candidateNotes, setCandidateNotes] = useState('');
  const [strengthsInput, setStrengthsInput] = useState('');
  const [improvementsInput, setImprovementsInput] = useState('');
  const [rating, setRating] = useState(4);
  const [slotIntentApplied, setSlotIntentApplied] = useState(false);
  const slotLanguageFromIntent =
    typeof intentSlotLanguage === 'string'
      ? intentSlotLanguage
      : typeof intentLanguage === 'string'
        ? intentLanguage
        : undefined;
  const slotProfessionFromIntent =
    typeof intentSlotProfession === 'string'
      ? intentSlotProfession
      : typeof intentProfession === 'string'
        ? intentProfession
        : undefined;
  const slotStartFromIntent = typeof intentSlotStart === 'string' ? intentSlotStart : undefined;
  const slotEndFromIntent = typeof intentSlotEnd === 'string' ? intentSlotEnd : undefined;

  const overviewQuery = useQuery({ queryKey: ['matching', 'overview'], queryFn: fetchMatchOverview });
  const candidatesQuery = useQuery({ queryKey: ['matching', 'candidates'], queryFn: fetchCandidateSummaries });
  const interviewersQuery = useQuery({ queryKey: ['matching', 'interviewers'], queryFn: fetchInterviewers });
  const recentSessionsQuery = useQuery<CompletedSessionDto[]>({
    queryKey: ['matching', 'recent-sessions'],
    queryFn: () => fetchRecentSessions(5)
  });

  const slotDetailsQuery = useQuery({
    queryKey: ['matching', 'slot', intentSlotId],
    queryFn: () => fetchSlotDetails(intentSlotId as string),
    enabled: router.isReady && isSlotJoinIntent
  });
  const slotCandidateId = slotDetailsQuery.data?.candidateId ?? null;
  const lockedCandidateId = useMemo(() => {
    if (!isSlotJoinIntent) {
      return null;
    }

    if (typeof intentCandidateId === 'string') {
      return intentCandidateId;
    }

    return slotCandidateId ?? null;
  }, [intentCandidateId, isSlotJoinIntent, slotCandidateId]);
  const lockedCandidate = useMemo(() => {
    if (!lockedCandidateId) {
      return undefined;
    }

    return candidatesQuery.data?.find((candidate) => candidate.id === lockedCandidateId);
  }, [candidatesQuery.data, lockedCandidateId]);
  const slotStartIso = slotDetailsQuery.data?.start ?? slotStartFromIntent;
  const slotEndIso = slotDetailsQuery.data?.end ?? slotEndFromIntent;
  const slotLanguage = slotDetailsQuery.data?.language ?? slotLanguageFromIntent;
  const slotProfession = slotDetailsQuery.data?.profession ?? slotProfessionFromIntent;
  const slotProfessionTitle = slotProfession
    ? PROFESSION_TITLES.get(slotProfession) ?? slotProfession
    : undefined;
  const slotCapacityTotal = slotDetailsQuery.data?.participantCapacity;
  const slotCapacityUsed = slotDetailsQuery.data?.participantCount ?? 0;
  const slotStartDate = slotStartIso ? new Date(slotStartIso) : null;
  const slotEndDate = slotEndIso ? new Date(slotEndIso) : null;
  const formattedSlotStart =
    slotStartDate && !Number.isNaN(slotStartDate.getTime())
      ? slotStartDate.toLocaleString()
      : '—';
  const formattedSlotEnd =
    slotEndDate && !Number.isNaN(slotEndDate.getTime())
      ? slotEndDate.toLocaleString()
      : '—';
  const slotCapacityDisplay = slotDetailsQuery.isLoading
    ? 'Loading…'
    : slotDetailsQuery.isError
      ? 'Unknown'
      : slotCapacityTotal !== undefined
        ? `${slotCapacityUsed} / ${slotCapacityTotal} participants`
        : '—';
  const slotDetailsErrorMessage =
    slotDetailsQuery.isError && slotDetailsQuery.error instanceof Error
      ? slotDetailsQuery.error.message
      : slotDetailsQuery.isError
        ? 'Failed to load slot details.'
        : null;
  const lockedCandidateLabel = lockedCandidate?.displayName ?? lockedCandidateId ?? null;

  useEffect(() => {
    if (!candidatesQuery.data?.length) {
      return;
    }

    const candidateFromIntent = lockedCandidateId
      ? candidatesQuery.data.find((candidate) => candidate.id === lockedCandidateId)
      : undefined;
    const fallbackCandidate = candidatesQuery.data[0];
    const candidateForDefaults = candidateFromIntent ?? fallbackCandidate;

    if (!selectedCandidateId && candidateForDefaults) {
      setSelectedCandidateId(candidateForDefaults.id);
    }

    if (candidateForDefaults) {
      if (!targetRole) {
        setTargetRole(candidateForDefaults.preferredRoles[0] ?? '');
      }
      if (!focusAreasInput) {
        setFocusAreasInput(candidateForDefaults.preferredRoles.join(', '));
      }
      if (!languagesInput) {
        setLanguagesInput(candidateForDefaults.preferredLanguages.join(', '));
      }
    }
  }, [
    candidatesQuery.data,
    focusAreasInput,
    languagesInput,
    lockedCandidateId,
    selectedCandidateId,
    targetRole
  ]);

  useEffect(() => {
    if (!lockedCandidateId) {
      return;
    }

    if (selectedCandidateId !== lockedCandidateId) {
      setSelectedCandidateId(lockedCandidateId);
    }
  }, [lockedCandidateId, selectedCandidateId]);

  useEffect(() => {
    if (!selectedInterviewerId && interviewersQuery.data?.length) {
      setSelectedInterviewerId(interviewersQuery.data[0].id);
    }
  }, [interviewersQuery.data, selectedInterviewerId]);

  useEffect(() => {
    if (!router.isReady || slotIntentApplied) {
      return;
    }

    if (slotProfessionFromIntent && !targetRole) {
      const professionTitle = PROFESSION_TITLES.get(slotProfessionFromIntent) ?? slotProfessionFromIntent;
      setTargetRole(professionTitle);
    }

    const toolValues = toArray(intentTools);
    if (toolValues.length > 0 && !focusAreasInput) {
      setFocusAreasInput(toolValues.join(', '));
    }

    if (slotLanguageFromIntent && !languagesInput) {
      setLanguagesInput(slotLanguageFromIntent);
    }

    if (!notes) {
      const notesParts: string[] = [];
      if (intentOnlyFree === 'true') {
        notesParts.push('Нужны свободные места');
      }
      if (intentOnlyWithParticipants === 'true') {
        notesParts.push('Важно наличие других участников');
      }
      if (typeof intentTab === 'string') {
        notesParts.push(`Исходный таб: ${intentTab}`);
      }

      if (notesParts.length > 0) {
        setNotes(notesParts.join('. '));
      }
    }

    setSlotIntentApplied(true);
  }, [
    focusAreasInput,
    slotLanguageFromIntent,
    intentOnlyFree,
    intentOnlyWithParticipants,
    slotProfessionFromIntent,
    intentTab,
    intentTools,
    languagesInput,
    notes,
    router.isReady,
    slotIntentApplied,
    targetRole
  ]);

  const createRequestMutation = useMutation({
    mutationFn: (payload: CreateMatchRequestPayload) => createMatchRequest(payload),
    onSuccess: (request) => {
      setActiveRequestId(request.id);
      queryClient.invalidateQueries({ queryKey: ['matching', 'overview'] });
    }
  });

  const joinSlotMutation = useMutation({
    mutationFn: (payload: CreateMatchRequestPayload) => {
      if (!isSlotJoinIntent || typeof intentSlotId !== 'string') {
        return Promise.reject(new Error('Slot intent is missing'));
      }

      return joinSlot(intentSlotId, payload);
    },
    onSuccess: (request) => {
      if (!request) {
        return;
      }

      setActiveRequestId(request.id);
      queryClient.setQueryData(['matching', 'request', request.id], request);
      queryClient.invalidateQueries({ queryKey: ['matching', 'overview'] });
      if (typeof intentSlotId === 'string') {
        queryClient.invalidateQueries({ queryKey: ['matching', 'slot', intentSlotId] });
      }
    }
  });

  const matchRequestQuery = useQuery<MatchRequestWithResultDto | null>({
    queryKey: ['matching', 'request', activeRequestId],
    queryFn: () => fetchMatchRequest(activeRequestId!).catch(() => null),
    enabled: Boolean(activeRequestId)
  });

  const matchPreviewsQuery = useQuery<MatchPreviewDto[]>({
    queryKey: ['matching', 'previews', activeRequestId],
    queryFn: () => fetchMatchPreviews(activeRequestId!).then((response) => response.previews),
    enabled: Boolean(activeRequestId)
  });

  const availabilityQuery = useQuery({
    queryKey: ['matching', 'availability', selectedInterviewerId],
    queryFn: () => fetchInterviewerAvailability(selectedInterviewerId!),
    enabled: Boolean(selectedInterviewerId)
  });

  const scheduleMatchMutation = useMutation({
    mutationFn: (availabilityId: string) =>
      scheduleMatch(activeRequestId!, {
        availabilityId
      }),
    onSuccess: (updatedRequest) => {
      queryClient.setQueryData(['matching', 'request', activeRequestId], updatedRequest);
      queryClient.invalidateQueries({ queryKey: ['matching', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['matching', 'previews', activeRequestId] });
      queryClient.invalidateQueries({ queryKey: ['matching', 'availability', selectedInterviewerId] });
    }
  });

  const createAvailabilityMutation = useMutation({
    mutationFn: () => {
      if (!selectedInterviewerId) return Promise.reject(new Error('Select interviewer first'));
      if (!availabilityStart || !availabilityEnd) {
        return Promise.reject(new Error('Specify start and end time'));
      }

      const startISO = new Date(availabilityStart).toISOString();
      const endISO = new Date(availabilityEnd).toISOString();

      if (new Date(endISO) <= new Date(startISO)) {
        return Promise.reject(new Error('End time must be after start time'));
      }

      return createInterviewerAvailabilitySlot(selectedInterviewerId, {
        start: startISO,
        end: endISO,
        isRecurring: availabilityRecurring
      });
    },
    onSuccess: () => {
      setAvailabilityStart('');
      setAvailabilityEnd('');
      setAvailabilityRecurring(false);
      queryClient.invalidateQueries({ queryKey: ['matching', 'availability', selectedInterviewerId] });
    }
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: (slotId: string) => deleteInterviewerAvailabilitySlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matching', 'availability', selectedInterviewerId] });
    }
  });

  const completeMatchMutation = useMutation({
    mutationFn: async () => {
      const matchId = matchRequestQuery.data?.result?.id;

      if (!activeRequestId || !matchId) {
        throw new Error('No scheduled match to complete');
      }

      if (!interviewerNotes.trim()) {
        throw new Error('Add interviewer notes before completing the match');
      }

      return completeMatch(matchId, {
        effectivenessScore,
        interviewerNotes: interviewerNotes.trim(),
        candidateNotes: candidateNotes.trim() || undefined,
        strengths: parseList(strengthsInput),
        improvements: parseList(improvementsInput),
        rating
      });
    },
    onSuccess: (updatedRequest) => {
      if (!updatedRequest) {
        return;
      }

      setEffectivenessScore(85);
      setInterviewerNotes('');
      setCandidateNotes('');
      setStrengthsInput('');
      setImprovementsInput('');
      setRating(4);

      queryClient.setQueryData(['matching', 'request', activeRequestId], updatedRequest);
      queryClient.invalidateQueries({ queryKey: ['matching', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['matching', 'previews', activeRequestId] });
      queryClient.invalidateQueries({ queryKey: ['matching', 'recent-sessions'] });
      const interviewerId = updatedRequest.result?.interviewer.id;
      if (interviewerId) {
        queryClient.invalidateQueries({
          queryKey: ['matching', 'availability', interviewerId]
        });
      }
    }
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCandidateId) return;

    const payload: CreateMatchRequestPayload = {
      candidateId: selectedCandidateId,
      targetRole: targetRole.trim(),
      focusAreas: parseList(focusAreasInput),
      preferredLanguages: parseList(languagesInput),
      sessionFormat,
      notes: notes.trim() || undefined
    };

    if (isSlotJoinIntent) {
      joinSlotMutation.mutate(payload);
      return;
    }

    createRequestMutation.mutate(payload);
  };

  const activeCandidate: CandidateSummaryDto | undefined = useMemo(() => {
    return candidatesQuery.data?.find((candidate) => candidate.id === selectedCandidateId);
  }, [candidatesQuery.data, selectedCandidateId]);

  const interviewerOptions: InterviewerSummaryDto[] = interviewersQuery.data ?? [];
  const isSubmitPending = isSlotJoinIntent
    ? joinSlotMutation.isPending
    : createRequestMutation.isPending;
  const submitButtonLabel = isSlotJoinIntent
    ? joinSlotMutation.isPending
      ? 'Joining slot…'
      : 'Join slot'
    : createRequestMutation.isPending
      ? 'Creating match request…'
      : 'Generate match candidates';
  const submitError = (isSlotJoinIntent ? joinSlotMutation.error : createRequestMutation.error) ?? null;
  const submitErrorMessage = submitError instanceof Error ? submitError.message : null;
  const submitSuccessMessage = isSlotJoinIntent
    ? joinSlotMutation.isSuccess
      ? 'Slot joined — request updated below.'
      : null
    : createRequestMutation.isSuccess
      ? 'Match request queued — previews updated below.'
      : null;

  return (
    <>
      <Head>
        <title>SuperMock · Interview Matching</title>
      </Head>

      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 p-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold">Interview Matching</h1>
          <p className="text-sm text-slate-400">
            Draft matching console that pairs candidates with interviewers, calculates fit score and previews upcoming
            availability.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {['queuedRequests', 'scheduledMatches', 'completedMatches'].map((metric) => {
            const labelMap: Record<string, string> = {
              queuedRequests: 'In queue',
              scheduledMatches: 'Scheduled',
              completedMatches: 'Completed'
            };
            const value = overviewQuery.data?.[metric as keyof typeof overviewQuery.data] ?? 0;
            return (
              <article key={metric} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-500">{labelMap[metric]}</p>
                <p className="text-2xl font-semibold text-white">{value}</p>
              </article>
            );
          })}
        </section>
        {isSlotJoinIntent && (
          <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
            <h2 className="mb-3 text-xl font-semibold text-amber-200">Joining existing slot</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-amber-200/80">Start</p>
                <p className="font-medium text-white">{formattedSlotStart}</p>
              </div>
              <div>
                <p className="text-sm text-amber-200/80">End</p>
                <p className="font-medium text-white">{formattedSlotEnd}</p>
              </div>
              <div>
                <p className="text-sm text-amber-200/80">Capacity</p>
                <p className="font-medium text-white">{slotCapacityDisplay}</p>
              </div>
              <div>
                <p className="text-sm text-amber-200/80">Language</p>
                <p className="font-medium text-white">{slotLanguage ?? '—'}</p>
              </div>
              <div>
                <p className="text-sm text-amber-200/80">Profession</p>
                <p className="font-medium text-white">{slotProfessionTitle ?? '—'}</p>
              </div>
            </div>
            {slotDetailsErrorMessage && (
              <p className="mt-3 text-sm text-red-300">{slotDetailsErrorMessage}</p>
            )}
            <p className="mt-4 text-xs text-amber-200/80">
              {lockedCandidateLabel
                ? `Candidate selection is locked to ${lockedCandidateLabel}.`
                : 'Candidate selection will lock once slot details are loaded.'}
            </p>
          </section>
        )}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Candidate</span>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  value={selectedCandidateId}
                  onChange={(event) => setSelectedCandidateId(event.target.value)}
                  disabled={isSlotJoinIntent}
                >
                  <option value="">Select candidate</option>
                  {candidatesQuery.data?.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.displayName} · {candidate.preferredRoles.join(' / ')}
                    </option>
                  ))}
                </select>
                {isSlotJoinIntent && (
                  <span className="text-xs text-amber-200/80">
                    Slot intent locks this field{lockedCandidateLabel ? ` for ${lockedCandidateLabel}` : ''}.
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Target role</span>
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="Frontend Engineer"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Focus areas (comma separated)</span>
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={focusAreasInput}
                  onChange={(event) => setFocusAreasInput(event.target.value)}
                  placeholder="React, TypeScript, System Design"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Preferred languages</span>
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={languagesInput}
                  onChange={(event) => setLanguagesInput(event.target.value)}
                  placeholder="English, Русский"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Session format</span>
                <select
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={sessionFormat}
                  onChange={(event) => setSessionFormat(event.target.value as CreateMatchRequestPayload['sessionFormat'])}
                >
                  {SESSION_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Notes (optional)</span>
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Specific scenarios to cover"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950"
                disabled={isSubmitPending}
              >
                {submitButtonLabel}
              </button>
              {submitErrorMessage && <span className="text-sm text-red-400">{submitErrorMessage}</span>}
              {submitSuccessMessage && (
                <span className="text-sm text-green-400">{submitSuccessMessage}</span>
              )}
              {scheduleMatchMutation.isError && (
                <span className="text-sm text-red-400">{(scheduleMatchMutation.error as Error).message}</span>
              )}
              {scheduleMatchMutation.isSuccess && (
                <span className="text-sm text-emerald-400">Match scheduled.</span>
              )}
            </div>
          </form>
        </section>

        {activeCandidate && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-3 text-xl font-semibold">Candidate snapshot</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-slate-400">Experience</p>
                <p className="font-medium text-white">{activeCandidate.experienceYears} years</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Preferred roles</p>
                <p className="font-medium text-white">{activeCandidate.preferredRoles.join(', ') || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Languages</p>
                <p className="font-medium text-white">{activeCandidate.preferredLanguages.join(', ') || '—'}</p>
              </div>
            </div>
          </section>
        )}

        {matchRequestQuery.data && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-3 text-xl font-semibold">Active request</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-slate-400">Status</p>
                <p className="font-medium text-white">{matchRequestQuery.data.status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Created</p>
                <p className="font-medium text-white">
                  {new Date(matchRequestQuery.data.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Focus areas</p>
                <p className="font-medium text-white">{matchRequestQuery.data.focusAreas.join(', ')}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Preferred languages</p>
                <p className="font-medium text-white">{matchRequestQuery.data.preferredLanguages.join(', ')}</p>
              </div>
            </div>

            {matchRequestQuery.data.result && (
              <div className="mt-4 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-300">Matched interviewer</p>
                <p className="text-lg font-semibold text-white">{matchRequestQuery.data.result.interviewer.displayName}</p>
                <p className="text-sm text-emerald-200">
                  Scheduled at{' '}
                  {matchRequestQuery.data.result.scheduledAt
                    ? new Date(matchRequestQuery.data.result.scheduledAt).toLocaleString()
                    : 'TBD'}
                </p>
                <p className="text-sm text-emerald-200">Effectiveness score: {matchRequestQuery.data.result.effectivenessScore}</p>
                {matchRequestQuery.data.result.completedAt && (
                  <p className="text-sm text-emerald-200">
                    Completed at {new Date(matchRequestQuery.data.result.completedAt).toLocaleString()}
                  </p>
                )}
                {matchRequestQuery.data.result.summary && (
                  <div className="mt-3 space-y-2 text-sm text-emerald-100">
                    <p className="font-semibold">Summary</p>
                    <p className="text-emerald-200">{matchRequestQuery.data.result.summary.interviewerNotes}</p>
                    {matchRequestQuery.data.result.summary.candidateNotes && (
                      <p className="italic text-emerald-200">
                        Candidate: {matchRequestQuery.data.result.summary.candidateNotes}
                      </p>
                    )}
                    {matchRequestQuery.data.result.summary.strengths.length > 0 && (
                      <p className="text-emerald-200">
                        Strengths: {matchRequestQuery.data.result.summary.strengths.join(', ')}
                      </p>
                    )}
                    {matchRequestQuery.data.result.summary.improvements.length > 0 && (
                      <p className="text-emerald-200">
                        Improvements: {matchRequestQuery.data.result.summary.improvements.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Suggested interviewers</h2>
            {matchPreviewsQuery.isFetching && <span className="text-sm text-slate-500">Refreshing…</span>}
          </div>

          {matchPreviewsQuery.data && matchPreviewsQuery.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {matchPreviewsQuery.data.map((preview) => (
                <article key={preview.interviewer.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{preview.interviewer.displayName}</h3>
                      <p className="text-xs text-slate-400">
                        {preview.interviewer.specializations.join(', ') || 'Generalist'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Score</p>
                      <p className="text-lg font-semibold text-secondary">{preview.score.percentage}%</p>
                      <p className={`text-xs ${preview.score.meetsThreshold ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {preview.score.meetsThreshold ? 'Ready to match' : 'Needs review'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-400">
                    <p>Languages: {preview.interviewer.languages.join(', ') || '—'}</p>
                    <p>Timezone: {preview.interviewer.timezone}</p>
                    <p>Experience: {preview.interviewer.experienceYears} years · Rating {preview.interviewer.rating.toFixed(1)}</p>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming availability</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-300">
                      {preview.availability.length > 0 ? (
                        preview.availability.map((slot) => {
                          const isScheduling = scheduleMatchMutation.isPending;
                          const requestResult = matchRequestQuery.data?.result;
                          const requestHasResult = Boolean(
                            requestResult && requestResult.status !== 'COMPLETED'
                          );

                          return (
                            <li key={slot.id} className="flex items-center justify-between gap-2">
                              <span>
                                {new Date(slot.start).toLocaleString()} → {new Date(slot.end).toLocaleTimeString()}
                              </span>
                              <button
                                type="button"
                                className="rounded border border-secondary/40 px-2 py-1 text-[11px] font-semibold text-secondary hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => scheduleMatchMutation.mutate(slot.id)}
                                disabled={isScheduling || !activeRequestId || requestHasResult}
                              >
                                {requestHasResult ? 'Scheduled' : isScheduling ? 'Scheduling…' : 'Schedule'}
                              </button>
                            </li>
                          );
                        })
                      ) : (
                        <li>No upcoming slots</li>
                      )}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {activeRequestId
                ? 'Generate or refresh a match request to see interviewer suggestions.'
                : 'Create a match request to preview relevant interviewers.'}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Interviewer availability</h2>
            <label className="text-sm text-slate-400">
              Manage slots for
              <select
                className="ml-2 rounded border border-slate-700 bg-slate-950 px-3 py-1 text-white"
                value={selectedInterviewerId}
                onChange={(event) => setSelectedInterviewerId(event.target.value)}
              >
                {interviewerOptions.map((interviewer) => (
                  <option key={interviewer.id} value={interviewer.id}>
                    {interviewer.displayName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <form
            className="grid gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              createAvailabilityMutation.mutate();
            }}
          >
            <label className="flex flex-col gap-2 text-xs">
              <span className="text-slate-400">Start time</span>
              <input
                type="datetime-local"
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={availabilityStart}
                onChange={(event) => setAvailabilityStart(event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-xs">
              <span className="text-slate-400">End time</span>
              <input
                type="datetime-local"
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={availabilityEnd}
                onChange={(event) => setAvailabilityEnd(event.target.value)}
                required
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                checked={availabilityRecurring}
                onChange={(event) => setAvailabilityRecurring(event.target.checked)}
              />
              Recurring slot
            </label>

            <button
              type="submit"
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={createAvailabilityMutation.isPending || !selectedInterviewerId}
            >
              {createAvailabilityMutation.isPending ? 'Adding…' : 'Add slot'}
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {createAvailabilityMutation.isError && (
              <p className="text-xs text-red-400">{(createAvailabilityMutation.error as Error).message}</p>
            )}
            {deleteAvailabilityMutation.isError && (
              <p className="text-xs text-red-400">{(deleteAvailabilityMutation.error as Error).message}</p>
            )}
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Upcoming slots</h3>
            {availabilityQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading availability…</p>
            ) : availabilityQuery.data && availabilityQuery.data.length > 0 ? (
              <ul className="space-y-2">
                {availabilityQuery.data.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                  >
                    <span>
                      {new Date(slot.start).toLocaleString()} → {new Date(slot.end).toLocaleTimeString()}
                    </span>
                    <button
                      type="button"
                      className="rounded border border-red-500/60 px-2 py-1 font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-60"
                      onClick={() => deleteAvailabilityMutation.mutate(slot.id)}
                      disabled={deleteAvailabilityMutation.isPending}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No availability slots yet.</p>
            )}
          </div>
        </section>

        {matchRequestQuery.data?.result && matchRequestQuery.data.result.status !== 'COMPLETED' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-xl font-semibold">Close interview</h2>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                completeMatchMutation.mutate();
              }}
            >
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Effectiveness score (0-100)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={effectivenessScore}
                  onChange={(event) => setEffectivenessScore(Number(event.target.value))}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Rating (0-5)</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                />
              </label>

              <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Interviewer notes</span>
                <textarea
                  className="min-h-[120px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={interviewerNotes}
                  onChange={(event) => setInterviewerNotes(event.target.value)}
                  required
                />
              </label>

              <label className="md:col-span-2 flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Candidate notes (optional)</span>
                <textarea
                  className="min-h-[80px] rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={candidateNotes}
                  onChange={(event) => setCandidateNotes(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Strengths (comma separated)</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={strengthsInput}
                  onChange={(event) => setStrengthsInput(event.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-slate-400">Areas to improve (comma separated)</span>
                <input
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={improvementsInput}
                  onChange={(event) => setImprovementsInput(event.target.value)}
                />
              </label>

              <div className="md:col-span-2 flex items-center gap-4">
                <button
                  type="submit"
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={completeMatchMutation.isPending}
                >
                  {completeMatchMutation.isPending ? 'Saving…' : 'Mark as completed'}
                </button>
                {completeMatchMutation.isError && (
                  <span className="text-sm text-red-400">{(completeMatchMutation.error as Error).message}</span>
                )}
                {completeMatchMutation.isSuccess && (
                  <span className="text-sm text-emerald-400">Session closed.</span>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="mb-3 text-xl font-semibold">Recent sessions</h2>
          {recentSessionsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading sessions…</p>
          ) : recentSessionsQuery.data && recentSessionsQuery.data.length > 0 ? (
            <ul className="space-y-3">
              {recentSessionsQuery.data.map((session) => (
                <li
                  key={session.id}
                  className="rounded border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">{session.interviewer.displayName}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(session.completedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Effectiveness: {session.effectivenessScore} · Rating{' '}
                    {session.summary?.rating ?? Math.round(session.effectivenessScore / 20)}/5
                  </p>
                  {session.summary?.interviewerNotes && (
                    <p className="mt-2 text-xs text-slate-300">{session.summary.interviewerNotes}</p>
                  )}
                  {session.summary?.strengths.length ? (
                    <p className="mt-2 text-xs text-emerald-300">
                      Strengths: {session.summary.strengths.join(', ')}
                    </p>
                  ) : null}
                  {session.summary?.improvements.length ? (
                    <p className="text-xs text-amber-300">
                      Improvements: {session.summary.improvements.join(', ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No completed sessions yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
