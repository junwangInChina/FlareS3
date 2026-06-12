<template>
  <Modal
    :show="show"
    :title="t('mount.modals.uploadTitle')"
    width="420px"
    :closable="!uploading"
    @update:show="emit('update:show', $event)"
  >
    <div class="mount-upload-progress">
      <p v-if="uploading">{{ t('mount.upload.uploading') }}</p>
      <p v-if="uploading && progress >= 0">
        {{ t('mount.upload.progress', { percent: progress }) }}
      </p>
    </div>

    <template #footer>
      <Button v-if="!uploading" type="default" @click="emit('update:show', false)">
        {{ t('common.close') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import Modal from '../ui/modal/Modal.vue'

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  uploading: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: -1,
  },
})

const emit = defineEmits(['update:show'])
const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped>
.mount-upload-progress {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
  text-align: center;
  color: var(--nb-ink);
}
</style>
