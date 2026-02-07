<template>
  <Modal v-model:show="showProxy" :title="modalTitle" width="560px">
    <div class="form-grid">
      <FormItem :label="t('setup.labels.name')">
        <Input v-model="form.name" :placeholder="t('setup.placeholders.name')" />
      </FormItem>

      <FormItem :label="t('setup.labels.endpoint')">
        <Input v-model="form.endpoint" :placeholder="t('setup.placeholders.endpoint')" />
      </FormItem>

      <FormItem :label="t('setup.labels.bucketName')">
        <Input v-model="form.bucket_name" :placeholder="t('setup.placeholders.bucketName')" />
      </FormItem>

      <FormItem :label="t('setup.labels.quotaGb')">
        <Input
          v-model="form.quota_gb"
          type="number"
          :placeholder="t('setup.placeholders.quotaGb')"
        />
      </FormItem>

      <FormItem
        :label="
          normalizedMode === 'create'
            ? t('setup.labels.accessKeyId')
            : t('setup.labels.accessKeyIdOptional')
        "
      >
        <Input v-model="form.access_key_id" :placeholder="t('setup.placeholders.accessKeyId')" />
      </FormItem>

      <FormItem
        :label="
          normalizedMode === 'create'
            ? t('setup.labels.secretAccessKey')
            : t('setup.labels.secretAccessKeyOptional')
        "
      >
        <Input
          v-model="form.secret_access_key"
          type="password"
          :placeholder="t('setup.placeholders.secretAccessKey')"
        />
      </FormItem>

      <Alert type="info" :title="t('setup.hint.title')">
        <ul class="help-list">
          <li>
            {{ t('setup.hint.endpointFormatPrefix') }}
            <code>https://&lt;account_id&gt;.r2.cloudflarestorage.com</code>
          </li>
          <li>
            {{ t('setup.hint.tokenCreatePrefix') }}
            <strong>R2 → Manage R2 API Tokens</strong>
            {{ t('setup.hint.tokenCreateSuffix') }}
          </li>
        </ul>
      </Alert>
    </div>

    <template #footer>
      <Button type="default" @click="showProxy = false">
        {{ t('common.cancel') }}
      </Button>
      <Button type="primary" :loading="submitting" @click="emitSubmit">
        {{ t('setup.modal.save') }}
      </Button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '../ui/modal/Modal.vue'
import FormItem from '../ui/form-item/FormItem.vue'
import Input from '../ui/input/Input.vue'
import Alert from '../ui/alert/Alert.vue'
import Button from '../ui/button/Button.vue'

const props = defineProps({
  show: Boolean,
  mode: { type: String, default: 'create' },
  submitting: Boolean,
  initialValue: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:show', 'submit'])

const { t } = useI18n({ useScope: 'global' })

const normalizedMode = computed(() => (props.mode === 'edit' ? 'edit' : 'create'))

const modalTitle = computed(() =>
  normalizedMode.value === 'create' ? t('setup.modal.createTitle') : t('setup.modal.editTitle')
)

const showProxy = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
})

const defaultFormValue = () => ({
  name: '',
  endpoint: '',
  bucket_name: '',
  quota_gb: '10',
  access_key_id: '',
  secret_access_key: '',
})

const form = reactive(defaultFormValue())

const resetForm = () => {
  const next = { ...defaultFormValue(), ...(props.initialValue || {}) }
  Object.assign(form, next)
}

watch(
  () => props.show,
  (show) => {
    if (show) resetForm()
  }
)

watch(
  () => props.mode,
  () => {
    if (props.show) resetForm()
  }
)

watch(
  () => props.initialValue,
  () => {
    if (props.show) resetForm()
  },
  { deep: true }
)

const emitSubmit = () => {
  emit('submit', { ...form })
}
</script>

<style scoped>
.form-grid {
  display: grid;
  gap: var(--nb-space-md);
}

.form-grid :deep(.brutal-form-item) {
  margin-bottom: 0;
}

.help-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.8;
}

.help-list code {
  background: var(--nb-gray-200);
  padding: 2px 6px;
  font-family: var(--nb-font-mono);
  font-size: 13px;
}
</style>
