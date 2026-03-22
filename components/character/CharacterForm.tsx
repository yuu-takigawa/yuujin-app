import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DiceButton from './DiceButton';
import ImageCropper from '../common/ImageCropper';
import { useTheme } from '../../hooks/useTheme';
import { spacing, fontSize } from '../../constants/theme';
import { uploadAvatar, streamGenerateBio } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import {
  PRESET_AVATARS,
  OCCUPATIONS,
  PERSONALITIES,
  HOBBIES,
  LOCATIONS,
  pickRandom,
  pickRandomN,
  randomFullName,
  randomAge,
} from '../../constants/characterData';

interface CharacterFormData {
  name: string;
  avatarUrl: string;
  age: number;
  gender: string;
  occupation: string;
  personality: string[];
  hobbies: string[];
  location: string;
  bio: string;
}

interface CharacterFormProps {
  initialData?: Partial<CharacterFormData>;
  onSubmit: (data: CharacterFormData) => void;
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
  const user = useAuthStore((s) => s.user);
  const { width: screenW } = useWindowDimensions();
  const AVATAR_SIZE = Math.floor((screenW - spacing.md * 2 - 8 * 4) / 5); // 5列

  const [name, setName] = useState(initialData?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [age, setAge] = useState(String(initialData?.age || 25));
  const [gender, setGender] = useState(initialData?.gender || '女性');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [personality, setPersonality] = useState(initialData?.personality?.join('、') || '');
  const [hobbies, setHobbies] = useState(initialData?.hobbies?.join('、') || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [bio, setBio] = useState(initialData?.bio || '');

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [generatingBio, setGeneratingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const bioCancel = useRef<(() => void) | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (!name.trim()) errs.name = true;
    if (!avatarUrl) errs.avatar = true;
    if (!occupation.trim()) errs.occupation = true;
    if (!personality.trim()) errs.personality = true;
    if (!hobbies.trim()) errs.hobbies = true;
    if (!location.trim()) errs.location = true;
    if (!bio.trim()) errs.bio = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      Alert.alert('入力不足', '全ての項目を入力してください');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      avatarUrl,
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
    setName(randomFullName(g));
    setAge(String(randomAge()));
    setOccupation(pickRandom(OCCUPATIONS));
    setLocation(pickRandom(LOCATIONS));
    setPersonality(pickRandomN(PERSONALITIES, 3).join('、'));
    setHobbies(pickRandomN(HOBBIES, 3).join('、'));
    setAvatarUrl(pickRandom(PRESET_AVATARS));
    setErrors({});
  };

  const handleGenerateBio = () => {
    const missing: string[] = [];
    const errs: Record<string, boolean> = {};
    if (!avatarUrl) { missing.push('アバター'); errs.avatar = true; }
    if (!name.trim()) { missing.push('名前'); errs.name = true; }
    if (!occupation.trim()) { missing.push('職業'); errs.occupation = true; }
    if (!personality.trim()) { missing.push('性格'); errs.personality = true; }
    if (!hobbies.trim()) { missing.push('趣味'); errs.hobbies = true; }
    if (!location.trim()) { missing.push('住所'); errs.location = true; }
    if (missing.length > 0) {
      setErrors((prev) => ({ ...prev, ...errs }));
      Alert.alert('情報不足', `先に以下を入力してください：\n${missing.join('、')}`);
      return;
    }
    setGeneratingBio(true);
    setBio('');
    setErrors((p) => ({ ...p, bio: false }));

    let accumulated = '';
    bioCancel.current = streamGenerateBio(
      {
        name: name.trim(),
        age: parseInt(age) || 25,
        gender,
        occupation: occupation.trim(),
        personality: personality.split('、').filter(Boolean),
        hobbies: hobbies.split('、').filter(Boolean),
        location: location.trim(),
      },
      (delta) => {
        accumulated += delta;
        setBio(accumulated);
      },
      () => setGeneratingBio(false),
      (err) => {
        setGeneratingBio(false);
        Alert.alert('生成失敗', err);
      },
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要', 'フォトライブラリへのアクセスを許可してください');
      return;
    }
    const isWeb = Platform.OS === 'web';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: !isWeb,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const isGif = mimeType === 'image/gif' || asset.uri?.toLowerCase().endsWith('.gif');
    if (isGif || !isWeb) {
      await doUpload(asset.uri, isGif ? 'image/gif' : mimeType);
    } else {
      setCropperImage(asset.uri);
    }
  };

  const doUpload = async (uri: string, mimeType: string) => {
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(uri, mimeType, 'character', user?.id || '');
      setAvatarUrl(url);
      setErrors((p) => ({ ...p, avatar: false }));
    } catch (err) {
      Alert.alert('アップロード失敗', (err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const isCustomAvatar = avatarUrl && !PRESET_AVATARS.includes(avatarUrl);
  const errBorder = (field: string) => errors[field] ? { borderColor: t.error, borderWidth: 2 } : {};
  const inputStyle = [styles.input, { backgroundColor: t.surface, borderColor: t.border, color: t.text }];

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} keyboardShouldPersistTaps="handled">
      {/* 全てランダム */}
      <TouchableOpacity style={[styles.randomAllButton, { backgroundColor: t.brandLight }]} onPress={handleRandomizeAll}>
        <Text style={[styles.randomAllText, { color: t.brand }]}>🎲 全てランダム</Text>
      </TouchableOpacity>

      {/* アバター選択 (5列, 3行可見スクロール) */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: errors.avatar ? t.error : t.text, marginBottom: 8 }]}>アバター <Text style={{ color: t.error }}>*</Text> {errors.avatar ? <Text style={{ color: t.error, fontSize: 12, fontWeight: '400' }}>選択してください</Text> : null}</Text>
        <ScrollView
          style={{ height: (AVATAR_SIZE + 8) * 3 + 8 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <View style={styles.avatarGrid}>
            {/* 自定义上传放在最前面 */}
            <TouchableOpacity
              style={[styles.avatarCell, {
                width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2,
                backgroundColor: isCustomAvatar ? undefined : t.surface,
                borderColor: isCustomAvatar ? t.brand : t.border,
                borderWidth: isCustomAvatar ? 2 : 1,
                borderStyle: isCustomAvatar ? 'solid' : 'dashed',
              }]}
              onPress={handlePickImage}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color={t.brand} />
              ) : isCustomAvatar ? (
                <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="camera-outline" size={AVATAR_SIZE * 0.4} color={t.textSecondary} />
              )}
            </TouchableOpacity>
            {PRESET_AVATARS.map((url) => (
              <TouchableOpacity
                key={url}
                style={[styles.avatarCell, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }, avatarUrl === url && { borderColor: t.brand, borderWidth: 2 }]}
                onPress={() => { setAvatarUrl(url); setErrors((p) => ({ ...p, avatar: false })); }}
              >
                <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 名前 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>名前 <Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setName(randomFullName(gender)); setErrors((p) => ({ ...p, name: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('name')]} value={name} onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: false })); }} placeholder="名前" placeholderTextColor={t.textSecondary} />
      </View>

