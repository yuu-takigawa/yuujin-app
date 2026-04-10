import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCreditStore } from '../../../stores/creditStore';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../hooks/useLocale';

type Tier = 'free' | 'pro' | 'max' | 'admin';

interface Plan {
  tier: Tier;
  name: string;
  price: string;
  priceNoteKey: string;
  dailyCredits: string;
  color: string;
  badgeTextKey?: string;
  featureKeys: string[];
  models: string[];
}

const PLANS: Plan[] = [
  {
    tier: 'max',
    name: 'Max',
    price: '\u00a529.9',
    priceNoteKey: 'membership.perMonth',
    dailyCredits: '2000pt',
    color: '#E85B3A',
    badgeTextKey: 'membership.comingSoon',
    featureKeys: ['membership.feat.max1', 'membership.feat.max2', 'membership.feat.tts', 'membership.feat.max3', 'membership.feat.max4'],
    models: [],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '\u00a514.9',
    priceNoteKey: 'membership.perMonth',
    dailyCredits: '500pt',
    color: '#3B82F6',
    featureKeys: ['membership.feat.pro1', 'membership.feat.pro2', 'membership.feat.tts', 'membership.feat.pro3', 'membership.feat.pro4'],
    models: ['membership.model.qwenFlash', 'membership.model.deepseek', 'membership.model.qwenPlus', 'membership.model.qianwenPlus'],
  },
  {
    tier: 'free',
    name: 'Free',
    price: '\u00a50',
    priceNoteKey: 'membership.freeForever',
    dailyCredits: '100pt',
    color: '#9CA3AF',
    featureKeys: ['membership.feat.free1', 'membership.feat.free2', 'membership.feat.free3', 'membership.feat.free4'],
    models: ['membership.model.ernieSpeed', 'membership.model.ernieLite'],
  },
];

const TIER_ORDER: Record<Tier, number> = { free: 0, pro: 1, max: 2, admin: 3 };

