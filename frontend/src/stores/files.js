import { defineStore } from 'pinia'
import api from '../services/api'

export const useFilesStore = defineStore('files', {
  state: () => ({
    files: [],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    scope: 'mine'
  }),

  actions: {
    async fetchFiles(page = 1, limit = this.limit, scope = this.scope) {
      this.loading = true
      try {
        const response = await api.getFiles(page, limit, scope)
        this.files = response.files || []
        this.total = response.total
        this.page = response.page
        this.limit = response.limit
        this.scope = scope
        this.loading = false
      } catch (error) {
        this.loading = false
        throw error
      }
    },

    async deleteFile(fileId) {
      try {
        await api.deleteFile(fileId)
        await this.fetchFiles(this.page, this.limit, this.scope)
      } catch (error) {
        throw error
      }
    }
  }
})
