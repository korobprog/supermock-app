export type RealtimeSessionStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export type SessionParticipantRole = 'HOST' | 'INTERVIEWER' | 'CANDIDATE' | 'OBSERVER';

export interface SessionParticipantDto {
  id: string;
  sessionId: string;
  userId?: string | null;
  role: SessionParticipantRole;
  joinedAt: string;
  lastSeenAt: string;
  leftAt?: string | null;
  connectionId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface RealtimeSessionDto {
  id: string;
  matchId?: string | null;
  hostId: string;
  status: RealtimeSessionStatus;
  startedAt: string;
  endedAt?: string | null;
  lastHeartbeat?: string | null;
  metadata?: Record<string, unknown>;
  participants: SessionParticipantDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRealtimeSessionPayload {
  matchId?: string;
  hostId: string;
  status?: RealtimeSessionStatus;
  metadata?: Record<string, unknown>;
}

export interface JoinRealtimeSessionPayload {
  userId?: string;
  role?: SessionParticipantRole;
  connectionId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRealtimeSessionStatusPayload {
  status: RealtimeSessionStatus;
  endedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface HeartbeatPayload {
  participantId?: string;
  timestamp?: string;
}

export interface RealtimeSessionListQuery {
  status?: RealtimeSessionStatus;
  hostId?: string;
  matchId?: string;
  activeOnly?: boolean;
}

export type NotificationChannel = 'in-app' | 'email' | 'telegram' | 'push' | string;

export type NotificationImportance = 'low' | 'normal' | 'high';

export type NotificationSource = 'matching' | 'system' | 'profile' | string;

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  channel?: NotificationChannel | null;
  payload?: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
  source?: NotificationSource;
  importance?: NotificationImportance;
}

export interface CreateNotificationPayload {
  userId: string;
  type: string;
  channel?: NotificationChannel;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  source?: NotificationSource;
  importance?: NotificationImportance;
}

export interface MarkNotificationsReadPayload {
  notificationIds?: string[];
  before?: string;
}
