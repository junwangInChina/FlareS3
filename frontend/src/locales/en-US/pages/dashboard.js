export default {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Review system metrics, upload configuration health, and scheduled job results',
    actions: {
      refresh: 'Refresh data',
    },
    state: {
      loadingTitle: 'Loading dashboard',
      loadingContent: 'Please wait while the latest operational data is loaded.',
    },
    messages: {
      loadFailed: 'Failed to load dashboard',
    },
    cards: {
      users: 'Users',
      usersHint: 'Review account volume and currently available logins',
      totalUsers: 'Total users',
      totalUsersHint: 'Includes both admins and regular users',
      activeUsers: 'Active users',
      activeUsersHint: 'Accounts that can currently log in',
      disabledUsers: 'Disabled users',
      disabledUsersHint: 'Accounts currently suspended by admins',
      files: 'Files',
      filesHint: 'Review valid file volume and 7-day expiry pressure',
      totalFiles: 'Valid files',
      totalFilesHint: 'Completed file records that are not deleted',
      storage: 'Storage & config',
      usedSpace: 'Used storage',
      usedSpaceHint: 'Aggregated from stored file sizes in the database',
      expiringThisWeek: 'Expiring in 7 days',
      expiringThisWeekHint: 'Users should be reminded to download important files soon',
      pendingDeleteQueue: 'Pending delete queue',
      pendingDeleteQueueHint: 'Objects waiting for scheduled cleanup',
      uploadConfig: 'Upload configs',
      uploadConfigMissing: 'Missing',
      uploadConfigPendingDefault: 'Default missing',
      uploadConfigReady: 'Ready',
      uploadConfigMissingHint: 'There is no R2 configuration available for uploads yet',
      uploadConfigPendingDefaultHint:
        '{count} config(s) exist, but no default upload config is selected',
      uploadConfigReadyHint: 'Default config: {defaultConfigId}. Total configs: {count}',
    },
    risks: {
      title: 'Operational risks',
      okTitle: 'No high-priority risks detected',
      okContent: 'Upload configuration, job execution, and storage indicators currently look healthy.',
      codes: {
        missing_default_upload_config: {
          title: 'Default upload config is missing',
          description:
            'Upload configs exist, but no default config is selected. User uploads may fail to start.',
        },
        scheduled_job_failed: {
          title: 'Recent scheduled job reported issues',
          description:
            'Job {jobName} recently failed or completed partially. Please review cleanup logs and results.',
        },
        unknown: {
          title: 'A risk requires attention',
          description: 'Please review the backend response for more details.',
        },
      },
    },
    jobs: {
      title: 'Recent job runs',
      subtitle: 'Showing the latest {count} cleanup job records',
      emptyTitle: 'No job runs yet',
      emptyContent: 'Results will appear here after the next scheduled cleanup run.',
      summaryEmpty: 'No summary details',
      labels: {
        startedAt: 'Started at',
        finishedAt: 'Finished at',
        duration: 'Duration',
        summary: 'Summary',
        error: 'Error',
      },
      status: {
        running: 'Running',
        success: 'Success',
        partial: 'Partial',
        failed: 'Failed',
        unknown: 'Unknown',
      },
      names: {
        cleanupExpired: 'Expired file cleanup',
        cleanupDeleteQueue: 'Delete queue cleanup',
        cleanupRetention: 'Retention cleanup',
      },
    },
  },
}
