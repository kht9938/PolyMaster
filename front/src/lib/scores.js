import { isSupabaseConfigured, supabase } from './supabase';

const SCORE_TABLE = 'scores';

export async function fetchHighScores(limit = 20) {
  ensureSupabaseConfigured();

  const { data, error } = await supabase
    .from(SCORE_TABLE)
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data ?? [];
}

export async function createScore(score) {
  ensureSupabaseConfigured();

  const { data, error } = await supabase
    .from(SCORE_TABLE)
    .insert(toScoreRow(score))
    .select()
    .single();

  if (error) throw error;

  return data;
}

function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }
}

function toScoreRow(score) {
  return {
    nickname: score.nickname,
    score: score.score,
    max_combo: score.maxCombo,
    bpm: score.bpm,
    speed: score.speed,
    mode: score.mode,
    full_combo: score.fullCombo,
    judgements: score.judgements,
  };
}
