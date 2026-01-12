import { defineStore } from 'pinia'
import api from '../services/api'

export const useFilesStore = defineStore('files', {
  state: () => ({
    files: [],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    filters: {},
  }),

  actions: {
    async fetchFiles(page = 1, limit = this.limit, filters = this.filters, options = {}) {
      this.loading = true
      try {
        const response = await api.getFiles(page, limit, filters)
        const nextFiles = response.files || []
        const shouldAppend = Boolean(options?.append)

        this.files = shouldAppend ? [...this.files, ...nextFiles] : nextFiles
        this.total = response.total
        this.page = response.page
        this.limit = response.limit
        this.filters = filters || {}
      } finally {
        this.loading = false
      }
    },

    async deleteFile(fileId) {
      await api.deleteFile(fileId)
      await this.fetchFiles(this.page, this.limit, this.filters)
    },
  },
})
