<template>
  <Modal
    :show="show"
    :title="t('texts.modals.shareTitle')"
    width="560px"
    @update:show="handleUpdateShow"
  >
    <template v-if="loading">
      <div class="modal-state">{{ t('texts.state.loading') }}</div>
    </template>

    <template v-else>
      <div class="share-summary">
        <div class="share-summary-title">
          <span class="share-title">{{ textTitle || '-' }}</span>
        </div>
        <div v-if="share" class="share-summary-meta">
          <span>{{ visitsText }}</span>
          <span v-if="expiresSummary"> · {{ expiresSummary }}</span>
          <span v-if="share?.has_password"> · {{ t('texts.share.protected') }}</span>
        </div>
        <div v-else class="share-summary-meta">
          <span>{{ t('texts.share.notCreated') }}</span>
        </div>
      </div>

      <FormItem :label="t('texts.share.maxViews')">
        <Input
          v-model="form.maxViews"
          type="number"
          size="small"
          :placeholder="t('texts.share.maxViewsPlaceholder')"
          :disabled="saving"
        />
        <p class="form-hint">{{ t('texts.share.maxViewsHint') }}</p>
      </FormItem>

      <FormItem :label="t('texts.share.expiresAt')">
        <Switch
          v-model="form.expiresEnabled"
          :label="t('texts.share.enableExpires')"
          :disabled="saving"
        />
        <div v-if="form.expiresEnabled" class="inline-row">
          <Input v-model="form.expiresAt" type="datetime-local" size="small" :disabled="saving" />
        </div>
        <p class="form-hint">{{ t('texts.share.expiresHint') }}</p>
      </FormItem>

      <FormItem :label="t('texts.share.password')">
        <Switch
          v-model="form.passwordEnabled"
          :label="t('texts.share.enablePassword')"
          :disabled="saving"
        />
        <div v-if="form.passwordEnabled" class="inline-row">
          <Input
            v-model="form.password"
            type="password"
            size="small"
            :placeholder="passwordPlaceholder"
            :disabled="saving"
          />
        </div>
        <p v-if="share?.has_password" class="form-hint">{{ t('texts.share.passwordKeepHint') }}</p>
      </FormItem>

      <div class="link-group">
        <label class="link-label">{{ t('texts.share.link') }}</label>
        <div class="link-row">
          <Input :model-value="shareUrl" readonly size="small" />
          <Button type="primary" size="small" :disabled="!shareUrl || saving" @click="copyShareUrl">
            {{ t('upload.copy') }}
          </Button>
        </div>
      </div>
    </template>

    <template #footer>
      <Button type="default" :disabled="saving" @click="emit('update:show', false)">{{
        t('common.close')
      }}</Button>

      <Button
        v-if="share"
        type="default"
        :disabled="saving"
        @click="saveShare({ regenerate: true })"
      >
        {{ t('texts.share.regenerate') }}
      </Button>

      <Button v-if="share" type="danger" :disabled="saving" @click="disableShare">
        {{ t('texts.share.disable') }}
      </Button>

      <Button
        type="primary"
        :loading="saving"
        :disabled="loading || !resolvedTextId"
        @click="saveShare()"
      >
        {{ share ? t('texts.share.save') : t('texts.share.create') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/modal/Modal.vue'
import FormItem from '../ui/form-item/FormItem.vue'
import Input from '../ui/input/Input.vue'
import Switch from '../ui/switch/Switch.vue'
import Button from '../ui/button/Button.vue'
import api from '../../services/api'
import { useMessage } from '../../composables/useMessage'

const props = defineProps({
  show: Boolean,
  textId: String,
  textTitle: String,
})

const emit = defineEmits(['update:show'])

const { t, locale } = useI18n({ useScope: 'global' })
const message = useMessage()

const loading = ref(false)
const saving = ref(false)
const share = ref(null)

const form = ref({
  maxViews: '0',
  expiresEnabled: false,
  expiresAt: '',
  passwordEnabled: false,
  password: '',
})

const resolvedTextId = computed(() => String(props.textId ?? '').trim())

const resetForm = () => {
  form.value = {
    maxViews: '0',
    expiresEnabled: false,
    expiresAt: '',
    passwordEnabled: false,
    password: '',
  }
}

const formatDateTime = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(locale.value)
}

const toDatetimeLocalValue = (isoString) => {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}-${m}-${d}T${hh}:${mm}`
}

const fromDatetimeLocalValue = (value) => {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const applyShareToForm = (record) => {
  if (!record) {
    resetForm()
    return
  }

  const maxViews = Number(record.max_views ?? 0)
  form.value.maxViews = Number.isFinite(maxViews) ? String(maxViews) : '0'

  const expiresAt = String(record.expires_at ?? '').trim()
  form.value.expiresEnabled = Boolean(expiresAt)
  form.value.expiresAt = expiresAt ? toDatetimeLocalValue(expiresAt) : ''

  form.value.passwordEnabled = Boolean(record.has_password)
  form.value.password = ''
}

const shareUrl = computed(() => {
  const code = String(share.value?.share_code ?? '').trim()
  if (!code) return ''
  if (typeof window === 'undefined') return `/s/${code}`
  return `${window.location.origin}/s/${code}`
})

const visitsText = computed(() => {
  if (!share.value) return ''
  const views = Number(share.value.views ?? 0)
  const maxViews = Number(share.value.max_views ?? 0)

  if (Number.isFinite(maxViews) && maxViews > 0) {
    return t('texts.share.visitsWithMax', { views, max: maxViews })
  }

  return t('texts.share.visits', { views })
})

const expiresSummary = computed(() => {
  if (!share.value) return ''
  const expiresAt = String(share.value.expires_at ?? '').trim()
  if (!expiresAt) {
    return t('texts.share.noExpires')
  }

  const formatted = formatDateTime(expiresAt)
  return formatted ? t('texts.share.expiresAtText', { time: formatted }) : ''
})

const passwordPlaceholder = computed(() => {
  if (share.value?.has_password) {
    return t('texts.share.passwordKeepPlaceholder')
  }
  return t('texts.share.passwordPlaceholder')
})

const loadShare = async () => {
  const id = resolvedTextId.value
  if (!id) return

  loading.value = true
  try {
    const result = await api.getTextShare(id)
    share.value = result?.share || null
    applyShareToForm(share.value)
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.shareLoadFailed'))
  } finally {
    loading.value = false
  }
}

const buildPayload = ({ regenerate = false } = {}) => {
  const maxViews = Number(form.value.maxViews ?? 0)
  if (!Number.isFinite(maxViews) || maxViews < 0) {
    message.error(t('texts.share.maxViewsInvalid'))
    return null
  }

  const payload = {
    max_views: Math.floor(maxViews),
    expires_at: null,
  }

  if (form.value.expiresEnabled) {
    const expiresAt = fromDatetimeLocalValue(form.value.expiresAt)
    if (!expiresAt) {
      message.error(t('texts.share.expiresRequired'))
      return null
    }
    payload.expires_at = expiresAt
  }

  if (form.value.passwordEnabled) {
    const password = String(form.value.password ?? '').trim()
    if (password) {
      payload.password = password
    } else if (!share.value?.has_password) {
      message.error(t('texts.share.passwordRequired'))
      return null
    }
  } else {
    payload.password = null
  }

  if (regenerate) {
    payload.regenerate = true
  }

  return payload
}

const saveShare = async ({ regenerate = false } = {}) => {
  const id = resolvedTextId.value
  if (!id) return
  if (saving.value) return

  const payload = buildPayload({ regenerate })
  if (!payload) return

  saving.value = true
  try {
    const result = await api.upsertTextShare(id, payload)
    share.value = result?.share || null
    applyShareToForm(share.value)
    form.value.password = ''
    message.success(t('texts.messages.shareSaveSuccess'))
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.shareSaveFailed'))
  } finally {
    saving.value = false
  }
}

const disableShare = async () => {
  const id = resolvedTextId.value
  if (!id) return
  if (saving.value) return

  saving.value = true
  try {
    await api.deleteTextShare(id)
    share.value = null
    resetForm()
    message.success(t('texts.messages.shareDisableSuccess'))
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.shareDisableFailed'))
  } finally {
    saving.value = false
  }
}

const copyShareUrl = async () => {
  const url = shareUrl.value
  if (!url) return

  try {
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null
    if (!clipboard) {
      throw new Error('Clipboard API is not available')
    }
    await clipboard.writeText(url)
    message.success(t('common.copied'))
  } catch (error) {
    message.error(error.response?.data?.error || t('texts.messages.shareCopyFailed'))
  }
}

const handleUpdateShow = (value) => {
  emit('update:show', value)
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      loadShare()
    } else {
      share.value = null
      resetForm()
      loading.value = false
      saving.value = false
    }
  }
)

watch(
  () => props.textId,
  () => {
    if (props.show) {
      loadShare()
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

.share-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: var(--nb-space-lg);
}

.share-title {
  font-weight: 700;
  color: var(--nb-ink);
  word-break: break-word;
}

.share-summary-meta {
  font-size: 12px;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.inline-row {
  margin-top: var(--nb-space-sm);
}

.form-hint {
  margin: var(--nb-space-xs) 0 0;
  font-size: 12px;
  color: var(--nb-muted-foreground, var(--nb-gray-500));
}

.link-group {
  display: flex;
  flex-direction: column;
  gap: var(--nb-space-xs);
}

.link-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--nb-ink);
}

.link-row {
  display: flex;
  gap: var(--nb-space-sm);
  align-items: center;
}

@media (max-width: 720px) {
  .link-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
