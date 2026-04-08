import { post } from '../http';

export interface RedeemResult {
  reward: Record<string, unknown>;
  message: string;
}

export async function redeemCode(code: string): Promise<RedeemResult> {
  return post<RedeemResult>('/redeem', { code });
}
