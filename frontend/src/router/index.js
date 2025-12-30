import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/Setup.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/Users.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/audit',
    name: 'Audit',
    component: () => import('../views/Audit.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/',
    name: 'Files',
    component: () => import('../views/Files.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/files',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      const isValid = await authStore.checkAuth()
      if (!isValid) {
        next('/login')
        return
      }
    }

    if (to.meta.requiresAdmin && !authStore.isAdmin) {
      next('/')
      return
    }
  }

  next()
})

export default router
