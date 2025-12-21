<template>
  <AppLayout>
    <BrutalCard title="R2 存储配置">
      <BrutalSteps :current="currentStep" :status="stepStatus" :items="stepItems" />

      <BrutalDivider />

      <BrutalAlert v-if="isEnvConfig" type="info" title="已使用环境变量配置，无法在界面修改" />

      <div class="form-section">
        <BrutalFormItem label="R2 端点 URL" required>
          <BrutalInput
            v-model="formValue.endpoint"
            placeholder="https://xxxxxxxx.r2.cloudflarestorage.com"
            :disabled="isEnvConfig"
          />
        </BrutalFormItem>

        <BrutalFormItem label="Access Key ID" required>
          <BrutalInput
            v-model="formValue.access_key_id"
            placeholder="R2 访问密钥 ID"
            :disabled="isEnvConfig"
          />
        </BrutalFormItem>

        <BrutalFormItem label="Secret Access Key" required>
          <BrutalInput
            v-model="formValue.secret_access_key"
            type="password"
            placeholder="R2 访问密钥"
            :disabled="isEnvConfig"
          />
        </BrutalFormItem>

        <BrutalFormItem label="Bucket Name" required>
          <BrutalInput
            v-model="formValue.bucket_name"
            placeholder="存储桶名称"
            :disabled="isEnvConfig"
          />
        </BrutalFormItem>
      </div>

      <BrutalAlert type="info" title="如何获取这些信息？">
        <ol class="help-list">
          <li>登录 <a href="https://dash.cloudflare.com" target="_blank">Cloudflare Dashboard</a></li>
          <li>进入 R2 Object Storage</li>
          <li>创建或选择一个存储桶</li>
          <li>在 "Manage R2 API Tokens" 中创建 API Token（需要 Object Read/Write 权限）</li>
          <li><strong>R2 端点 URL</strong>：格式为 <code>https://&lt;account_id&gt;.r2.cloudflarestorage.com</code></li>
        </ol>
      </BrutalAlert>

      <div class="action-row">
        <div class="action-group">
          <BrutalButton
            type="default"
            :loading="testing"
            :disabled="!isFormValid || isEnvConfig"
            @click="handleTest"
          >
            测试连接
          </BrutalButton>
          <BrutalButton
            type="primary"
            :loading="saving"
            :disabled="!testPassed || isEnvConfig"
            @click="handleSave"
          >
            保存配置
          </BrutalButton>
        </div>
      </div>

      <BrutalAlert
        v-if="testResult"
        :type="testResult.success ? 'success' : 'error'"
        :title="testResult.message"
        class="result-alert"
      />
    </BrutalCard>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import AppLayout from '../components/layout/AppLayout.vue'
import BrutalCard from '../components/ui/BrutalCard.vue'
import BrutalSteps from '../components/ui/BrutalSteps.vue'
import BrutalDivider from '../components/ui/BrutalDivider.vue'
import BrutalFormItem from '../components/ui/BrutalFormItem.vue'
import BrutalInput from '../components/ui/BrutalInput.vue'
import BrutalButton from '../components/ui/BrutalButton.vue'
import BrutalAlert from '../components/ui/BrutalAlert.vue'
import { useMessage } from '../composables/useMessage'

const router = useRouter()
const message = useMessage()

const formValue = ref({
  endpoint: '',
  access_key_id: '',
  secret_access_key: '',
  bucket_name: ''
})

const stepItems = [
  { title: '输入配置', description: '填写 Cloudflare R2 信息' },
  { title: '测试连接', description: '验证配置是否正确' },
  { title: '完成', description: '开始使用' }
]

const currentStep = ref(1)
const stepStatus = ref('process')
const testing = ref(false)
const saving = ref(false)
const testPassed = ref(false)
const testResult = ref(null)
const isEnvConfig = ref(false)

const isFormValid = computed(() => {
  return formValue.value.endpoint &&
         formValue.value.access_key_id &&
         formValue.value.secret_access_key &&
         formValue.value.bucket_name
})

onMounted(async () => {
  try {
    const status = await api.getSetupStatus()
    if (status.configured && status.config) {
      formValue.value.endpoint = status.config.endpoint || ''
      formValue.value.bucket_name = status.config.bucket_name || ''
    }
    isEnvConfig.value = status.config_source === 'env'
  } catch (error) {
    console.error('加载配置失败:', error)
  }
})

const handleTest = async () => {
  if (!isFormValid.value) {
    message.error('请填写所有必填项')
    return
  }

  try {
    testing.value = true
    testResult.value = null

    const result = await api.testR2Connection({
      endpoint: formValue.value.endpoint,
      access_key_id: formValue.value.access_key_id,
      secret_access_key: formValue.value.secret_access_key,
      bucket_name: formValue.value.bucket_name
    })

    testResult.value = result
    if (result.success) {
      testPassed.value = true
      currentStep.value = 2
      message.success('连接测试成功！')
    } else {
      testPassed.value = false
      message.error(result.message)
    }
  } catch (error) {
    testResult.value = {
      success: false,
      message: error.response?.data?.message || '连接测试失败'
    }
    message.error('连接测试失败')
  } finally {
    testing.value = false
  }
}

const handleSave = async () => {
  try {
    saving.value = true

    const result = await api.saveR2Config({
      endpoint: formValue.value.endpoint,
      access_key_id: formValue.value.access_key_id,
      secret_access_key: formValue.value.secret_access_key,
      bucket_name: formValue.value.bucket_name
    })

    if (result.success) {
      currentStep.value = 3
      stepStatus.value = 'finish'
      message.success('配置保存成功！')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    }
  } catch (error) {
    message.error('保存配置失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.form-section {
  display: grid;
  gap: var(--nb-space-md);
  margin-bottom: var(--nb-space-lg);
}

.help-list {
  margin: var(--nb-space-sm) 0 0 var(--nb-space-lg);
  line-height: 1.8;
}

.help-list a {
  color: var(--nb-secondary);
  font-weight: 700;
}

.help-list code {
  background: var(--nb-gray-200);
  padding: 2px 6px;
  font-family: var(--nb-font-mono);
  font-size: 13px;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--nb-space-lg);
}

.action-group {
  display: flex;
  gap: var(--nb-space-sm);
}

.result-alert {
  margin-top: var(--nb-space-lg);
}
</style>
