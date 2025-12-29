// Toast composable for global message notifications
import { getCurrentInstance, h, ref, render } from 'vue'
import Toast from '../components/ui/toast/Toast.vue'

let toastInstance = null
let toastContainer = null
let toastRef = null

const createToastInstance = (appContext) => {
  if (toastInstance) return toastInstance
  if (typeof document === 'undefined') return null

  toastContainer = document.createElement('div')
  document.body.appendChild(toastContainer)

  toastRef = ref(null)
  const vnode = h(Toast, { ref: toastRef })
  vnode.appContext = appContext
  render(vnode, toastContainer)
  toastInstance = toastRef.value || null

  return toastInstance
}

export const useMessage = () => {
  const instance = getCurrentInstance()
  const appContext = instance?.appContext

  const getInstance = () => {
    if (!toastInstance) {
      if (!appContext) return null
      createToastInstance(appContext)
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
