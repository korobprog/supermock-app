import { useMemo, useState } from 'react';
import Head from 'next/head';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createInterviewerAvailabilitySlot,
  deleteInterviewerAvailabilitySlot,
  fetchCandidateSummaries,
  fetchInterviewerAvailability,
  fetchInterviewerSessions,
  fetchInterviewers
} from '@/lib/api';
import type {
  AvailabilitySlotDto,
  CandidateSummaryDto,
  InterviewerSessionDto,
  InterviewerSummaryDto
} from '../../../shared/src/types/matching.js';

const DEFAULT_INTERVIEWER_EMAIL = 'interviewer@supermock.io';

export default function InterviewerDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedInterviewerId, setSelectedInterviewerId] = useState('');
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [sessionLimit, setSessionLimit] = useState(10);

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

  const currentInterviewer: InterviewerSummaryDto | undefined = useMemo(() => {
    return interviewersQuery.data?.find((person) => person.id === selectedInterviewerId);
  }, [interviewersQuery.data, selectedInterviewerId]);

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
