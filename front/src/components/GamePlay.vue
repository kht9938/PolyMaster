<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

import { createScore } from '../lib/scores';

const emit = defineEmits(['exit']);

const props = defineProps({
  mode: {
    type: String,
    default: 'practice',
  },
  rhythm: {
    type: Object,
    default: null,
  },
});

const LANES = {
  LEFT: 'left',
  RIGHT: 'right',
};

const BASE_SIDE_TO_LANE = {
  LEFT: LANES.LEFT,
  RIGHT: LANES.RIGHT,
};

const KEYS = {
  f: LANES.LEFT,
  j: LANES.RIGHT,
};

const RHYTHM_PAIRS = [
  { base: 2, other: 3, bpm: 150, measureCount: 4 },
  { base: 4, other: 3, bpm: 150, measureCount: 4 },
  { base: 4, other: 5, bpm: 150, measureCount: 4 },
  { base: 4, other: 7, bpm: 150, measureCount: 4 },
  { base: 8, other: 7, bpm: 150, measureCount: 2 },
  { base: 8, other: 9, bpm: 150, measureCount: 2 },
];

const CHALLENGE_EXTRA_SEQUENCE = [
  { base: 4, other: 5, baseSide: 'LEFT', measureCount: 1 },
  { base: 4, other: 5, baseSide: 'RIGHT', measureCount: 1 },
  { base: 4, other: 5, baseSide: 'LEFT', measureCount: 1 },
  { base: 4, other: 5, baseSide: 'RIGHT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'LEFT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'RIGHT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'LEFT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'RIGHT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'LEFT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'RIGHT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'LEFT', measureCount: 1 },
  { base: 2, other: 3, baseSide: 'RIGHT', measureCount: 1 },
];

const FALL_DURATION = 0.5;
const BASE_NOTE_SPEED = 100 / FALL_DURATION;
const JUDGE_LINE_Y = 85;
const NOTE_HEIGHT_PX = 28;

const JUDGE_RULES = [
  { name: 'PERFECT', window: 0.05, point: 1000 },
  { name: 'GOOD', window: 0.1, point: 500 },
  { name: 'BAD', window: 0.16, point: 100 },
];

const BAD_WINDOW = JUDGE_RULES[JUDGE_RULES.length - 1].window;
const EMPTY_MEASURES = 2;
const PRACTICE_MEASURES = 32;
const CHALLENGE_DEFAULT_MEASURES = 4;
const CLICK_LOOKAHEAD = 0.015;
const SPEED_STORAGE_KEY = 'poly-note-speed';
const BPM_STORAGE_KEY = 'poly-bpm';
const CENTER_SPEED_MULTIPLIER = 0.85;
const MIN_DISPLAYED_SPEED = 0.5;
const MAX_DISPLAYED_SPEED = 1.5;
const DISPLAYED_SPEED_STEP = 0.05;
const MIN_SPEED_MULTIPLIER = CENTER_SPEED_MULTIPLIER * MIN_DISPLAYED_SPEED;
const MAX_SPEED_MULTIPLIER = CENTER_SPEED_MULTIPLIER * MAX_DISPLAYED_SPEED;
const DEFAULT_SPEED_MULTIPLIER = CENTER_SPEED_MULTIPLIER;
const MIN_BPM = 70;
const MAX_BPM = 200;
const DEFAULT_BPM = 100;
const BPM_STEP = 5;
const SCORE_BPM_BASE = 100;
const MAX_NICKNAME_LENGTH = 12;

const CLICK_SOUNDS = {
  BASE: {
    frequency: 180,
    duration: 0.07,
    type: 'square',
    volume: 0.9,
  },
  SUB: {
    frequency: 920,
    duration: 0.035,
    type: 'sine',
    volume: 0.56,
  },
};

const isPlaying = ref(false);
const startTime = ref(0);
const currentTime = ref(0);

const sections = ref([]);
const notes = ref([]);
const measureLines = ref([]);
const hitEffects = ref([]);

const judgement = ref('');
const timingFeedback = ref(null);
const score = ref(0);
const combo = ref(0);
const maxCombo = ref(0);
const speedMultiplier = ref(loadSpeedMultiplier());
const selectedBpm = ref(loadBpm());
const resultVisible = ref(false);
const resultPending = ref(false);
const judgeCounts = ref(createEmptyJudgeCounts());
const nickname = ref(localStorage.getItem('poly-nickname') ?? '');
const scoreSubmitStatus = ref('');
const scoreSubmitError = ref('');
const isSubmittingScore = ref(false);
const hasSubmittedScore = ref(false);

const leftFlash = ref(false);
const rightFlash = ref(false);

let animationId = null;
let noteId = 0;
let lineId = 0;
let effectId = 0;
let audioContext = null;
let resultTimerId = null;

const bpm = computed(
  () => currentSection.value?.bpm ?? selectedBpm.value,
);

const currentSection = computed(() => {
  if (sections.value.length === 0) return null;

  return (
    sections.value.find((section) => {
      return (
        currentTime.value >= section.startTime &&
        currentTime.value < section.endTime
      );
    }) ?? sections.value[0]
  );
});

const leftCount = computed(
  () => currentSection.value?.leftCount ?? props.rhythm?.leftCount ?? 0,
);
const rightCount = computed(
  () => currentSection.value?.rightCount ?? props.rhythm?.rightCount ?? 0,
);
const baseSide = computed(
  () => currentSection.value?.baseSide ?? props.rhythm?.baseSide ?? 'LEFT',
);

const isDemoMode = computed(() => props.mode === 'demo');
const isChallengePatternMode = computed(
  () => props.mode === 'challenge' || isDemoMode.value,
);
const modeText = computed(() => {
  if (isDemoMode.value) return '데모 플레이';
  if (props.mode === 'challenge') return '실전모드';

  return '연습모드';
});

const leftIsBase = computed(() => baseSide.value === 'LEFT');
const rightIsBase = computed(() => baseSide.value === 'RIGHT');

const visibleLeftNotes = computed(() => getVisibleNotesByLane(LANES.LEFT));
const visibleRightNotes = computed(() => getVisibleNotesByLane(LANES.RIGHT));
const leftHitEffects = computed(() => getHitEffectsByLane(LANES.LEFT));
const rightHitEffects = computed(() => getHitEffectsByLane(LANES.RIGHT));
const noteSpeed = computed(() => BASE_NOTE_SPEED * speedMultiplier.value);
const displayedSpeed = computed(
  () => speedMultiplier.value / CENTER_SPEED_MULTIPLIER,
);
const speedText = computed(() => `${displayedSpeed.value.toFixed(2)}x`);
const bpmControlText = computed(() => `${selectedBpm.value} BPM`);
const scoreMultiplier = computed(() => selectedBpm.value / SCORE_BPM_BASE);
const scoreMultiplierText = computed(
  () => `점수배율 ${scoreMultiplier.value.toFixed(2)}배`,
);
const isFullCombo = computed(
  () => resultVisible.value && judgeCounts.value.MISS === 0,
);
const canSubmitScore = computed(() => {
  return (
    resultVisible.value &&
    props.mode === 'challenge' &&
    nickname.value.trim().length > 0 &&
    !isSubmittingScore.value &&
    !hasSubmittedScore.value
  );
});

function getNow() {
  return performance.now() / 1000;
}

function loadSpeedMultiplier() {
  const savedValue = localStorage.getItem(SPEED_STORAGE_KEY);
  if (savedValue === null) return DEFAULT_SPEED_MULTIPLIER;

  const savedSpeed = Number(savedValue);

  if (Number.isFinite(savedSpeed)) {
    return clampSpeed(savedSpeed);
  }

  return DEFAULT_SPEED_MULTIPLIER;
}

function loadBpm() {
  const savedValue = localStorage.getItem(BPM_STORAGE_KEY);
  if (savedValue === null) return DEFAULT_BPM;

  const savedBpm = Number(savedValue);

  if (Number.isFinite(savedBpm)) {
    return clampBpm(savedBpm);
  }

  return DEFAULT_BPM;
}

function setSpeedMultiplier(value) {
  speedMultiplier.value = clampSpeed(Number(value));
  localStorage.setItem(SPEED_STORAGE_KEY, String(speedMultiplier.value));
}

function setBpm(value) {
  selectedBpm.value = clampBpm(Number(value));
  localStorage.setItem(BPM_STORAGE_KEY, String(selectedBpm.value));
}

function adjustBpm(amount) {
  setBpm(selectedBpm.value + amount);
}

function setDisplayedSpeed(value) {
  setSpeedMultiplier(Number(value) * CENTER_SPEED_MULTIPLIER);
}

function adjustSpeed(amount) {
  setDisplayedSpeed(displayedSpeed.value + amount);
}

function clampSpeed(value) {
  if (!Number.isFinite(value)) return DEFAULT_SPEED_MULTIPLIER;

  return Math.min(
    MAX_SPEED_MULTIPLIER,
    Math.max(MIN_SPEED_MULTIPLIER, Number(value.toFixed(4))),
  );
}

function clampBpm(value) {
  if (!Number.isFinite(value)) return DEFAULT_BPM;

  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

function startGame() {
  isPlaying.value = true;
  startTime.value = getNow();
  currentTime.value = 0;

  prepareAudio();
  resetGameState();
  generateSections();
  generateMeasureLines();
  generateNotes();

  if (animationId) cancelAnimationFrame(animationId);
  if (resultTimerId) clearTimeout(resultTimerId);

  gameLoop();
}

function prepareAudio() {
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function resetGameState() {
  sections.value = [];
  notes.value = [];
  measureLines.value = [];
  hitEffects.value = [];
  judgement.value = '';
  timingFeedback.value = null;
  score.value = 0;
  combo.value = 0;
  maxCombo.value = 0;
  resultVisible.value = false;
  resultPending.value = false;
  judgeCounts.value = createEmptyJudgeCounts();
  scoreSubmitStatus.value = '';
  scoreSubmitError.value = '';
  hasSubmittedScore.value = false;

  noteId = 0;
  lineId = 0;
  effectId = 0;
}

function createEmptyJudgeCounts() {
  return {
    PERFECT: 0,
    GOOD: 0,
    BAD: 0,
    MISS: 0,
  };
}

function getMeasureDuration(section) {
  return (60 / section.bpm) * section.beatsPerMeasure;
}

function generateSections() {
  if (isChallengePatternMode.value) {
    generateChallengeSections();
  } else {
    generatePracticeSections();
  }
}

function generatePracticeSections() {
  const rhythm = props.rhythm;
  if (!rhythm) return;

  const section = {
    leftCount: rhythm.leftCount,
    rightCount: rhythm.rightCount,
    baseSide: rhythm.baseSide,
    beatsPerMeasure: rhythm.beatsPerMeasure,
    bpm: selectedBpm.value,
    measureCount: PRACTICE_MEASURES,
    type: 'practice',
  };

  const introDuration = EMPTY_MEASURES * getMeasureDuration(section);
  const sectionDuration = PRACTICE_MEASURES * getMeasureDuration(section);

  sections.value.push({
    ...section,
    startTime: introDuration,
    endTime: introDuration + sectionDuration,
  });
}

function generateChallengeSections() {
  const rawSections = [];

  RHYTHM_PAIRS.forEach((pair) => {
    rawSections.push(createChallengeSection(pair, 'LEFT'));
    rawSections.push(createChallengeSection(pair, 'RIGHT'));
  });

  CHALLENGE_EXTRA_SEQUENCE.forEach((pattern) => {
    rawSections.push(createChallengeSection(pattern, pattern.baseSide));
  });

  const firstMeasureDuration = getMeasureDuration(rawSections[0]);
  let timeCursor = EMPTY_MEASURES * firstMeasureDuration;

  rawSections.forEach((section) => {
    const duration = section.measureCount * getMeasureDuration(section);

    sections.value.push({
      ...section,
      startTime: timeCursor,
      endTime: timeCursor + duration,
    });

    timeCursor += duration;
  });
}

function createChallengeSection(pattern, baseSide) {
  const baseOnLeft = baseSide === 'LEFT';

  return {
    leftCount: baseOnLeft ? pattern.base : pattern.other,
    rightCount: baseOnLeft ? pattern.other : pattern.base,
    baseSide,
    beatsPerMeasure: pattern.base,
    bpm: selectedBpm.value,
    measureCount: pattern.measureCount ?? CHALLENGE_DEFAULT_MEASURES,
  };
}

function generateNotes() {
  sections.value.forEach((section) => {
    const measureDuration = getMeasureDuration(section);

    for (let m = 0; m < section.measureCount; m++) {
      const measureStart = section.startTime + m * measureDuration;

      addMeasureNotes(
        LANES.LEFT,
        section.leftCount,
        section,
        measureStart,
        measureDuration,
      );
      addMeasureNotes(
        LANES.RIGHT,
        section.rightCount,
        section,
        measureStart,
        measureDuration,
      );
    }
  });
}

function addMeasureNotes(lane, count, section, measureStart, measureDuration) {
  for (let i = 0; i < count; i++) {
    notes.value.push({
      id: noteId++,
      lane,
      hitTime: measureStart + i * (measureDuration / count),
      isBase: lane === BASE_SIDE_TO_LANE[section.baseSide],
      clickPlayed: false,
      judged: false,
      missed: false,
    });
  }
}

function generateMeasureLines() {
  if (sections.value.length === 0) return;

  const firstSection = sections.value[0];
  const firstMeasureDuration = getMeasureDuration(firstSection);

  for (let m = 0; m < EMPTY_MEASURES; m++) {
    measureLines.value.push({
      id: lineId++,
      hitTime: m * firstMeasureDuration,
      measureNumber: m + 1,
      type: 'normal',
      label: '',
    });
  }

  let globalMeasure = EMPTY_MEASURES + 1;

  sections.value.forEach((section, sectionIndex) => {
    const measureDuration = getMeasureDuration(section);

    for (let m = 0; m <= section.measureCount; m++) {
      const isSectionStart = m === 0;
      const isChangeLine = sectionIndex > 0 && isSectionStart;

      if (sectionIndex > 0 && m === 0) {
        measureLines.value.push({
          id: lineId++,
          hitTime: section.startTime,
          measureNumber: globalMeasure,
          type: 'change',
          label: '',
        });
      } else if (sectionIndex === 0 || m > 0) {
        measureLines.value.push({
          id: lineId++,
          hitTime: section.startTime + m * measureDuration,
          measureNumber: globalMeasure,
          type: isChangeLine ? 'change' : 'normal',
          label: '',
        });
      }

      if (m > 0) globalMeasure++;
    }
  });
}

function getYByHitTime(hitTime) {
  const timeUntilHit = hitTime - currentTime.value;
  return JUDGE_LINE_Y - timeUntilHit * noteSpeed.value;
}

function getNoteY(note) {
  return getYByHitTime(note.hitTime);
}

function getNoteTransform(note) {
  return `translate(-50%, calc(${getNoteY(note)}vh - ${NOTE_HEIGHT_PX / 2}px))`;
}

function gameLoop() {
  currentTime.value = getNow() - startTime.value;

  if (isDemoMode.value) {
    playDueNoteClicks();
    autoPlayDueNotes();
  }

  notes.value.forEach((note) => {
    if (!note.judged && !note.missed) {
      const diff = currentTime.value - note.hitTime;

      if (diff > BAD_WINDOW) {
        note.missed = true;
        judgement.value = 'MISS';
        judgeCounts.value.MISS++;
        combo.value = 0;
      }
    }
  });

  checkGameComplete();

  animationId = requestAnimationFrame(gameLoop);
}

function playDueNoteClicks() {
  notes.value.forEach((note) => {
    if (note.clickPlayed || currentTime.value + CLICK_LOOKAHEAD < note.hitTime) {
      return;
    }

    note.clickPlayed = true;
    playClick(note.isBase);
  });
}

function playClick(isBase) {
  if (!audioContext) return;

  const sound = isBase ? CLICK_SOUNDS.BASE : CLICK_SOUNDS.SUB;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = sound.type;
  oscillator.frequency.setValueAtTime(sound.frequency, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(sound.volume, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + sound.duration);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start(now);
  oscillator.stop(now + sound.duration + 0.01);
}

function autoPlayDueNotes() {
  getPlayableNotes()
    .filter((note) => currentTime.value >= note.hitTime)
    .forEach((note) => {
      applyJudge(note, 'PERFECT', 1000);
    });
}

function checkGameComplete() {
  if (!isPlaying.value || resultVisible.value || notes.value.length === 0) {
    return;
  }

  const hasRemainingNotes = notes.value.some(
    (note) => !note.judged && !note.missed,
  );

  if (hasRemainingNotes) return;

  finishGame();
}

function finishGame() {
  isPlaying.value = false;
  resultPending.value = true;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  resultTimerId = setTimeout(() => {
    resultPending.value = false;
    resultVisible.value = true;
    resultTimerId = null;
  }, 2000);
}

async function submitScore() {
  const playerName = nickname.value.trim().slice(0, MAX_NICKNAME_LENGTH);

  if (!playerName || props.mode !== 'challenge') return;

  isSubmittingScore.value = true;
  scoreSubmitStatus.value = '';
  scoreSubmitError.value = '';

  try {
    const payload = {
      nickname: playerName,
      score: score.value,
      maxCombo: maxCombo.value,
      bpm: selectedBpm.value,
      speed: Number(displayedSpeed.value.toFixed(2)),
      mode: props.mode,
      fullCombo: isFullCombo.value,
      judgements: { ...judgeCounts.value },
      createdAt: new Date().toISOString(),
    };

    await createScore(payload);

    localStorage.setItem('poly-nickname', playerName);
    nickname.value = playerName;
    hasSubmittedScore.value = true;
    scoreSubmitStatus.value = '점수가 등록되었습니다.';
  } catch (error) {
    scoreSubmitError.value = error.message;
  } finally {
    isSubmittingScore.value = false;
  }
}

function handleKeyDown(e) {
  if (
    !isPlaying.value &&
    !resultVisible.value &&
    !resultPending.value &&
    e.code === 'Space'
  ) {
    e.preventDefault();
    startGame();
    return;
  }

  if (!isPlaying.value || isDemoMode.value) return;

  const key = e.key.toLowerCase();
  const lane = KEYS[key];
  if (!lane) return;

  playClick(lane === BASE_SIDE_TO_LANE[baseSide.value]);

  const targetNote = findClosestNote(lane);
  if (!targetNote) return;

  const diff = Math.abs(currentTime.value - targetNote.hitTime);
  const judgeRule = JUDGE_RULES.find((rule) => diff <= rule.window);

  if (judgeRule) {
    applyJudge(
      targetNote,
      judgeRule.name,
      judgeRule.point,
      currentTime.value - targetNote.hitTime,
    );
  }
}

function findClosestNote(lane) {
  return getPlayableNotes()
    .filter((note) => note.lane === lane)
    .reduce((closestNote, note) => {
      if (!closestNote) return note;

      const closestDiff = Math.abs(closestNote.hitTime - currentTime.value);
      const noteDiff = Math.abs(note.hitTime - currentTime.value);

      return noteDiff < closestDiff ? note : closestNote;
    }, null);
}

function getPlayableNotes() {
  return notes.value.filter((note) => !note.judged && !note.missed);
}

function getVisibleNotesByLane(lane) {
  return getPlayableNotes().filter((note) => note.lane === lane);
}

function getHitEffectsByLane(lane) {
  return hitEffects.value.filter((effect) => effect.lane === lane);
}

function applyJudge(note, judge, point, timingDiff = 0) {
  note.judged = true;
  judgement.value = judge;
  judgeCounts.value[judge]++;
  score.value += Math.round(point * scoreMultiplier.value);
  updateTimingFeedback(note.lane, judge, timingDiff);

  combo.value++;

  if (combo.value > maxCombo.value) {
    maxCombo.value = combo.value;
  }

  createHitEffect(note.lane, judge);
  flashLane(note.lane);
}

function updateTimingFeedback(lane, judge, timingDiff) {
  if (judge === 'PERFECT') {
    timingFeedback.value = null;
    return;
  }

  const timing = timingDiff < 0 ? 'FAST' : 'SLOW';

  timingFeedback.value = {
    lane,
    timing,
    ms: Math.round(Math.abs(timingDiff) * 1000),
  };
}

function createHitEffect(lane, judge) {
  const id = effectId++;

  hitEffects.value.push({
    id,
    lane,
    judge,
  });

  setTimeout(() => {
    hitEffects.value = hitEffects.value.filter((effect) => effect.id !== id);
  }, 350);
}

function flashLane(lane) {
  if (lane === LANES.LEFT) {
    leftFlash.value = true;
    setTimeout(() => {
      leftFlash.value = false;
    }, 80);
  } else {
    rightFlash.value = true;
    setTimeout(() => {
      rightFlash.value = false;
    }, 80);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  if (resultTimerId) {
    clearTimeout(resultTimerId);
  }
});
</script>

<template>
  <div class="game">
    <div class="top">
      <button class="menu-btn" @click="emit('exit')">← MENU</button>

      <div class="count" :class="{ red: leftIsBase, blue: !leftIsBase }">
        {{ leftCount }}
      </div>

      <div class="info">
        <div class="hud-chip mode-chip">{{ modeText }}</div>
        <div class="hud-grid">
          <div class="hud-stat">
            <span>BPM</span>
            <strong>{{ bpm }}</strong>
          </div>
          <div class="hud-stat">
            <span>BASE</span>
            <strong>{{ baseSide }}</strong>
          </div>
          <div class="hud-stat score-stat">
            <span>SCORE</span>
            <strong>{{ score }}</strong>
          </div>
        </div>
      </div>

      <div class="count" :class="{ red: rightIsBase, blue: !rightIsBase }">
        {{ rightCount }}
      </div>
    </div>

    <div class="lanes">
      <div
        class="lane"
        :class="[leftIsBase ? 'base-lane' : 'sub-lane', { flash: leftFlash }]"
      >
        <div
          v-for="line in measureLines"
          :key="'left-line-' + line.id"
          class="measure-line"
          :class="{ change: line.type === 'change' }"
          :style="{ transform: `translateY(${getYByHitTime(line.hitTime)}vh)` }"
        >
          <span v-if="line.type === 'change'" class="change-label">
            {{ line.label }}
          </span>
          <span v-else>{{ line.measureNumber }}</span>
        </div>

        <div
          v-for="effect in leftHitEffects"
          :key="effect.id"
          class="hit-effect"
          :class="effect.judge.toLowerCase()"
        ></div>

        <div class="key-label">F</div>

        <div
          v-for="note in visibleLeftNotes"
          :key="note.id"
          class="note"
          :class="leftIsBase ? 'base-note' : 'sub-note'"
          :style="{ transform: getNoteTransform(note) }"
        ></div>

        <div class="judge-line"></div>
      </div>

      <div
        class="lane"
        :class="[rightIsBase ? 'base-lane' : 'sub-lane', { flash: rightFlash }]"
      >
        <div
          v-for="line in measureLines"
          :key="'right-line-' + line.id"
          class="measure-line"
          :class="{ change: line.type === 'change' }"
          :style="{ transform: `translateY(${getYByHitTime(line.hitTime)}vh)` }"
        >
          <span v-if="line.type === 'change'" class="change-label">
            {{ line.label }}
          </span>
          <span v-else>{{ line.measureNumber }}</span>
        </div>

        <div
          v-for="effect in rightHitEffects"
          :key="effect.id"
          class="hit-effect"
          :class="effect.judge.toLowerCase()"
        ></div>

        <div class="key-label">J</div>

        <div
          v-for="note in visibleRightNotes"
          :key="note.id"
          class="note"
          :class="rightIsBase ? 'base-note' : 'sub-note'"
          :style="{ transform: getNoteTransform(note) }"
        ></div>

        <div class="judge-line"></div>
      </div>
    </div>

    <div class="judgement">
      {{ judgement }}
    </div>

    <div
      v-if="timingFeedback"
      class="timing-feedback"
      :class="[timingFeedback.lane, timingFeedback.timing.toLowerCase()]"
    >
      <div>{{ timingFeedback.timing }}</div>
      <div>{{ timingFeedback.ms }}ms</div>
    </div>

    <div v-if="combo > 1" class="combo-display">{{ combo }} COMBO</div>

    <div v-if="!isPlaying && !resultVisible && !resultPending" class="speed-panel">
      <div class="setting-block">
        <div class="speed-title">배속</div>
        <div class="speed-value">{{ speedText }}</div>

        <div class="speed-controls">
          <button
            class="speed-button"
            type="button"
            @click="adjustSpeed(-DISPLAYED_SPEED_STEP)"
          >
            -
          </button>

          <input
            class="speed-slider"
            type="range"
            :min="MIN_DISPLAYED_SPEED"
            :max="MAX_DISPLAYED_SPEED"
            :step="DISPLAYED_SPEED_STEP"
            :value="displayedSpeed"
            @input="setDisplayedSpeed($event.target.value)"
          />

          <button
            class="speed-button"
            type="button"
            @click="adjustSpeed(DISPLAYED_SPEED_STEP)"
          >
            +
          </button>
        </div>
      </div>

      <div class="setting-block">
        <div class="speed-title">BPM</div>
        <div class="speed-value">{{ bpmControlText }}</div>
        <div class="score-multiplier">{{ scoreMultiplierText }}</div>

        <div class="speed-controls">
          <button
            class="speed-button"
            type="button"
            @click="adjustBpm(-BPM_STEP)"
          >
            -
          </button>

          <input
            class="speed-slider"
            type="range"
            :min="MIN_BPM"
            :max="MAX_BPM"
            step="1"
            :value="selectedBpm"
            @input="setBpm($event.target.value)"
          />

          <button
            class="speed-button"
            type="button"
            @click="adjustBpm(BPM_STEP)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <div v-if="resultVisible" class="result-panel">
      <div v-if="isFullCombo" class="full-combo">FULL COMBO</div>
      <h2>RESULT</h2>

      <div class="result-score">{{ score }}</div>

      <div class="result-row">
        <span>Max Combo</span>
        <strong>{{ maxCombo }}</strong>
      </div>

      <div class="judge-counts">
        <div class="result-row perfect">
          <span>PERFECT</span>
          <strong>{{ judgeCounts.PERFECT }}</strong>
        </div>
        <div class="result-row good">
          <span>GOOD</span>
          <strong>{{ judgeCounts.GOOD }}</strong>
        </div>
        <div class="result-row bad">
          <span>BAD</span>
          <strong>{{ judgeCounts.BAD }}</strong>
        </div>
        <div class="result-row miss">
          <span>MISS</span>
          <strong>{{ judgeCounts.MISS }}</strong>
        </div>
      </div>

      <div v-if="props.mode === 'challenge'" class="score-submit">
        <div class="submit-row">
          <input
            v-model="nickname"
            class="nickname-input"
            type="text"
            :maxlength="MAX_NICKNAME_LENGTH"
            placeholder="닉네임 입력"
          />
          <button
            class="submit-score-button"
            type="button"
            :disabled="!canSubmitScore"
            @click="submitScore"
          >
            {{ isSubmittingScore ? '등록중' : '점수 등록' }}
          </button>
        </div>

        <div v-if="scoreSubmitStatus" class="submit-status">
          {{ scoreSubmitStatus }}
        </div>
        <div v-if="scoreSubmitError" class="submit-error">
          {{ scoreSubmitError }}
        </div>
      </div>

      <button class="result-button" type="button" @click="startGame">
        RETRY
      </button>
    </div>

    <button
      v-if="!isPlaying && !resultVisible && !resultPending"
      class="start-btn"
      @click="startGame"
    >
      START
      <span class="start-hint">SPACE</span>
    </button>
  </div>
</template>

<style scoped>
.game {
  width: 100vw;
  height: 100vh;
  background:
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 50% 8%, rgba(34, 211, 238, 0.12), transparent 30%),
    #070a18;
  background-size:
    44px 44px,
    44px 44px,
    auto,
    auto;
  color: white;
  overflow: hidden;
  position: relative;
  font-family: Arial, sans-serif;
}

.top {
  position: absolute;
  top: 24px;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 20;
}

.menu-btn {
  position: absolute;
  left: 24px;
  top: 12px;
  padding: 10px 18px;
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  cursor: pointer;
  font-weight: bold;
  color: #e0faff;
  background: rgba(15, 23, 42, 0.82);
  box-shadow: 0 0 18px rgba(34, 211, 238, 0.18);
}

.count {
  font-size: 64px;
  font-weight: 900;
  text-shadow: 0 0 28px currentColor;
}

.red {
  color: #fb7185;
}

.blue {
  color: #22d3ee;
}

.info {
  min-width: min(440px, 44vw);
  padding: 12px;
  border: 2px solid rgba(34, 211, 238, 0.34);
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.12), rgba(244, 63, 94, 0.08)),
    rgba(15, 23, 42, 0.7);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 0 24px rgba(34, 211, 238, 0.06),
    0 0 32px rgba(34, 211, 238, 0.18);
}

.hud-chip {
  width: fit-content;
  margin: 0 auto 10px;
  padding: 4px 14px;
  border: 1px solid rgba(250, 204, 21, 0.55);
  border-radius: 999px;
  color: #facc15;
  background: rgba(250, 204, 21, 0.08);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-shadow: 0 0 12px rgba(250, 204, 21, 0.55);
}

.hud-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.35fr;
  gap: 8px;
}

