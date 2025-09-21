import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import DateTimePicker from '@/components/DateTimePicker';
import { useAuth } from '@/store/useAuth';

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
const DURATION_OPTIONS = [30, 45, 60, 90, 120];
const DEFAULT_LANGUAGE_LABEL = '🇺🇸 English';

function normalizeLanguageLabel(label: string) {
  // Remove emoji flags and other non-letter characters from the beginning
  // but preserve the actual language name
  return label.replace(/^[^\p{L}]+/u, '').trim();
}

function getDefaultLanguageFromUrl(languageParam?: string | string[] | null): string {
  const queryValue = Array.isArray(languageParam) ? languageParam[0] : languageParam ?? null;

  const valueFromUrl = () => {
    if (typeof window === 'undefined') {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('language');
  };

  const rawLanguage = queryValue ?? valueFromUrl();

  if (!rawLanguage) {
    return DEFAULT_LANGUAGE_LABEL;
  }

  let decodedLanguage = rawLanguage;

  try {
    decodedLanguage = decodeURIComponent(rawLanguage);
  } catch (error) {
    // Keep the raw value if decoding fails
  }

  const trimmedLanguage = decodedLanguage.trim();
  if (!trimmedLanguage) {
    return DEFAULT_LANGUAGE_LABEL;
  }

  const normalizedLabel = normalizeLanguageLabel(trimmedLanguage);
  if (!normalizedLabel) {
    return trimmedLanguage;
  }

  const normalizedIndex = trimmedLanguage.indexOf(normalizedLabel);
  if (normalizedIndex > 0) {
    const prefix = trimmedLanguage.slice(0, normalizedIndex).trim();
    if (prefix) {
      return `${prefix} ${normalizedLabel}`.trim();
    }
  }

  return normalizedLabel;
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

function safeFormat(date: Date, options: Intl.DateTimeFormatOptions, timeZone?: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }
}

function safeFormatToParts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  timeZone?: string
) {
  try {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone }).formatToParts(date);
  } catch {
    return new Intl.DateTimeFormat(undefined, options).formatToParts(date);
  }
}

function getDatePartsInTimeZone(date: Date, timeZone?: string) {
  const parts = safeFormatToParts(date, { year: 'numeric', month: '2-digit', day: '2-digit' }, timeZone);
  const getPart = (type: Intl.DateTimeFormatPart['type']) =>
    parts.find((part) => part.type === type)?.value ?? '0';
  return {
    year: Number(getPart('year')),
    month: Number(getPart('month')),
    day: Number(getPart('day'))
  };
}

function isSameCalendarDayInTimeZone(start: Date, end: Date, timeZone?: string) {
  const startParts = getDatePartsInTimeZone(start, timeZone);
  const endParts = getDatePartsInTimeZone(end, timeZone);
  return (
    startParts.year === endParts.year &&
    startParts.month === endParts.month &&
    startParts.day === endParts.day
  );
}

function getTimeZoneLabel(date: Date, timeZone?: string) {
  const parts = safeFormatToParts(date, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }, timeZone);
  const zonePart = parts.find((part) => part.type === 'timeZoneName');
  if (!zonePart?.value) {
    return timeZone === 'UTC' ? 'UTC' : timeZone;
  }

  return zonePart.value;
}

function formatDateTimeWithZone(value: string | null | undefined, timeZone?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const label = safeFormat(date, { dateStyle: 'medium', timeStyle: 'short' }, timeZone);
  const zone = getTimeZoneLabel(date, timeZone);
  return zone ? `${label} · ${zone}` : label;
}

