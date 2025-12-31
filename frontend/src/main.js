import './assets/neobrutalism.css'
import './assets/shadcn-fonts.css'
import './assets/shadcn.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useThemeStore } from './stores/theme'
import { i18n } from './locales'

const app = createApp(App)
const pinia = createPinia()

useThemeStore(pinia).init()

app.use(pinia)
app.use(i18n)
app.use(router)

app.mount('#app')
