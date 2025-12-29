<script setup>
defineProps({
  current: { type: Number, default: 1 },
  steps: { type: Array, default: () => [] },
  status: { type: String, default: 'process' }
})
</script>

<template>
  <div class="shadcn-steps">
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="step-item"
      :class="{
        completed: index + 1 < current,
        active: index + 1 === current,
        pending: index + 1 > current,
        error: index + 1 === current && status === 'error'
      }"
    >
      <div class="step-indicator">
        <span class="step-number">
          <template v-if="index + 1 < current">✓</template>
          <template v-else>{{ index + 1 }}</template>
        </span>
      </div>
      <div class="step-content">
        <div class="step-title">{{ step.title }}</div>
        <div v-if="step.description" class="step-desc">{{ step.description }}</div>
      </div>
      <div v-if="index < steps.length - 1" class="step-connector"></div>
    </div>
  </div>
</template>

<style scoped>
.shadcn-steps {
  display: flex;
  align-items: flex-start;
}

.step-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  text-align: center;
}

.step-indicator {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  background: var(--background);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
  border-radius: 9999px;
  color: var(--muted-foreground);
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.step-number {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
}

.step-content {
  max-width: 120px;
}

.step-title {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 0.875rem;
  color: var(--foreground);
}

.step-desc {
  font-size: 0.75rem;
  color: var(--muted-foreground);
  margin-top: 4px;
}

.step-connector {
  position: absolute;
  top: 16px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: var(--border);
}

.completed .step-indicator {
  border-color: var(--primary);
  color: var(--primary);
}

.completed .step-connector {
  background: var(--primary);
}

.active .step-indicator {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
}

.pending .step-indicator {
  background: var(--background);
  color: var(--muted-foreground);
}

.pending .step-title,
.pending .step-desc {
  color: var(--muted-foreground);
}

.error .step-indicator {
  background: var(--destructive);
  color: var(--destructive-foreground);
  border-color: var(--destructive);
}
</style>
