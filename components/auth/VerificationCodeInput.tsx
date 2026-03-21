import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { sendCode } from '../../services/api';

interface Props {
  email: string;
  type: 'register' | 'reset_password';
  value: string;
  onChangeText: (v: string) => void;
  onError?: (msg: string) => void;
}

export default function VerificationCodeInput({ email, type, value, onChangeText, onError }: Props) {
  const t = useTheme();
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSend = async () => {
    if (!email || countdown > 0 || sending) return;
    if (!/\S+@\S+\.\S+/.test(email)) {
      onError?.('有効なメールアドレスを入力してください');
      return;
    }
    setSending(true);
    try {
      await sendCode(email, type);
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      onError?.(err?.message || 'コード送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const canSend = !!email && countdown === 0 && !sending;

  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
        placeholder="認証コード (6桁)"
        placeholderTextColor={t.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={6}
        {...(Platform.OS === 'web' ? { autoComplete: 'one-time-code' } : {})}
      />
      <TouchableOpacity
        style={[styles.sendBtn, { backgroundColor: canSend ? t.brand : t.inputBg }]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.7}
      >
        <Text style={[styles.sendText, { color: canSend ? '#FFF' : t.textSecondary }]}>
          {sending ? '送信中...' : countdown > 0 ? `再送信 (${countdown}s)` : 'コード送信'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    letterSpacing: 4,
  },
  sendBtn: {
    flexShrink: 0,
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  sendText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
