import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { useCreditStore } from '../../stores/creditStore';
import { radii, spacing, fontSize } from '../../constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RedeemCodeModal({ visible, onClose }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const redeemCode = useCreditStore((s) => s.redeemCode);
  const t = useTheme();
  const { t: i } = useLocale();

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await redeemCode(code.trim());
      setSuccess(i('redeem.success'));
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
    setCode('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.container, { backgroundColor: t.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: t.text }]}>{i('redeem.title')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={t.textSecondary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: t.inputBg, color: t.text }]}
            placeholder={i('redeem.placeholder')}
            placeholderTextColor={t.textSecondary}
            value={code}
            onChangeText={(v) => { setCode(v); setError(''); setSuccess(''); }}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {error ? (
            <Text style={[styles.msg, { color: t.error || '#E53935' }]}>{error}</Text>
          ) : null}
          {success ? (
            <Text style={[styles.msg, { color: '#10B981' }]}>{success}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: t.brand }, (!code.trim() || loading) && styles.btnDisabled]}
            onPress={handleRedeem}
            disabled={!code.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.btnText}>{i('redeem.btn')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    width: '85%',
    maxWidth: 360,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSize.subtitle,
    fontWeight: '700',
  },
  input: {
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: fontSize.body,
    letterSpacing: 1,
  },
  msg: {
    fontSize: fontSize.caption,
    textAlign: 'center',
  },
  btn: {
    borderRadius: radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
