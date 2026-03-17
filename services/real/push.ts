import { post, del } from '../http';

export async function registerPushToken(token: string, platform = 'expo'): Promise<void> {
  await post('/push/register', { token, platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await del('/push/unregister', { token });
}
