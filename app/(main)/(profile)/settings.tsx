import { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useSettingsStore } from '../../../stores/settingsStore';
import { useTheme } from '../../../hooks/useTheme';
import type { JpLevel } from '../../../services/api';
import { updateProfile } from '../../../services/api';
import HalfScreenModal from '../../../components/common/HalfScreenModal';

const JP_LEVELS: { value: JpLevel; label: string; desc: string }[] = [
  { value: 'none', label: '無経験', desc: '日本語が全然わからない' },
  { value: 'N5', label: 'N5', desc: 'ひらがな・基本あいさつ' },
  { value: 'N4', label: 'N4', desc: '簡単な日常会話ができる' },
  { value: 'N3', label: 'N3', desc: '日常会話がある程度できる' },
  { value: 'N2', label: 'N2', desc: 'ほぼ自然に話せる' },
  { value: 'N1', label: 'N1', desc: 'ネイティブに近いレベル' },
  { value: 'native', label: '母語', desc: 'ネイティブレベル' },
];

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
  const user = useAuthStore((s) => s.user);
  const setJpLevel = useAuthStore((s) => s.setJpLevel);
  const logout = useAuthStore((s) => s.logout);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const jpLevel = user?.jpLevel || 'N4';

  const [jpLevelPickerVisible, setJpLevelPickerVisible] = useState(false);

  const currentLevel = JP_LEVELS.find((l) => l.value === jpLevel) || JP_LEVELS[1];

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
      await updateUser({ jpLevel: level });
    } catch { /* silent */ }
  };

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={[styles.backText, { color: t.brand }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>設定</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {/* 学習 */}
        <SectionHeader title="学習" />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="school-outline"
            label="日本語レベル"
            right={
              <View style={styles.valueRow}>
                <Text style={[styles.valueText, { color: t.brand }]}>{currentLevel.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={t.textSecondary} />
              </View>
            }
            onPress={handleJpLevelChange}
          />
        </View>

        {/* 外観 */}
        <SectionHeader title="外観" />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="moon-outline"
            label="テーマ"
            right={
              <View style={{ flexDirection: 'row', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: t.border }}>
                {([['light', 'ライト'], ['system', 'システム'], ['dark', 'ダーク']] as const).map(([mode, label]) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setThemeMode(mode)}
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
        <SectionHeader title="通知" />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="notifications-outline"
            label="プッシュ通知"
            right={<Switch value={false} onValueChange={() => Alert.alert('準備中', 'この機能は近日公開予定です。')} trackColor={{ true: t.brand, false: t.border }} thumbColor="#FFFFFF" />}
          />
        </View>

        {/* アカウント */}
        <SectionHeader title="アカウント" />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="person-outline"
            label="プロフィール編集"
            onPress={() => router.push('/edit-profile')}
          />
          <RowDivider />
          <SettingsRow
            icon="lock-closed-outline"
            label="パスワード変更"
            onPress={() => router.push('/change-password')}
          />
          <RowDivider />
          <SettingsRow
            icon="log-out-outline"
            label="ログアウト"
            destructive
            iconColor={t.error || '#E53935'}
            onPress={handleLogout}
          />
          <RowDivider />
          <SettingsRow
            icon="trash-outline"
            label="アカウント削除"
            destructive
            iconColor={t.error || '#E53935'}
            onPress={handleDeleteAccount}
          />
        </View>

        {/* その他 */}
        <SectionHeader title="その他" />
        <View style={[styles.group, { borderColor: t.border }]}>
          <SettingsRow
            icon="information-circle-outline"
            label="バージョン情報"
            right={<Text style={[styles.valueText, { color: t.textSecondary }]}>1.0.0</Text>}
            iconColor={t.textSecondary}
          />
          <RowDivider />
          <SettingsRow
            icon="chatbubble-ellipses-outline"
            label="フィードバック"
            onPress={() => Alert.alert('準備中', 'この機能は近日公開予定です。')}
            iconColor={t.textSecondary}
          />
          <RowDivider />
          <SettingsRow
            icon="document-text-outline"
            label="オープンソースライセンス"
            onPress={() => Alert.alert('準備中', 'この機能は近日公開予定です。')}
            iconColor={t.textSecondary}
          />
        </View>
      </ScrollView>

      <HalfScreenModal visible={jpLevelPickerVisible} onClose={() => setJpLevelPickerVisible(false)} height={420}>
        <View style={styles.levelModal}>
          <Text style={[styles.levelModalTitle, { color: t.text }]}>日本語レベルを選択</Text>
          {JP_LEVELS.map((l) => (
            <TouchableOpacity
              key={l.value}
              style={[styles.levelOption, { backgroundColor: jpLevel === l.value ? t.brandLight : 'transparent' }]}
              onPress={() => handleJpLevelSelect(l.value)}
            >
              <Text style={[styles.levelOptionLabel, { color: jpLevel === l.value ? t.brand : t.text }]}>
                {l.label}
              </Text>
              <Text style={[styles.levelOptionDesc, { color: t.textSecondary }]}>{l.desc}</Text>
              {jpLevel === l.value && <Ionicons name="checkmark" size={18} color={t.brand} />}
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
