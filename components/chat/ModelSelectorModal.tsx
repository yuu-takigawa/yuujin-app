import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useCreditStore } from '../../stores/creditStore';
import HalfScreenModal from '../common/HalfScreenModal';

interface ModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

const TIER_LABELS: Record<string, string> = {
  free: '無料',
  basic: 'ベーシック',
  premium: 'プレミアム',
  admin: '管理者',
};

const PROVIDER_ICONS: Record<string, string> = {
  ernie: 'B',
  deepseek: 'D',
  qianwen: 'Q',
  claude: 'C',
};

export default function ModelSelectorModal({ visible, onClose }: ModelSelectorModalProps) {
  const t = useTheme();
  const models = useCreditStore((s) => s.models);
  const selectedModelId = useCreditStore((s) => s.selectedModelId);
  const setSelectedModel = useCreditStore((s) => s.setSelectedModel);
  const credits = useCreditStore((s) => s.credits);

  const setDefaultModel = useCreditStore((s) => s.setDefaultModel);

  const handleSelect = (modelId: string) => {
    setDefaultModel(modelId);
    onClose();
  };

  return (
    <HalfScreenModal visible={visible} onClose={onClose} height={480}>
      <View style={[styles.header, { borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>AIモデル選択</Text>
        <View style={[styles.creditsBadge, { backgroundColor: t.brandLight }]}>
          <Ionicons name="flash" size={12} color={t.brand} />
          <Text style={[styles.creditsText, { color: t.brand }]}>
            {credits === -1 ? '無制限' : credits}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {models.map((model) => {
          const isSelected = model.id === selectedModelId;
          const isLocked = !model.available;

          return (
            <TouchableOpacity
              key={model.id}
              style={[
                styles.modelItem,
                { backgroundColor: isSelected ? t.brandLight : t.surface, borderColor: isSelected ? t.brand : t.border },
              ]}
              onPress={() => !isLocked && handleSelect(model.id)}
              activeOpacity={isLocked ? 1 : 0.6}
              disabled={isLocked}
            >
              <View style={[styles.providerIcon, { backgroundColor: isLocked ? t.inputBg : t.brand }]}>
                <Text style={[styles.providerLetter, { color: isLocked ? t.textSecondary : '#FFF' }]}>
                  {PROVIDER_ICONS[model.provider] || '?'}
                </Text>
              </View>

              <View style={styles.modelInfo}>
                <Text style={[styles.modelName, { color: isLocked ? t.textSecondary : t.text }]}>
                  {model.name}
                </Text>
                <View style={styles.modelMeta}>
                  <Text style={[styles.costText, { color: t.textSecondary }]}>
                    {model.creditsPerChat}pt/回
                  </Text>
                  {isLocked && (
                    <View style={[styles.tierBadge, { backgroundColor: t.inputBg }]}>
                      <Ionicons name="lock-closed" size={10} color={t.textSecondary} />
                      <Text style={[styles.tierText, { color: t.textSecondary }]}>
                        {TIER_LABELS[model.minTier] || model.minTier}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={t.brand} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </HalfScreenModal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  creditsText: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    gap: 8,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  providerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerLetter: {
    fontSize: 16,
    fontWeight: '800',
  },
  modelInfo: {
    flex: 1,
    gap: 2,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costText: {
    fontSize: 12,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
