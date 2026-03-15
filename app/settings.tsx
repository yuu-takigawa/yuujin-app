import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from '../hooks/useTheme';
import { spacing, fontSize, radii } from '../constants/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const darkMode = useSettingsStore((s) => s.darkMode);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const jpLevel = useSettingsStore((s) => s.jpLevel);
  const setJpLevel = useSettingsStore((s) => s.setJpLevel);

  const levels: Array<import('../services/api').JpLevel> = ['none', 'N5', 'N4', 'N3', 'N2', 'N1'];

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { backgroundColor: t.surface }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: t.brand }]}>‹ 戻る</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: t.text }]}>設定</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>外観</Text>
        <View style={[styles.row, { backgroundColor: t.surface }]}>
          <Text style={[styles.label, { color: t.text }]}>ダークモード</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: t.border, true: t.brand }}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>日本語レベル</Text>
        <View style={[styles.levelRow, { backgroundColor: t.surface }]}>
          {levels.map((lv) => (
            <TouchableOpacity
              key={lv}
              style={[
                styles.levelButton,
                jpLevel === lv && { backgroundColor: t.brand },
              ]}
              onPress={() => setJpLevel(lv)}
            >
              <Text
                style={[
                  styles.levelText,
                  { color: jpLevel === lv ? '#FFF' : t.text },
                ]}
              >
                {lv === 'none' ? '🔰' : lv}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: t.textSecondary }]}>その他</Text>
        {['AIモデル切替', '界面語言', '消息通知', 'アカウント管理', '友人について', 'フィードバック'].map(
          (label, i) => (
            <View
              key={i}
              style={[styles.row, { backgroundColor: t.surface }]}
            >
              <Text style={[styles.label, { color: t.text }]}>{label}</Text>
              <Text style={[styles.arrow, { color: t.textSecondary }]}>›</Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  back: {
    fontSize: fontSize.body,
    fontWeight: '500',
    width: 60,
  },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  label: {
    fontSize: fontSize.body,
  },
  arrow: {
    fontSize: 18,
  },
  levelRow: {
    flexDirection: 'row',
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  levelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  levelText: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
