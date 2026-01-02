export default {
  audit: {
    title: "Audit Logs",
    subtitle: "View all actions in the system",
    allActions: "All actions",
    allActors: "All actors",
    loadUsersFailed: "Failed to load users",
    loadLogsFailed: "Failed to load audit logs",
    confirmDelete: "Delete this audit log entry?",
    confirmBatchDelete: "Delete the selected {count} audit log entries?",
    actions: {
      delete: "Delete",
      deleteSelected: "Delete selected ({count})",
    },
    modals: {
      deleteTitle: "Confirm deletion",
    },
    messages: {
      deleteSuccess: "Deleted {count} entries",
      deleteFailed: "Failed to delete",
    },
    columns: {
      time: "Time",
      action: "Action",
      actor: "Actor",
      ip: "IP",
      userAgent: "User-Agent",
      actions: "Actions",
    },
  },
};
