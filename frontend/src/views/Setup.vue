<template>
  <div class="setup-container">
    <n-card class="setup-card" title="R2 存储配置" size="large">
      <n-steps :current="currentStep" :status="stepStatus">
        <n-step title="输入配置" description="填写 Cloudflare R2 信息" />
        <n-step title="测试连接" description="验证配置是否正确" />
        <n-step title="完成" description="开始使用" />
      </n-steps>

      <n-divider />

      <n-alert v-if="isEnvConfig" type="info" title="已使用环境变量配置，无法在界面修改" style="margin-bottom: 16px;" />

      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
        label-placement="left"
        label-width="140"
      >
        <n-form-item label="R2 端点 URL" path="endpoint">
          <n-input
            v-model:value="formValue.endpoint"
            placeholder="https://xxxxxxxx.r2.cloudflarestorage.com"
            :disabled="isEnvConfig"
          />
        </n-form-item>

        <n-form-item label="Access Key ID" path="access_key_id">
          <n-input
            v-model:value="formValue.access_key_id"
            placeholder="R2 访问密钥 ID"
            :disabled="isEnvConfig"
          />
        </n-form-item>

        <n-form-item label="Secret Access Key" path="secret_access_key">
          <n-input
            v-model:value="formValue.secret_access_key"
            type="password"
            placeholder="R2 访问密钥"
            show-password-on="click"
            :disabled="isEnvConfig"
          />
        </n-form-item>

        <n-form-item label="Bucket Name" path="bucket_name">
          <n-input
            v-model:value="formValue.bucket_name"
            placeholder="存储桶名称"
            :disabled="isEnvConfig"
          />
        </n-form-item>
      </n-form>

      <n-alert type="info" title="如何获取这些信息？" style="margin-bottom: 20px;">
        <ol style="margin-left: 20px; margin-top: 10px;">
          <li>登录 <a href="https://dash.cloudflare.com" target="_blank">Cloudflare Dashboard</a></li>
          <li>进入 R2 Object Storage</li>
          <li>创建或选择一个存储桶</li>
          <li>在 "Manage R2 API Tokens" 中创建 API Token（需要 Object Read/Write 权限）</li>
          <li><strong>R2 端点 URL</strong>：格式为 <code>https://&lt;account_id&gt;.r2.cloudflarestorage.com</code></li>
        </ol>
      </n-alert>

      <n-space justify="space-between">
        <n-button @click="handleLogout">退出登录</n-button>
        <n-space>
          <n-button
            type="info"
            :loading="testing"
            :disabled="!isFormValid || isEnvConfig"
            @click="handleTest"
          >
            测试连接
          </n-button>
          <n-button
            type="primary"
            :loading="saving"
            :disabled="!testPassed || isEnvConfig"
            @click="handleSave"
          >
            保存配置
          </n-button>
        </n-space>
      </n-space>

      <n-alert
        v-if="testResult"
        :type="testResult.success ? 'success' : 'error'"
        :title="testResult.message"
        style="margin-top: 20px;"
      />
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../services/api'
import {
  NCard,
  NSteps,
  NStep,
  NDivider,
  NForm,
  NFormItem,
  NInput,
  NButton,
  NSpace,
  NAlert,
  useMessage
} from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref(null)
const formValue = ref({
  endpoint: '',
  access_key_id: '',
  secret_access_key: '',
  bucket_name: ''
})

const rules = {
  endpoint: { required: true, message: '请输入 R2 端点 URL', trigger: 'blur' },
  access_key_id: { required: true, message: '请输入 Access Key ID', trigger: 'blur' },
  secret_access_key: { required: true, message: '请输入 Secret Access Key', trigger: 'blur' },
  bucket_name: { required: true, message: '请输入 Bucket Name', trigger: 'blur' }
}

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
  try {
    await formRef.value?.validate()
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

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.setup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f7fa;
}

.setup-card {
  width: 100%;
  max-width: 900px;
  border-radius: 16px;
}
</style>
