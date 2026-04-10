import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { useCreditStore } from '../../stores/creditStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

function rewardText(reward: Record<string, unknown>, i: (key: string) => string): string {
  const parts: string[] = [];
  if (typeof reward.credits === 'number' && reward.credits > 0) {
    parts.push(i('redeem.rewardCredits').replace('{n}', String(reward.credits)));
  }
  if (typeof reward.membership_days === 'number' && typeof reward.membership_tier === 'string') {
    parts.push(i('redeem.rewardMembershipDays').replace('{tier}', reward.membership_tier.toUpperCase()).replace('{days}', String(reward.membership_days)));
  } else if (typeof reward.membership === 'string') {
    parts.push(i('redeem.rewardMembership').replace('{tier}', reward.membership.toUpperCase()));
  }
  return parts.join('\n');
}

export default function RedeemCodeModal({ visible, onClose }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reward, setReward] = useState<Record<string, unknown> | null>(null);
  const redeemCode = useCreditStore((s) => s.redeemCode);
  const loadCredits = useCreditStore((s) => s.loadCredits);
  const t = useTheme();
  const { t: i } = useLocale();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.85);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleRedeem = async () => {
    if (!code.trim()) {
      setError(i('redeem.invalid'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await redeemCode(code.trim());
      setReward(result);
      setCode('');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('使用済み') || msg.includes('already')) {
        setError(i('redeem.alreadyUsed'));
      } else if (msg.includes('上限') || msg.includes('quota')) {
        setError(i('redeem.full'));
      } else if (msg.includes('有効期限') || msg.includes('expired')) {
        setError(i('redeem.expired'));
      } else {
        setError(i('redeem.invalid'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    const hadReward = !!reward;
    setCode('');
    setError('');
    setReward(null);
    onClose();
    if (hadReward) {
      loadCredits();
    }
  };

  const isSuccess = !!reward;

  return (
    <Modal visible={visible} transparent statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={isSuccess ? undefined : handleClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: t.surface, transform: [{ scale: scaleAnim }], opacity: fadeAnim },
          ]}
        >
          {isSuccess ? (
            <>
              <Ionicons name="checkmark-circle" size={48} color={t.brand} style={{ marginBottom: 12 }} />
              <Text style={[styles.title, { color: t.text }]}>{i('redeem.success')}</Text>
              <Text style={[styles.message, { color: t.textSecondary }]}>
                {rewardText(reward!, i)}
              </Text>
              <View style={[styles.buttons, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: t.brand }]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{i('redeem.close')}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: t.text }]}>{i('redeem.title')}</Text>
              <Text style={[styles.message, { color: t.textSecondary }]}>{i('redeem.placeholder')}</Text>

              <TextInput
                style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
                placeholderTextColor={t.textSecondary}
                value={code}
                onChangeText={(v) => { setCode(v); setError(''); }}
                maxLength={30}
                autoCapitalize="none"
                multiline
                numberOfLines={1}
                blurOnSubmit
              />

              {error ? (
                <Text style={[styles.feedback, { color: t.error || '#E53935' }]}>{error}</Text>
              ) : null}

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: t.inputBg || t.background }]}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: t.textSecondary }]}>{i('redeem.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: t.brand }, loading && styles.buttonDisabled]}
                  onPress={handleRedeem}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>{i('redeem.btn')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as any : {}),
  },
  card: {
    width: '80%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    letterSpacing: 1,
    textAlign: 'center',
  },
  feedback: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
