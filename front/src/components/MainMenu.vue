<script setup>
defineEmits([
  'selectPractice',
  'selectChallenge',
  'selectDemo',
  'selectRanking',
  'selectHelp',
]);
</script>

<template>
  <div class="menu">
    <h1 class="title">PolyMaster</h1>

    <div class="buttons">
      <button @click="$emit('selectPractice')">연습모드</button>
      <button @click="$emit('selectChallenge')">실전모드</button>
      <button @click="$emit('selectDemo')">데모 플레이</button>
      <button @click="$emit('selectRanking')">랭킹</button>
      <button @click="$emit('selectHelp')">도움말</button>
    </div>
  </div>
</template>

<style scoped>
.menu {
  width: 100vw;
  height: 100vh;
  background:
    linear-gradient(rgba(7, 10, 24, 0.34), rgba(7, 10, 24, 0.6)),
    linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    radial-gradient(circle at 50% 18%, rgba(34, 211, 238, 0.16), transparent 34%),
    radial-gradient(circle at 48% 82%, rgba(244, 63, 94, 0.14), transparent 34%),
    url('/images/main-menu-bg.png'),
    #080b18;
  background-size:
    auto,
    44px 44px,
    44px 44px,
    auto,
    auto,
    cover,
    auto;
  background-position:
    center,
    center,
    center,
    center,
    center,
    center,
    center;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 7vh;
}

.title {
  font-size: clamp(58px, 8vw, 96px);
  margin-bottom: 56px;
  color: #f8fafc;
  letter-spacing: 0.04em;
  text-shadow:
    0 0 18px rgba(34, 211, 238, 0.9),
    0 0 42px rgba(244, 63, 94, 0.55);
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

button {
  width: 280px;
  padding: 18px;
  font-size: 24px;
  border-radius: 16px;
  border: 2px solid rgba(34, 211, 238, 0.62);
  cursor: pointer;
  font-weight: bold;
  color: #e0faff;
  background:
    linear-gradient(135deg, rgba(34, 211, 238, 0.18), rgba(244, 63, 94, 0.12)),
    rgba(15, 23, 42, 0.78);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 0 18px rgba(255, 255, 255, 0.04),
    0 0 24px rgba(34, 211, 238, 0.24);
}

button:hover {
  border-color: rgba(250, 204, 21, 0.8);
  box-shadow:
    inset 0 0 24px rgba(255, 255, 255, 0.07),
    0 0 26px rgba(34, 211, 238, 0.38),
    0 0 36px rgba(244, 63, 94, 0.22);
}
</style>
