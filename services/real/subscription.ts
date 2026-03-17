import { post } from '../http';

interface UpgradeResult {
  membership: string;
  credits: number;
  dailyCredits: number;
}

export async function upgradeSubscription(tier: 'basic' | 'premium'): Promise<UpgradeResult> {
  return post<UpgradeResult>('/subscriptions/upgrade', { tier });
}
