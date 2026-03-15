import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import DiceButton from './DiceButton';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize, radii } from '../../constants/theme';
import { randomizeField, randomizeArrayField } from '../../services/api';

interface CharacterFormProps {
  initialData?: {
    name: string;
    avatarEmoji: string;
    age: number;
    gender: string;
    occupation: string;
    personality: string[];
    hobbies: string[];
    location: string;
    bio: string;
  };
  onSubmit: (data: {
    name: string;
    avatarEmoji: string;
    age: number;
    gender: string;
    occupation: string;
    personality: string[];
    hobbies: string[];
    location: string;
    bio: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export default function CharacterForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel,
}: CharacterFormProps) {
  const t = useTheme();
  const [name, setName] = useState(initialData?.name || '');
  const [avatarEmoji, setAvatarEmoji] = useState(initialData?.avatarEmoji || '😊');
  const [age, setAge] = useState(String(initialData?.age || 25));
  const [gender, setGender] = useState(initialData?.gender || '女性');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [personality, setPersonality] = useState(
    initialData?.personality?.join('、') || ''
  );
  const [hobbies, setHobbies] = useState(
    initialData?.hobbies?.join('、') || ''
  );
  const [location, setLocation] = useState(initialData?.location || '');
  const [bio, setBio] = useState(initialData?.bio || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      avatarEmoji,
      age: parseInt(age) || 25,
      gender,
      occupation: occupation.trim(),
      personality: personality.split('、').filter(Boolean),
      hobbies: hobbies.split('、').filter(Boolean),
      location: location.trim(),
      bio: bio.trim(),
    });
  };

  const handleRandomizeAll = () => {
    const g = Math.random() > 0.5 ? '女性' : '男性';
    setGender(g);
    setName(randomizeField('name', g) as string);
    setAvatarEmoji(randomizeField('avatarEmoji') as string);
    setAge(String(randomizeField('age')));
    setOccupation(randomizeField('occupation') as string);
    setLocation(randomizeField('location') as string);
    setPersonality(randomizeArrayField('personality').join('、'));
    setHobbies(randomizeArrayField('hobbies').join('、'));
  };

  const inputStyle = [styles.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]}>
      <TouchableOpacity
        style={[styles.randomAllButton, { backgroundColor: t.brandLight }]}
        onPress={handleRandomizeAll}
      >
        <Text style={[styles.randomAllText, { color: t.brand }]}>🎲 全てランダム</Text>
      </TouchableOpacity>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>名前</Text>
          <DiceButton onPress={() => setName(randomizeField('name', gender) as string)} />
        </View>
        <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="名前" placeholderTextColor={t.textSecondary} />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>アバター</Text>
          <DiceButton onPress={() => setAvatarEmoji(randomizeField('avatarEmoji') as string)} />
        </View>
        <TextInput style={inputStyle} value={avatarEmoji} onChangeText={setAvatarEmoji} />
      </View>

      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: t.text }]}>年齢</Text>
            <DiceButton onPress={() => setAge(String(randomizeField('age')))} />
          </View>
          <TextInput style={inputStyle} value={age} onChangeText={setAge} keyboardType="numeric" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: t.text }]}>性別</Text>
          </View>
          <View style={styles.genderRow}>
            {['女性', '男性'].map((g, i) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genderButton,
                  { borderColor: t.border },
                  i === 0 && styles.genderLeft,
                  i === 1 && styles.genderRight,
                  gender === g && { backgroundColor: t.brand, borderColor: t.brand },
                ]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderText, { color: t.text }, gender === g && { color: '#FFF' }]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>職業</Text>
          <DiceButton onPress={() => setOccupation(randomizeField('occupation') as string)} />
        </View>
        <TextInput style={inputStyle} value={occupation} onChangeText={setOccupation} placeholder="職業" placeholderTextColor={t.textSecondary} />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>性格（「、」区切り）</Text>
          <DiceButton onPress={() => setPersonality(randomizeArrayField('personality').join('、'))} />
        </View>
        <TextInput style={inputStyle} value={personality} onChangeText={setPersonality} placeholder="明るい、親切" placeholderTextColor={t.textSecondary} />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>趣味（「、」区切り）</Text>
          <DiceButton onPress={() => setHobbies(randomizeArrayField('hobbies').join('、'))} />
        </View>
        <TextInput style={inputStyle} value={hobbies} onChangeText={setHobbies} placeholder="料理、映画" placeholderTextColor={t.textSecondary} />
      </View>

      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>住所</Text>
          <DiceButton onPress={() => setLocation(randomizeField('location') as string)} />
        </View>
        <TextInput style={inputStyle} value={location} onChangeText={setLocation} placeholder="東京・渋谷" placeholderTextColor={t.textSecondary} />
      </View>

      <View style={styles.field}>
        <Text style={[styles.label, { color: t.text }]}>自己紹介</Text>
        <TextInput
          style={[...inputStyle, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="自己紹介文"
          placeholderTextColor={t.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.cancelButton, { borderColor: t.border }]} onPress={onCancel}>
          <Text style={[styles.cancelText, { color: t.text }]}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: t.brand, opacity: isLoading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitText}>{isLoading ? '保存中...' : (submitLabel || '作成する')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  randomAllButton: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  randomAllText: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: fontSize.body,
    borderWidth: 1,
  },
  textArea: {
    height: undefined,
    minHeight: 100,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  genderRow: {
    flexDirection: 'row',
  },
  genderButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  genderLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderRightWidth: 0,
  },
  genderRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  genderText: {
    fontSize: fontSize.caption,
    fontWeight: '500',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelText: {
    fontSize: fontSize.body,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: fontSize.body,
    fontWeight: '600',
  },
});