      {/* 年齢 + 性別 */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: t.text }]}>年齢</Text>
            <DiceButton onPress={() => setAge(String(randomAge()))} />
          </View>
          <TextInput style={inputStyle} value={age} onChangeText={setAge} keyboardType="numeric" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: t.text }]}>性別</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.genderRow}>
            {['女性', '男性'].map((g, i) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderButton, { borderColor: t.border }, i === 0 && styles.genderLeft, i === 1 && styles.genderRight, gender === g && { backgroundColor: t.brand, borderColor: t.brand }]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderText, { color: t.text }, gender === g && { color: '#FFF' }]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* 職業 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>職業 <Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setOccupation(pickRandom(OCCUPATIONS)); setErrors((p) => ({ ...p, occupation: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('occupation')]} value={occupation} onChangeText={(v) => { setOccupation(v); setErrors((p) => ({ ...p, occupation: false })); }} placeholder="バリスタ" placeholderTextColor={t.textSecondary} />
      </View>

      {/* 性格 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>性格（「、」区切り）<Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setPersonality(pickRandomN(PERSONALITIES, 3).join('、')); setErrors((p) => ({ ...p, personality: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('personality')]} value={personality} onChangeText={(v) => { setPersonality(v); setErrors((p) => ({ ...p, personality: false })); }} placeholder="明るい、親切" placeholderTextColor={t.textSecondary} />
      </View>

      {/* 趣味 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>趣味（「、」区切り）<Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setHobbies(pickRandomN(HOBBIES, 3).join('、')); setErrors((p) => ({ ...p, hobbies: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('hobbies')]} value={hobbies} onChangeText={(v) => { setHobbies(v); setErrors((p) => ({ ...p, hobbies: false })); }} placeholder="料理、映画" placeholderTextColor={t.textSecondary} />
      </View>

      {/* 住所 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>住所 <Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setLocation(pickRandom(LOCATIONS)); setErrors((p) => ({ ...p, location: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('location')]} value={location} onChangeText={(v) => { setLocation(v); setErrors((p) => ({ ...p, location: false })); }} placeholder="東京都・渋谷区" placeholderTextColor={t.textSecondary} />
      </View>

      {/* 自己紹介 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>自己紹介 <Text style={{ color: t.error }}>*</Text></Text>
          <TouchableOpacity onPress={handleGenerateBio} disabled={generatingBio} style={styles.aiButton}>
            {generatingBio ? (
              <ActivityIndicator size={14} color={t.brand} />
            ) : (
              <Text style={{ color: t.brand, fontSize: 13, fontWeight: '600' }}>🎲 AI生成</Text>
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          style={[...inputStyle, styles.textArea, errBorder('bio')]}
          value={bio}
          onChangeText={(v) => { setBio(v); setErrors((p) => ({ ...p, bio: false })); }}
          placeholder="自己紹介文（AI生成も可能）"
          placeholderTextColor={t.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* ボタン */}
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: t.surface, borderColor: t.border }]} onPress={onCancel}>
          <Text style={[styles.cancelText, { color: t.textSecondary }]}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: t.brand, opacity: isLoading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitText}>{isLoading ? '保存中...' : (submitLabel || '作成する')}</Text>
        </TouchableOpacity>
      </View>

      {cropperImage && (
        <ImageCropper
          imageUri={cropperImage}
          onConfirm={(uri) => { setCropperImage(null); doUpload(uri, 'image/jpeg'); }}
          onCancel={() => setCropperImage(null)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  randomAllButton: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  randomAllText: { fontSize: fontSize.body, fontWeight: '600' },
  field: { marginBottom: spacing.md },
  fieldHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, marginBottom: spacing.xs },
  label: { fontSize: fontSize.caption, fontWeight: '600' },
  input: { borderRadius: 12, paddingHorizontal: spacing.md, height: 48, fontSize: fontSize.body, borderWidth: 1 },
  textArea: { height: undefined, minHeight: 100, paddingVertical: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md },
  genderRow: { flexDirection: 'row' },
  genderButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  genderLeft: { borderTopLeftRadius: 12, borderBottomLeftRadius: 12, borderRightWidth: 0 },
  genderRight: { borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  genderText: { fontSize: fontSize.caption, fontWeight: '500' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarCell: { overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  aiButton: { height: 32, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl },
  cancelButton: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelText: { fontSize: fontSize.body, fontWeight: '600' },
  submitButton: { flex: 1, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontSize: fontSize.body, fontWeight: '600' },
});
