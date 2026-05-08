<script setup>
import { ref } from 'vue';

import MainMenu from './components/MainMenu.vue';
import PracticeSelect from './components/PracticeSelect.vue';
import GamePlay from './components/GamePlay.vue';
import RankingBoard from './components/RankingBoard.vue';
import HelpPage from './components/HelpPage.vue';
import { trackEvent } from './lib/analytics';

const SCENES = {
  MAIN: 'main',
  PRACTICE_SELECT: 'practiceSelect',
  PRACTICE_GAME: 'practiceGame',
  CHALLENGE_GAME: 'challengeGame',
  DEMO_GAME: 'demoGame',
  RANKING: 'ranking',
  HELP: 'help',
};

const currentScene = ref(SCENES.MAIN);
const selectedRhythm = ref(null);

function goMain() {
  currentScene.value = SCENES.MAIN;
}

function goPractice() {
  trackEvent('menu_select', { target: 'practice' });
  currentScene.value = SCENES.PRACTICE_SELECT;
}

function startPractice(rhythm) {
  trackEvent('practice_pattern_select', {
    pattern: rhythm.name,
    base_side: rhythm.baseSide,
    bpm: rhythm.bpm,
    left_count: rhythm.leftCount,
    right_count: rhythm.rightCount,
  });

  selectedRhythm.value = rhythm;
  currentScene.value = SCENES.PRACTICE_GAME;
}

function startChallenge() {
  trackEvent('menu_select', { target: 'challenge' });
  selectedRhythm.value = null;
  currentScene.value = SCENES.CHALLENGE_GAME;
}

function startDemo() {
  trackEvent('menu_select', { target: 'demo' });
  selectedRhythm.value = null;
  currentScene.value = SCENES.DEMO_GAME;
}

function openRanking() {
  trackEvent('menu_select', { target: 'ranking' });
  trackEvent('ranking_view', { source: currentScene.value });
  currentScene.value = SCENES.RANKING;
}

function openHelp() {
  trackEvent('menu_select', { target: 'help' });
  trackEvent('help_view', { source: currentScene.value });
  currentScene.value = SCENES.HELP;
}
</script>

<template>
  <MainMenu
    v-if="currentScene === SCENES.MAIN"
    @select-practice="goPractice"
    @select-challenge="startChallenge"
    @select-demo="startDemo"
    @select-ranking="openRanking"
    @select-help="openHelp"
  />

  <PracticeSelect
    v-else-if="currentScene === SCENES.PRACTICE_SELECT"
    @select-rhythm="startPractice"
    @back="goMain"
  />

  <GamePlay
    v-else-if="currentScene === SCENES.PRACTICE_GAME"
    mode="practice"
    :rhythm="selectedRhythm"
    @exit="goPractice"
  />

  <GamePlay
    v-else-if="currentScene === SCENES.CHALLENGE_GAME"
    mode="challenge"
    @exit="goMain"
  />

  <GamePlay
    v-else-if="currentScene === SCENES.DEMO_GAME"
    mode="demo"
    @exit="goMain"
  />

  <RankingBoard
    v-else-if="currentScene === SCENES.RANKING"
    @back="goMain"
  />

  <HelpPage
    v-else-if="currentScene === SCENES.HELP"
    @back="goMain"
  />
</template>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}

* {
  box-sizing: border-box;
}

body {
  background:
    radial-gradient(circle at 18% 12%, rgba(34, 211, 238, 0.2), transparent 32%),
    radial-gradient(circle at 82% 18%, rgba(244, 63, 94, 0.18), transparent 34%),
    linear-gradient(135deg, #070a18 0%, #111827 48%, #080b18 100%);
  color: white;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

button,
input {
  font: inherit;
}

button {
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    border-color 0.16s ease,
    background 0.16s ease;
}

button:not(:disabled):hover {
  transform: translateY(-2px);
}

button:not(:disabled):active {
  transform: translateY(0);
}
</style>
