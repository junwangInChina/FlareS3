import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { buildLoginRouteLocation, resolvePostLoginNavigation } from '../utils/authRedirect.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/Setup.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/Users.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/audit',
    name: 'Audit',
    component: () => import('../views/Audit.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/texts',
    alias: '/texts/',
    name: 'Texts',
    component: () => import('../views/Texts.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    name: 'Files',
    component: () => import('../views/Files.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/mount',
    alias: '/mount/',
    name: 'Mount',
    component: () => import('../views/Mount.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/files',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.path === '/login' && authStore.isAuthenticated) {
    const navigation = resolvePostLoginNavigation(to.query.next)
    if (navigation.type === 'hard') {
      window.location.assign(navigation.target)
      return
    }
    next(navigation.target)
    return
  }

  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      const isValid = await authStore.checkAuth()
      if (!isValid) {
        next(buildLoginRouteLocation(to.fullPath))
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
