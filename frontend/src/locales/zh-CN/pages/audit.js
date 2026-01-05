export default {
  audit: {
    title: '审计日志',
    subtitle: '查看系统内的所有操作记录',
    allActions: '全部动作',
    allActors: '全部操作者',
    loadUsersFailed: '加载用户列表失败',
    loadLogsFailed: '加载审计日志失败',
    confirmDelete: '确定要删除这条审计日志吗？',
    confirmBatchDelete: '确定要删除选中的 {count} 条审计日志吗？',
    actions: {
      delete: '删除',
      deleteSelected: '删除所选 ({count})',
    },
    modals: {
      deleteTitle: '确认删除',
    },
    messages: {
      deleteSuccess: '已删除 {count} 条记录',
      deleteFailed: '删除失败',
    },
    columns: {
      time: '时间',
      action: '动作',
      actor: '操作者',
      ip: 'IP',
      userAgent: 'User-Agent',
      actions: '操作',
    },
  },
}
