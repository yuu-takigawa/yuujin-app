import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { streamChatAnnotate } from '../../services/api';

interface AnnotationPanelProps {
  content: string;
  type: 'translation' | 'analysis' | 'correct';
  onClose: () => void;
}

export default function AnnotationPanel({ content, type, onClose }: AnnotationPanelProps) {
  const t = useTheme();
  const { t: i } = useLocale();
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Map 'correct' to 'analysis' for the API call (server handles both as analysis types)
    const apiType = type === 'correct' ? 'analysis' : type;

    const cancel = streamChatAnnotate(content, apiType, (event) => {
      if (event.type === 'start') {
        setResult('');
        setLoading(true);
      } else if (event.type === 'delta' && event.content) {
        setResult((prev) => prev + event.content);
      } else if (event.type === 'done') {
        setLoading(false);
      } else if (event.type === 'error') {
        setError(event.error || 'Error');
        setLoading(false);
      }
    });

    cancelRef.current = cancel;

    return () => {
      if (cancelRef.current) cancelRef.current();
    };
  }, [content, type]);

  const handleClose = () => {
    if (cancelRef.current) cancelRef.current();
    onClose();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerLabel, { color: t.textSecondary }]}>
          {type === 'translation' ? i('bubble.translate') : type === 'correct' ? i('bubble.correct') : i('bubble.analyze')}
        </Text>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={16} color={t.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.resultText, { color: t.text }]}>
        {error ? error : result || (loading ? i('bubble.loading') : '')}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
