// Toast composable for global message notifications
import { ref, createApp, h } from 'vue'
import BrutalToast from '../components/ui/BrutalToast.vue'

let toastInstance = null
let toastContainer = null

const createToastInstance = () => {
  if (toastInstance) return toastInstance

  toastContainer = document.createElement('div')
  document.body.appendChild(toastContainer)

  const app = createApp({
    setup() {
      const toastRef = ref(null)
      return () => h(BrutalToast, { ref: toastRef })
    }
  })

  const vm = app.mount(toastContainer)
  toastInstance = vm.$refs?.toastRef || vm

  return toastInstance
}

export const useMessage = () => {
  const getInstance = () => {
    if (!toastInstance) {
      createToastInstance()
    }
    return toastInstance
  }

  return {
    success: (message, duration) => getInstance()?.success?.(message, duration),
    error: (message, duration) => getInstance()?.error?.(message, duration),
    warning: (message, duration) => getInstance()?.warning?.(message, duration),
    info: (message, duration) => getInstance()?.info?.(message, duration)
  }
}

export default useMessage
