import { accessTokenExpired, sameSession, sameSessionContext, sameSessionPair } from '~/utils/sessionRefresh';

export function GET(url, query) {
  return createApiFetch(url, "GET", null, query);
}

export function POST(url, body = null) {
  return createApiFetch(url, "POST", body);
}

export function PATCH(url, body = null) {
  return createApiFetch(url, "PATCH", body);
}

export function PUT(url, body = null) {
  return createApiFetch(url, "PUT", body);
}

export function DELETE(url, body = null) {
  return createApiFetch(url, "DELETE", body);
}

async function createApiFetch(url, method, body, query) {
  const config = useRuntimeConfig().public;
  const snapshot = getSessionSnapshot();
  const options = {
    baseURL: config.BASE_API_URL,
    method,
    body,
    query,
    retry: 0,
    _session: snapshot,
    headers: { Authorization: `Bearer ${snapshot.accessToken}` },
    onRequest,
    onResponse,
    onResponseError,
  };
  try {
    return await $fetch(url, options);
  } catch (error) {
    if (!invalidTokenResponse(error?.response) || !snapshot.identity ||
      !sameSession(snapshot, getSessionSnapshot())) throw error;
    const [success, refreshError] = await refresh(snapshot);
    if (!success) throw refreshError;
    // One retry is allowed only for the captured browser session.
    if (!sameSession(snapshot, getSessionSnapshot()))
      throw { statusCode: 401, data: { error: 'session_changed' } };
    const attempted = getSessionSnapshot();
    try {
      return await $fetch(url, { ...options, _session: attempted });
    } catch (retryError) {
      if (invalidTokenResponse(retryError?.response) &&
        sameSessionPair(attempted, getSessionSnapshot())) setStates(null);
      throw retryError;
    }
  }
}

function invalidTokenResponse(response) {
  const detail = response?._data?.detail;
  return response?.status === 401 &&
    (response?._data?.error === 'invalid_token' ||
      (typeof detail === 'string' && detail.toLowerCase().includes('invalid token')));
}

const onRequest = async ({ options }) => {
  if (!sameSessionContext(options._session, getSessionSnapshot()))
    throw { statusCode: 401, data: { error: 'session_changed' } };
  if (accessTokenExpired(getAccessToken())) {
    const [success, error] = await refresh(options._session);
    if (!success) throw error;
  }
  if (!sameSessionContext(options._session, getSessionSnapshot()))
    throw { statusCode: 401, data: { error: 'session_changed' } };
  options._session = getSessionSnapshot();
  options.headers = new Headers(options.headers);
  options.headers.set('Authorization', `Bearer ${getAccessToken()}`);
};

const onResponse = ({ options }) => {
  if (!sameSessionContext(options._session, getSessionSnapshot()))
    throw { statusCode: 401, data: { error: 'session_changed' } };
};

const onResponseError = ({ options, response }) => {
  if (!sameSessionContext(options._session, getSessionSnapshot())) return;
  // Normalize API validation errors without logging account or credential data.
  if (!response._data || typeof response._data !== 'object') return;
  const detail = response._data.detail;
  const message = typeof detail === 'string' ? detail :
    (Array.isArray(detail) ? detail[0]?.msg : detail?.msg);
  const details = typeof message === 'string' ? message.toLowerCase() : '';

  if (details.includes("user already exists")) {
    response._data.detail = "Error.NicknameAlreadyExists";
  } else if (details.includes("email already exists")) {
    response._data.detail = "Error.EmailAlreadyExists";
  } else if (details.includes("invalid email")) {
    response._data.detail = "Error.InvalidEmail";
  } else if (details.includes("invalid oauth token")) {
    response._data.detail = "Error.InvalidOAuthToken";
  } else if (details.includes("registration disabled")) {
    response._data.detail = "Error.RegistrationDisabled";
  } else if (details.includes("no login method")) {
    response._data.detail = "Error.NoLoginMethod";
  } else if (details.includes("invalid credentials")) {
    response._data.detail = "Error.InvalidCredentials";
  } else if (details.includes("user disabled")) {
    response._data.detail = "Error.UserDisabled";
  } else if (details.includes("could not send message")) {
    response._data.detail = "Error.MessageNotSubmitted";
  } else if (details.includes("user not found")) {
    response._data.detail = "Error.UserNotFound";
  } else if (details.includes("admin mfa required")) {
    response._data.detail = "Error.AdminMFARequired";
  } else if (details.includes("permission denied")) {
    response._data.detail = "Error.PermissionDenied";
  } else if (details.includes("invalid verification code")) {
    response._data.detail = "Error.InvalidVerificationCode";
  } else if (details.includes("email already verified")) {
    response._data.detail = "Error.EmailAlreadyVerified";
  } else if (details.includes("mfa already enabled")) {
    response._data.detail = "Error.MFAAlreadyEnabled";
  } else if (details.includes("mfa not initialized")) {
    response._data.detail = "Error.MFANotInitialized";
  } else if (details.includes("mfa not enabled")) {
    response._data.detail = "Error.MFANotEnabled";
  } else if (details.includes("password reset failed")) {
    response._data.detail = "Error.PasswordResetFailed";
  } else if (details.includes("invalid code")) {
    response._data.detail = "Error.InvalidCode";
  } else if (details.includes("provider not found")) {
    response._data.detail = "Error.ProviderNotFound";
  }
};
