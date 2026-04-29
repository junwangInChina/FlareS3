<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
// NeoBrutalism styled app - no external UI library needed
</script>

<style>
#app {
  min-height: 100vh;
}

@media (max-width: 768px) {
  html,
  body,
  #app {
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
}
</style>
