import './assets/neobrutalism.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

useThemeStore(pinia).init()

app.use(pinia)
app.use(router)

app.mount('#app')