.hud-stat {
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid rgba(224, 250, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.055);
  text-align: center;
}

.hud-stat span {
  display: block;
  margin-bottom: 4px;
  color: rgba(224, 250, 255, 0.58);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.hud-stat strong {
  display: block;
  overflow: hidden;
  color: #e0faff;
  font-size: 20px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 0 0 14px rgba(34, 211, 238, 0.56);
}

.score-stat strong {
  color: #facc15;
  text-shadow: 0 0 14px rgba(250, 204, 21, 0.6);
}

.lanes {
  width: 100%;
  height: 100%;
  display: flex;
}

.lane {
  width: 50%;
  height: 100%;
  position: relative;
  overflow: hidden;
  transition:
    background 0.08s,
    box-shadow 0.08s;
}

.base-lane {
  background:
    linear-gradient(180deg, rgba(251, 113, 133, 0.18), rgba(251, 113, 133, 0.05)),
    rgba(15, 23, 42, 0.2);
}

.sub-lane {
  background:
    linear-gradient(180deg, rgba(34, 211, 238, 0.16), rgba(34, 211, 238, 0.04)),
    rgba(15, 23, 42, 0.2);
}

.lane.flash {
  box-shadow: inset 0 0 34px rgba(255, 255, 255, 0.075);
}

.measure-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: rgba(224, 250, 255, 0.56);
  box-shadow: 0 0 14px rgba(224, 250, 255, 0.5);
  will-change: transform;
  z-index: 3;
}

