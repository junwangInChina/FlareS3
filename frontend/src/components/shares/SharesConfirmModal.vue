<template>
  <Modal :show="show" :title="title" width="420px" @update:show="emit('update:show', $event)">
    <p class="shares-confirm-text">
      {{ message }}
    </p>

    <template #footer>
      <Button type="default" :disabled="submitting" @click="emit('cancel')">
        {{ t('common.cancel') }}
      </Button>
      <Button :type="buttonType" :loading="submitting" :disabled="disabled" @click="emit('submit')">
        {{ buttonLabel }}
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
  title: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
  buttonLabel: {
    type: String,
    default: '',
  },
  buttonType: {
    type: String,
    default: 'default',
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:show', 'cancel', 'submit'])
const { t } = useI18n({ useScope: 'global' })
</script>

<style scoped>
.shares-confirm-text {
  margin: 0;
  line-height: 1.6;
  color: var(--nb-foreground, inherit);
  word-break: break-word;
}
</style>
