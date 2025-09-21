import type { CandidateProfile, InterviewerProfile } from '@prisma/client';

import type { MatchRequestWithResultDto } from '../../../shared/src/types/matching.js';
import { createNotification } from './notifications.js';

export type MatchScheduledHookContext = {
  request: MatchRequestWithResultDto;
  candidate: CandidateProfile;
  interviewer: InterviewerProfile;
  slot: { start: Date; end: Date };
};

export type MatchSchedulingHooks = {
  onScheduled?: (context: MatchScheduledHookContext) => Promise<void> | void;
};

async function postWebhook(url: string, body: Record<string, unknown>) {
  if (!url) {
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Match webhook responded with non-2xx status', response.status, text);
    }
  } catch (error) {
    console.error('Failed to deliver match webhook', error);
  }
}

function buildEventPayload(context: MatchScheduledHookContext) {
  const { request, candidate, interviewer, slot } = context;
  const match = request.result;

  if (!match || !match.scheduledAt) {
    return null;
  }

  return {
    matchId: match.id,
    requestId: request.id,
    scheduledAt: match.scheduledAt,
    slot: {
      start: slot.start.toISOString(),
      end: slot.end.toISOString()
    },
    candidate: {
      id: candidate.id,
      displayName: candidate.displayName,
      timezone: candidate.timezone,
      userId: candidate.userId
    },
    interviewer: {
      id: interviewer.id,
      displayName: interviewer.displayName,
      timezone: interviewer.timezone,
      userId: interviewer.userId
    }
  } satisfies Record<string, unknown>;
}

export function createMatchSchedulingHooks(options: { webhookUrl?: string | null } = {}): MatchSchedulingHooks {
  const webhookUrl = options.webhookUrl ?? null;

  return {
    async onScheduled(context) {
      const payload = buildEventPayload(context);

      if (!payload) {
        return;
      }

      const tasks: Promise<unknown>[] = [];

      if (context.candidate.userId) {
        tasks.push(
          createNotification({
            userId: context.candidate.userId,
            type: 'match.scheduled',
            channel: 'in-app',
            payload: {
              ...payload,
              role: 'candidate'
            }
          }).catch((error) => {
            console.error('Failed to create candidate match notification', error);
          })
        );
      }

      if (context.interviewer.userId) {
        tasks.push(
          createNotification({
            userId: context.interviewer.userId,
            type: 'match.assigned',
            channel: 'in-app',
            payload: {
              ...payload,
              role: 'interviewer'
            }
          }).catch((error) => {
            console.error('Failed to create interviewer match notification', error);
          })
        );
      }

      if (webhookUrl) {
        tasks.push(
          postWebhook(webhookUrl, {
            event: 'match.scheduled',
            data: payload
          })
        );
      }

      await Promise.all(tasks);
    }
  };
}
