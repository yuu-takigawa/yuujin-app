import { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useCreditStore } from '../../../stores/creditStore';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../hooks/useLocale';
import ModelSelectorModal from '../../../components/chat/ModelSelectorModal';

type Tier = 'free' | 'pro' | 'max' | 'admin';

/**
 * 服务端可能因 DB 编码问题（GBK→UTF-8 错误解析）返回含 U+FFFD 替换字符的用户名。
 * 检测到乱码时降级为邮件前缀。
 */
function safeDisplayName(username: string | undefined, email: string | undefined): string {
  if (!username || username.trim().length === 0) {
    return email?.split('@')[0] || 'ゲスト';
  }
  // U+FFFD = iOS 渲染为 ◆? 的替换字符；U+FFFE/FFFF 也是非法字符
  const hasGarbled = username.includes('\uFFFD') || username.includes('\uFFFE') || username.includes('\uFFFF');
  if (hasGarbled) {
    return email?.split('@')[0] || 'ゲスト';
  }
  return username;
}

const TIER_LABEL: Record<Tier, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
  admin: 'Max',
};

const TIER_COLOR: Record<Tier, string> = {
  free: '#9CA3AF',
  pro: '#3B82F6',
  max: '#E85B3A',
  admin: '#7C3AED',
};

const JP_LEVEL_LABEL: Record<string, string> = {
  none: '無経験',
  N5: 'N5',
  N4: 'N4',
  N3: 'N3',
  N2: 'N2',
  N1: 'N1',
};

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const credits = useCreditStore((s) => s.credits);
  const dailyCredits = useCreditStore((s) => s.dailyCredits);
  const membership = useCreditStore((s) => s.membership) as Tier;
  const loadCredits = useCreditStore((s) => s.loadCredits);
  const models = useCreditStore((s) => s.models);
  const selectedModelId = useCreditStore((s) => s.selectedModelId);
  const loadModels = useCreditStore((s) => s.loadModels);
  const [modelModalVisible, setModelModalVisible] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();

  // 5 stagger sections: userCard, credits, membership, menu, logout
  const anims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    loadCredits();
    loadModels();
    anims.forEach((anim, idx) => {
      setTimeout(() => {
        Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
      }, idx * 80);
    });
  }, []);

  const staggerStyle = (idx: number) => ({
    opacity: anims[idx],
    transform: [{ translateY: anims[idx].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
  });

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const tier = (membership || 'free') as Tier;
  const isAdmin = tier === 'admin';
  const tierColor = TIER_COLOR[tier] || TIER_COLOR.free;
  const tierLabel = TIER_LABEL[tier] || tier;
  const jpLabel = JP_LEVEL_LABEL[user?.jpLevel || 'N4'] || user?.jpLevel || 'N4';

  // 经过乱码过滤的安全显示名
  const displayName = safeDisplayName(user?.username, user?.email);

  // Avatar priority: image > emoji > letter
  const hasImage = !!user?.avatarUrl;
  const hasEmoji = !hasImage && !!user?.avatarEmoji && user.avatarEmoji !== '👤';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const menuItems = [
    {
      icon: 'trophy-outline' as const,
      label: i('profile.membershipPlan'),
      iconColor: t.brand,
      onPress: () => router.push('/membership'),
    },
    {
      icon: 'settings-outline' as const,
      label: i('settings.title'),
      iconColor: t.textSecondary,
      onPress: () => router.push('/settings'),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <Text style={[styles.headerTitle, { color: t.brand }]}>{i('profile.title')}</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={22} color={t.brand} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── User card ── */}
        <Animated.View style={staggerStyle(0)}>
          <View style={[styles.userCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            {/* Brand banner */}
            <View style={[styles.banner, { backgroundColor: t.brand }]}>
              {/* Subtle decorative circles */}
              <View style={[styles.bannerCircle1, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              <View style={[styles.bannerCircle2, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            </View>

            {/* Edit button top-right of banner */}
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => router.push('/edit-profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={14} color={t.textSecondary} />
            </TouchableOpacity>

            {/* User info */}
            <View style={styles.userBody}>
              {/* Avatar */}
              <TouchableOpacity
                style={[styles.avatarWrap, { borderColor: t.surface }]}
                onPress={() => router.push('/edit-profile')}
                activeOpacity={0.8}
              >
                <View style={[styles.avatar, { backgroundColor: t.surface }]}>
                  {hasImage ? (
                    <Image source={{ uri: user!.avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                  ) : hasEmoji ? (
                    <Text style={styles.avatarEmoji}>{user!.avatarEmoji}</Text>
                  ) : (
                    <Text style={[styles.avatarLetter, { color: tierColor }]}>{avatarLetter}</Text>
                  )}
                </View>
              </TouchableOpacity>

              {/* Name */}
              <Text style={[styles.username, { color: t.text }]} numberOfLines={1}>
                {displayName}
              </Text>

              {/* Email */}
              <Text style={[styles.email, { color: t.textSecondary }]} numberOfLines={1}>
                {user?.email || ''}
              </Text>

              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: tierColor + '18', borderColor: tierColor + '40' }]}>
                  <Ionicons name="trophy" size={10} color={tierColor} />
                  <Text style={[styles.badgeText, { color: tierColor }]}>{tierLabel}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: t.brandLight, borderColor: t.brand + '40' }]}>
                  <Ionicons name="school" size={10} color={t.brand} />
                  <Text style={[styles.badgeText, { color: t.brand }]}>{jpLabel}</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Credits card ── */}
        <Animated.View style={staggerStyle(1)}>
          <View style={[styles.creditsCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.creditsHeader}>
              <Ionicons name="flash-outline" size={16} color={t.brand} />
              <Text style={[styles.creditsTitle, { color: t.text }]}>{i('profile.pointsBalance')}</Text>
            </View>

            <View style={styles.creditsRow}>
              <View style={styles.creditsStat}>
                <Text style={[styles.creditsValue, { color: isAdmin ? '#7C3AED' : t.brand }]}>
                  {isAdmin ? '∞' : credits.toLocaleString()}
                </Text>
                <Text style={[styles.creditsLabel, { color: t.textSecondary }]}>{i('profile.remainingPoints')}</Text>
              </View>
              <View style={[styles.creditsDivider, { backgroundColor: t.border }]} />
              <View style={styles.creditsStat}>
                <Text style={[styles.creditsValue, { color: t.text }]}>
                  {isAdmin ? '∞' : dailyCredits.toLocaleString()}
                </Text>
                <Text style={[styles.creditsLabel, { color: t.textSecondary }]}>{i('profile.dailyLimit')}</Text>
              </View>
            </View>

            {!isAdmin && (
              <>
                <View style={[styles.creditsBar, { backgroundColor: t.inputBg }]}>
                  <View
                    style={[
                      styles.creditsBarFill,
                      {
                        backgroundColor: t.brand,
                        width: `${dailyCredits > 0 ? Math.min(100, (credits / dailyCredits) * 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.creditsNote, { color: t.textSecondary }]}>
                  {i('profile.resetTime')}
                </Text>
              </>
            )}
          </View>
        </Animated.View>

        {/* ── Membership card ── */}
        <Animated.View style={staggerStyle(2)}>
          {isAdmin ? (
            /* Admin card with model selector */
            <View style={[styles.memberCard, { backgroundColor: '#7C3AED18', borderColor: '#7C3AED60' }]}>
              <View style={styles.memberRow}>
                <Ionicons name="shield-checkmark" size={20} color="#7C3AED" />
                <Text style={[styles.memberTitle, { color: '#7C3AED' }]}>{i('profile.adminAccount')}</Text>
              </View>
              <Text style={[styles.memberDesc, { color: t.textSecondary }]}>
                {i('profile.adminDesc')}
              </Text>
              <TouchableOpacity
                style={[styles.modelSelectBtn, { backgroundColor: '#7C3AED12', borderColor: '#7C3AED40' }]}
                onPress={() => setModelModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color="#7C3AED" />
                <Text style={[styles.modelSelectLabel, { color: t.textSecondary }]}>{i('profile.currentModel')}</Text>
                <Text style={[styles.modelSelectValue, { color: '#7C3AED' }]} numberOfLines={1}>
                  {models.find((m) => m.id === selectedModelId)?.name || i('profile.autoSelect')}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
              </TouchableOpacity>
            </View>
          ) : tier === 'max' ? (
            /* Max card - show current plan details + model selector */
            <View style={[styles.memberCard, { backgroundColor: t.brandLight, borderColor: t.brand + '60' }]}>
              <View style={styles.memberRow}>
                <Ionicons name="trophy" size={20} color={t.brand} />
                <Text style={[styles.memberTitle, { color: t.brand }]}>{i('profile.maxMember')}</Text>
              </View>
              <Text style={[styles.memberDesc, { color: t.textSecondary }]}>
                {i('profile.maxDesc')}
              </Text>
              <TouchableOpacity
                style={[styles.modelSelectBtn, { backgroundColor: t.brand + '12', borderColor: t.brand + '40' }]}
                onPress={() => setModelModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color={t.brand} />
                <Text style={[styles.modelSelectLabel, { color: t.textSecondary }]}>{i('profile.currentModel')}</Text>
                <Text style={[styles.modelSelectValue, { color: t.brand }]} numberOfLines={1}>
                  {models.find((m) => m.id === selectedModelId)?.name || i('profile.autoSelect')}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={t.brand} />
              </TouchableOpacity>
            </View>
          ) : tier === 'pro' ? (
            /* Pro card - show current plan details + model selector */
            <View style={[styles.memberCard, { backgroundColor: '#3B82F618', borderColor: '#3B82F660' }]}>
              <View style={styles.memberRow}>
                <Ionicons name="trophy" size={20} color="#3B82F6" />
                <Text style={[styles.memberTitle, { color: '#3B82F6' }]}>Pro</Text>
              </View>
              <TouchableOpacity
                style={[styles.modelSelectBtn, { backgroundColor: '#3B82F612', borderColor: '#3B82F640' }]}
                onPress={() => setModelModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="sparkles" size={16} color="#3B82F6" />
                <Text style={[styles.modelSelectLabel, { color: t.textSecondary }]}>{i('profile.currentModel')}</Text>
                <Text style={[styles.modelSelectValue, { color: '#3B82F6' }]} numberOfLines={1}>
                  {models.find((m) => m.id === selectedModelId)?.name || i('profile.autoSelect')}
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          ) : (
            /* Upgrade ad for free */
            <View style={[styles.upgradeCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={styles.upgradeHeader}>
                <View style={[styles.upgradeIcon, { backgroundColor: t.brandLight }]}>
                  <Ionicons name="trophy" size={22} color={t.brand} />
                </View>
                <View style={styles.upgradeText}>
                  <Text style={[styles.upgradeTitle, { color: t.text }]}>{i('profile.upgradeToMax')}</Text>
                  <Text style={[styles.upgradeSub, { color: t.textSecondary }]}>
                    {i('profile.upgradeDesc')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: t.brand }]}
                onPress={() => router.push('/membership')}
                activeOpacity={0.8}
              >
                <Text style={styles.upgradeBtnText}>{i('profile.viewPlans')}</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── Menu ── */}
        <Animated.View style={staggerStyle(3)}>
          <View style={[styles.menuGroup, { borderColor: t.border }]}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.menuItem,
                  { backgroundColor: t.surface },
                  idx < menuItems.length - 1 && {
                    borderBottomColor: t.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                  },
                ]}
                onPress={item.onPress}
                activeOpacity={0.6}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.iconColor + '18' }]}>
                  <Ionicons name={item.icon} size={18} color={item.iconColor} />
                </View>
                <Text style={[styles.menuLabel, { color: t.text }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Logout ── */}
        <Animated.View style={staggerStyle(4)}>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            onPress={handleLogout}
            activeOpacity={0.6}
          >
            <Ionicons name="log-out-outline" size={18} color={t.textSecondary} />
            <Text style={[styles.logoutText, { color: t.textSecondary }]}>{i('profile.logout')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <ModelSelectorModal visible={modelModalVisible} onClose={() => setModelModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  scroll: { padding: 16, gap: 16 },

  // User card
  userCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  banner: { height: 100, position: 'relative' },
  bannerCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -60,
    right: -20,
  },
  bannerCircle2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    bottom: -30,
    left: 40,
  },
  editBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBody: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 0 },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    marginTop: -40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    flex: 1,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: { fontSize: 36 },
  avatarLetter: { fontSize: 32, fontWeight: '700' },
  username: { fontSize: 20, fontWeight: '700', marginTop: 12, maxWidth: 240 },
  email: { fontSize: 13, marginTop: 3, maxWidth: 240 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },

  // Credits card
  creditsCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  creditsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  creditsTitle: { fontSize: 14, fontWeight: '600' },
  creditsRow: { flexDirection: 'row', alignItems: 'center' },
  creditsStat: { flex: 1, alignItems: 'center', gap: 4 },
  creditsValue: { fontSize: 30, fontWeight: '800' },
  creditsLabel: { fontSize: 12 },
  creditsDivider: { width: 1, height: 44 },
  creditsBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  creditsBarFill: { height: '100%', borderRadius: 3 },
  creditsNote: { fontSize: 11, textAlign: 'center' },

  // Membership cards
  memberCard: {
    borderRadius: 14,
    padding: 18,
    gap: 8,
    borderWidth: 1,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberTitle: { fontSize: 16, fontWeight: '700' },
  memberDesc: { fontSize: 13, lineHeight: 20 },
  modelSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  modelSelectLabel: { fontSize: 12 },
  modelSelectValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  upgradeCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  upgradeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upgradeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeText: { flex: 1, gap: 3 },
  upgradeTitle: { fontSize: 15, fontWeight: '700' },
  upgradeSub: { fontSize: 13 },
  upgradeBtn: {
    height: 42,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  upgradeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Menu
  menuGroup: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { flex: 1, fontSize: 16 },

  // Logout
  logoutBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  logoutText: { fontSize: 15, fontWeight: '500' },
});
