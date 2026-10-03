import { useState } from '#app';

type AuthUser = { id: string; email?: string; email_verified?: boolean; admin?: boolean; enabled?: boolean };
type AuthSession = { id: string; user_id: string; mfa_verified: boolean };
export const useUser = () => useState<AuthUser | null>('user', () => null);
export const useSession = () => useState<AuthSession | null>('session', () => null);
export const useAccessToken = () => useState('accessToken', () => '');
export const useRefreshToken = () => useState('refreshToken', () => '');

/** Request snapshots read the shared jar without adding cookie listeners. */
export function readSessionCookie(name: string): any {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string')
    return useCookie<any>(name, { readonly: true, watch: false }).value;
  const entry = document.cookie.split(';').find((value) => value.trim().startsWith(`${name}=`));
  if (!entry) return null;
  try {
    const value = decodeURIComponent(entry.trim().slice(name.length + 1));
    if (value === 'undefined') return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch {
    return null;
  }
}

export function getAccessToken() {
  const accessToken = useAccessToken();
  if (!accessToken.value) return null;
  accessToken.value = readSessionCookie('accessToken') ?? '';
  return accessToken.value;
}

export function getRefreshToken() {
  const refreshToken = useRefreshToken();
  if (!refreshToken.value) return null;
  refreshToken.value = readSessionCookie('refreshToken') ?? '';
  return refreshToken.value;
}

export function syncSessionCookies() {
  const user = useUser();
  const session = useSession();
  const cookieUser = readSessionCookie('user');
  const cookieSession = readSessionCookie('session');
  if (JSON.stringify(user.value) !== JSON.stringify(cookieUser)) user.value = cookieUser ?? null;
  if (JSON.stringify(session.value) !== JSON.stringify(cookieSession)) session.value = cookieSession ?? null;
  useAccessToken().value = readSessionCookie('accessToken') ?? '';
  useRefreshToken().value = readSessionCookie('refreshToken') ?? '';
}

export function setStates(response: any, renewing = false) {
  // Synchronous publication is required before releasing the origin lock.
  const write = (name: string, value: any) => {
    if (typeof document !== 'undefined' && typeof document.cookie === 'string') {
      document.cookie = `${name}=${value == null ? '' : encodeURIComponent(typeof value === 'string' ? value : JSON.stringify(value))}; Path=/; Secure; SameSite=Lax${value == null ? '; Max-Age=0' : ''}`;
      refreshCookie(name);
    } else useCookie<any>(name, { watch: false }).value = value;
  };
  if (!renewing) write('authGeneration', crypto.randomUUID());
  const user = useUser();
  user.value = response?.user ?? null;
  write('user', user.value);
  const session = useSession();
  session.value = response?.session ?? null;
  write('session', session.value);
  const accessToken = useAccessToken();
  accessToken.value = response?.access_token ?? '';
  write('accessToken', accessToken.value || null);
  const refreshToken = useRefreshToken();
  refreshToken.value = response?.refresh_token ?? '';
  write('refreshToken', refreshToken.value || null);
  if (response == null) useRouter().push('/');
}

export const isAuth = computed((): boolean => {
  const accessToken = useAccessToken();
  return Boolean(accessToken.value);
});

export const hasEmail = computed((): boolean => {
  const user = <any>useUser();
  return Boolean(user.value?.email ?? '');
});

export async function getUser() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;

  try {
    if (!user_id) {
      throw { data: 'Invalid User Id' };
    }
    const response = await GET(`/auth/users/${user_id}`);

    const user = useUser();
    const cookie_user = <any>useCookie('user');
    user.value = response ?? null;
    cookie_user.value = user.value;

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
