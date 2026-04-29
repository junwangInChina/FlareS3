const primaryMenuItems = [
  { key: '/', icon: 'folder', labelKey: 'nav.files', mobileLabelKey: 'mobileNav.files', path: '/' },
  {
    key: '/texts',
    icon: 'file-text',
    labelKey: 'nav.texts',
    mobileLabelKey: 'mobileNav.texts',
    path: '/texts',
  },
  {
    key: '/shares',
    icon: 'share',
    labelKey: 'nav.shares',
    mobileLabelKey: 'mobileNav.shares',
    path: '/shares',
  },
]

const adminOverviewItem = {
  key: '/dashboard',
  icon: 'chart',
  labelKey: 'nav.dashboard',
  path: '/dashboard',
}

const adminManagementItems = [
  { key: '/mount', icon: 'mount', labelKey: 'nav.mount', path: '/mount' },
  { key: '/users', icon: 'users', labelKey: 'nav.users', path: '/users' },
  { key: '/audit', icon: 'audit', labelKey: 'nav.audit', path: '/audit' },
  { key: '/setup', icon: 'settings', labelKey: 'nav.setup', path: '/setup' },
]

const mobileMoreMatchPaths = ['/more', '/dashboard', '/mount', '/users', '/audit', '/setup']

const withTranslatedLabels = (items, t, labelField = 'labelKey') =>
  items.map((item) => ({
    ...item,
    label: t(item[labelField] || item.labelKey),
  }))

export const normalizeNavigationPath = (path = '/') => {
  const normalized = String(path || '/').trim()
  if (!normalized) {
    return '/'
  }
  if (normalized.length > 1 && normalized.endsWith('/')) {
    return normalized.slice(0, -1)
  }
  return normalized
}

export const isMobileMorePath = (path = '/') =>
  mobileMoreMatchPaths.includes(normalizeNavigationPath(path))

export function buildSidebarMenuItems({ isAdmin = false, t = (key) => key } = {}) {
  const items = []

  if (isAdmin) {
    items.push(adminOverviewItem)
  }

  items.push(...primaryMenuItems)

  if (isAdmin) {
    items.push(...adminManagementItems)
  }

  return withTranslatedLabels(items, t)
}

export function buildMobileTabbarItems({ t = (key) => key } = {}) {
  return [
    ...withTranslatedLabels(primaryMenuItems, t, 'mobileLabelKey').map((item) => ({
      ...item,
      matchPaths: [item.path],
    })),
    {
      key: '/more',
      icon: 'more',
      label: t('mobileNav.more'),
      path: '/more',
      matchPaths: [...mobileMoreMatchPaths],
    },
  ]
}

export function buildMorePageAdminItems({ isAdmin = false, t = (key) => key } = {}) {
  if (!isAdmin) {
    return []
  }

  return withTranslatedLabels([adminOverviewItem, ...adminManagementItems], t)
}