.measure-line.change {
  height: 12px;
  background: #facc15;
  box-shadow:
    0 0 22px #facc15,
    0 0 42px rgba(250, 204, 21, 0.55);
  z-index: 4;
}

.measure-line span {
  position: absolute;
  left: 12px;
  top: -24px;
  font-size: 14px;
  opacity: 0.75;
}

.measure-line.change .change-label {
  left: 50%;
  top: -38px;
  transform: translateX(-50%);
  font-size: 30px;
  font-weight: 900;
  color: #facc15;
  opacity: 1;
  text-shadow: 0 0 16px black;
}

.key-label {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 36px;
  font-weight: bold;
  opacity: 0.8;
  z-index: 8;
  color: rgba(224, 250, 255, 0.76);
  text-shadow: 0 0 18px rgba(34, 211, 238, 0.55);
}

.note {
  position: absolute;
  top: 0;
  left: 50%;
  width: 90px;
  height: 28px;
  border-radius: 999px;
  will-change: transform;
  z-index: 10;
}

.base-note {
  background: linear-gradient(90deg, #fb7185, #f43f5e);
  box-shadow:
    0 0 14px rgba(251, 113, 133, 0.95),
    0 0 30px rgba(244, 63, 94, 0.45);
}

.sub-note {
  background: linear-gradient(90deg, #67e8f9, #22d3ee);
  box-shadow:
    0 0 14px rgba(34, 211, 238, 0.95),
    0 0 30px rgba(34, 211, 238, 0.42);
}

.judge-line {
  position: absolute;
  top: 85vh;
  left: 15%;
  width: 70%;
  height: 4px;
  background: #e0faff;
  box-shadow:
    0 0 14px rgba(224, 250, 255, 0.95),
    0 0 34px rgba(34, 211, 238, 0.55);
  z-index: 6;
}

.hit-effect {
  position: absolute;
  top: 85vh;
  left: 50%;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: hit-pop 0.35s ease-out forwards;
  z-index: 8;
  pointer-events: none;
}

.hit-effect.perfect {
  border: 5px solid #facc15;
  box-shadow: 0 0 30px #facc15;
}

.hit-effect.good {
  border: 5px solid #22c55e;
  box-shadow: 0 0 30px #22c55e;
}

.hit-effect.bad {
  border: 5px solid #fb923c;
  box-shadow: 0 0 30px #fb923c;
}

@keyframes hit-pop {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(0.3);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.3);
  }
}

