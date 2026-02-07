export default {
  mount: {
    title: 'Mount',
    subtitle: 'Browse objects in the selected R2 bucket (without DB records).',
    filters: {
      config: 'R2 Config',
      prefix: 'Prefix',
      limit: 'Per page',
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
    messages: {
      loadConfigsFailed: 'Failed to load R2 configs',
      loadObjectsFailed: 'Failed to load objects',
    },
  },
}
