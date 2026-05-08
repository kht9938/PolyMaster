<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['selectRhythm', 'back']);

const baseSide = ref('LEFT');

const rhythmPairs = [
  { base: 2, other: 3, bpm: 150 },
  { base: 4, other: 3, bpm: 150 },
  { base: 4, other: 5, bpm: 150 },
  { base: 4, other: 7, bpm: 150 },
  { base: 8, other: 7, bpm: 150 },
  { base: 8, other: 9, bpm: 150 },
];

const rhythms = computed(() => {
  return rhythmPairs.map((pair) => {
    const leftCount = baseSide.value === 'LEFT' ? pair.base : pair.other;
    const rightCount = baseSide.value === 'LEFT' ? pair.other : pair.base;

    return {
      name: `${leftCount} : ${rightCount}`,
      leftCount,
      rightCount,
      bpm: pair.bpm,
      baseSide: baseSide.value,
      beatsPerMeasure: pair.base,
    };
  });
});

function selectRhythm(rhythm) {
  emit('selectRhythm', rhythm);
}
</script>

<template>
  <div class="select-page">
    <h1>연습모드</h1>
    <p>연습할 폴리리듬을 선택하세요</p>

    <div class="base-toggle">
      <div class="toggle-title">기준박</div>

      <div class="toggle-buttons">
        <button
          :class="{ active: baseSide === 'LEFT' }"
          @click="baseSide = 'LEFT'"
        >
          LEFT
        </button>

        <button
          :class="{ active: baseSide === 'RIGHT' }"
          @click="baseSide = 'RIGHT'"
        >
          RIGHT
        </button>
      </div>
    </div>

    <div class="rhythm-list">
      <button
        v-for="rhythm in rhythms"
        :key="rhythm.name"
        @click="selectRhythm(rhythm)"
      >
        {{ rhythm.name }}
      </button>
    </div>

    <button class="back-btn" @click="$emit('back')">뒤로가기</button>
  </div>
</template>

<style scoped>
.select-page {
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(circle at 22% 22%, rgba(34, 211, 238, 0.18), transparent 34%),
    radial-gradient(circle at 80% 75%, rgba(244, 63, 94, 0.16), transparent 34%),
    #080b18;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

h1 {
  font-size: 56px;
  margin-bottom: 12px;
  text-shadow: 0 0 26px rgba(34, 211, 238, 0.75);
}

p {
  margin-bottom: 24px;
  color: rgba(226, 232, 240, 0.78);
}

.rhythm-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 180px));
  gap: 18px;
  margin-top: 28px;
}

.rhythm-list button {
  padding: 24px;
  font-size: 28px;
  font-weight: bold;
  border-radius: 14px;
  border: 2px solid rgba(34, 211, 238, 0.58);
  cursor: pointer;
  color: #e0faff;
  background: rgba(15, 23, 42, 0.76);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.06),
    inset 0 0 20px rgba(34, 211, 238, 0.08),
    0 0 22px rgba(34, 211, 238, 0.16);
}

.rhythm-list button:hover {
  border-color: #facc15;
  box-shadow:
    inset 0 0 22px rgba(250, 204, 21, 0.08),
    0 0 30px rgba(34, 211, 238, 0.28);
}

.back-btn {
  margin-top: 28px;
  padding: 12px 32px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  color: #111827;
  background: #e0faff;
  font-weight: 900;
}

.base-toggle {
  padding: 16px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.76);
  border: 2px solid rgba(244, 63, 94, 0.45);
  box-shadow: 0 0 26px rgba(244, 63, 94, 0.12);
}

.toggle-title {
  text-align: center;
  margin-bottom: 10px;
  font-size: 14px;
  opacity: 0.8;
}

.toggle-buttons {
  display: flex;
  gap: 8px;
}

.toggle-buttons button {
  padding: 10px 16px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
  font-weight: bold;
  opacity: 0.45;
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.toggle-buttons button.active {
  opacity: 1;
  background: #facc15;
  color: #111827;
}

@media (max-width: 620px) {
  .rhythm-list {
    grid-template-columns: repeat(2, minmax(130px, 1fr));
    width: calc(100vw - 48px);
  }
}
</style>
