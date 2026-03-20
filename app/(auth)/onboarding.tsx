import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import Avatar from '../../components/common/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCharacterStore } from '../../stores/characterStore';
import { useFriendStore } from '../../stores/friendStore';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, radii } from '../../constants/theme';

type Step = 'level' | 'gift' | 'add';

export default function OnboardingScreen() {
  const router = useRouter();
  const t = useTheme();
  const [step, setStep] = useState<Step>('level');
  const [selectedLevel, setSelectedLevel] = useState<import('../../services/api').JpLevel>('N4');

  const user = useAuthStore((s) => s.user);
  const setJpLevel = useAuthStore((s) => s.setJpLevel);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setSettingsLevel = useSettingsStore((s) => s.setJpLevel);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const addFriend = useFriendStore((s) => s.addFriend);

  const levels: Array<import('../../services/api').JpLevel> = ['none', 'N5', 'N4', 'N3', 'N2', 'N1', 'native'];
  const levelDescriptions: Record<string, string> = {
    none: '🔰 無経験 — まったくの初心者',
    N5: '初心者 — ひらがな・カタカナ、基本的な挨拶',
    N4: '初級 — 日常会話の基本',
    N3: '中級 — 日常的な場面で使える',
    N2: '中上級 — 幅広い場面で使える',
    N1: '上級 — 複雑な文章も理解できる',
    native: '🇯🇵 母語話者 — ネイティブレベル',
  };

  const handleLevelSelect = () => {
    setJpLevel(selectedLevel);
    setSettingsLevel(selectedLevel);
    setStep('gift');
  };

  const handleGiftAccept = () => {
    setStep('add');
  };

  const handleAddFriend = async () => {
    if (!user) return;
    await fetchCharacters();
    const conv = await addFriend(user.id, 'preset-sato-yuki');
    completeOnboarding();
    router.replace(`/conversation/${conv.id}`);
  };

  if (step === 'level') {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.title, { color: t.text }]}>日本語のレベルを{'\n'}教えてください</Text>
        <View style={styles.levels}>
          {levels.map((lv) => (
            <TouchableOpacity
              key={lv}
              style={[
                styles.levelOption,
                { backgroundColor: t.surface },
                selectedLevel === lv && { backgroundColor: t.brandLight },
              ]}
              onPress={() => setSelectedLevel(lv)}
            >
              <Text style={[styles.levelLabel, { color: t.text }, selectedLevel === lv && { color: t.brand }]}>
                {lv}
              </Text>
              <Text style={[styles.levelDesc, { color: t.textSecondary }]}>
                {levelDescriptions[lv]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={handleLevelSelect}
        >
          <Text style={styles.buttonText}>次へ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'gift') {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.giftSection}>
          <Text style={[styles.giftTitle, { color: t.text }]}>ようこそ！🎉</Text>
          <Text style={[styles.giftSub, { color: t.textSecondary }]}>
            最初の友達を紹介します
          </Text>
          <View style={styles.giftCard}>
            <Avatar name="ゆき" size={80} />
            <Text style={[styles.giftName, { color: t.text }]}>佐藤ゆき</Text>
            <Text style={[styles.giftDesc, { color: t.textSecondary }]}>
              27歳 · UIデザイナー · 東京・下北沢
            </Text>
            <Text style={[styles.giftBio, { color: t.text }]}>
              明るくて話しやすい、好奇心旺盛な女の子。{'\n'}気軽に日本語で話しかけてね！
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={handleGiftAccept}
        >
          <Text style={styles.buttonText}>受け取る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // step === 'add'
  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.giftSection}>
        <Avatar name="ゆき" size={80} />
        <Text style={[styles.giftTitle, { color: t.text, marginTop: spacing.md }]}>
          ゆきと友達になろう！
        </Text>
        <Text style={[styles.giftSub, { color: t.textSecondary }]}>
          友達に追加すると、すぐにチャットが始まります
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: t.brand }]}
        onPress={handleAddFriend}
      >
        <Text style={styles.buttonText}>友達に追加してチャット開始</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 34,
  },
  levels: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  levelOption: {
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  levelLabel: {
    fontSize: fontSize.body,
    fontWeight: '700',
  },
  levelDesc: {
    fontSize: fontSize.caption,
    marginTop: 2,
  },
  button: {
    paddingVertical: 16,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  giftSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  giftTitle: {
    fontSize: fontSize.title,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  giftSub: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  giftCard: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  giftName: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
  giftDesc: {
    fontSize: fontSize.caption,
  },
  giftBio: {
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
});