.judgement {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 56px;
  font-weight: 900;
  color: #facc15;
  text-shadow:
    0 0 18px rgba(250, 204, 21, 0.9),
    0 0 34px rgba(244, 63, 94, 0.45),
    0 0 20px black;
  z-index: 30;
}

.timing-feedback {
  position: absolute;
  top: calc(42% + 64px);
  transform: translateX(-50%);
  font-size: 20px;
  font-weight: 900;
  line-height: 1.15;
  text-align: center;
  text-shadow: 0 0 14px black;
  z-index: 30;
  pointer-events: none;
}

.timing-feedback.left {
  left: 35%;
}

.timing-feedback.right {
  left: 65%;
}

.timing-feedback.fast {
  color: #60a5fa;
}

.timing-feedback.slow {
  color: #f87171;
}

.combo-display {
  position: absolute;
  top: 54%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 42px;
  font-weight: 900;
  color: white;
  text-shadow: 0 0 18px black;
  z-index: 30;
  pointer-events: none;
}

.speed-panel {
  position: absolute;
  top: 46%;
  left: 50%;
  width: min(420px, calc(100vw - 48px));
  transform: translate(-50%, -50%);
  padding: 18px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(34, 211, 238, 0.32);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.4),
    0 0 42px rgba(34, 211, 238, 0.18),
    inset 0 0 24px rgba(255, 255, 255, 0.035);
  z-index: 35;
}

