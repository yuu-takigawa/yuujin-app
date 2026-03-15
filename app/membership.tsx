import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { radii } from '../constants/theme';

export default function MembershipScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const features = [
    '無制限のAI会話',
    '全ニュース記事閲覧',
    '広告非表示',
    '優先サポート',
  ];

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>会員プラン</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Ionicons name="trophy" size={40} color={t.brand} />
          <Text style={[styles.heroTitle, { color: t.text }]}>
            プレミアムで{'\n'}もっと楽しく学ぼう
          </Text>
          <Text style={[styles.heroSub, { color: t.textSecondary }]}>
            すべての機能を制限なく使えます
          </Text>
        </View>

        {/* Monthly Plan (recommended) */}
        <View style={[styles.planCard, { borderColor: t.brand, shadowColor: t.brand }]}>
          <View style={[styles.planBadge, { backgroundColor: t.brand }]}>
            <Text style={styles.planBadgeText}>おすすめ</Text>
          </View>
          <View style={[styles.planBody, { backgroundColor: t.surface }]}>
            <View style={styles.planHeader}>
              <View>
                <Text style={[styles.planName, { color: t.text }]}>月額プラン</Text>
                <Text style={[styles.planDesc, { color: t.textSecondary }]}>毎月自動更新</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceYen, { color: t.brand }]}>¥</Text>
                <Text style={[styles.priceAmount, { color: t.brand }]}>980</Text>
                <Text style={[styles.pricePer, { color: t.textSecondary }]}>/月</Text>
              </View>
            </View>
            <View style={[styles.planSep, { backgroundColor: t.border }]} />
            <View style={styles.featureList}>
              {features.map((feat, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={16} color={t.success} />
                  <Text style={[styles.featureText, { color: t.text }]}>{feat}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: t.brand }]}>
              <Text style={styles.ctaBtnText}>このプランを選ぶ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Yearly Plan */}
        <View style={[styles.planCard, { borderColor: t.border }]}>
          <View style={[styles.planBody, { backgroundColor: t.surface }]}>
            <View style={styles.planHeader}>
              <View>
                <View style={styles.yearlyNameRow}>
                  <Text style={[styles.planName, { color: t.text }]}>年額プラン</Text>
                  <View style={[styles.saveBadge, { backgroundColor: t.success }]}>
                    <Text style={styles.saveBadgeText}>3ヶ月分お得</Text>
                  </View>
                </View>
                <Text style={[styles.planDesc, { color: t.textSecondary }]}>年一括払い</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.priceYen, { color: t.text }]}>¥</Text>
                <Text style={[styles.priceAmount, { color: t.text }]}>9,800</Text>
                <Text style={[styles.pricePer, { color: t.textSecondary }]}>/年</Text>
              </View>
            </View>
            <View style={[styles.planSep, { backgroundColor: t.border }]} />
            <View style={styles.featureList}>
              {features.map((feat, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons name="checkmark" size={16} color={t.success} />
                  <Text style={[styles.featureText, { color: t.text }]}>{feat}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 }]}>
              <Text style={[styles.ctaBtnText, { color: t.text }]}>このプランを選ぶ</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Free plan note */}
        <View style={styles.freeNote}>
          <Text style={[styles.freeTitle, { color: t.text }]}>フリープラン</Text>
          <Text style={[styles.freeSub, { color: t.textSecondary }]}>1日3回まで会話可能・広告あり</Text>
          <Text style={[styles.freeLink, { color: t.brand }]}>フリープランを続ける</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
  },
  scroll: {
    padding: 16,
    gap: 24,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: undefined, // set via inline style
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  planBadge: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  planBody: {
    padding: 20,
    gap: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
  },
  planDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  yearlyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  saveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  priceYen: {
    fontSize: 16,
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '700',
  },
  pricePer: {
    fontSize: 14,
    marginBottom: 4,
  },
  planSep: {
    height: 1,
  },
  featureList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  ctaBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  freeNote: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  freeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  freeSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  freeLink: {
    fontSize: 14,
    fontWeight: '500',
  },
});
