<script setup>
import { computed, ref } from 'vue';

const emit = defineEmits(['back']);

const sections = [
  {
    title: '조작방법',
    body: '왼쪽 레인은 F, 오른쪽 레인은 J 키로 입력합니다. 시작 전에는 Space 키 또는 START 버튼으로 게임을 시작할 수 있습니다. 플레이 중 ← MENU 버튼을 누르면 메뉴로 돌아갑니다.',
  },
  {
    title: '폴리리듬',
    body: '폴리리듬은 서로 다른 박자 수가 하나의 마디 안에서 동시에 진행되는 리듬 구조입니다. 한 손은 기준박을 유지하고, 다른 손은 그 위에 다른 박자를 겹쳐 연주합니다.',
  },
  {
    title: 'N:M의 의미',
    body: '왼쪽 숫자는 F 레인, 오른쪽 숫자는 J 레인의 박자 수를 의미합니다. 예를 들어 2:3은 같은 한 마디 동안 왼손은 2번, 오른손은 3번 연주하는 패턴입니다.',
  },
  {
    title: '기준박',
    body: '기준박은 리듬의 중심이 되는 박자입니다. 기준박 레인은 빨간색으로 표시되며, 반대쪽 레인은 파란색으로 표시됩니다. LEFT / RIGHT 설정에 따라 기준박 방향이 바뀝니다.',
  },
  {
    title: '하얀색 마디선',
    body: '하얀색 마디선은 일반 마디의 경계를 나타냅니다. 선이 판정선에 도달하는 순간 새로운 마디가 시작됩니다.',
  },
  {
    title: '노란색 특수 마디선',
    body: '노란색 특수 마디선은 패턴 전환 지점을 나타냅니다. 실전모드와 데모 플레이에서 등장하며, 기준박 방향이나 박자 비율이 곧 변경된다는 의미입니다.',
  },
  {
    title: '배속과 BPM',
    body: '배속은 노트가 내려오는 시각적 속도만 변경합니다. BPM은 실제 리듬의 속도를 의미하며, BPM이 높을수록 노트 간격이 짧아지고 점수 배율도 함께 증가합니다.',
  },
  {
    title: '판정과 점수',
    body: 'PERFECT는 1000점, GOOD은 500점, BAD는 100점을 획득합니다. MISS가 발생하면 콤보가 끊어집니다. 최종 점수는 판정 점수와 BPM 배율을 기반으로 계산됩니다.',
  },
  {
    title: '콤보',
    body: '노트를 연속으로 성공하면 콤보가 증가합니다. 높은 콤보를 유지할수록 안정적인 리듬 감각이 중요해집니다.',
  },
  {
    title: '연습모드',
    body: '원하는 폴리리듬 패턴을 선택해 반복 연습할 수 있는 모드입니다. 기준박 방향도 자유롭게 변경할 수 있습니다.',
  },
  {
    title: '실전모드',
    body: '여러 폴리리듬 패턴이 순서대로 이어지는 모드입니다. 플레이 도중 기준박 방향과 박자 비율이 계속 변경되며, 완주 후 점수를 기록할 수 있습니다.',
  },
  {
    title: '데모 플레이',
    body: '데모 플레이는 실전모드를 자동 PERFECT 판정으로 재생하는 기능입니다. 패턴 흐름과 기준박 전환 타이밍을 참고할 때 사용할 수 있습니다.',
  },
  {
    title: '랭킹',
    body: '랭킹에서는 실전모드에서 기록한 최고 점수를 확인할 수 있습니다. 높은 BPM과 안정적인 콤보 유지가 고득점의 핵심입니다.',
  },
];

const currentIndex = ref(0);
const currentSection = computed(() => sections[currentIndex.value]);
const pageText = computed(() => `${currentIndex.value + 1} / ${sections.length}`);

function goPrev() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
}

function goNext() {
  if (currentIndex.value < sections.length - 1) {
    currentIndex.value++;
  }
}
</script>

<template>
  <div class="help-page">
    <button class="back-btn" type="button" @click="emit('back')">← MENU</button>

    <main class="help-panel">
      <h1>도움말</h1>

      <section class="help-card">
        <h2>{{ currentSection.title }}</h2>
        <p>{{ currentSection.body }}</p>
      </section>

      <div class="pager">
        <button type="button" :disabled="currentIndex === 0" @click="goPrev">
          이전
        </button>
        <span>{{ pageText }}</span>
        <button
          type="button"
          :disabled="currentIndex === sections.length - 1"
          @click="goNext"
        >
          다음
        </button>
      </div>
    </main>
  </div>
</template>

<style scoped>
.help-page {
  width: 100vw;
  height: 100vh;
  background:
    radial-gradient(circle at 18% 18%, rgba(34, 211, 238, 0.18), transparent 34%),
    radial-gradient(circle at 82% 78%, rgba(244, 63, 94, 0.16), transparent 34%),
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

.help-panel {
  width: min(720px, calc(100vw - 48px));
  min-height: 420px;
  padding: 32px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(34, 211, 238, 0.28);
  box-shadow:
    0 0 44px rgba(34, 211, 238, 0.15),
    inset 0 0 28px rgba(255, 255, 255, 0.03);
}

h1 {
  margin: 0 0 24px;
  text-align: center;
  font-size: 44px;
  text-shadow: 0 0 24px rgba(34, 211, 238, 0.62);
}

.help-card {
  min-height: 210px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 28px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(244, 63, 94, 0.22);
}

h2 {
  margin: 0 0 18px;
  color: #facc15;
  font-size: 30px;
  text-align: center;
}

p {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.82);
  text-align: center;
}

.pager {
  display: grid;
  grid-template-columns: 110px 1fr 110px;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}

.pager button {
  padding: 12px 0;
  border: none;
  border-radius: 999px;
  background: #e0faff;
  color: #111827;
  cursor: pointer;
  font-size: 17px;
  font-weight: 900;
}

.pager button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.pager span {
  text-align: center;
  font-size: 18px;
  font-weight: 900;
  color: #facc15;
}
</style>
