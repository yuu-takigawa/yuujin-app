import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCreditStore } from '../../../stores/creditStore';
import { useTheme } from '../../../hooks/useTheme';
import { ActivityIndicator } from 'react-native';

type Tier = 'free' | 'pro' | 'max' | 'admin';

interface Plan {
  tier: Tier;
  name: string;
  price: string;
  priceNote: string;
  dailyCredits: string;
  color: string;
  badgeText?: string;
  features: string[];
  models: string[];
}

const PLANS: Plan[] = [
  {
    tier: 'free',
    name: 'Free',
    price: '¥0',
    priceNote: 'ずっと無料',
    dailyCredits: '100pt',
    color: '#9CA3AF',
    features: ['毎日100ポイント', 'AI日本語会話', '新聞閲覧', 'ニュースフィード'],
    models: ['ERNIE Speed', 'ERNIE Lite'],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '¥9.9',
    priceNote: '/ 月',
    dailyCredits: '500pt',
    color: '#3B82F6',
    features: ['毎日500ポイント', '全ての Free 機能', 'DeepSeek V3 利用可', '通義千問 キャラモデル利用可'],
    models: ['通義 Flash キャラ', 'DeepSeek V3', '通義 Plus キャラ', '通義千問 Plus'],
  },
  {
    tier: 'max',
    name: 'Max',
    price: '¥29.9',
    priceNote: '/ 月',
    dailyCredits: '2000pt',
    color: '#E85B3A',
    badgeText: 'おすすめ',
    features: ['毎日2000ポイント', '全ての Pro 機能', '通義千問 Max（最高品質）', '優先サポート'],
    models: ['全モデル対応（通義千問 Max 含む）'],
  },
];

const TIER_ORDER: Record<Tier, number> = { free: 0, pro: 1, max: 2, admin: 3 };

