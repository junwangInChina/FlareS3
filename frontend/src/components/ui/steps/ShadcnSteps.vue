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
  width: 36px;
  height: 36px;
  border: 2px solid var(--nb-gray-300);
  background: var(--nb-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  position: relative;
  z-index: 1;
  border-radius: 50%;
  transition: all 0.15s ease;
}

.step-number {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-semibold);
  font-size: 16px;
}

.step-content {
  max-width: 120px;
}

.step-title {
  font-family: var(--nb-font-ui);
  font-weight: var(--nb-font-weight-medium);
  font-size: 14px;
  color: var(--nb-foreground);
}

.step-desc {
  font-size: 12px;
  color: var(--nb-muted-foreground);
  margin-top: 4px;
}

.step-connector {
  position: absolute;
  top: 18px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: var(--nb-gray-300);
}

.completed .step-indicator {
  background: var(--nb-success);
  color: var(--nb-success-foreground);
  border-color: var(--nb-success);
}

.completed .step-connector {
  background: var(--nb-success);
}

.active .step-indicator {
  background: var(--nb-primary);
  color: var(--nb-primary-foreground);
  border-color: var(--nb-primary);
}

.pending .step-indicator {
  background: var(--nb-gray-100);
  color: var(--nb-muted-foreground);
}

.pending .step-title,
.pending .step-desc {
  color: var(--nb-muted-foreground);
}

.error .step-indicator {
  background: var(--nb-danger);
  color: var(--nb-danger-foreground);
  border-color: var(--nb-danger);
}
</style>
