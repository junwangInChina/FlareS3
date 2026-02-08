export default {
  mount: {
    title: 'Mount',
    subtitle: 'Browse objects in the selected R2 bucket (without DB records).',
    filters: {
      config: 'R2 Config',
      prefix: 'Prefix',
      limit: 'Per page',
    },
    viewMode: {
      ariaLabel: 'View mode',
      table: 'Table view',
      card: 'Card view',
    },
    actions: {
      go: 'Go',
      root: 'Root',
      up: 'Up',
      refresh: 'Refresh',
      prevPage: 'Prev',
      nextPage: 'Next',
      open: 'Open',
      preview: 'Preview',
      download: 'Download',
      delete: 'Delete',
      copyKey: 'Copy key',
    },
    table: {
      name: 'Name',
      size: 'Size',
      lastModified: 'Last modified',
      actions: 'Actions',
    },
    pagination: {
      page: 'Page {page}',
    },
    state: {
      loading: 'Loading...',
      empty: 'No objects',
      noConfigsTitle: 'No R2 configs',
      noConfigsContent: 'Please add and test an R2 config in the Storage page first.',
      noConfigSelectedTitle: 'Select an R2 config',
      noConfigSelectedContent: 'Select a config to browse objects in that bucket.',
    },
    preview: {
      title: 'Preview',
      titleWithName: 'Preview: {name}',
      loadFailed: 'Failed to load preview',
      unsupportedTitle: 'Preview not supported',
      unsupportedContent:
        'This file type is not supported for preview. Please download it instead.',
      unsupported: 'Preview not supported for this file type',
    },
    modals: {
      deleteTitle: 'Confirm object deletion',
      deleteFolderTitle: 'Confirm folder deletion',
    },
    confirmDelete: 'Delete object "{name}"?',
    confirmDeleteFolder:
      'Delete folder "{name}" recursively with all contents? This action cannot be undone.',
    messages: {
      loadConfigsFailed: 'Failed to load R2 configs',
      loadObjectsFailed: 'Failed to load objects',
      deleteSuccess: 'Object deleted',
      deleteFailed: 'Failed to delete object',
      deleteFolderSuccess: 'Folder and contents deleted ({count} objects)',
      deleteFolderFailed: 'Failed to delete folder',
    },
  },
}
