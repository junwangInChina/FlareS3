<template>
  <Modal v-model:show="showProxy" :title="t('setup.help')" width="520px">
    <div class="usage-tips-grid">
      <Alert v-for="tip in usageTips" :key="tip.key" :type="tip.type" :title="tip.title">
        {{ tip.content }}
      </Alert>
    </div>
  </Modal>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { buildUsageTips } from '../../lib/usageTips'
import Modal from '../ui/modal/Modal.vue'
import Alert from '../ui/alert/Alert.vue'

const props = defineProps({
  show: Boolean,
})

const emit = defineEmits(['update:show'])

const { t } = useI18n({ useScope: 'global' })
const usageTips = computed(() => buildUsageTips(t))

const showProxy = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})
</script>

<style scoped>
.usage-tips-grid {
  display: grid;
  gap: var(--nb-space-md);
}
</style>
