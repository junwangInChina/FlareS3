<script setup>
import { useI18n } from 'vue-i18n'
import Button from '../ui/button/Button.vue'
import Modal from '../ui/modal/Modal.vue'

const props = defineProps({
  show: Boolean,
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'confirm'])

const { t } = useI18n({ useScope: 'global' })

const handleUpdateShow = (nextValue) => {
  if (props.loading) {
    return
  }

  emit('update:show', nextValue)
}

const handleCancel = () => {
  if (props.loading) {
    return
  }

  emit('update:show', false)
}
</script>

<template>
  <Modal
    :show="show"
    :title="t('common.logoutConfirmTitle')"
    width="420px"
    @update:show="handleUpdateShow"
  >
    <p class="logout-confirm-text">{{ t('common.logoutConfirmText') }}</p>

    <template #footer>
      <Button type="default" :disabled="loading" @click="handleCancel">
        {{ t('common.cancel') }}
      </Button>
      <Button type="danger" :loading="loading" @click="emit('confirm')">
        {{ t('common.logout') }}
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.logout-confirm-text {
  margin: 0;
}
</style>
