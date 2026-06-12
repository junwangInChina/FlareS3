<template>
  <div class="mount-browser-header">
    <div class="mount-path">
      <Button type="ghost" size="small" :disabled="loading || !prefix" @click="$emit('go-root')">
        <Home :size="16" />
        <span class="btn-label">{{ t('mount.actions.root') }}</span>
      </Button>

      <div class="breadcrumb">
        <span class="breadcrumb-root" :class="{ clickable: prefix }" @click="$emit('go-root')"
          >/</span
        >
        <template v-for="(item, index) in breadcrumbItems" :key="item.prefix">
          <span v-if="index > 0" class="breadcrumb-sep">/</span>
          <span class="breadcrumb-item clickable" @click="$emit('navigate', item.prefix)">
            {{ item.label }}
          </span>
        </template>
      </div>

      <Button type="ghost" size="small" :disabled="loading || !prefix" @click="$emit('go-up')">
        <ArrowUp :size="16" />
        <span class="btn-label">{{ t('mount.actions.up') }}</span>
      </Button>
    </div>
  </div>
</template>

<script setup>
import { ArrowUp, Home } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'

defineProps({
  prefix: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  breadcrumbItems: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['go-root', 'go-up', 'navigate'])

const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped>
.mount-browser-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--nb-space-md);
}

.mount-path {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.btn-label {
  margin-left: 6px;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.breadcrumb-root,
.breadcrumb-item {
  font-family: var(--nb-font-mono, ui-monospace);
  font-size: 0.875rem;
}

.clickable {
  cursor: pointer;
  color: var(--nb-link-color, var(--nb-primary));
}

.breadcrumb-sep {
  opacity: 0.6;
}

@media (max-width: 768px) {
  .mount-browser-header,
  .mount-path {
    width: 100%;
    min-width: 0;
    flex-wrap: wrap;
  }

  .breadcrumb {
    width: 100%;
    min-width: 0;
  }
}
</style>
