import { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useTheme } from '../../../hooks/useTheme';
import { useLocale } from '../../../hooks/useLocale';
import type { JpLevel } from '../../../services/api';
import { updateProfile } from '../../../services/api';
import HalfScreenModal from '../../../components/common/HalfScreenModal';

const JP_LEVEL_VALUES: JpLevel[] = ['none', 'N5', 'N4', 'N3', 'N2', 'N1', 'native'];

function SectionHeader({ title }: { title: string }) {
  const t = useTheme();
  return <Text style={[styles.sectionHeader, { color: t.textSecondary }]}>{title}</Text>;
}

function SettingsRow({
  icon,
  label,
  right,
  onPress,
  destructive,
  iconColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  iconColor?: string;
}) {
  const t = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: t.surface }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: (iconColor || t.brand) + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor || t.brand} />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? (t.error || '#E53935') : t.text }]}>{label}</Text>
      {right !== undefined ? (
        right
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();
  const { t: i } = useLocale();
  const user = useAuthStore((s) => s.user);
  const setJpLevel = useAuthStore((s) => s.setJpLevel);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const jpLevel = user?.jpLevel || 'N4';

  const [jpLevelPickerVisible, setJpLevelPickerVisible] = useState(false);

  const currentLevelLabel = i(`level.${jpLevel}`);

  const handleLogout = () => {
    Alert.alert('ログアウト', '本当にログアウトしますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'ログアウト', style: 'destructive', onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('アカウント削除', '本当に削除しますか？この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          try {
            await deleteAccount();
            router.replace('/(auth)/login');
          } catch {
            Alert.alert('エラー', '削除に失敗しました。もう一度お試しください。');
          }
        },
      },
    ]);
  };

  const handleJpLevelChange = () => {
    setJpLevelPickerVisible(!jpLevelPickerVisible);
  };

  const handleJpLevelSelect = async (level: JpLevel) => {
    setJpLevel(level);
    setJpLevelPickerVisible(false);
    try {
      await updateProfile({ jpLevel: level });
    } catch { /* silent */ }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: t.brand }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>{i('settings.title')}</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {/* 学習 */}
        <SectionHeader title={i('settings.learning')} />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="school-outline"
            label={i('settings.jpLevel')}
            right={
              <View style={styles.valueRow}>
                <Text style={[styles.valueText, { color: t.brand }]}>{currentLevelLabel}</Text>
                <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
              </View>
            }
            onPress={handleJpLevelChange}
          />
        </View>

        {/* 外観 */}
        <SectionHeader title={i('settings.appearance')} />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="moon-outline"
            label={i('settings.theme')}
            right={
              <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: t.border }}>
                {([['light', i('settings.themeLight')], ['system', i('settings.themeSystem')], ['dark', i('settings.themeDark')]] as [string, string][]).map(([mode, label]) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setThemeMode(mode as 'light' | 'system' | 'dark')}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      backgroundColor: themeMode === mode ? t.brand : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: themeMode === mode ? '#FFF' : t.textSecondary }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            }
          />
        </View>

        {/* 通知 */}
        <SectionHeader title={i('settings.notifications')} />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="notifications-outline"
            label={i('settings.pushNotifications')}
            right={<Switch value={false} onValueChange={() => Alert.alert(i('action.preparing'), i('action.preparingMsg'))} trackColor={{ true: t.brand, false: t.border }} thumbColor="#FFFFFF" />}
          />
        </View>

        {/* アカウント */}
        <SectionHeader title={i('settings.account')} />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="person-outline"
            label={i('settings.editProfile')}
            onPress={() => router.push('/edit-profile')}
          />
          <RowDivider />
          <SettingsRow
            icon="lock-closed-outline"
            label={i('settings.changePassword')}
            onPress={() => router.push('/change-password')}
          />
          <RowDivider />
          <SettingsRow
            icon="trash-outline"
            label={i('settings.deleteAccount')}
            destructive
            iconColor={t.error || '#E53935'}
            onPress={handleDeleteAccount}
          />
        </View>

      </ScrollView>

      <HalfScreenModal visible={jpLevelPickerVisible} onClose={() => setJpLevelPickerVisible(false)} height={420}>
        <View style={styles.levelModal}>
          <Text style={[styles.levelModalTitle, { color: t.text }]}>{i('settings.selectJpLevel')}</Text>
          {JP_LEVEL_VALUES.map((lv) => (
            <TouchableOpacity
              key={lv}
              style={[styles.levelOption, { backgroundColor: jpLevel === lv ? t.brandLight : 'transparent' }]}
              onPress={() => handleJpLevelSelect(lv)}
            >
              <Text style={[styles.levelOptionLabel, { color: jpLevel === lv ? t.brand : t.text }]}>
                {i(`level.${lv}`)}
              </Text>
              <Text style={[styles.levelOptionDesc, { color: t.textSecondary }]}>{i(`level.${lv}.desc`)}</Text>
              {jpLevel === lv && <Ionicons name="checkmark" size={18} color={t.brand} />}
            </TouchableOpacity>
          ))}
        </View>
      </HalfScreenModal>
    </View>
  );
}

function RowDivider() {
  const t = useTheme();
  return <View style={[styles.divider, { backgroundColor: t.border }]} />;
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
  title: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  scroll: { paddingTop: 20, paddingHorizontal: 16, gap: 6 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 6,
  },
  group: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: { flex: 1, fontSize: 16 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  valueText: { fontSize: 14 },
  levelModal: { paddingHorizontal: 16, paddingTop: 8 },
  levelModalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  levelOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, gap: 8, marginBottom: 2 },
  levelOptionLabel: { fontSize: 15, fontWeight: '600', width: 80 },
  levelOptionDesc: { flex: 1, fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
});
