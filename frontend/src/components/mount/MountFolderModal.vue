<template>
  <Modal
    :show="show"
    :title="t('mount.modals.newFolderTitle')"
    width="420px"
    @update:show="emit('update:show', $event)"
  >
    <div class="mount-folder-form">
      <label class="mount-folder-label">{{ t('mount.newFolderLabel') }}</label>
      <Input
        :model-value="folderName"
        :placeholder="t('mount.newFolderPlaceholder')"
        size="small"
        @update:model-value="emit('update:folderName', $event)"
        @keyup.enter="emit('create')"
      />
    </div>

    <template #footer>
      <Button type="default" :disabled="creating" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </Button>
      <Button
        type="primary"
        :loading="creating"
        :disabled="!folderName.trim()"
        @click="emit('create')"
      >
        {{ t('mount.actions.newFolder') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import Input from '../ui/input/Input.vue'
import Modal from '../ui/modal/Modal.vue'

defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  folderName: {
    type: String,
    default: '',
  },
  creating: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:show', 'update:folderName', 'cancel', 'create'])
const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped>
.mount-folder-form {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-sm);
}

.mount-folder-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--nb-ink);
}
</style>