.setting-block + .setting-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.speed-title {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  opacity: 0.8;
  color: #e0faff;
}

.speed-value {
  margin-top: 4px;
  text-align: center;
  font-size: 34px;
  font-weight: 900;
  color: #facc15;
  text-shadow: 0 0 22px rgba(250, 204, 21, 0.55);
}

.speed-controls {
  display: grid;
  grid-template-columns: 48px 1fr 48px;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
}

.speed-button {
  width: 42px;
  height: 42px;
  border: 1px solid rgba(34, 211, 238, 0.32);
  border-radius: 999px;
  background: rgba(224, 250, 255, 0.95);
  color: #111827;
  cursor: pointer;
  font-size: 24px;
  font-weight: 900;
  line-height: 1;
}

.speed-slider {
  width: 100%;
  accent-color: #facc15;
}

.score-multiplier {
  margin-top: 4px;
  text-align: center;
  font-size: 14px;
  font-weight: 800;
  color: #facc15;
  opacity: 0.9;
}

.start-btn {
  position: absolute;
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  padding: 16px 48px;
  font-size: 28px;
  font-weight: bold;
  border: 1px solid rgba(250, 204, 21, 0.65);
  border-radius: 999px;
  background: linear-gradient(135deg, #facc15, #22d3ee);
  color: #111827;
  cursor: pointer;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  box-shadow:
    0 0 24px rgba(250, 204, 21, 0.42),
    0 0 42px rgba(34, 211, 238, 0.24);
}

.start-btn:hover {
  transform: translateX(-50%) translateY(-2px);
}

.start-btn:active {
  transform: translateX(-50%);
}

.start-hint {
  font-size: 12px;
  letter-spacing: 0;
  opacity: 0.58;
}

.result-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(520px, calc(100vw - 48px));
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  transform: translate(-50%, -50%);
  padding: 28px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(34, 211, 238, 0.32);
  box-shadow:
    0 28px 80px rgba(0, 0, 0, 0.48),
    0 0 48px rgba(34, 211, 238, 0.18);
  z-index: 45;
  text-align: center;
}

