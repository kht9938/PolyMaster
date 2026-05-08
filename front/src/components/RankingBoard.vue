<script setup>
import { computed, nextTick, onMounted, ref } from 'vue';

import { fetchHighScores } from '../lib/scores';

const emit = defineEmits(['back']);

const HIGHSCORE_LIMIT = 100;

const highScores = ref([]);
const isLoading = ref(false);
const errorMessage = ref('');
const rankingPanel = ref(null);
const canScroll = ref(false);
const scrollThumbHeight = ref(36);
const scrollThumbTop = ref(0);

const scrollThumbStyle = computed(() => ({
  height: `${scrollThumbHeight.value}px`,
  transform: `translateY(${scrollThumbTop.value}px)`,
}));

onMounted(() => {
  loadHighScores();
});

async function loadHighScores() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    highScores.value = await fetchHighScores(HIGHSCORE_LIMIT);
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
    await nextTick();
    updateScrollState(rankingPanel.value);
  }
}

function handleScroll(event) {
  updateScrollState(event.currentTarget);
}

function updateScrollState(target) {
  if (!target) return;

  const scrollableDistance = target.scrollHeight - target.clientHeight;
  const trackHeight = Math.max(target.clientHeight - 64, 120);

  canScroll.value = scrollableDistance > 0;

  if (!canScroll.value) {
    scrollThumbHeight.value = 36;
    scrollThumbTop.value = 0;
    return;
  }

  scrollThumbHeight.value = Math.max(
    36,
    Math.round((target.clientHeight / target.scrollHeight) * trackHeight),
  );
  scrollThumbTop.value =
    (target.scrollTop / scrollableDistance) *
    (trackHeight - scrollThumbHeight.value);
}
</script>

<template>
  <div class="ranking-page">
    <button class="back-btn" type="button" @click="emit('back')">
      ← MENU
    </button>

    <div class="ranking-shell">
      <main ref="rankingPanel" class="ranking-panel" @scroll="handleScroll">
        <h1>HIGH SCORE</h1>

        <div v-if="isLoading" class="empty-state">불러오는 중</div>
        <div v-else-if="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>
        <div v-else-if="highScores.length === 0" class="empty-state">
          아직 등록된 점수가 없습니다.
        </div>

        <ol v-else class="ranking-list">
          <li v-for="(entry, index) in highScores" :key="entry.id">
            <span class="rank-number">{{ index + 1 }}</span>
            <span class="nickname">{{ entry.nickname }}</span>
            <span class="meta">{{ entry.bpm }} BPM · {{ entry.max_combo }} combo</span>
            <strong>{{ entry.score }}</strong>
          </li>
        </ol>
      </main>

      <div v-if="canScroll" class="scroll-hint" aria-hidden="true">
        <span :style="scrollThumbStyle"></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ranking-page {
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(circle at 16% 18%, rgba(34, 211, 238, 0.18), transparent 34%),
    radial-gradient(circle at 84% 78%, rgba(244, 63, 94, 0.16), transparent 34%),
    #080b18;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  position: relative;
}

.back-btn {
  position: absolute;
  top: 36px;
  left: 36px;
  padding: 10px 18px;
  border: 1px solid rgba(34, 211, 238, 0.35);
  border-radius: 999px;
  cursor: pointer;
  font-weight: 900;
  color: #e0faff;
  background: rgba(15, 23, 42, 0.8);
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.16);
}

.ranking-shell {
  width: min(640px, calc(100vw - 48px));
  max-height: calc(100vh - 120px);
  position: relative;
}

.ranking-panel {
  width: 100%;
  max-height: inherit;
  overflow-y: auto;
  padding: 32px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(34, 211, 238, 0.28);
  box-shadow:
    0 0 44px rgba(34, 211, 238, 0.15),
    inset 0 0 28px rgba(255, 255, 255, 0.03);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.ranking-panel::-webkit-scrollbar {
  display: none;
}

h1 {
  margin: 0 0 24px;
  text-align: center;
  font-size: 44px;
  color: #f8fafc;
  text-shadow: 0 0 24px rgba(250, 204, 21, 0.55);
}

.empty-state,
.error-state {
  padding: 32px 0;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  opacity: 0.78;
}

.error-state {
  color: #f87171;
}

.ranking-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ranking-list li {
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 6px 18px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid rgba(34, 211, 238, 0.16);
}

.rank-number {
  grid-column: 1;
  grid-row: 1 / span 2;
  color: #facc15;
  font-size: 20px;
  font-weight: 900;
  text-align: center;
  text-shadow: 0 0 12px rgba(250, 204, 21, 0.48);
}

.nickname {
  grid-column: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 20px;
  font-weight: 900;
}

.meta {
  grid-column: 2;
  color: rgba(255, 255, 255, 0.62);
  font-size: 13px;
  font-weight: 800;
}

strong {
  grid-column: 3;
  grid-row: 1 / span 2;
  color: #facc15;
  font-size: 24px;
}

.scroll-hint {
  position: absolute;
  top: 32px;
  right: -18px;
  bottom: 32px;
  width: 5px;
  border-radius: 999px;
  background: rgba(224, 250, 255, 0.14);
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.25);
  pointer-events: none;
}

.scroll-hint span {
  display: block;
  width: 100%;
  border-radius: inherit;
  background: #22d3ee;
  transition: transform 0.08s linear;
  box-shadow:
    0 0 12px rgba(34, 211, 238, 0.9),
    0 0 24px rgba(34, 211, 238, 0.45);
}
</style>
