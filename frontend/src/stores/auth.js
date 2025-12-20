import { defineStore } from 'pinia'
import api from '../services/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    user: null
  }),

  getters: {
    isAdmin: state => state.user?.role === 'admin'
  },

  actions: {
    async login(username, password) {
      try {
        const response = await api.login(username, password)
        if (response.success) {
          this.isAuthenticated = true
          this.user = response.user
          return { success: true }
        }
        return { success: false, message: response.message }
      } catch (error) {
        return { success: false, message: error.response?.data?.error || '登录失败' }
      }
    },

    async checkAuth() {
      try {
        const response = await api.getAuthStatus()
        this.isAuthenticated = response.authenticated
        this.user = response.user || null
        return this.isAuthenticated
      } catch (error) {
        this.logoutLocal()
        return false
      }
    },

    async logout() {
      try {
        await api.logout()
      } catch (error) {
        // ignore
      }
      this.logoutLocal()
    },

    logoutLocal() {
      this.isAuthenticated = false
      this.user = null
    }
  }
})
