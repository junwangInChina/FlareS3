export const uiThemes = [
  {
    id: 'motherduck-neobrutalism',
    label: 'MotherDuck Neo-Brutalist',
  },
  {
    id: 'shadcn',
    label: 'shadcn/ui',
  },
]

export const defaultUiThemeId = uiThemes[0]?.id ?? 'motherduck-neobrutalism'

export const isKnownUiTheme = (value) => uiThemes.some((theme) => theme.id === value)

export const getUiThemeById = (value) => uiThemes.find((theme) => theme.id === value) ?? null
