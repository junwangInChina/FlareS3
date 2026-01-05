export default {
  files: {
    title: '文件列表',
    subtitle: '查看和管理所有上传的文件',
    uploadFile: '上传文件',
    filters: {
      filename: '文件名称',
      allOwners: '全部用户',
      allStatus: '全部状态',
    },
    status: {
      valid: '有效',
      invalid: '失效',
      expired: '已过期',
    },
    expires: {
      seconds: '{value}秒',
      days: '{days}天',
    },
    columns: {
      filename: '文件名',
      size: '大小',
      expires: '有效期',
      status: '状态',
      remaining: '剩余时间',
      uploadedAt: '上传时间',
      owner: '归属用户',
      actions: '操作',
    },
    actions: {
      delete: '删除',
    },
    modals: {
      infoTitle: '文件信息',
      uploadTitle: '上传文件',
    },
    info: {
      filename: '文件名',
      size: '文件大小',
      uploadedAt: '上传时间',
      remaining: '剩余时间',
      permission: '下载权限',
    },
    permission: {
      requireLogin: '需要登录',
      public: '公开',
    },
    downloadFile: '下载文件',
    confirmDelete: '确定要删除这个文件吗？',
    messages: {
      loadUsersFailed: '加载用户列表失败',
      loadFilesFailed: '加载文件列表失败',
      deleteSuccess: '文件已删除',
      deleteFailed: '删除文件失败',
    },
  },
}
