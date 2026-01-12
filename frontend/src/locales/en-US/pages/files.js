export default {
  files: {
    title: 'Files',
    subtitle: 'View and manage all uploaded files',
    uploadFile: 'Upload',
    filters: {
      filename: 'Filename',
      allOwners: 'All users',
      allStatus: 'All status',
    },
    status: {
      valid: 'Valid',
      invalid: 'Invalid',
      expired: 'Expired',
    },
    expires: {
      seconds: '{value}s',
      days: '{days}d',
    },
    viewMode: {
      table: 'Table view',
      card: 'Card view',
    },
    state: {
      loading: 'Loading...',
      empty: 'No files',
    },
    columns: {
      filename: 'Filename',
      size: 'Size',
      expires: 'Expires',
      status: 'Status',
      remaining: 'Remaining',
      uploadedAt: 'Uploaded at',
      owner: 'Owner',
      actions: 'Actions',
    },
    actions: {
      delete: 'Delete',
      loadMore: 'Load more',
    },
    modals: {
      infoTitle: 'File info',
      uploadTitle: 'Upload',
    },
    info: {
      filename: 'Filename',
      size: 'Size',
      uploadedAt: 'Uploaded at',
      remaining: 'Remaining',
      permission: 'Download access',
    },
    permission: {
      requireLogin: 'Login required',
      public: 'Public',
    },
    downloadFile: 'Download',
    confirmDelete: 'Delete this file?',
    messages: {
      loadUsersFailed: 'Failed to load users',
      loadFilesFailed: 'Failed to load files',
      deleteSuccess: 'File deleted',
      deleteFailed: 'Failed to delete file',
    },
  },
}
