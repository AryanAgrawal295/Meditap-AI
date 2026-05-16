const ACCESS_TOKEN_KEY = 'meditap.accessToken';
const REFRESH_TOKEN_KEY = 'meditap.refreshToken';
const ROLE_KEY = 'meditap.role';
const USER_KEY = 'meditap.user';
const PATIENT_ID_KEY = 'meditap.patientId';

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearStoredTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getStoredRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function setStoredRole(role: string | null) {
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    return;
  }

  localStorage.removeItem(ROLE_KEY);
}

export function getStoredUser<T>() {
  const rawValue = localStorage.getItem(USER_KEY);
  return rawValue ? (JSON.parse(rawValue) as T) : null;
}

export function setStoredUser(user: unknown) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return;
  }

  localStorage.removeItem(USER_KEY);
}

export function getStoredPatientId() {
  return localStorage.getItem(PATIENT_ID_KEY);
}

export function setStoredPatientId(patientId: string | null) {
  if (patientId) {
    localStorage.setItem(PATIENT_ID_KEY, patientId);
    return;
  }

  localStorage.removeItem(PATIENT_ID_KEY);
}

export function clearStoredSession() {
  clearStoredTokens();
  setStoredRole(null);
  setStoredUser(null);
  setStoredPatientId(null);
}
