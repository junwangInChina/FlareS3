<script setup>
defineProps({
  percentage: { type: Number, default: 0 },
  type: { type: String, default: 'line' },
  showIndicator: { type: Boolean, default: true },
  color: String,
  height: { type: Number, default: 24 }
})
</script>

<template>
  <div v-if="type === 'line'" class="shadcn-progress-line">
    <div class="progress-container" :style="{ height: `${height}px` }">
      <div
        class="progress-bar"
        :style="{
          width: `${Math.min(percentage, 100)}%`,
          backgroundColor: color || 'var(--nb-primary)'
        }"
      ></div>
      <span v-if="showIndicator" class="progress-text">{{ Math.round(percentage) }}%</span>
    </div>
  </div>

  <div v-else class="shadcn-progress-circle">
    <svg viewBox="0 0 100 100" width="100" height="100">
      <circle
        class="circle-bg"
        cx="50"
        cy="50"
        r="42"
        fill="none"
        stroke="var(--nb-gray-200)"
        stroke-width="8"
      />
      <circle
        class="circle-progress"
        cx="50"
        cy="50"
        r="42"
        fill="none"
        :stroke="color || 'var(--nb-primary)'"
        stroke-width="8"
        stroke-linecap="round"
        :stroke-dasharray="264"
        :stroke-dashoffset="264 - (264 * Math.min(percentage, 100)) / 100"
        transform="rotate(-90 50 50)"
      />
    </svg>
    <div v-if="showIndicator" class="circle-text">
      <slot>
        <span class="percentage">{{ Math.round(percentage) }}%</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.shadcn-progress-line {
  width: 100%;
}

.progress-container {
  width: 100%;
  background: var(--nb-gray-200);
  position: relative;
  overflow: hidden;
  border-radius: var(--nb-radius-sm);
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: var(--nb-radius-sm);
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 12px;
  color: var(--nb-foreground);
}

.shadcn-progress-circle {
  position: relative;
  display: inline-block;
}

.circle-progress {
  transition: stroke-dashoffset 0.3s ease;
}

.circle-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.percentage {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  font-size: 18px;
  color: var(--nb-foreground);
}
</style>