function formatDateRangeWithZone(
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone?: string
) {
  if (!start) {
    return null;
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  const endDate = end ? new Date(end) : null;
  if (endDate && Number.isNaN(endDate.getTime())) {
    return formatDateTimeWithZone(start, timeZone);
  }

  const startLabel = safeFormat(startDate, { dateStyle: 'medium', timeStyle: 'short' }, timeZone);
  const zone = getTimeZoneLabel(startDate, timeZone);

  if (!endDate) {
    return zone ? `${startLabel} · ${zone}` : startLabel;
  }

  const sameDay = isSameCalendarDayInTimeZone(startDate, endDate, timeZone);
  const endLabel = safeFormat(
    endDate,
    sameDay ? { timeStyle: 'short' } : { dateStyle: 'medium', timeStyle: 'short' },
    timeZone
  );
  const separator = sameDay ? ' – ' : ' → ';

  return `${startLabel}${separator}${endLabel}${zone ? ` · ${zone}` : ''}`;
}

function parseLocalDateTime(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const value = new Date(`${date}T${time}`);
  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getToggleButtonClass(isActive: boolean) {
  return `rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
    isActive
      ? 'border border-emerald-500/60 bg-emerald-500/20 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
      : 'text-slate-300 hover:text-white'
  }`;
}

export default function InterviewerDashboardPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { isAuthenticated, login, user, logout, accessToken } = useAuth();
  const [loginEmail, setLoginEmail] = useState('interviewer@supermock.io');
  const [loginPassword, setLoginPassword] = useState('supermock');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Debug authentication state
  useEffect(() => {
    console.log('Auth state changed:', { isAuthenticated, user: user?.email, hasToken: !!accessToken });
  }, [isAuthenticated, user, accessToken]);


  // Test function to debug API calls
  const testApiCall = async () => {
    if (!accessToken) {
      console.log('No access token available');
      return;
    }
    
    try {
      console.log('Making test API call with token:', accessToken.substring(0, 20) + '...');
      const response = await fetch('/api/matching/interviewers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('API call successful:', data);
      } else {
        const error = await response.text();
        console.log('API call failed:', response.status, error);
      }
    } catch (error) {
      console.error('API call error:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    
    try {
      await login(loginEmail, loginPassword);
      // Stay on interviewer page after successful login
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const {
    language: intentLanguage,
    tools: intentTools,
    onlyFree: intentOnlyFree,
    tab: intentTab,
    showUtc: intentShowUtc
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
  // Initialize with today and next available time slot
  const getInitialDateTime = () => {
    const now = new Date();
    const nextSlot = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour to current time
    nextSlot.setMinutes(Math.ceil(nextSlot.getMinutes() / 15) * 15, 0, 0); // Round to next 15 minutes
    return nextSlot;
  };

  const getInitialEndDateTime = (startTime: Date) => {
    // Ensure minimum 30 minutes duration
    const minDuration = Math.max(DURATION_OPTIONS[2], 30); // DURATION_OPTIONS[2] is default
    const endTime = new Date(startTime.getTime() + minDuration * 60 * 1000);
    return endTime;
  };

  const [startDateTime, setStartDateTime] = useState<Date | undefined>(getInitialDateTime());
  const [endDateTime, setEndDateTime] = useState<Date | undefined>(() => {
    const start = getInitialDateTime();
    return getInitialEndDateTime(start);
  });
  const [durationMinutes, setDurationMinutes] = useState(DURATION_OPTIONS[2]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() =>
    getDefaultLanguageFromUrl(intentLanguage ?? null)
  );
  const [sessionLimit, setSessionLimit] = useState(10);
  const [sessionLimitTouched, setSessionLimitTouched] = useState(false);
  const [sessionTab, setSessionTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [showUtc, setShowUtc] = useState(false);
  const [slotIntentApplied, setSlotIntentApplied] = useState(false);
  const [joinIntentApplied, setJoinIntentApplied] = useState(false);

  useEffect(() => {
    if (!startDateTime) {
      return;
    }

    // Ensure minimum 30 minutes duration
    const minDuration = Math.max(durationMinutes, 30);
    const end = new Date(startDateTime.getTime() + minDuration * 60 * 1000);
    setEndDateTime(end);
  }, [durationMinutes, startDateTime]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }
    if (typeof intentShowUtc === 'string') {
      setShowUtc(intentShowUtc === 'true');
    } else if (intentShowUtc === undefined) {
      setShowUtc(false);
    }
  }, [intentShowUtc, router.isReady]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const languageFromUrl = getDefaultLanguageFromUrl(intentLanguage ?? null);
    setSelectedLanguage((current) =>
      current === languageFromUrl ? current : languageFromUrl
    );
  }, [intentLanguage, router.isReady]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (typeof intentTab === 'string') {
      if (intentTab === 'completed') {
        setSessionTab('completed');
      } else if (intentTab === 'all') {
        setSessionTab('all');
      } else if (intentTab === 'upcoming' || intentTab === 'live') {
        setSessionTab('upcoming');
      }
    }
  }, [intentTab, router.isReady]);

  useEffect(() => {
    if (sessionLimitTouched) {
      return;
    }

    const defaultLimit = sessionTab === 'completed' ? 20 : sessionTab === 'all' ? 15 : 10;

    if (sessionLimit !== defaultLimit) {
      setSessionLimit(defaultLimit);
    }
  }, [sessionLimit, sessionLimitTouched, sessionTab]);

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
    queryFn: fetchInterviewers,
    enabled: typeof window !== 'undefined' // Only run on client side
  });

  // Handle success and error side effects
  useEffect(() => {
    if (interviewersQuery.isSuccess && interviewersQuery.data) {
      console.log('Interviewers loaded:', interviewersQuery.data);
    }
  }, [interviewersQuery.isSuccess, interviewersQuery.data]);

  useEffect(() => {
    if (interviewersQuery.isError && interviewersQuery.error) {
      console.error('Failed to load interviewers:', interviewersQuery.error);
    }
  }, [interviewersQuery.isError, interviewersQuery.error]);

  const availabilityQuery = useQuery({
    queryKey: ['interviewer', selectedInterviewerId, 'availability'],
    queryFn: () => fetchInterviewerAvailability(selectedInterviewerId),
    enabled: Boolean(selectedInterviewerId) && typeof window !== 'undefined'
  });

  const sessionsQuery = useQuery({
    queryKey: ['interviewer', selectedInterviewerId, 'sessions', sessionLimit],
    queryFn: () => fetchInterviewerSessions(selectedInterviewerId, sessionLimit),
    enabled: Boolean(selectedInterviewerId) && typeof window !== 'undefined'
  });

  const candidatesQuery = useQuery({
    queryKey: ['interviewer', 'candidate-summaries'],
    queryFn: fetchCandidateSummaries,
    enabled: typeof window !== 'undefined'
  });

  const currentInterviewer: InterviewerSummaryDto | undefined = useMemo(() => {
    return interviewersQuery.data?.find((person) => person.id === selectedInterviewerId);
  }, [interviewersQuery.data, selectedInterviewerId]);
  const deviceTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  }, []);
  const resolvedTimeZone = showUtc ? 'UTC' : currentInterviewer?.timezone ?? undefined;
  const canonicalTimeZoneName = showUtc ? 'UTC' : currentInterviewer?.timezone ?? deviceTimeZone ?? null;
  const timeZoneShortLabel = useMemo(() => {
    const referenceDate = new Date();
    return getTimeZoneLabel(referenceDate, resolvedTimeZone ?? (showUtc ? 'UTC' : undefined)) ?? (showUtc ? 'UTC' : null);
  }, [resolvedTimeZone, showUtc]);
  const timeDisplayDescription =
    timeZoneShortLabel && canonicalTimeZoneName && timeZoneShortLabel !== canonicalTimeZoneName
      ? `${timeZoneShortLabel} (${canonicalTimeZoneName})`
      : canonicalTimeZoneName ?? timeZoneShortLabel ?? 'local time';

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
  const slotTimeSummary = useMemo(
    () => formatDateRangeWithZone(slotStartIso ?? null, slotEndIso ?? null, resolvedTimeZone),
    [resolvedTimeZone, slotEndIso, slotStartIso]
  );
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
  const filteredSessions = useMemo(() => {
    if (!sessionsQuery.data) {
      return [];
    }

    if (sessionTab === 'completed') {
      return sessionsQuery.data.filter((session) => session.status === 'COMPLETED');
    }

    if (sessionTab === 'upcoming') {
      return sessionsQuery.data.filter((session) => session.status !== 'COMPLETED');
    }

    return sessionsQuery.data;
  }, [sessionTab, sessionsQuery.data]);
  const hasFilteredSessions = filteredSessions.length > 0;
  const noSessionsMessage =
    sessionTab === 'completed'
      ? 'No completed sessions yet.'
      : sessionTab === 'upcoming'
        ? 'No upcoming sessions yet.'
        : 'No sessions to show.';
  const normalizedIntentLanguageLabel = useMemo(() => {
    if (typeof intentLanguage !== 'string') {
      return null;
    }

    const normalized = normalizeLanguageLabel(intentLanguage);
    return normalized ? normalized.toLowerCase() : null;
  }, [intentLanguage]);
  const highlightedLanguageLabel = useMemo(() => {
    if (typeof intentLanguage !== 'string') {
      return null;
    }

    const normalized = normalizeLanguageLabel(intentLanguage);
    return normalized.length > 0 ? normalized : null;
  }, [intentLanguage]);
  const candidateSummariesOrdered = useMemo(() => {
    const candidateSummaries = candidatesQuery.data ?? [];
    
    if (!normalizedIntentLanguageLabel) {
      return candidateSummaries;
    }

    const matches: CandidateSummaryDto[] = [];
    const rest: CandidateSummaryDto[] = [];

    candidateSummaries.forEach((candidate) => {
      const hasLanguage = candidate.preferredLanguages.some((language) =>
        language.toLowerCase().includes(normalizedIntentLanguageLabel)
      );

      if (hasLanguage) {
        matches.push(candidate);
      } else {
        rest.push(candidate);
      }
    });

    return [...matches, ...rest];
  }, [candidatesQuery.data, normalizedIntentLanguageLabel]);
  const visibleCandidateSummaries = useMemo(
    () => candidateSummariesOrdered.slice(0, 6),
    [candidateSummariesOrdered]
  );
  const hasCandidateSummaries = visibleCandidateSummaries.length > 0;

  const createSlotMutation = useMutation({
    mutationFn: () => {
      if (!selectedInterviewerId) {
        return Promise.reject(new Error('Please select an interviewer first'));
      }
      if (!startDateTime || !endDateTime) {
        return Promise.reject(new Error('Please select start and end date/time'));
      }

      // Check that the slot is in the future (at least 30 minutes from now)
      const now = new Date();
      const minFutureTime = new Date(now.getTime() + 30 * 60 * 1000);
      if (startDateTime <= minFutureTime) {
        return Promise.reject(new Error('Slot must be at least 30 minutes in the future'));
      }

      // Check minimum duration of 30 minutes
      const minDuration = Math.max(durationMinutes, 30);
      if (durationMinutes < 30) {
        return Promise.reject(new Error('Interview duration must be at least 30 minutes'));
      }

      // Create ISO string with timezone offset
      const formatDateTimeWithTimezone = (date: Date) => {
        const offset = -date.getTimezoneOffset();
        const offsetHours = Math.floor(Math.abs(offset) / 60);
        const offsetMinutes = Math.abs(offset) % 60;
        const offsetSign = offset >= 0 ? '+' : '-';
        const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
        
        return date.toISOString().replace('Z', offsetString);
      };

      const normalizedLanguage = normalizeLanguageLabel(selectedLanguage);
      const payload = {
        start: formatDateTimeWithTimezone(startDateTime),
        end: formatDateTimeWithTimezone(endDateTime),
        isRecurring,
        language: normalizedLanguage
      };

      console.log('Creating slot with payload:', {
        interviewerId: selectedInterviewerId,
        ...payload
      });
      console.log('Selected language:', selectedLanguage);
      console.log('Normalized language:', normalizedLanguage);
      console.log('Start date:', startDateTime);
      console.log('End date:', endDateTime);
      console.log('Start ISO:', startDateTime.toISOString());
      console.log('End ISO:', endDateTime.toISOString());

      return createInterviewerAvailabilitySlot(selectedInterviewerId, payload);
    },
    onSuccess: () => {
      // Generate new time that's different from the current one
      const newStart = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      newStart.setMinutes(Math.ceil(newStart.getMinutes() / 15) * 15, 0, 0);
      
      setStartDateTime(newStart);
      setEndDateTime(getInitialEndDateTime(newStart));
      setDurationMinutes(DURATION_OPTIONS[2]);
      setIsRecurring(false);
      setSelectedLanguage(getDefaultLanguageFromUrl(intentLanguage ?? null));
      queryClient.invalidateQueries({ queryKey: ['interviewer', selectedInterviewerId, 'availability'] });
      
      console.log('Slot created successfully, form reset with new time:', newStart.toISOString());
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

  const isJoinDisabled =
    joinSlotMutation.isPending ||
    !joinSlotIntent?.id ||
    !selectedInterviewerId ||
    slotDetailsQuery.isLoading ||
    slotDetailsQuery.isError ||
    isSlotFull;

  const updateQueryParams = useCallback(
    (updates: Record<string, string | string[] | null | undefined>) => {
      const nextQuery: Record<string, string | string[]> = {};

      Object.entries(router.query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            nextQuery[key] = value;
          }
        } else if (typeof value === 'string' && value.length > 0) {
          nextQuery[key] = value;
        }
      });

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          delete nextQuery[key];
          return;
        }

        if (Array.isArray(value)) {
          if (value.length > 0) {
            nextQuery[key] = value;
          } else {
            delete nextQuery[key];
          }
          return;
        }

        nextQuery[key] = value;
      });

      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router]
  );

  const handleTimeDisplayToggle = useCallback(
    (value: boolean) => {
      setShowUtc(value);
      updateQueryParams({ showUtc: value ? 'true' : null });
    },
    [updateQueryParams]
  );

  const handleSessionTabChange = useCallback(
    (nextTab: 'upcoming' | 'completed' | 'all') => {
      setSessionTab(nextTab);
      updateQueryParams({ tab: nextTab });
    },
    [updateQueryParams]
  );

  useEffect(() => {
    if (!router.isReady || slotIntentApplied) {
      return;
    }

    if (typeof intentOnlyFree === 'string') {
      setIsRecurring(intentOnlyFree === 'true');
    }

    setSlotIntentApplied(true);
  }, [intentOnlyFree, router.isReady, slotIntentApplied]);

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
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Time display</span>
            <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-1">
              <button
                type="button"
                className={getToggleButtonClass(!showUtc)}
                onClick={() => handleTimeDisplayToggle(false)}
                disabled={!showUtc}
              >
                Local
              </button>
              <button
                type="button"
                className={getToggleButtonClass(showUtc)}
                onClick={() => handleTimeDisplayToggle(true)}
                disabled={showUtc}
              >
                UTC
              </button>
            </div>
            <span className="text-slate-500">
              Showing times in{' '}
              <span className="font-semibold text-slate-200">{timeDisplayDescription}</span>
            </span>
          </div>
        </header>

        {!isAuthenticated ? (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-white mb-4">Login Required</h2>
              <p className="text-sm text-slate-400 mb-6">
                Please login with your interviewer credentials to access the dashboard.
              </p>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Password</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                    required
                  />
                </div>
                
                {loginError && (
                  <div className="text-red-400 text-sm">{loginError}</div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingIn ? 'Logging in...' : 'Login'}
                </button>
              </form>
              
              <div className="mt-4 text-xs text-slate-500">
                <p>Test credentials:</p>
                <p>Email: interviewer@supermock.io</p>
                <p>Password: supermock</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Welcome, {user?.email}</h2>
                  <p className="text-sm text-slate-400">Role: {user?.role}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={testApiCall}
                    className="rounded border border-blue-500/60 px-3 py-1 text-sm font-semibold text-blue-400 transition-colors hover:bg-blue-500/10"
                  >
                    Test API
                  </button>
                  <button
                    onClick={logout}
                    className="rounded border border-red-500/60 px-3 py-1 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </section>

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
              <dl className="grid gap-1 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <dt className="text-slate-500">Timezone</dt>
                  <dd className="font-semibold text-white">{currentInterviewer.timezone}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-slate-500">Languages</dt>
                  <dd className="font-semibold text-white">
                    {currentInterviewer.languages.join(', ') || '—'}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="text-slate-500">Experience</dt>
                  <dd className="font-semibold text-white">{currentInterviewer.experienceYears} yrs</dd>
                </div>
              </dl>
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
                {slotTimeSummary ? (
                  <p className="text-sm text-slate-300">
                    When:{' '}
                    <span className="font-medium text-white">{slotTimeSummary}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-300">
                    When:{' '}
                    <span className="font-medium text-slate-500">To be confirmed</span>
                  </p>
                )}
                <p className="text-[11px] text-emerald-200/80">Times shown in {timeDisplayDescription}.</p>
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
          <div>
            <h2 className="text-lg font-semibold text-white">Add availability</h2>
            <p className="text-sm text-slate-400">
              Create a new availability slot for candidates to join.
            </p>
          </div>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              createSlotMutation.mutate();
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-xs">
                <span className="text-slate-400">Start date & time</span>
                <DateTimePicker
                  value={startDateTime}
                  onChange={(date) => {
                    setStartDateTime(date);
                    // Auto-calculate end time based on duration
                    if (date) {
                      const minDuration = Math.max(durationMinutes, 30);
                      const end = new Date(date.getTime() + minDuration * 60 * 1000);
                      setEndDateTime(end);
                    } else {
                      setEndDateTime(undefined);
                    }
                  }}
                  placeholder="Select start date and time"
                  showTime={true}
                  minDate={(() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return today;
                  })()}
                />
              </label>

              <label className="flex flex-col gap-2 text-xs">
                <span className="text-slate-400">Duration</span>
                <select
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
                  value={durationMinutes}
                  onChange={(event) => {
                    const newDuration = Number(event.target.value);
                    setDurationMinutes(newDuration);
                    // Auto-calculate end time based on new duration
                    if (startDateTime) {
                      const minDuration = Math.max(newDuration, 30);
                      const end = new Date(startDateTime.getTime() + minDuration * 60 * 1000);
                      setEndDateTime(end);
                    }
                  }}
                >
                  {DURATION_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutes
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <div className="flex flex-wrap items-end gap-4">

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
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createSlotMutation.isPending || !selectedInterviewerId}
              >
                {createSlotMutation.isPending ? 'Adding…' : 'Add slot'}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">Times shown in {timeDisplayDescription}.</p>
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
                    className="flex flex-col gap-2 rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">
                          {formatDateRangeWithZone(slot.start, slot.end, resolvedTimeZone) ?? '—'}
                        </p>
                        {slot.language && (
                          <span className="rounded-full bg-slate-800/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                            {slot.language}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Duration:{' '}
                        {Math.max(
                          Math.round((new Date(slot.end).getTime() - new Date(slot.start).getTime()) / 60000),
                          0
                        )}{' '}
                        min
                        {slot.createdAt && (
                          <span className="ml-2 text-slate-600">
                            Added {formatDateTimeWithZone(slot.createdAt, resolvedTimeZone) ?? '—'}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-start md:self-center">
                      {slot.isRecurring && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          Recurring
                        </span>
                      )}
                      <button
                        type="button"
                        className="rounded border border-red-500/60 px-2 py-1 font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => deleteSlotMutation.mutate(slot.id)}
                        disabled={deleteSlotMutation.isPending}
                      >
                        Remove
                      </button>
                    </div>
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
            <div>
              <h2 className="text-lg font-semibold text-white">Candidate pipeline</h2>
              <p className="text-xs text-slate-400">
                Overview of candidates waiting for interviews
                {highlightedLanguageLabel ? (
                  <>
                    {' '}
                    · prioritizing <span className="text-emerald-300">{highlightedLanguageLabel}</span>
                  </>
                ) : null}
                .
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void candidatesQuery.refetch();
              }}
              disabled={candidatesQuery.isFetching}
            >
              {candidatesQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {candidatesQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading candidates…</p>
          ) : candidatesQuery.isError ? (
            <p className="text-sm text-red-400">
              {(candidatesQuery.error as Error).message || 'Failed to load candidate summaries.'}
            </p>
          ) : hasCandidateSummaries ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {visibleCandidateSummaries.map((candidate) => {
                const languageMatch = normalizedIntentLanguageLabel
                  ? candidate.preferredLanguages.some((language) =>
                      language.toLowerCase().includes(normalizedIntentLanguageLabel)
                    )
                  : false;

                return (
                  <li
                    key={candidate.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{candidate.displayName}</p>
                        <p className="text-[11px] text-slate-500">{candidate.timezone}</p>
                      </div>
                      <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-200">
                        {candidate.experienceYears} yrs
                      </span>
                    </div>
                    {languageMatch && highlightedLanguageLabel && (
                      <p className="mt-2 text-[11px] text-emerald-300">
                        Matches requested language ({highlightedLanguageLabel}).
                      </p>
                    )}
                    <div className="mt-3 space-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Preferred roles</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {candidate.preferredRoles.length > 0 ? (
                            candidate.preferredRoles.map((role) => (
                              <span
                                key={`${candidate.id}-role-${role}`}
                                className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-200"
                              >
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Languages</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {candidate.preferredLanguages.length > 0 ? (
                            candidate.preferredLanguages.map((language) => {
                              const normalized = language.toLowerCase();
                              const isHighlighted =
                                normalizedIntentLanguageLabel &&
                                normalized.includes(normalizedIntentLanguageLabel);

                              return (
                                <span
                                  key={`${candidate.id}-lang-${language}`}
                                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                    isHighlighted
                                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200'
                                      : 'border-slate-700 bg-slate-900 text-slate-200'
                                  }`}
                                >
                                  {language}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[11px] text-slate-500">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-500">
                      Candidate ID:{' '}
                      <span className="font-mono text-slate-300">{candidate.id}</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No candidates queued right now.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-white">Upcoming / recent sessions</h2>
              <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 p-1">
                {[
                  { value: 'upcoming' as const, label: 'Upcoming' },
                  { value: 'completed' as const, label: 'Completed' },
                  { value: 'all' as const, label: 'All' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={getToggleButtonClass(sessionTab === option.value)}
                    onClick={() => handleSessionTabChange(option.value)}
                    disabled={sessionTab === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="text-xs text-slate-400">
              Show last
              <select
                className="ml-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-white"
                value={sessionLimit}
                onChange={(event) => {
                  setSessionLimit(Number(event.target.value));
                  setSessionLimitTouched(true);
                }}
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
          ) : sessionsQuery.isError ? (
            <p className="text-sm text-red-400">
              {(sessionsQuery.error as Error).message || 'Failed to load sessions.'}
            </p>
          ) : hasFilteredSessions ? (
            <ul className="space-y-3">
              {filteredSessions.map((session: InterviewerSessionDto) => {
                const scheduledLabel = session.scheduledAt
                  ? formatDateTimeWithZone(session.scheduledAt, resolvedTimeZone) ?? 'TBD'
                  : 'TBD';
                const completedLabel = session.completedAt
                  ? formatDateTimeWithZone(session.completedAt, resolvedTimeZone)
                  : null;

                return (
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
                  <p className="mt-2 text-slate-400">Scheduled: {scheduledLabel}</p>
                  {completedLabel && <p className="text-slate-400">Completed: {completedLabel}</p>}
                  <p className="text-slate-400">
                    Candidate: <span className="font-semibold">{session.candidateId}</span>
                  </p>
                  <p className="text-slate-400">Focus: {session.focusAreas.join(', ') || '—'}</p>
                  <p className="text-slate-400">Languages: {(() => {
                    // Use selected language from form, or fallback to URL parameter, or session data
                    const currentLanguage = selectedLanguage || getDefaultLanguageFromUrl(intentLanguage ?? null);
                    const displayLanguage = currentLanguage ? normalizeLanguageLabel(currentLanguage) : (session.preferredLanguages.join(', ') || '—');
                    console.log('Session language display:', {
                      sessionId: session.id,
                      selectedLanguage,
                      currentLanguage,
                      displayLanguage,
                      sessionLanguages: session.preferredLanguages
                    });
                    return displayLanguage;
                  })()}</p>
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
              );
              })}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{noSessionsMessage}</p>
          )}
        </section>
          </>
        )}
      </main>
    </>
  );
}