.result-panel h2 {
  margin: 0;
  font-size: 28px;
  letter-spacing: 0;
}

.full-combo {
  margin-bottom: 10px;
  font-size: 24px;
  font-weight: 900;
  color: #facc15;
  text-shadow: 0 0 18px rgba(250, 204, 21, 0.7);
}

.result-score {
  margin: 18px 0;
  font-size: 54px;
  font-weight: 900;
  color: #e0faff;
  text-shadow: 0 0 24px rgba(34, 211, 238, 0.55);
}

.judge-counts {
  margin-top: 14px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 18px;
  font-weight: 800;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-row strong {
  font-size: 22px;
}

.result-row.perfect {
  color: #facc15;
}

.result-row.good {
  color: #22c55e;
}

.result-row.bad {
  color: #fb923c;
}

.result-row.miss {
  color: #f87171;
}

.result-button {
  width: 100%;
  margin-top: 22px;
  padding: 14px;
  border: 1px solid rgba(34, 211, 238, 0.38);
  border-radius: 999px;
  background: #e0faff;
  color: #111827;
  cursor: pointer;
  font-size: 20px;
  font-weight: 900;
}

.score-submit {
  margin-top: 18px;
}

.submit-row {
  display: grid;
  grid-template-columns: 1fr 132px;
  gap: 10px;
}

.nickname-input {
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  font-size: 16px;
  font-weight: 800;
  outline: none;
}

.nickname-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.submit-score-button {
  border: 1px solid rgba(250, 204, 21, 0.55);
  border-radius: 999px;
  background: #facc15;
  color: #111827;
  cursor: pointer;
  font-size: 16px;
  font-weight: 900;
}

.submit-score-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.submit-status,
.submit-error {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 800;
}

.submit-status {
  color: #22c55e;
}

.submit-error {
  color: #f87171;
}

</style>
