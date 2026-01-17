<template>
  <Modal
    :show="show"
    :title="modalTitle"
    width="420px"
    @update:show="handleUpdateShow"
  >
    <template v-if="loading">
      <div class="modal-state">{{ t('texts.state.loading') }}</div>
    </template>

    <template v-else-if="errorText">
      <div class="modal-state modal-error">{{ errorText }}</div>
    </template>

    <template v-else>
      <div v-if="qrDataUrl" class="qr-wrap">
        <img class="qr-image" :src="qrDataUrl" :alt="modalTitle" />
        <p v-if="formattedExpiresAt" class="qr-meta">
          {{ t('texts.qrcode.expiresAt', { time: formattedExpiresAt }) }}
        </p>
        <p class="qr-hint">{{ t('texts.qrcode.hint') }}</p>
      </div>
      <div v-else class="modal-state">{{ t('texts.qrcode.empty') }}</div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import Modal from '../ui/modal/Modal.vue'
import { useMessage } from '../../composables/useMessage'
import api from '../../services/api'

const props = defineProps({
  show: Boolean,
  textId: String,
  textTitle: String,
})

const emit = defineEmits(['update:show'])

const { t } = useI18n({ useScope: 'global' })
const message = useMessage()

const loading = ref(false)
const qrDataUrl = ref('')
const errorText = ref('')
const expiresAt = ref('')

const resolvedTextId = computed(() => String(props.textId ?? '').trim())
const modalTitle = computed(() => {
  const base = t('texts.modals.qrcodeTitle')
  const title = String(props.textTitle ?? '').trim()
  return title ? `${base} - ${title}` : base
})
const formattedExpiresAt = computed(() => {
  const iso = String(expiresAt.value || '').trim()
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
})

const resetState = () => {
  loading.value = false
  qrDataUrl.value = ''
  errorText.value = ''
  expiresAt.value = ''
}

const loadQr = async () => {
  const id = resolvedTextId.value
  if (!id) return

  resetState()
  loading.value = true

  try {
    const result = await api.createTextOneTimeShare(id)
    const code = String(result?.share?.share_code ?? '').trim()
    const exp = String(result?.share?.expires_at ?? '').trim()
    expiresAt.value = exp

    if (!code) {
      errorText.value = t('texts.qrcode.empty')
      return
    }

    const base = typeof window === 'undefined' ? '' : window.location.origin
    const url = `${base}/s/${code}`

    qrDataUrl.value = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
    })
  } catch (error) {
    const backendError = error?.response?.data?.error
    const fallback = t('texts.messages.qrcodeFailed')
    const rawMessage = error?.message ? String(error.message) : ''
    const looksLikeTooLarge = /too (big|large|long)|data.*(too (big|large|long))/i.test(rawMessage)
    const msg =
      backendError || (looksLikeTooLarge ? t('texts.messages.qrcodeTooLarge') : rawMessage || fallback)
    errorText.value = msg
    message.error(msg)
  } finally {
    loading.value = false
  }
}

const handleUpdateShow = (value) => {
  emit('update:show', value)
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      loadQr()
    } else {
      resetState()
    }
  }
)

watch(
  () => props.textId,
  () => {
    if (props.show) {
      loadQr()
    }
  }
)
</script>

<style scoped>
.modal-state {
  padding: var(--nb-space-md);
  text-align: center;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.modal-error {
  color: var(--destructive, var(--nb-danger));
}

.qr-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--nb-space-sm);
  padding: var(--nb-space-sm) 0;
}

.qr-image {
  width: 280px;
  height: 280px;
  border-radius: var(--nb-radius);
  background: white;
  border: var(--nb-border);
}

.qr-hint {
  margin: 0;
  font-size: 12px;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  text-align: center;
}

.qr-meta {
  margin: 0;
  font-size: 12px;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
  text-align: center;
}
</style>
