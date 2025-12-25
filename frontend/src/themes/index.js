export const uiThemes = [
  {
    id: "motherduck-neobrutalism",
    label: "MotherDuck Neo-Brutalist",
  },
];

export const defaultUiThemeId = uiThemes[0]?.id ?? "motherduck-neobrutalism";

export const isKnownUiTheme = (value) =>
  uiThemes.some((theme) => theme.id === value);

export const getUiThemeById = (value) =>
  uiThemes.find((theme) => theme.id === value) ?? null;

