import { get, post, put, setTokens, getRefreshToken } from '../http';
import type { User } from '../mock/data';

interface AuthResponse {
  token: string;
  user: User;
}

interface ServerAuthResult {
  user: { id: string; email: string; name: string; avatarEmoji?: string };
  token: string;
  refreshToken: string;
}

interface ServerUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  avatarEmoji?: string;
  jpLevel?: string;
  membership?: string;
  settings?: { onboardingCompleted?: boolean };
}

function mapUser(serverUser: ServerAuthResult['user'], isNewUser = false): User {
  return {
    id: serverUser.id,
    email: serverUser.email,
    username: serverUser.name,
    avatarEmoji: serverUser.avatarEmoji || '👤',
    level: 1,
    jpLevel: 'N5',
    onboardingCompleted: !isNewUser,
  };
}

function mapFullUser(s: ServerUser): User {
  return {
    id: s.id,
    email: s.email,
    username: s.name,
    avatarEmoji: s.avatarEmoji || '👤',
    level: 1,
    jpLevel: (s.jpLevel || 'N5') as User['jpLevel'],
    onboardingCompleted: s.settings?.onboardingCompleted ?? true,
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await post<ServerAuthResult>('/auth/login', { email, password });
  setTokens(result.token, result.refreshToken);
  // Fetch full user profile to get jpLevel, settings etc.
  try {
    const profile = await get<ServerUser>('/users/me');
    return { token: result.token, user: mapFullUser(profile) };
  } catch {
    return { token: result.token, user: mapUser(result.user, false) };
  }
}

export async function register(email: string, password: string, username: string): Promise<AuthResponse> {
  const result = await post<ServerAuthResult>('/auth/register', { email, password, name: username });
  setTokens(result.token, result.refreshToken);
  return { token: result.token, user: mapUser(result.user, true) };
}

export async function refreshToken(): Promise<{ token: string }> {
  const stored = getRefreshToken();
  const result = await post<{ token: string }>('/auth/refresh', { refreshToken: stored || '' });
  setTokens(result.token);
  return result;
}

export async function updateProfile(updates: { name?: string; jpLevel?: string; settings?: Record<string, unknown> }): Promise<void> {
  await put('/users/me', updates);
}
