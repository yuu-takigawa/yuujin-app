import { get } from '../http';

export interface CreditsInfo {
  credits: number;
  dailyCredits: number;
  membership: string;
  invited: boolean;
  creditsResetAt: string;
  membershipExpiresAt: string | null;
}

export interface AiModel {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  creditsPerChat: number;
  minTier: string;
  displayOrder: number;
  isActive: number;
  available: boolean;
}

export async function getCredits(): Promise<CreditsInfo> {
  return get<CreditsInfo>('/credits');
}

export async function getModels(): Promise<AiModel[]> {
  return get<AiModel[]>('/models');
}
