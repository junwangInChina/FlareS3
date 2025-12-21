<template>
  <div class="login-container">
    <div class="login-card">
      <div class="logo">
        <div class="logo-box">F</div>
        <span class="logo-text">FlareS3</span>
      </div>
      <p class="subtitle">轻量级临时文件分享</p>

      <form class="login-form" @submit.prevent="handleSubmit">
        <BrutalFormItem label="用户名">
          <BrutalInput
            v-model="formValue.username"
            placeholder="请输入用户名"
            size="large"
            @keyup.enter="handleSubmit"
          />
        </BrutalFormItem>

        <BrutalFormItem label="密码">
          <BrutalInput
            v-model="formValue.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            @keyup.enter="handleSubmit"
          />
        </BrutalFormItem>

        <BrutalButton
          type="primary"
          size="large"
          block
          :loading="loading"
          @click="handleSubmit"
        >
          登录
        </BrutalButton>

        <BrutalAlert v-if="errorMessage" type="error" class="error-alert">
          {{ errorMessage }}
        </BrutalAlert>
      </form>

      <p class="footer-text">管理员账号通过环境变量初始化</p>
      <a class="github-link" href="https://github.com/Today-ddr/r2box" target="_blank">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
        GitHub
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BrutalInput from '../components/ui/BrutalInput.vue'
import BrutalButton from '../components/ui/BrutalButton.vue'
import BrutalAlert from '../components/ui/BrutalAlert.vue'
import BrutalFormItem from '../components/ui/BrutalFormItem.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formValue = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  if (!formValue.value.username || !formValue.value.password) {
    errorMessage.value = '请输入用户名和密码'
    return
  }

  try {
    loading.value = true
    errorMessage.value = ''

    const result = await authStore.login(formValue.value.username, formValue.value.password)
    if (result.success) {
      const next = typeof route.query.next === 'string' ? route.query.next : '/'
      const target = next.startsWith('/') ? next : '/'
      router.push(target)
    } else {
      errorMessage.value = result.message || '登录失败'
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.error || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--nb-bg);
  padding: var(--nb-space-md);
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: var(--nb-space-2xl);
  background: var(--nb-white);
  border: var(--nb-border);
  box-shadow: var(--nb-shadow-lg);
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--nb-space-sm);
}

.logo-box {
  width: 56px;
  height: 56px;
  background-color: var(--nb-black);
  color: var(--nb-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--nb-font-mono);
  font-weight: 900;
  font-size: 32px;
}

.logo-text {
  font-family: var(--nb-font-mono);
  font-size: 36px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -2px;
}

.subtitle {
  text-align: center;
  color: var(--nb-gray-500);
  margin-top: var(--nb-space-sm);
  font-size: 14px;
}

.login-form {
  margin-top: var(--nb-space-xl);
}

.error-alert {
  margin-top: var(--nb-space-md);
}

.footer-text {
  margin-top: var(--nb-space-xl);
  text-align: center;
  color: var(--nb-gray-400);
  font-size: 12px;
}

.github-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: var(--nb-space-sm);
  color: var(--nb-gray-500);
  text-decoration: none;
  font-size: 12px;
  justify-content: center;
  width: 100%;
  padding: 8px;
  border: 2px solid transparent;
  transition: var(--nb-transition-fast);
}

.github-link:hover {
  background: var(--nb-gray-100);
  border-color: var(--nb-black);
}
</style>
