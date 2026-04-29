import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

export function useLogoutConfirm({ beforeOpen } = {}) {
  const router = useRouter()
  const authStore = useAuthStore()

  const logoutConfirmVisible = ref(false)
  const logoutSubmitting = ref(false)

  const openLogoutConfirm = () => {
    if (logoutSubmitting.value) {
      return
    }

    if (typeof beforeOpen === 'function') {
      beforeOpen()
    }

    logoutConfirmVisible.value = true
  }

  const confirmLogout = async () => {
    if (logoutSubmitting.value) {
      return
    }

    logoutSubmitting.value = true

    try {
      await authStore.logout()
      logoutConfirmVisible.value = false
      await router.push('/login')
    } finally {
      logoutSubmitting.value = false
    }
  }

  return {
    logoutConfirmVisible,
    logoutSubmitting,
    openLogoutConfirm,
    confirmLogout,
  }
}
