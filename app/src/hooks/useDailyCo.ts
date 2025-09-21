import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

type DailyModule = typeof import('@daily-co/daily-js');
type DailyCall = import('@daily-co/daily-js').DailyCall;
type DailyEvent = import('@daily-co/daily-js').DailyEvent;
type DailyEventObject<T extends DailyEvent = DailyEvent> = import('@daily-co/daily-js').DailyEventObject<T>;
type DailyParticipant = import('@daily-co/daily-js').DailyParticipant;

type EventHandler = [DailyEvent, (event: DailyEventObject) => void];

type UseDailyCoOptions = {
  roomUrl?: string | null;
  token?: string | null;
  userName?: string;
  autoJoin?: boolean;
  maxReconnectionAttempts?: number;
};

type UseDailyCoResult = {
  containerRef: RefObject<HTMLDivElement>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  participants: Record<string, DailyParticipant>;
  participantsCount: number;
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  join: () => Promise<void>;
  leaveCall: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleMicrophone: () => Promise<void>;
  retry: () => Promise<void>;
};

const MAX_RECONNECT_ATTEMPTS = 3;

let dailyModulePromise: Promise<DailyModule> | null = null;

async function loadDailyModule(): Promise<DailyModule> {
  if (!dailyModulePromise) {
    dailyModulePromise = import('@daily-co/daily-js');
  }

  return dailyModulePromise;
}

function isTrackPlayable(track?: { state?: string | undefined } | null): boolean {
  if (!track || !track.state) {
    return false;
  }

  return track.state === 'playable' || track.state === 'loading';
}

function createDarkTheme() {
  return {
    colors: {
      background: '#0f172a',
      backgroundAccent: '#1e293b',
      mainAreaBg: '#111827',
      mainAreaBgAccent: '#1f2937',
      border: '#1e293b',
      baseText: '#e2e8f0',
      accent: '#6366f1',
      accentText: '#0f172a'
    }
  } as const;
}

