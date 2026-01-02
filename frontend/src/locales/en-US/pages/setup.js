export default {
  setup: {
    title: "Storage",
    help: "Usage tips",
    subtitle:
      "Manage multiple Cloudflare R2 configs, set a default config, and choose which config to use when uploading files.",
    actions: {
      addConfig: "Add config",
      refreshList: "Refresh",
    },
    state: {
      loading: "Loading...",
      emptyTitle: "No configs",
      emptyContent: "No R2 configs yet. Click “Add config” to create one.",
      defaultTag: "Default",
    },
    labels: {
      bucket: "Bucket",
      totalSpace: "Total",
      usedSpace: "Used",
      usagePercent: "Usage",
      configId: "Config ID",
      name: "Name",
      endpoint: "R2 endpoint URL",
      bucketName: "Bucket name",
      quotaGb: "Total quota (GB)",
      accessKeyId: "Access Key ID",
      accessKeyIdOptional: "Access Key ID (leave blank to keep)",
      secretAccessKey: "Secret Access Key",
      secretAccessKeyOptional: "Secret Access Key (leave blank to keep)",
    },
    placeholders: {
      name: "e.g. Production",
      endpoint: "https://<account_id>.r2.cloudflarestorage.com",
      bucketName: "Bucket name",
      quotaGb: "e.g. 10",
      accessKeyId: "R2 access key ID",
      secretAccessKey: "R2 secret access key",
    },
    hint: {
      title: "Tips",
      endpointFormatPrefix: "R2 endpoint URL format:",
      endpointFormat: "R2 endpoint URL format: {url}",
      tokenCreatePrefix: "Create access keys in Cloudflare Dashboard at",
      tokenCreateSuffix: "(Object Read/Write required).",
      tokenCreate:
        "Create access keys in Cloudflare Dashboard at {path} (Object Read/Write required).",
    },
    modal: {
      createTitle: "Create R2 config",
      editTitle: "Edit R2 config",
      save: "Save",
    },
    aria: {
      testConnection: "Test connection",
      setDefault: "Set default",
      edit: "Edit",
      notEditable: "This config is read-only",
      delete: "Delete",
    },
    validation: {
      required: "Please fill in name, endpoint, bucket, and quota",
      quotaInvalid: "Quota must be a number greater than 0 (GB)",
      createNeedKeys: "Access Key and Secret Key are required for new configs",
    },
    messages: {
      loadFailed: "Failed to load R2 configs",
      defaultUpdated: "Default config updated",
      setDefaultFailed: "Failed to set default config",
      testSuccess: "Connection test succeeded",
      testFailed: "Connection test failed",
      createSuccess: "Config created",
      updateSuccess: "Config updated",
      saveFailed: "Save failed",
      deleteConfirm: "Delete this config? Make sure no files are linked to it.",
      deleteSuccess: "Config deleted",
      deleteFailed: "Failed to delete config",
    },
    usageTips: {
      usage: {
        title: "Usage notes",
        content:
          "Displayed usage is calculated from the local database and may differ from actual R2 usage.",
      },
      storage: {
        title: "Storage",
        content:
          "Currently using Cloudflare R2 free tier with 10GB total. Additional usage may incur fees.",
      },
      expiry: {
        title: "Expiry",
        content:
          "Files are automatically deleted based on the expiration setting. Download important files in time.",
      },
      bandwidth: {
        title: "Bandwidth",
        content: "R2 does not charge egress fees; downloads are free.",
      },
    },
  },
};
