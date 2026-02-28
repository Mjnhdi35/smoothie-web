export const ROLES_KEY = Symbol('ROLES_METADATA');

export const APP_ROLES = ['admin', 'staff', 'user'] as const;
export type AppRole = (typeof APP_ROLES)[number];
