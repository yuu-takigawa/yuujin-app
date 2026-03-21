import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../../components/common/Avatar';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useCharacterStore } from '../../stores/characterStore';
import { useFriendStore } from '../../stores/friendStore';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { spacing, fontSize, radii } from '../../constants/theme';
import type { JpLevel } from '../../services/api';

type Step = 'welcome' | 'level' | 'gift' | 'add';

export default function OnboardingScreen() {
  const router = useRouter();
  const t = useTheme();
  const { t: i } = useLocale();
  const [step, setStep] = useState<Step>('welcome');
  const [selectedLevel, setSelectedLevel] = useState<JpLevel>('N4');
  const [isAdding, setIsAdding] = useState(false);

  const user = useAuthStore((s) => s.user);
  const setJpLevel = useAuthStore((s) => s.setJpLevel);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setSettingsLevel = useSettingsStore((s) => s.setJpLevel);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const addFriend = useFriendStore((s) => s.addFriend);

  const levels: { value: JpLevel; label: string }[] = [
    { value: 'none', label: i('onboarding.levelNone') },
    { value: 'N5', label: i('onboarding.levelN5') },
    { value: 'N4', label: i('onboarding.levelN4') },
    { value: 'N3', label: i('onboarding.levelN3') },
    { value: 'N2', label: i('onboarding.levelN2') },
    { value: 'N1', label: i('onboarding.levelN1') },
  ];

  const handleLevelSelect = () => {
    setJpLevel(selectedLevel);
    setSettingsLevel(selectedLevel);
    setStep('gift');
  };

  const handleAddFriend = async () => {
    if (!user || isAdding) return;
    setIsAdding(true);
    try {
      await fetchCharacters();
      const conv = await addFriend(user.id, 'preset-sato-yuki');
      completeOnboarding();
      router.replace(`/conversation/${conv.id}`);
    } catch {
      setIsAdding(false);
    }
  };

  // Step 1: Welcome
  if (step === 'welcome') {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.center}>
          <Text style={[styles.logo, { color: t.brand }]}>Yuujin・友人</Text>
          <Text style={[styles.welcomeTitle, { color: t.text }]}>
            {i('onboarding.welcome')}
          </Text>
          <Text style={[styles.welcomeSub, { color: t.textSecondary }]}>
            {i('onboarding.subtitle')}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={() => setStep('level')}
        >
          <Text style={styles.buttonText}>{i('onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 2: Select JP level
  if (step === 'level') {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <Text style={[styles.title, { color: t.text }]}>
          {i('onboarding.selectLevel')}
        </Text>
        <View style={styles.levels}>
          {levels.map((lv) => (
            <TouchableOpacity
              key={lv.value}
              style={[
                styles.levelOption,
                { backgroundColor: t.surface, borderColor: t.border, borderWidth: 1 },
                selectedLevel === lv.value && { backgroundColor: t.brandLight, borderColor: t.brand },
              ]}
              onPress={() => setSelectedLevel(lv.value)}
            >
              <View style={styles.levelRow}>
                <Text style={[styles.levelValue, { color: selectedLevel === lv.value ? t.brand : t.text }]}>
                  {lv.value === 'none' ? '🔰' : lv.value}
                </Text>
                <Text style={[styles.levelLabel, { color: selectedLevel === lv.value ? t.brand : t.textSecondary }]}>
                  {lv.label}
                </Text>
              </View>
              {selectedLevel === lv.value && (
                <Ionicons name="checkmark-circle" size={20} color={t.brand} />
              )}
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={handleLevelSelect}
        >
          <Text style={styles.buttonText}>{i('onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Meet Yuki
  if (step === 'gift') {
    return (
      <View style={[styles.container, { backgroundColor: t.background }]}>
        <View style={styles.center}>
          <Text style={[styles.giftTitle, { color: t.text }]}>
            {i('onboarding.meetYuki')}
          </Text>
          <View style={[styles.yukiCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Avatar name="ゆき" size={80} />
            <Text style={[styles.yukiName, { color: t.text }]}>佐藤ゆき</Text>
            <Text style={[styles.yukiDesc, { color: t.textSecondary }]}>
              {i('onboarding.yukiDesc')}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: t.brand }]}
          onPress={() => setStep('add')}
        >
          <Text style={styles.buttonText}>{i('onboarding.addFriend')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 4: Add friend & start chatting
  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <View style={styles.center}>
        <Avatar name="ゆき" size={80} />
        <Text style={[styles.addTitle, { color: t.text }]}>
          {i('onboarding.tryReply')}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: t.brand }, isAdding && { opacity: 0.6 }]}
        onPress={handleAddFriend}
        disabled={isAdding}
      >
        <Text style={styles.buttonText}>
          {isAdding ? '...' : i('onboarding.start')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'ShipporiMincho_700Bold',
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  welcomeSub: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 34,
  },
  levels: {
    gap: 8,
    marginBottom: spacing.xl,
  },
  levelOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelValue: {
    fontSize: 15,
    fontWeight: '700',
    width: 36,
  },
  levelLabel: {
    fontSize: 14,
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
  giftTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  yukiCard: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    width: '100%',
  },
  yukiName: {
    fontSize: 20,
    fontWeight: '700',
  },
  yukiDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  addTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
