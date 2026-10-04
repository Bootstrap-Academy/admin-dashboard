import { GET, POST, PUT } from './fetch';
import { revokeSession, withSessionRefreshLock } from '~/utils/sessionRefresh';

export const useOauthProviders = () => useState('oauthProviders', () => []);

export async function getOAuthProviders() {
  try {
    const response = await GET('/auth/oauth/providers');

    const oauthProviders = useOauthProviders();
    oauthProviders.value = response ?? [];

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function loginViaOAuthProvider(body: any) {
  try {
    const response = await POST("/auth/sessions/oauth", body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function refresh(expected = getSessionSnapshot(), clearOnInvalid = true) {
  try {
    const response = await refreshSession(expected, clearOnInvalid);
    return [response, null];
  } catch (error: any) {
    return [null, error];
  }
}

export async function logout() {
  const expected = getSessionSnapshot();
  const config = useRuntimeConfig().public;

  // Explicit logout clears all tabs immediately, even when the API is offline.
  setStates(null);
  if (!expected.identity || (!expected.accessToken && !expected.refreshToken))
    return [true, null];
  try {
    const response = await revokeSession({
      expected,
      lock: withSessionRefreshLock,
      raw: (path, method, body, token) =>
        $fetch(`${config.BASE_API_URL}${path}`, {
          method,
          body: body as any,
          ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
          retry: 0,
          timeout: 20000,
        }),
    });
    // The result never writes over a later login or another session.
    return [response, null];
  } catch (error) {
    return [null, error];
  }
}

export async function login(body: any) {
  try {
    const response = await POST('/auth/sessions', body);

    setStates(response);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function signup(body: any) {
  try {
    const response = await POST('/auth/users', body);

    setStates(response);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function requestEmailVerification() {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;
  let user_email = user?.value?.email ?? null;
  let isAccountVerified = user?.value?.email_verified ?? false;

  if (isAccountVerified) return [true, null];

  try {
    if (!user_id) {
      throw { data: { detail: 'Invalid User Id' } };
    }
    if (!user_email) {
      throw { data: { detail: 'User does not have email' } };
    }

    const response = await POST(`/auth/users/${user_id}/email`);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function verifyAccount(body: any) {
  const user = <any>useUser();
  let user_id = user?.value?.id ?? null;
  let isAccountVerified = user?.value?.email_verified ?? false;

  if (isAccountVerified) return [true, null];

  try {
    if (!user_id) {
      throw { data: 'Invalid User Id' };
    }

    const response = await PUT(`/auth/users/${user_id}/email`, body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function forgotPassword(body: any) {
  try {
    const response = await POST('/auth/password_reset', body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}

export async function resetPassword(body: any) {
  try {
    const response = await PUT('/auth/password_reset', body);

    return [response, null];
  } catch (error: any) {
    return [null, error.data];
  }
}
