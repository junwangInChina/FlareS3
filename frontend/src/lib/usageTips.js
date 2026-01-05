export const buildUsageTips = (t) => [
  {
    key: 'usage',
    type: 'warning',
    title: t('setup.usageTips.usage.title'),
    content: t('setup.usageTips.usage.content'),
  },
  {
    key: 'storage',
    type: 'info',
    title: t('setup.usageTips.storage.title'),
    content: t('setup.usageTips.storage.content'),
  },
  {
    key: 'expiry',
    type: 'warning',
    title: t('setup.usageTips.expiry.title'),
    content: t('setup.usageTips.expiry.content'),
  },
  {
    key: 'bandwidth',
    type: 'success',
    title: t('setup.usageTips.bandwidth.title'),
    content: t('setup.usageTips.bandwidth.content'),
  },
]