export default function MembershipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const membership = useCreditStore((s) => s.membership) as Tier;
  const credits = useCreditStore((s) => s.credits);
  const dailyCredits = useCreditStore((s) => s.dailyCredits);
  const upgradePlan = useCreditStore((s) => s.upgradePlan);
  const isUpgrading = useCreditStore((s) => s.isUpgrading);

  const isAdmin = membership === 'admin';
  const currentTierOrder = TIER_ORDER[membership] ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: t.brand }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>会員プラン</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="trophy" size={40} color={t.brand} />
          <Text style={[styles.heroTitle, { color: t.text }]}>プランを選ぼう</Text>
          <Text style={[styles.heroSub, { color: t.textSecondary }]}>
            ポイントで AI キャラと自由に会話。{'\n'}会員になるとより多くのモデルが使えます。
          </Text>
        </View>

        {/* Admin card */}
        {isAdmin && (
          <View style={[styles.adminCard, { backgroundColor: '#7C3AED18', borderColor: '#7C3AED' }]}>
            <View style={styles.adminRow}>
              <Ionicons name="shield-checkmark" size={22} color="#7C3AED" />
              <Text style={[styles.adminTitle, { color: '#7C3AED' }]}>管理者アカウント</Text>
            </View>
            <Text style={[styles.adminDesc, { color: t.textSecondary }]}>
              全モデル利用可 · ポイント無制限 · 通義千問 Max 含む
            </Text>
            <View style={styles.adminStats}>
              <Text style={[styles.adminStat, { color: '#7C3AED' }]}>∞ pt 残り</Text>
              <Text style={[styles.adminStatSep, { color: t.border }]}>|</Text>
              <Text style={[styles.adminStat, { color: '#7C3AED' }]}>∞ pt / 日</Text>
            </View>
          </View>
        )}

        {/* Current plan summary (non-admin) */}
        {!isAdmin && (
          <View style={[styles.currentCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.currentLabel, { color: t.textSecondary }]}>現在のプラン</Text>
            <View style={styles.currentRow}>
              <Text style={[styles.currentName, { color: t.text }]}>
                {PLANS.find((p) => p.tier === membership)?.name ?? '無料プラン'}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: (PLANS.find((p) => p.tier === membership)?.color ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.tierBadgeText, { color: PLANS.find((p) => p.tier === membership)?.color ?? '#9CA3AF' }]}>
                  {PLANS.find((p) => p.tier === membership)?.dailyCredits ?? '100pt'} / 日
                </Text>
              </View>
            </View>
            <View style={[styles.creditsBar, { backgroundColor: t.inputBg }]}>
              <View
                style={[
                  styles.creditsBarFill,
                  {
                    backgroundColor: t.brand,
                    width: `${Math.min(100, dailyCredits > 0 ? (credits / dailyCredits) * 100 : 0)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.creditsText, { color: t.textSecondary }]}>
              残り {credits} pt / {dailyCredits} pt
            </Text>
          </View>
        )}

        {/* Plan cards */}
        {!isAdmin && PLANS.map((plan) => {
          const isCurrent = plan.tier === membership;
          const isUpgrade = TIER_ORDER[plan.tier] > currentTierOrder;

          return (
            <View
              key={plan.tier}
              style={[
                styles.planCard,
                {
                  backgroundColor: t.surface,
                  borderColor: isCurrent ? plan.color : t.border,
                  borderWidth: isCurrent ? 2 : 1,
                },
              ]}
            >
              {/* Card header */}
              <View style={styles.planHeader}>
                <View style={styles.planTitleRow}>
                  <Text style={[styles.planName, { color: t.text }]}>{plan.name}</Text>
                  {plan.badgeText && (
                    <View style={[styles.recommendBadge, { backgroundColor: plan.color }]}>
                      <Text style={styles.recommendText}>⭐ {plan.badgeText}</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: plan.color + '20', borderColor: plan.color }]}>
                      <Text style={[styles.currentBadgeText, { color: plan.color }]}>現在</Text>
                    </View>
                  )}
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: isCurrent ? plan.color : t.text }]}>{plan.price}</Text>
                  <Text style={[styles.priceNote, { color: t.textSecondary }]}>{plan.priceNote}</Text>
                </View>

                <View style={[styles.creditsPill, { backgroundColor: plan.color + '18' }]}>
                  <Ionicons name="flash" size={13} color={plan.color} />
                  <Text style={[styles.creditsPillText, { color: plan.color }]}>
                    毎日 {plan.dailyCredits} ポイント
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.cardDivider, { backgroundColor: t.border }]} />

              {/* Features */}
              <View style={styles.featureList}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                    <Text style={[styles.featureText, { color: t.text }]}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* Models */}
              <View style={[styles.modelBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Text style={[styles.modelLabel, { color: t.textSecondary }]}>利用可能なモデル</Text>
                {plan.models.map((m, i) => (
                  <Text key={i} style={[styles.modelItem, { color: t.text }]}>· {m}</Text>
                ))}
              </View>

              {/* CTA */}
              {!isCurrent && isUpgrade && (
                <TouchableOpacity
                  style={[styles.ctaBtn, { backgroundColor: isUpgrading ? plan.color + '88' : plan.color }]}
                  activeOpacity={0.8}
                  disabled={isUpgrading}
                  onPress={() =>
                    Alert.alert(
                      `${plan.name}にアップグレード`,
                      `毎日${plan.dailyCredits}ポイントが利用可能になります。\n\n※現在テスト中のため無料でアップグレードできます。`,
                      [
                        { text: 'キャンセル', style: 'cancel' },
                        {
                          text: 'アップグレード', onPress: async () => {
                            try {
                              await upgradePlan(plan.tier as 'pro' | 'max');
                              Alert.alert('🎉 アップグレード完了', `${plan.name}になりました！`);
                            } catch {
                              Alert.alert('エラー', 'アップグレードに失敗しました。');
                            }
                          },
                        },
                      ],
                    )
                  }
                >
                  {isUpgrading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.ctaBtnText}>アップグレード</Text>
                  )}
                </TouchableOpacity>
              )}
              {isCurrent && (
                <View style={[styles.ctaBtn, { backgroundColor: t.inputBg }]}>
                  <Text style={[styles.ctaBtnText, { color: t.textSecondary }]}>現在のプラン</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom note */}
        <Text style={[styles.footnote, { color: t.textSecondary }]}>
          ※ 支払い機能は近日公開予定です。{'\n'}
          全プラン自動更新なし、いつでもキャンセル可能。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  back: { width: 68, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, fontWeight: '300', lineHeight: 34 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  scroll: { padding: 16, gap: 16 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  heroTitle: { fontSize: 22, fontWeight: '700' },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  adminCard: {
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 2,
  },
  adminRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminTitle: { fontSize: 18, fontWeight: '700' },
  adminDesc: { fontSize: 14, lineHeight: 22 },
  adminStats: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
  adminStat: { fontSize: 15, fontWeight: '700' },
  adminStatSep: { fontSize: 14 },
  currentCard: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  currentLabel: { fontSize: 12, fontWeight: '600' },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currentName: { fontSize: 16, fontWeight: '700' },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  tierBadgeText: { fontSize: 12, fontWeight: '600' },
  creditsBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  creditsBarFill: { height: '100%', borderRadius: 3 },
  creditsText: { fontSize: 12 },
  planCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  planHeader: { padding: 20, gap: 10 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  planName: { fontSize: 18, fontWeight: '700' },
  recommendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  recommendText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  currentBadgeText: { fontSize: 11, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 28, fontWeight: '800' },
  priceNote: { fontSize: 14 },
  creditsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  creditsPillText: { fontSize: 13, fontWeight: '600' },
  cardDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  featureList: { padding: 20, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { fontSize: 14, flex: 1, lineHeight: 20 },
  modelBox: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  modelLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  modelItem: { fontSize: 13 },
  ctaBtn: {
    marginHorizontal: 20,
    marginBottom: 20,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  footnote: { fontSize: 12, textAlign: 'center', lineHeight: 20 },
});
