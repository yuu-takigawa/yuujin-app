import { mockUser, type User } from './data';

interface AuthResponse {
  token: string;
  user: User;
}

const FAKE_TOKEN = 'mock-jwt-token-yuujin-2026';

export async function mockLogin(
  _email: string,
  _password: string
): Promise<AuthResponse> {
  await delay(500);
  return { token: FAKE_TOKEN, user: { ...mockUser } };
}

export async function mockRegister(
  email: string,
  _password: string,
  username: string
): Promise<AuthResponse> {
  await delay(800);
  return {
    token: FAKE_TOKEN,
    user: { ...mockUser, email, username, onboardingCompleted: false },
  };
}

export async function mockRefreshToken(): Promise<{ token: string }> {
  await delay(200);
  return { token: FAKE_TOKEN };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
