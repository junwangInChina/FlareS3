import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true
})

api.interceptors.response.use(
  response => response.data,
  error => {
    const isAuthApi = error.config?.url?.includes('/auth/')
    if (error.response?.status === 401 && !isAuthApi) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default {
  // 认证
  login(username, password) {
    return api.post('/auth/login', { username, password })
  },

  logout() {
    return api.post('/auth/logout')
  },

  getAuthStatus() {
    return api.get('/auth/status')
  },

  // R2 配置
  getSetupStatus() {
    return api.get('/setup/status')
  },

  saveR2Config(config) {
    return api.post('/setup/config', config)
  },

  testR2Connection(config) {
    return api.post('/setup/test', config)
  },

  // 文件上传
  getUploadURL(data) {
    return api.post('/upload/presign', data)
  },

  initMultipartUpload(data) {
    return api.post('/upload/multipart/init', data)
  },

  getMultipartUploadURL(data) {
    return api.post('/upload/multipart/presign', data)
  },

  completeMultipartUpload(data) {
    return api.post('/upload/multipart/complete', data)
  },

  confirmUpload(fileId) {
    return api.post('/upload/confirm', { file_id: fileId })
  },

  // 文件管理
  getFiles(page = 1, limit = 20, scope = 'mine') {
    return api.get('/files', { params: { page, limit, scope } })
  },

  deleteFile(fileId) {
    return api.delete(`/files/${fileId}`)
  },

  getDownloadURL(fileId) {
    return `/api/files/${fileId}/download`
  },

  // 存储统计
  getStats() {
    return api.get('/stats')
  },

  // 用户管理
  getUsers(params = {}) {
    return api.get('/users', { params })
  },

  createUser(payload) {
    return api.post('/users', payload)
  },

  updateUser(userId, payload) {
    return api.patch(`/users/${userId}`, payload)
  },

  resetUserPassword(userId, password) {
    return api.post(`/users/${userId}/reset-password`, { password })
  },

  deleteUser(userId) {
    return api.delete(`/users/${userId}`)
  },

  // 审计
  getAudit(params = {}) {
    return api.get('/audit', { params })
  },

  // 直接上传到 R2
  uploadToR2(url, file, onProgress) {
    return axios.put(url, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      },
      onUploadProgress: progressEvent => {
        if (onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(percent, progressEvent.loaded, progressEvent.total)
        }
      }
    })
  }
}
