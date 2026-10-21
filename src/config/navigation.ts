export const DASHBOARD_PATH = '/dashboard';
export const LEGACY_CONTROL_ROOM_PATH = '/#control-room';

export function getPublicAuthRoute(pathname: string): 'login' | 'signup' | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  if (normalizedPath === '/login') return 'login';
  if (normalizedPath === '/signup') return 'signup';
  return null;
}

export function isControlRoomRoute(pathname: string, hash: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return normalizedPath === DASHBOARD_PATH || (normalizedPath === '/' && hash === '#control-room');
}

export function safeControlRoomReturnPath(value: string | null | undefined): string {
  return value === LEGACY_CONTROL_ROOM_PATH ? LEGACY_CONTROL_ROOM_PATH : DASHBOARD_PATH;
}

export function loginUrlForControlRoom(returnPath: string): string {
  const safePath = safeControlRoomReturnPath(returnPath);
  return `/login?returnTo=${encodeURIComponent(safePath)}`;
}
