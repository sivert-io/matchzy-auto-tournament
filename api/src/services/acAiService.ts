import { db } from '../config/database';

type AcAiSignalInput = {
  playerId: string;
  matchSlug?: string;
  signalType: string;
  payload?: Record<string, unknown>;
  score?: number;
};

type AcAiScoreRow = {
  player_id: string;
  score: number | string;
  signal_count: number;
  last_signal_at: number | null;
  updated_at: number;
};

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function numeric(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

function estimateSignalScore(signalType: string, payload: Record<string, unknown>): number {
  if (typeof payload.riskScore === 'number') {
    return clamp(payload.riskScore, 0, 100);
  }

  const normalizedType = signalType.toLowerCase();
  if (normalizedType.includes('ban') || normalizedType.includes('tamper')) return 95;
  if (normalizedType.includes('integrity') || normalizedType.includes('memory')) return 80;
  if (normalizedType.includes('aim')) {
    return clamp(numeric(payload, 'headshotRate') * 50 + numeric(payload, 'flickConsistency') * 50, 0, 100);
  }
  if (normalizedType.includes('demo')) {
    return clamp(numeric(payload, 'suspiciousRounds') * 8 + numeric(payload, 'confidence') * 35, 0, 100);
  }

  return clamp(numeric(payload, 'confidence') * 100, 0, 100);
}

export async function ingestAcAiSignal(input: AcAiSignalInput): Promise<{
  playerId: string;
  matchSlug: string | null;
  signalType: string;
  signalScore: number;
  playerScore: number;
  signalCount: number;
}> {
  const playerId = input.playerId.trim();
  const signalType = input.signalType.trim();

  if (!playerId) throw new Error('playerId is required');
  if (!signalType) throw new Error('signalType is required');

  const payload = input.payload ?? {};
  const signalScore = clamp(
    typeof input.score === 'number' ? input.score : estimateSignalScore(signalType, payload),
    0,
    100
  );
  const matchSlug = input.matchSlug?.trim() || null;

  await db.runAsync(
    `
      INSERT INTO ac_ai_signals (player_id, match_slug, signal_type, payload, score)
      VALUES (?, ?, ?, ?, ?)
    `,
    [playerId, matchSlug, signalType, JSON.stringify(payload), signalScore]
  );

  const aggregate = await db.queryOneAsync<{ avg_score: string; signal_count: string; last_signal_at: number }>(
    `
      SELECT
        COALESCE(AVG(score), 0)::TEXT AS avg_score,
        COUNT(*)::TEXT AS signal_count,
        MAX(created_at) AS last_signal_at
      FROM ac_ai_signals
      WHERE player_id = ?
    `,
    [playerId]
  );

  const playerScore = clamp(Number(aggregate?.avg_score ?? 0), 0, 100);
  const signalCount = Number(aggregate?.signal_count ?? 0);
  const lastSignalAt = aggregate?.last_signal_at ?? Math.floor(Date.now() / 1000);

  await db.runAsync(
    `
      INSERT INTO ac_ai_player_scores (player_id, score, signal_count, last_signal_at, updated_at)
      VALUES (?, ?, ?, ?, EXTRACT(EPOCH FROM NOW())::INTEGER)
      ON CONFLICT(player_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        signal_count = EXCLUDED.signal_count,
        last_signal_at = EXCLUDED.last_signal_at,
        updated_at = EXTRACT(EPOCH FROM NOW())::INTEGER
    `,
    [playerId, playerScore, signalCount, lastSignalAt]
  );

  return { playerId, matchSlug, signalType, signalScore, playerScore, signalCount };
}

export async function getAcAiPlayerScore(playerId: string): Promise<AcAiScoreRow | undefined> {
  return db.queryOneAsync<AcAiScoreRow>(
    'SELECT player_id, score, signal_count, last_signal_at, updated_at FROM ac_ai_player_scores WHERE player_id = ?',
    [playerId]
  );
}

export async function listAcAiScores(limit = 50): Promise<AcAiScoreRow[]> {
  return db.queryAsync<AcAiScoreRow>(
    `
      SELECT player_id, score, signal_count, last_signal_at, updated_at
      FROM ac_ai_player_scores
      ORDER BY score DESC, updated_at DESC
      LIMIT ?
    `,
    [clamp(limit, 1, 200)]
  );
}
