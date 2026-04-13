export function buildSidebarMenuItems({ isAdmin = false, t = (key) => key } = {}) {
  const items = []

  if (isAdmin) {
    items.push({ key: '/dashboard', icon: 'chart', label: t('nav.dashboard'), path: '/dashboard' })
  }

  items.push(
    { key: '/', icon: 'folder', label: t('nav.files'), path: '/' },
    { key: '/texts', icon: 'file-text', label: t('nav.texts'), path: '/texts' },
    { key: '/shares', icon: 'share', label: t('nav.shares'), path: '/shares' }
  )

  if (isAdmin) {
    items.push(
      { key: '/mount', icon: 'mount', label: t('nav.mount'), path: '/mount' },
      { key: '/users', icon: 'users', label: t('nav.users'), path: '/users' },
      { key: '/audit', icon: 'audit', label: t('nav.audit'), path: '/audit' },
      { key: '/setup', icon: 'settings', label: t('nav.setup'), path: '/setup' }
    )
  }

  return items
}
