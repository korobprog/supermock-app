import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createInterviewerAvailabilitySlot,
  deleteInterviewerAvailabilitySlot,
  fetchCandidateSummaries,
  fetchInterviewerAvailability,
  fetchInterviewerSessions,
  fetchInterviewers,
  joinRealtimeSession
} from '@/lib/api';
import { fetchSlotDetails, type Slot, type SlotParticipant } from '@/data/slots';
import type {
  AvailabilitySlotDto,
  CandidateSummaryDto,
  InterviewerSessionDto,
  InterviewerSummaryDto
} from '../../../shared/src/types/matching.js';

const DEFAULT_INTERVIEWER_EMAIL = 'interviewer@supermock.io';

function normalizeLanguageLabel(label: string) {
  return label.replace(/^[^\p{L}]+/u, '').trim();
}

function toArray(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function formatParticipantRole(role: SlotParticipant['role']) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default function InterviewerDashboardPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    language: intentLanguage,
    tools: intentTools,
    onlyFree: intentOnlyFree,
    tab: intentTab
  } = router.query;
  const slotIdParam = router.query.slotId;
  const slotTitleParam = router.query.slotTitle;
  const slotStartParam = router.query.slotStart;
  const slotEndParam = router.query.slotEnd;
  const slotLanguageParam = router.query.slotLanguage;
  const slotCapacityParam = router.query.slotCapacity;
  const slotHostParam = router.query.slotHost;
  const slotToolsParam = router.query.slotTools;
  const slotFocusParam = router.query.slotFocus ?? router.query.slotFocusAreas;
  const slotInterviewerParam = router.query.slotInterviewerId ?? router.query.interviewerId;
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(10);
  const [slotIntentApplied, setSlotIntentApplied] = useState(false);
  const [joinIntentApplied, setJoinIntentApplied] = useState(false);

  const joinSlotId = typeof slotIdParam === 'string' ? slotIdParam : undefined;
  const joinSlotTitle = typeof slotTitleParam === 'string' ? slotTitleParam : undefined;
  const joinSlotStart = typeof slotStartParam === 'string' ? slotStartParam : undefined;
  const joinSlotEnd = typeof slotEndParam === 'string' ? slotEndParam : undefined;
  const joinSlotLanguageMeta = typeof slotLanguageParam === 'string' ? slotLanguageParam : undefined;
  const joinSlotCapacityMeta =
    typeof slotCapacityParam === 'string' && !Number.isNaN(Number(slotCapacityParam))
      ? Number(slotCapacityParam)
      : undefined;
  const joinSlotHostMeta = typeof slotHostParam === 'string' ? slotHostParam : undefined;
  const joinSlotToolsMeta = useMemo(() => toArray(slotToolsParam), [slotToolsParam]);
  const joinSlotFocusMeta = useMemo(() => toArray(slotFocusParam), [slotFocusParam]);
  const recommendedInterviewerId =
    typeof slotInterviewerParam === 'string' ? slotInterviewerParam : undefined;

  const joinSlotIntent = useMemo(() => {
    if (!joinSlotId) {
      return null;
    }

    return {
      id: joinSlotId,
      title: joinSlotTitle,
      start: joinSlotStart,
      end: joinSlotEnd,
      language: joinSlotLanguageMeta,
      capacity: joinSlotCapacityMeta,
      hostName: joinSlotHostMeta,
      tools: joinSlotToolsMeta,
      focusAreas: joinSlotFocusMeta
    };
  }, [
    joinSlotCapacityMeta,
    joinSlotFocusMeta,
    joinSlotHostMeta,
    joinSlotId,
    joinSlotLanguageMeta,
    joinSlotTitle,
    joinSlotStart,
    joinSlotEnd,
    joinSlotToolsMeta
  ]);

  const interviewersQuery = useQuery({
    queryKey: ['interviewers'],
    queryFn: fetchInterviewers
  });

  const availabilityQuery = useQuery({
    queryKey: ['interviewer', selectedInterviewerId, 'availability'],
    queryFn: () => fetchInterviewerAvailability(selectedInterviewerId),
    enabled: Boolean(selectedInterviewerId)
  });

  const sessionsQuery = useQuery({
    queryKey: ['interviewer', selectedInterviewerId, 'sessions', sessionLimit],
    queryFn: () => fetchInterviewerSessions(selectedInterviewerId, sessionLimit),
    enabled: Boolean(selectedInterviewerId)
  });

  const slotDetailsQuery = useQuery<Slot>({
    queryKey: ['slots', joinSlotIntent?.id],
    queryFn: () => fetchSlotDetails(joinSlotIntent!.id),
    enabled: Boolean(joinSlotIntent?.id)
  });

  const slotDetails = slotDetailsQuery.data ?? null;
  const slotTitle = slotDetails?.title ?? joinSlotIntent?.title ?? 'Requested slot';
  const slotLanguage = slotDetails?.language ?? joinSlotIntent?.language;
  const slotTools = useMemo(
    () => slotDetails?.tools ?? joinSlotIntent?.tools ?? [],
    [joinSlotIntent?.tools, slotDetails?.tools]
  );
  const slotFocusAreas = useMemo(
    () => slotDetails?.focusAreas ?? joinSlotIntent?.focusAreas ?? [],
    [joinSlotIntent?.focusAreas, slotDetails?.focusAreas]
  );
  const slotHostName = slotDetails?.hostName ?? joinSlotIntent?.hostName;
  const slotCapacity = slotDetails?.capacity ?? joinSlotIntent?.capacity;
  const slotParticipantCount = slotDetails ? slotDetails.participants.length : undefined;
  const slotParticipants = slotDetails?.participants ?? [];
  const slotRemaining =
    typeof slotCapacity === 'number' && typeof slotParticipantCount === 'number'
      ? Math.max(slotCapacity - slotParticipantCount, 0)
      : undefined;
  const slotStartIso = slotDetails?.start ?? joinSlotIntent?.start;
  const slotEndIso = slotDetails?.end ?? joinSlotIntent?.end;
  const slotStartDate = useMemo(() => (slotStartIso ? new Date(slotStartIso) : null), [slotStartIso]);
  const slotEndDate = useMemo(() => (slotEndIso ? new Date(slotEndIso) : null), [slotEndIso]);
  const slotTimeSummary = useMemo(() => {
    if (!slotStartDate) {
      return null;
    }

    const startLabel = slotStartDate.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    if (!slotEndDate) {
      return startLabel;
    }

    const sameDay = slotStartDate.toDateString() === slotEndDate.toDateString();
    const endLabel = slotEndDate.toLocaleString(undefined, {
      dateStyle: sameDay ? undefined : 'medium',
      timeStyle: 'short'
    });

    if (sameDay) {
      return `${startLabel} – ${endLabel}`;
    }

    return `${startLabel} → ${endLabel}`;
  }, [slotEndDate, slotStartDate]);
  const recommendedInterviewer = interviewersQuery.data?.find(
    (person) => person.id === recommendedInterviewerId
  );
  const participantCountLabel =
    slotParticipantCount !== undefined
      ? String(slotParticipantCount)
      : slotDetailsQuery.isLoading
        ? '…'
        : '—';
  const isSlotFull = typeof slotRemaining === 'number' && slotRemaining <= 0;

  const createSlotMutation = useMutation({
    mutationFn: () => {
      if (!selectedInterviewerId) {
        return Promise.reject(new Error('Select interviewer first'));
      }
      if (!startInput || !endInput) {
        return Promise.reject(new Error('Specify start and end time'));
      }

      const startISO = new Date(startInput).toISOString();
      const endISO = new Date(endInput).toISOString();

      if (new Date(endISO) <= new Date(startISO)) {
        return Promise.reject(new Error('End time must be after start time'));
      }

      return createInterviewerAvailabilitySlot(selectedInterviewerId, {
        start: startISO,
        end: endISO,
        isRecurring
      });
    },
    onSuccess: () => {
      setStartInput('');
      setEndInput('');
      setIsRecurring(false);
      queryClient.invalidateQueries({ queryKey: ['interviewer', selectedInterviewerId, 'availability'] });
    }
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: string) => deleteInterviewerAvailabilitySlot(slotId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviewer', selectedInterviewerId, 'availability'] });
    }
  });

  const joinSlotMutation = useMutation({
    mutationFn: async () => {
      if (!joinSlotIntent?.id) {
        throw new Error('Slot context missing');
      }

      if (!selectedInterviewerId) {
        throw new Error('Select interviewer first');
      }

      const metadata: Record<string, unknown> = {
        slotTitle,
        slotLanguage,
        hostName: slotHostName,
        focusAreas: slotFocusAreas,
        tools: slotTools,
        capacity: slotCapacity,
        remainingCapacity: slotRemaining,
        start: slotStartIso,
        end: slotEndIso,
        interviewerId: selectedInterviewerId,
        interviewerName: currentInterviewer?.displayName
      };

      Object.keys(metadata).forEach((key) => {
        const value = metadata[key];
        if (value === undefined || value === null) {
          delete metadata[key];
        }

        if (Array.isArray(value) && value.length === 0) {
          delete metadata[key];
        }
      });

      return joinRealtimeSession(joinSlotIntent.id, {
        role: 'INTERVIEWER',
        metadata
      });
    },
    onSuccess: () => {
      if (selectedInterviewerId) {
        queryClient.invalidateQueries({
          queryKey: ['interviewer', selectedInterviewerId, 'availability']
        });
        queryClient.invalidateQueries({
          queryKey: ['interviewer', selectedInterviewerId, 'sessions', sessionLimit]
        });
      }

      if (joinSlotIntent?.id) {
        queryClient.invalidateQueries({ queryKey: ['slots', joinSlotIntent.id] });
      }

      const nextQuery: Record<string, string | string[]> = {};
      Object.entries(router.query).forEach(([key, value]) => {
        if (key === 'slotId' || key.startsWith('slot')) {
          return;
        }

        if (Array.isArray(value)) {
          if (value.length > 0) {
            nextQuery[key] = value;
          }
        } else if (typeof value === 'string' && value.length > 0) {
          nextQuery[key] = value;
        }
      });

      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    }
  });

  const currentInterviewer: InterviewerSummaryDto | undefined = useMemo(() => {
    return interviewersQuery.data?.find((person) => person.id === selectedInterviewerId);
  }, [interviewersQuery.data, selectedInterviewerId]);
  const isJoinDisabled =
    joinSlotMutation.isPending ||
    !joinSlotIntent?.id ||
    !selectedInterviewerId ||
    slotDetailsQuery.isLoading ||
    slotDetailsQuery.isError ||
    isSlotFull;

  useEffect(() => {
    if (!router.isReady || slotIntentApplied) {
      return;
    }

    if (typeof intentOnlyFree === 'string') {
      setIsRecurring(intentOnlyFree === 'true');
    }

    if (typeof intentTab === 'string') {
      if (intentTab === 'completed') {
        setSessionLimit(20);
      } else if (intentTab === 'live') {
        setSessionLimit(5);
      }
    }

    setSlotIntentApplied(true);
  }, [intentOnlyFree, intentTab, router.isReady, slotIntentApplied]);

  useEffect(() => {
    if (!joinSlotIntent?.id) {
      setJoinIntentApplied(false);
    }
  }, [joinSlotIntent?.id]);

  useEffect(() => {
    if (!router.isReady || !interviewersQuery.data?.length) {
      return;
    }

    if (joinSlotIntent?.id && !joinIntentApplied) {
      let matched = false;

      if (recommendedInterviewerId) {
        const suggested = interviewersQuery.data.find((person) => person.id === recommendedInterviewerId);
        if (suggested) {
          setSelectedInterviewerId(suggested.id);
          matched = true;
        }
      }

      if (!matched) {
        const normalizedLanguage =
          slotLanguage ? normalizeLanguageLabel(slotLanguage).toLowerCase() : undefined;
        const normalizedTools =
          slotTools.length > 0
            ? slotTools.map((tool) => tool.toLowerCase())
            : toArray(intentTools).map((tool) => tool.toLowerCase());

        const match = interviewersQuery.data.find((person) => {
          const languageMatch =
            normalizedLanguage &&
            person.languages.some((language) => language.toLowerCase().includes(normalizedLanguage));
          const toolsMatch =
            normalizedTools.length > 0 &&
            normalizedTools.every((tool) =>
              person.specializations.some((specialization) => specialization.toLowerCase().includes(tool))
            );

          return languageMatch || toolsMatch;
        });

        if (match) {
          setSelectedInterviewerId(match.id);
          matched = true;
        }
      }

      setJoinIntentApplied(true);

      if (matched) {
        return;
      }
    }

    if (selectedInterviewerId) {
      return;
    }

    const normalizedLanguage =
      typeof intentLanguage === 'string' ? normalizeLanguageLabel(intentLanguage).toLowerCase() : undefined;
    const normalizedTools = toArray(intentTools).map((tool) => tool.toLowerCase());

    const matchingInterviewer = interviewersQuery.data.find((person) => {
      const languageMatch =
        normalizedLanguage &&
        person.languages.some((language) => language.toLowerCase().includes(normalizedLanguage));
      const toolsMatch =
        normalizedTools.length > 0 &&
        normalizedTools.every((tool) =>
          person.specializations.some((specialization) => specialization.toLowerCase().includes(tool))
        );

      return languageMatch || toolsMatch;
    });

    if (matchingInterviewer) {
      setSelectedInterviewerId(matchingInterviewer.id);
      return;
    }

    const fallback = interviewersQuery.data[0];
    if (fallback) {
      setSelectedInterviewerId(fallback.id);
    }
  }, [
    intentLanguage,
    intentTools,
    interviewersQuery.data,
    joinIntentApplied,
    joinSlotIntent?.id,
    recommendedInterviewerId,
    router.isReady,
    selectedInterviewerId,
    slotLanguage,
    slotTools
  ]);

  return (
    <>
      <Head>
        <title>Interviewer dashboard · SuperMock</title>
      </Head>
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 p-6">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold text-white">Interviewer dashboard</h1>
          <p className="text-sm text-slate-400">
            Manage availability, track upcoming interviews and review completed sessions. Seed account:{' '}
            <span className="font-semibold text-secondary">{DEFAULT_INTERVIEWER_EMAIL}</span>
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="text-sm text-slate-400">
              Interviewer profile
              <select
                className="ml-2 rounded border border-slate-700 bg-slate-950 px-3 py-1 text-white"
                value={selectedInterviewerId}
                onChange={(event) => setSelectedInterviewerId(event.target.value)}
              >
                <option value="">Select...</option>
                {interviewersQuery.data?.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </label>

            {currentInterviewer && (
              <div className="text-xs text-slate-400">
                <p>{currentInterviewer.timezone}</p>
                <p>{currentInterviewer.languages.join(', ')}</p>
              </div>
            )}
          </div>
        </section>

        {joinSlotIntent && (
          <section className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                  Join slot intent
                </p>
                <h2 className="text-xl font-semibold text-white">{slotTitle}</h2>
                {slotTimeSummary && (
                  <p className="text-sm text-slate-300">
                    When:{' '}
                    <span className="font-medium text-white">{slotTimeSummary}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                  {slotLanguage && (
                    <span>
                      Language:{' '}
                      <span className="font-semibold text-white">{slotLanguage}</span>
                    </span>
                  )}
                  {slotHostName && (
                    <span>
                      Host:{' '}
                      <span className="font-semibold text-white">{slotHostName}</span>
                    </span>
                  )}
                  {slotFocusAreas.length > 0 && (
                    <span>
                      Focus:{' '}
                      <span className="font-semibold text-white">{slotFocusAreas.join(', ')}</span>
                    </span>
                  )}
                  {slotTools.length > 0 && (
                    <span>
                      Tools:{' '}
                      <span className="font-semibold text-white">{slotTools.join(', ')}</span>
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <p>
                    Joining as:{' '}
                    <span className="font-semibold text-white">
                      {currentInterviewer?.displayName ?? 'Select profile'}
                    </span>
                  </p>
                  {recommendedInterviewer && (
                    <p className="text-emerald-300">
                      Suggested profile:{' '}
                      <span className="font-semibold text-white">
                        {recommendedInterviewer.displayName}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 md:w-auto md:items-end">
                <div className="flex flex-col items-start gap-1 text-xs text-slate-300 md:items-end">
                  <p>
                    Participants:{' '}
                    <span className="font-semibold text-white">{participantCountLabel}</span>
                    {typeof slotCapacity === 'number' && (
                      <>
                        /
                        <span className="font-semibold text-white">{slotCapacity}</span>
                        {typeof slotRemaining === 'number' && (
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              isSlotFull
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {isSlotFull ? 'Full' : `${slotRemaining} free`}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  {slotCapacity === undefined && (
                    <p className="text-[11px] text-slate-400">Capacity details pending confirmation.</p>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                  onClick={() => joinSlotMutation.mutate()}
                  disabled={isJoinDisabled}
                >
                  {joinSlotMutation.isPending ? 'Joining…' : 'Join slot as interviewer'}
                </button>
                {joinSlotMutation.isError && (
                  <p className="text-xs text-red-300">
                    {(joinSlotMutation.error as Error).message || 'Failed to join slot.'}
                  </p>
                )}
                {isSlotFull && (
                  <p className="text-xs text-amber-300">
                    Slot is fully booked. You can still adjust availability below.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Current participants
                </h3>
                {slotDetails?.waitlistCount ? (
                  <span className="text-[11px] text-amber-300">
                    Waitlist: {slotDetails.waitlistCount}
                  </span>
                ) : null}
              </div>
              {slotDetailsQuery.isLoading ? (
                <p className="text-xs text-slate-400">Loading slot details…</p>
              ) : slotDetailsQuery.isError ? (
                <p className="text-xs text-red-300">
                  {(slotDetailsQuery.error as Error).message || 'Failed to load slot details.'}
                </p>
              ) : slotParticipants.length > 0 ? (
                <ul className="grid gap-2 md:grid-cols-2">
                  {slotParticipants.map((participant) => (
                    <li
                      key={participant.id}
                      className="rounded border border-emerald-500/30 bg-slate-950/70 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-white">{participant.name}</p>
                      <p className="text-xs text-slate-400">
                        {formatParticipantRole(participant.role)} ·{' '}
                        {participant.stack.slice(0, 3).join(', ')}
                      </p>
                      <p className="text-[10px] text-slate-500">{participant.timezone}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">No participants yet.</p>
              )}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Add availability</h2>
          <form
            className="mt-4 grid gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              createSlotMutation.mutate();
            }}
          >
            <label className="flex flex-col gap-2 text-xs">
              <span className="text-slate-400">Start time</span>
              <input
                type="datetime-local"
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={startInput}
                onChange={(event) => setStartInput(event.target.value)}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-xs">
              <span className="text-slate-400">End time</span>
              <input
                type="datetime-local"
                className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                value={endInput}
                onChange={(event) => setEndInput(event.target.value)}
                required
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
              />
              Recurring slot
            </label>

            <button
              type="submit"
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
              disabled={createSlotMutation.isPending || !selectedInterviewerId}
            >
              {createSlotMutation.isPending ? 'Adding…' : 'Add slot'}
            </button>
          </form>

          <div className="mt-3 space-y-2 text-xs text-red-400">
            {createSlotMutation.isError && <p>{(createSlotMutation.error as Error).message}</p>}
            {deleteSlotMutation.isError && <p>{(deleteSlotMutation.error as Error).message}</p>}
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-semibold text-slate-300">Upcoming availability</h3>
            {availabilityQuery.isLoading ? (
              <p className="text-sm text-slate-500">Loading availability…</p>
            ) : availabilityQuery.data && availabilityQuery.data.length > 0 ? (
              <ul className="space-y-2">
                {availabilityQuery.data.map((slot: AvailabilitySlotDto) => (
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
                      onClick={() => deleteSlotMutation.mutate(slot.id)}
                      disabled={deleteSlotMutation.isPending}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No availability slots.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Upcoming / recent sessions</h2>
            <label className="text-xs text-slate-400">
              Show last
              <select
                className="ml-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                value={sessionLimit}
                onChange={(event) => setSessionLimit(Number(event.target.value))}
              >
                {[5, 10, 20, 30].map((limit) => (
                  <option key={limit} value={limit}>
                    {limit}
                  </option>
                ))}
              </select>
              sessions
            </label>
          </div>

          {sessionsQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading sessions…</p>
          ) : sessionsQuery.data && sessionsQuery.data.length > 0 ? (
            <ul className="space-y-3">
              {sessionsQuery.data.map((session: InterviewerSessionDto) => (
                <li
                  key={session.id}
                  className="rounded border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-white">{session.targetRole}</span>
                    <span className={`rounded px-2 py-1 text-[10px] uppercase ${session.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-sky-500/20 text-sky-300'}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-400">
                    Scheduled: {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : 'TBD'}
                  </p>
                  {session.completedAt && (
                    <p className="text-slate-400">Completed: {new Date(session.completedAt).toLocaleString()}</p>
                  )}
                  <p className="text-slate-400">
                    Candidate: <span className="font-semibold">{session.candidateId}</span>
                  </p>
                  <p className="text-slate-400">Focus: {session.focusAreas.join(', ') || '—'}</p>
                  <p className="text-slate-400">Languages: {session.preferredLanguages.join(', ') || '—'}</p>
                  <p className="mt-1 text-slate-400">Effectiveness score: {session.effectivenessScore}</p>
                  {session.summary && (
                    <div className="mt-2 space-y-1 text-slate-300">
                      <p className="text-white">Summary</p>
                      <p>{session.summary.interviewerNotes}</p>
                      {session.summary.candidateNotes && (
                        <p className="italic text-slate-200">Candidate: {session.summary.candidateNotes}</p>
                      )}
                      {session.summary.strengths.length > 0 && (
                        <p className="text-emerald-300">
                          Strengths: {session.summary.strengths.join(', ')}
                        </p>
                      )}
                      {session.summary.improvements.length > 0 && (
                        <p className="text-amber-300">
                          Improvements: {session.summary.improvements.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No scheduled or completed sessions yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
