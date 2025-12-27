// Toast composable for global message notifications
import { createApp, h } from 'vue'
import BrutalToast from '../components/ui/BrutalToast.vue'

let toastInstance = null
let toastContainer = null

const createToastInstance = () => {
  if (toastInstance) return toastInstance

  toastContainer = document.createElement('div')
  document.body.appendChild(toastContainer)

  const app = createApp({
    render() {
      return h(BrutalToast, { ref: 'toast' })
    }
  })

  const vm = app.mount(toastContainer)
  toastInstance = vm.$refs?.toast || null

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