export default function MembershipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();
  const membership = useCreditStore((s) => s.membership) as Tier;
  const credits = useCreditStore((s) => s.credits);
  const dailyCredits = useCreditStore((s) => s.dailyCredits);
  const invited = useCreditStore((s) => s.invited);
  const membershipExpiresAt = useCreditStore((s) => s.membershipExpiresAt);
  const isAdmin = membership === 'admin';
  const currentTierOrder = TIER_ORDER[membership] ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: t.brand }]}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>{i('membership.headerTitle')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="trophy" size={40} color={t.brand} />
          <Text style={[styles.heroTitle, { color: t.text }]}>{i('membership.selectPlan')}</Text>
          <Text style={[styles.heroSub, { color: t.textSecondary }]}>
            {i('membership.subtitle')}
          </Text>
        </View>

        {/* Admin card */}
        {isAdmin && (
          <View style={[styles.adminCard, { backgroundColor: '#7C3AED18', borderColor: '#7C3AED' }]}>
            <View style={styles.adminRow}>
              <Ionicons name="shield-checkmark" size={22} color="#7C3AED" />
              <Text style={[styles.adminTitle, { color: '#7C3AED' }]}>{i('profile.adminAccount')}</Text>
            </View>
            <Text style={[styles.adminDesc, { color: t.textSecondary }]}>
              {i('membership.adminAllModels')}
              {'\n'}{i('membership.feat.tts')}
            </Text>
            <View style={styles.adminStats}>
              <Text style={[styles.adminStat, { color: '#7C3AED' }]}>{'\u221e'} pt {i('membership.remainPt')}</Text>
              <Text style={[styles.adminStatSep, { color: t.border }]}>|</Text>
              <Text style={[styles.adminStat, { color: '#7C3AED' }]}>{'\u221e'} pt {i('membership.dailyPt')}</Text>
            </View>
          </View>
        )}

        {/* Current plan summary (non-admin) */}
        {!isAdmin && (
          <View style={[styles.currentCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.currentLabel, { color: t.textSecondary }]}>{i('membership.currentPlan')}</Text>
            <View style={styles.currentRow}>
              <Text style={[styles.currentName, { color: t.text }]}>
                {PLANS.find((p) => p.tier === membership)?.name ?? 'Free'}
              </Text>
              <View style={[styles.tierBadge, { backgroundColor: (PLANS.find((p) => p.tier === membership)?.color ?? '#9CA3AF') + '20' }]}>
                <Text style={[styles.tierBadgeText, { color: PLANS.find((p) => p.tier === membership)?.color ?? '#9CA3AF' }]}>
                  {PLANS.find((p) => p.tier === membership)?.dailyCredits ?? '100pt'} {i('membership.dailyPt')}
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
              {i('membership.remainPt')} {credits} pt / {dailyCredits} pt
            </Text>
            {membership !== 'free' && (
              <Text style={[styles.creditsText, { color: t.brand }]}>
                {membershipExpiresAt
                  ? i('membership.expiresAt').replace('{date}', new Date(membershipExpiresAt).toLocaleDateString())
                  : i('membership.permanent')}
              </Text>
            )}
          </View>
        )}

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isCurrent = isAdmin ? false : plan.tier === membership;
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
                  {plan.badgeTextKey && (
                    <View style={[styles.recommendBadge, { backgroundColor: plan.color }]}>
                      <Text style={styles.recommendText}>{plan.badgeTextKey === 'membership.freeCampaign' ? '\u2b50 ' : ''}{i(plan.badgeTextKey)}</Text>
                    </View>
                  )}
                  {isCurrent && (
                    <View style={[styles.currentBadge, { backgroundColor: plan.color + '20', borderColor: plan.color }]}>
                      <Text style={[styles.currentBadgeText, { color: plan.color }]}>{i('membership.current')}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: isCurrent ? plan.color : t.text }]}>{plan.price}</Text>
                  <Text style={[styles.priceNote, { color: t.textSecondary }]}>{i(plan.priceNoteKey)}</Text>
                </View>

                <View style={[styles.creditsPill, { backgroundColor: plan.color + '18' }]}>
                  <Ionicons name="flash" size={13} color={plan.color} />
                  <Text style={[styles.creditsPillText, { color: plan.color }]}>
                    {i('membership.dailyPoints').replace('{x}', plan.dailyCredits.replace('pt', ''))}
                  </Text>
                </View>
              </View>

              {/* Divider */}
              <View style={[styles.cardDivider, { backgroundColor: t.border }]} />

              {/* Features */}
              <View style={styles.featureList}>
                {plan.featureKeys.map((fk, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={plan.color} />
                    <Text style={[styles.featureText, { color: t.text }]}>{i(fk)}</Text>
                  </View>
                ))}
              </View>

              {/* Models */}
              <View style={[styles.modelBox, { backgroundColor: t.inputBg, borderColor: t.border }]}>
                <Text style={[styles.modelLabel, { color: t.textSecondary }]}>{i('membership.availableModels')}</Text>
                {plan.tier === 'max' ? (
                  <Text style={[styles.modelItem, { color: t.text }]}>{'\u00b7'} {i('membership.allModels')}</Text>
                ) : (
                  plan.models.map((m, idx) => (
                    <Text key={idx} style={[styles.modelItem, { color: t.text }]}>{'\u00b7'} {i(m)}</Text>
                  ))
                )}
              </View>

              {/* CTA */}
              {isCurrent ? (
                <View style={[styles.ctaBtn, { backgroundColor: t.inputBg }]}>
                  <Text style={[styles.ctaBtnText, { color: t.textSecondary }]}>{i('membership.currentPlan')}</Text>
                </View>
              ) : isAdmin ? (
                null
              ) : !isUpgrade ? (
                null
              ) : (
                <View style={[styles.ctaBtn, { backgroundColor: t.inputBg }]}>
                  <Text style={[styles.ctaBtnText, { color: t.textSecondary }]}>{i('membership.purchase')}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom note */}
        <Text style={[styles.footnote, { color: t.textSecondary }]}>
          {i('membership.paymentNote')}
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
