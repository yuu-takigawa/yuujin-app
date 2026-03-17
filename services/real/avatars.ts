import { get } from '../http';
import { API_BASE_URL, getToken } from '../http';

export interface AvatarPreset {
  id: string;
  gender: string;
  style: string;
  emoji: string;
  url: string;
  label: string;
}

export async function getAvatarPresets(): Promise<AvatarPreset[]> {
  return get<AvatarPreset[]>('/avatars/presets');
}

/**
 * 上传图片到 OSS，返回公开 URL
 * target: 'user' → 更新用户头像
 * target: 'character' → 更新角色头像（需要 targetId = characterId）
 */
export async function uploadAvatar(
  uri: string,
  mimeType: string,
  target: 'user' | 'character',
  targetId: string,
): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: mimeType,
    name: `avatar.${ext}`,
  } as unknown as Blob);
  formData.append('target', target);
  formData.append('targetId', targetId);

  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/avatars/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `アップロード失敗: ${res.status}`);
  }

  const json = await res.json() as { success: boolean; data?: { url: string }; error?: string };
  if (!json.success) throw new Error(json.error || 'アップロード失敗');
  return json.data!.url;
}
