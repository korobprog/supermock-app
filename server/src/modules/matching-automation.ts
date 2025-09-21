import { MatchStatus, type MatchRequest } from '@prisma/client';

import type { MatchPreviewDto } from '../../../shared/src/types/matching.js';
import type { DailyCoService } from './daily-co.js';
import { getMatchPreviews, scheduleMatch, type MatchSchedulingHooks } from './matching.js';
import { onMatchRequestCreated } from './matching-events.js';
import { prisma } from './prisma.js';

const DEFAULT_POLL_INTERVAL_MS = 15_000;

type MatchingAutomationOptions = {
  dailyCoService?: DailyCoService | null;
  hooks?: MatchSchedulingHooks;
  pollIntervalMs?: number;
};

type SlotCandidate = {
  availabilityId: string;
  start: Date;
  end: Date;
  score: number;
  meetsThreshold: boolean;
};

function selectBestCandidate(previews: MatchPreviewDto[]): SlotCandidate | null {
  const now = Date.now();
  const candidates: SlotCandidate[] = [];

  for (const preview of previews) {
    for (const availability of preview.availability) {
      const start = new Date(availability.start);
      const end = new Date(availability.end);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        continue;
      }

      if (start.getTime() <= now) {
        continue;
      }

      candidates.push({
        availabilityId: availability.id,
        start,
        end,
        score: preview.score.percentage,
        meetsThreshold: preview.score.meetsThreshold
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const viable = candidates.filter((candidate) => candidate.meetsThreshold);
  const pool = viable.length > 0 ? viable : candidates;

  pool.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    if (a.start.getTime() !== b.start.getTime()) {
      return a.start.getTime() - b.start.getTime();
    }

    return a.availabilityId.localeCompare(b.availabilityId);
  });

  return pool[0];
}

class MatchingAutomation {
  private queue = new Set<string>();
  private processing = false;
  private unsubscribe?: () => void;
  private timer?: NodeJS.Timeout;
  private options: MatchingAutomationOptions = {};

  start(options: MatchingAutomationOptions = {}) {
    this.options = options;

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = onMatchRequestCreated(({ requestId }) => this.enqueue(requestId));

    if (this.timer) {
      clearInterval(this.timer);
    }

    const interval = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

    if (interval > 0) {
      this.timer = setInterval(() => {
        void this.populateFromDatabase();
      }, interval).unref();
    }

    void this.populateFromDatabase();
  }

  enqueue(requestId: string) {
    if (!requestId) {
      return;
    }

    this.queue.add(requestId);
    void this.process();
  }

  private async populateFromDatabase() {
    try {
      const outstanding = await prisma.matchRequest.findMany({
        where: { status: MatchStatus.QUEUED },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
        take: 25
      });

      for (const record of outstanding) {
        this.queue.add(record.id);
      }

      if (outstanding.length > 0) {
        await this.process();
      }
    } catch (error) {
      console.error('Failed to populate matching queue', error);
    }
  }

  private async process() {
    if (this.processing) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.size > 0) {
        const iterator = this.queue.values().next();

        if (iterator.done) {
          break;
        }

        const requestId = iterator.value;
        this.queue.delete(requestId);
        await this.handleRequest(requestId);
      }
    } finally {
      this.processing = false;
    }
  }

  private async handleRequest(requestId: string) {
    let request: MatchRequest | null = null;

    try {
      request = await prisma.matchRequest.findUnique({
        where: { id: requestId }
      });
    } catch (error) {
      console.error('Failed to load match request for automation', { requestId, error });
      return;
    }

    if (!request || request.status !== MatchStatus.QUEUED) {
      return;
    }

    const previews = await getMatchPreviews(requestId);

    if (!previews || previews.length === 0) {
      return;
    }

    const best = selectBestCandidate(previews);

    if (!best) {
      return;
    }

    try {
      const scheduled = await scheduleMatch(
        requestId,
        { availabilityId: best.availabilityId },
        { dailyCoService: this.options.dailyCoService ?? null, hooks: this.options.hooks }
      );

      if (!scheduled) {
        console.warn('Matching automation failed to schedule request', requestId);
      }
    } catch (error) {
      console.error('Matching automation encountered an error while scheduling', { requestId, error });
    }
  }
}

export const matchingAutomation = new MatchingAutomation();

export function startMatchingAutomation(options: MatchingAutomationOptions = {}) {
  matchingAutomation.start(options);
  return matchingAutomation;
}

export function enqueueMatchRequest(requestId: string) {
  matchingAutomation.enqueue(requestId);
}