export function useDailyCo(options: UseDailyCoOptions): UseDailyCoResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callObjectRef = useRef<DailyCall | null>(null);
  const eventHandlersRef = useRef<EventHandler[]>([]);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualLeaveRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);

  const { roomUrl, token, userName, autoJoin, maxReconnectionAttempts = MAX_RECONNECT_ATTEMPTS } = options;

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const updateParticipantState = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      setParticipants({});
      setCameraEnabled(false);
      setMicrophoneEnabled(false);
      return;
    }

    const currentParticipants = callObject.participants();
    const normalized: Record<string, DailyParticipant> = {};

    Object.entries(currentParticipants).forEach(([key, participant]) => {
      if (participant) {
        normalized[key] = participant;
      }
    });

    setParticipants(normalized);

    const localParticipant = currentParticipants.local;
    if (localParticipant) {
      setCameraEnabled(isTrackPlayable(localParticipant.tracks?.video));
      setMicrophoneEnabled(isTrackPlayable(localParticipant.tracks?.audio));
    }
  }, []);

  const joinCall = useCallback(async () => {
    const callObject = callObjectRef.current;

    if (!callObject || !roomUrl) {
      setError('Видео-комната ещё не готова. Попробуйте позже.');
      return;
    }

    clearReconnectTimeout();
    setIsLoading(true);
    setError(null);

    try {
      await callObject.join({
        url: roomUrl,
        token: token ?? undefined,
        userName,
        showLeaveButton: true,
        showFullscreenButton: true
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось подключиться к Daily.co';
      setError(message);
      setIsLoading(false);
      throw err;
    }
  }, [clearReconnectTimeout, roomUrl, token, userName]);

  const scheduleReconnect = useCallback(() => {
    if (!roomUrl) {
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectionAttempts) {
      return;
    }

    reconnectAttemptsRef.current += 1;
    const backoff = 1000 * reconnectAttemptsRef.current;

    clearReconnectTimeout();
    reconnectTimeoutRef.current = setTimeout(() => {
      if (manualLeaveRef.current) {
        return;
      }

      void joinCall();
    }, backoff);
  }, [clearReconnectTimeout, joinCall, maxReconnectionAttempts, roomUrl]);

  const handleJoined = useCallback(() => {
    clearReconnectTimeout();
    reconnectAttemptsRef.current = 0;
    manualLeaveRef.current = false;
    setIsLoading(false);
    setIsConnected(true);
    setError(null);
    updateParticipantState();
  }, [clearReconnectTimeout, updateParticipantState]);

  const handleJoining = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const handleParticipantEvent = useCallback(() => {
    updateParticipantState();
  }, [updateParticipantState]);

  const handleLeft = useCallback(() => {
    setIsConnected(false);
    setIsLoading(false);
    updateParticipantState();

    if (manualLeaveRef.current) {
      manualLeaveRef.current = false;
      return;
    }

    scheduleReconnect();
  }, [scheduleReconnect, updateParticipantState]);

  const handleError = useCallback(
    (event: DailyEventObject<'error'>) => {
      const message = event?.error?.message ?? 'Не удалось подключиться к видео-сессии';
      setError(message);
      setIsConnected(false);
      setIsLoading(false);
      updateParticipantState();

      if (!manualLeaveRef.current) {
        scheduleReconnect();
      }
    },
    [scheduleReconnect, updateParticipantState]
  );

  const attachEventHandlers = useCallback(
    (callObject: DailyCall) => {
      eventHandlersRef.current.forEach(([event, handler]) => {
        callObject.off(event, handler);
      });

      const handlers: EventHandler[] = [
        ['joining-meeting', handleJoining],
        ['joined-meeting', handleJoined],
        ['left-meeting', handleLeft],
        ['participant-joined', handleParticipantEvent],
        ['participant-updated', handleParticipantEvent],
        ['participant-left', handleParticipantEvent],
        ['participant-counts-updated', handleParticipantEvent],
        ['track-started', handleParticipantEvent],
        ['track-stopped', handleParticipantEvent],
        ['error', handleError]
      ];

      handlers.forEach(([event, handler]) => {
        callObject.on(event, handler as (event: DailyEventObject) => void);
      });

      eventHandlersRef.current = handlers;
    },
    [handleError, handleJoined, handleJoining, handleLeft, handleParticipantEvent]
  );

  const leaveCall = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      return;
    }

    manualLeaveRef.current = true;
    clearReconnectTimeout();
    setIsLoading(true);

    try {
      await callObject.leave();
    } finally {
      setIsLoading(false);
    }
  }, [clearReconnectTimeout]);

  const toggleCamera = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      return;
    }

    const current = callObject.participants().local;
    const nextState = !isTrackPlayable(current?.tracks?.video);

    try {
      callObject.setLocalVideo(nextState);
      setCameraEnabled(nextState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось переключить камеру';
      setError(message);
      throw err;
    }
  }, []);

  const toggleMicrophone = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      return;
    }

    const current = callObject.participants().local;
    const nextState = !isTrackPlayable(current?.tracks?.audio);

    try {
      callObject.setLocalAudio(nextState);
      setMicrophoneEnabled(nextState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось переключить микрофон';
      setError(message);
      throw err;
    }
  }, []);

  const retry = useCallback(async () => {
    reconnectAttemptsRef.current = 0;
    manualLeaveRef.current = false;
    await joinCall();
  }, [joinCall]);

  useEffect(() => {
    if (!roomUrl || typeof window === 'undefined') {
      return () => {
        clearReconnectTimeout();
      };
    }

    let disposed = false;

    const setup = async () => {
      try {
        const dailyModule = await loadDailyModule();
        if (disposed) {
          return;
        }

        const DailyIframe = dailyModule.default ?? dailyModule;
        const container = containerRef.current;

        if (!container) {
          return;
        }

        const callObject = DailyIframe.createFrame(container, {
          showLeaveButton: true,
          showFullscreenButton: true,
          theme: createDarkTheme(),
          iframeStyle: {
            position: 'relative',
            width: '100%',
            height: '100%',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '24px',
            backgroundColor: '#0f172a'
          },
          dailyConfig: {
            subscribeToTracksAutomatically: true
          }
        });

        callObjectRef.current = callObject;
        attachEventHandlers(callObject);
        updateParticipantState();

        if (autoJoin) {
          await joinCall();
        }
      } catch (err) {
        if (disposed) {
          return;
        }

        const message = err instanceof Error ? err.message : 'Не удалось инициализировать Daily.co';
        setError(message);
        setIsLoading(false);
      }
    };

    void setup();

    return () => {
      disposed = true;
      clearReconnectTimeout();

      const callObject = callObjectRef.current;
      if (callObject) {
        eventHandlersRef.current.forEach(([event, handler]) => {
          callObject.off(event, handler);
        });

        callObjectRef.current = null;
        eventHandlersRef.current = [];
        void callObject.destroy().catch(() => {});
      }

      setIsConnected(false);
      setIsLoading(false);
      setParticipants({});
    };
  }, [attachEventHandlers, autoJoin, clearReconnectTimeout, joinCall, roomUrl, updateParticipantState]);

  const participantsCount = useMemo(() => {
    return Object.values(participants).filter((participant) => Boolean(participant?.session_id)).length;
  }, [participants]);

  return {
    containerRef,
    isConnected,
    isLoading,
    error,
    participants,
    participantsCount,
    cameraEnabled,
    microphoneEnabled,
    join: joinCall,
    leaveCall,
    toggleCamera,
    toggleMicrophone,
    retry
  };
}
