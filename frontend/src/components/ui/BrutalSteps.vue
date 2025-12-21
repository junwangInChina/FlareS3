<script setup>
defineProps({
  current: { type: Number, default: 1 },
  steps: { type: Array, default: () => [] }, // [{ title, description }]
  status: { type: String, default: 'process' } // process, finish, error
})
</script>

<template>
  <div class="brutal-steps">
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
.brutal-steps {
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
  width: 40px;
  height: 40px;
  border: var(--nb-border);
  background: var(--nb-white);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--nb-space-sm);
  position: relative;
  z-index: 1;
}

.step-number {
  font-family: var(--nb-font-mono);
  font-weight: 900;
  font-size: 18px;
}

.step-content {
  max-width: 120px;
}

.step-title {
  font-family: var(--nb-font-mono);
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
}

.step-desc {
  font-size: 12px;
  color: var(--nb-gray-500);
  margin-top: 4px;
}

.step-connector {
  position: absolute;
  top: 20px;
  left: calc(50% + 24px);
  right: calc(-50% + 24px);
  height: 3px;
  background: var(--nb-gray-300);
}

/* States */
.completed .step-indicator {
  background: var(--nb-success);
}

.completed .step-connector {
  background: var(--nb-success);
}

.active .step-indicator {
  background: var(--nb-primary);
  box-shadow: var(--nb-shadow-sm);
}

.pending .step-indicator {
  background: var(--nb-gray-200);
}

.pending .step-title,
.pending .step-desc {
  color: var(--nb-gray-400);
}

.error .step-indicator {
  background: var(--nb-danger);
  color: var(--nb-white);
}
</style>
