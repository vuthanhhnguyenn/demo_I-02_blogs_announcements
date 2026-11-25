export const MANUAL_NOTIFICATION_JOYFIT_SUB_BRANDS = [
  'joyfit',
  'joyfit24',
  'joyfit_yoga',
  'joyfit_plus',
] as const;

export const MANUAL_NOTIFICATION_BRANDS = [
  'joyfit_all',
  ...MANUAL_NOTIFICATION_JOYFIT_SUB_BRANDS,
  'fit365',
] as const;
