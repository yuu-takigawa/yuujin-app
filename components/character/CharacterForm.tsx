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
import { Audio } from 'expo-av';
import DiceButton from './DiceButton';
import ImageCropper from '../common/ImageCropper';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { spacing, fontSize } from '../../constants/theme';
import { uploadAvatar, streamGenerateBio } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { VOICES, getDefaultVoice } from '../../constants/voices';
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
  voice: string;
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
  const { t: i } = useLocale();
  const user = useAuthStore((s) => s.user);
  const { width: screenW } = useWindowDimensions();
  const AVATAR_SIZE = Math.floor((screenW - spacing.md * 2 - 8 * 4) / 5); // 5列

  const [name, setName] = useState(initialData?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData?.avatarUrl || '');
  const [age, setAge] = useState(String(initialData?.age || 25));
  const [gender, setGender] = useState(initialData?.gender || '\u5973\u6027');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [personality, setPersonality] = useState(initialData?.personality?.join('\u3001') || '');
  const [hobbies, setHobbies] = useState(initialData?.hobbies?.join('\u3001') || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [voice, setVoice] = useState(initialData?.voice || getDefaultVoice(initialData?.gender));
  const [previewSound, setPreviewSound] = useState<Audio.Sound | null>(null);

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [generatingBio, setGeneratingBio] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);
  const bioCancel = useRef<(() => void) | null>(null);
  const avatarScrollRef = useRef<ScrollView>(null);

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
      Alert.alert(i('character.inputRequired'), i('character.inputRequiredMsg'));
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
      personality: personality.split('\u3001').filter(Boolean),
      hobbies: hobbies.split('\u3001').filter(Boolean),
      location: location.trim(),
      bio: bio.trim(),
      voice,
    });
  };

  const handleRandomizeAll = () => {
    // Cancel any in-flight bio generation
    if (generatingBio) {
      bioCancel.current?.();
      bioCancel.current = null;
      setGeneratingBio(false);
    }

    const g = Math.random() > 0.5 ? '\u5973\u6027' : '\u7537\u6027';
    const newName = randomFullName(g);
    const newAge = String(randomAge());
    const newOccupation = pickRandom(OCCUPATIONS);
    const newLocation = pickRandom(LOCATIONS);
    const newPersonality = pickRandomN(PERSONALITIES, 3).join('\u3001');
    const newHobbies = pickRandomN(HOBBIES, 3).join('\u3001');
    const newAvatar = pickRandom(PRESET_AVATARS);

    const genderVoices = VOICES.filter(v => v.gender === (g === '\u5973\u6027' ? 'female' : 'male'));
    const randomVoice = genderVoices[Math.floor(Math.random() * genderVoices.length)];

    setGender(g);
    setName(newName);
    setAge(newAge);
    setOccupation(newOccupation);
    setLocation(newLocation);
    setPersonality(newPersonality);
    setHobbies(newHobbies);
    setAvatarUrl(newAvatar);
    setVoice(randomVoice?.id || getDefaultVoice(g));
    setErrors({});

    // Scroll avatar grid to show selected avatar
    const avatarIndex = PRESET_AVATARS.indexOf(newAvatar);
    if (avatarIndex >= 0 && avatarScrollRef.current) {
      // +1 for the camera upload button at position 0
      const row = Math.floor((avatarIndex + 1) / 5);
      const scrollTarget = Math.max(0, row * (AVATAR_SIZE + 8) - (AVATAR_SIZE + 8));
      setTimeout(() => avatarScrollRef.current?.scrollTo({ y: scrollTarget, animated: true }), 100);
    }

    // Auto-generate bio with a slight delay so state settles
    setBio('');
    setGeneratingBio(true);
    let accumulated = '';
    // Use setTimeout to ensure the state values above are committed
    setTimeout(() => {
      bioCancel.current = streamGenerateBio(
        {
          name: newName.trim(),
          age: parseInt(newAge) || 25,
          gender: g,
          occupation: newOccupation.trim(),
          personality: newPersonality.split('\u3001').filter(Boolean),
          hobbies: newHobbies.split('\u3001').filter(Boolean),
          location: newLocation.trim(),
        },
        (delta) => {
          accumulated += delta;
          setBio(accumulated);
        },
        () => setGeneratingBio(false),
        () => setGeneratingBio(false),
      );
    }, 50);
  };

  const handleGenerateBio = () => {
    const missing: string[] = [];
    const errs: Record<string, boolean> = {};
    if (!avatarUrl) { missing.push(i('character.avatar')); errs.avatar = true; }
    if (!name.trim()) { missing.push(i('character.name')); errs.name = true; }
    if (!occupation.trim()) { missing.push(i('character.occupation')); errs.occupation = true; }
    if (!personality.trim()) { missing.push(i('character.personality')); errs.personality = true; }
    if (!hobbies.trim()) { missing.push(i('character.hobbies')); errs.hobbies = true; }
    if (!location.trim()) { missing.push(i('character.location')); errs.location = true; }
    if (missing.length > 0) {
      setErrors((prev) => ({ ...prev, ...errs }));
      Alert.alert(i('character.bioMissingTitle'), i('character.bioMissingMsg').replace('{fields}', missing.join('\u3001')));
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
        personality: personality.split('\u3001').filter(Boolean),
        hobbies: hobbies.split('\u3001').filter(Boolean),
        location: location.trim(),
      },
      (delta) => {
        accumulated += delta;
        setBio(accumulated);
      },
      () => setGeneratingBio(false),
      (err) => {
        setGeneratingBio(false);
        Alert.alert(i('character.bioGenerateFailed'), err);
      },
    );
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(i('character.permissionRequired'), i('character.photoPermission'));
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
      Alert.alert(i('character.uploadFailed'), (err as Error).message);
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
        <Text style={[styles.randomAllText, { color: t.brand }]}>{'\ud83c\udfb2'} {i('character.randomizeAll')}</Text>
      </TouchableOpacity>

      {/* アバター選択 (5列, 3行可見スクロール) */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: errors.avatar ? t.error : t.text, marginBottom: 8 }]}>{i('character.avatar')} <Text style={{ color: t.error }}>*</Text> {errors.avatar ? <Text style={{ color: t.error, fontSize: 12, fontWeight: '400' }}>{i('character.avatarRequired')}</Text> : null}</Text>
        <View style={{ height: (AVATAR_SIZE + 8) * 3, overflow: 'hidden', position: 'relative' }}>
        <ScrollView
          ref={avatarScrollRef}
          style={{ height: (AVATAR_SIZE + 8) * 3 }}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
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
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 20, background: `linear-gradient(transparent, ${t.background})` } as any} pointerEvents="none" />
        </View>
      </View>

      {/* 名前 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('character.name')} <Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setName(randomFullName(gender)); setErrors((p) => ({ ...p, name: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('name')]} value={name} onChangeText={(v) => { setName(v); setErrors((p) => ({ ...p, name: false })); }} placeholder={i('character.name')} placeholderTextColor={t.textSecondary} />
      </View>

      {/* 年齢 + 性別 */}
      <View style={styles.row}>
        <View style={[styles.field, { flex: 1 }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: t.text }]}>{i('character.age')}</Text>
            <DiceButton onPress={() => setAge(String(randomAge()))} />
          </View>
          <TextInput style={inputStyle} value={age} onChangeText={setAge} keyboardType="numeric" />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <View style={styles.fieldHeader}>
            <Text style={[styles.label, { color: t.text }]}>{i('character.gender')}</Text>
            <View style={{ width: 36 }} />
          </View>
          <View style={styles.genderRow}>
            {['\u5973\u6027', '\u7537\u6027'].map((g, idx) => (
              <TouchableOpacity
                key={g}
                style={[styles.genderButton, { borderColor: t.border }, idx === 0 && styles.genderLeft, idx === 1 && styles.genderRight, gender === g && { backgroundColor: t.brand, borderColor: t.brand }]}
                onPress={() => { setGender(g); setVoice(getDefaultVoice(g)); }}
              >
                <Text style={[styles.genderText, { color: t.text }, gender === g && { color: '#FFF' }]}>{g === '\u5973\u6027' ? i('character.female') : i('character.male')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* ボイス */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('voice.label')}</Text>
          <DiceButton onPress={() => {
            const genderVoices = VOICES.filter(v => v.gender === (gender === '\u5973\u6027' ? 'female' : 'male'));
            const rv = genderVoices[Math.floor(Math.random() * genderVoices.length)];
            if (rv) setVoice(rv.id);
          }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
          {VOICES.filter(v => v.gender === (gender === '\u5973\u6027' ? 'female' : 'male')).map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[
                { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
                { borderColor: t.border },
                voice === v.id && { backgroundColor: t.brand, borderColor: t.brand },
              ]}
              onPress={() => setVoice(v.id)}
            >
              <Text style={[{ fontSize: 13, fontWeight: '500' }, { color: t.text }, voice === v.id && { color: '#FFF' }]}>{v.id}</Text>
              <TouchableOpacity
                hitSlop={8}
                onPress={async (e) => {
                  e.stopPropagation?.();
                  if (previewSound) { await previewSound.stopAsync(); await previewSound.unloadAsync(); }
                  const { sound } = await Audio.Sound.createAsync({ uri: v.demoUrl });
                  setPreviewSound(sound);
                  await sound.playAsync();
                  sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) { sound.unloadAsync(); setPreviewSound(null); } });
                }}
              >
                <Ionicons name="play-circle-outline" size={18} color={voice === v.id ? '#FFF' : t.brand} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[{ fontSize: 11, marginTop: 4 }, { color: t.textSecondary }]}>{i(`voice.${voice}`) || voice}</Text>
      </View>

      {/* 職業 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('character.occupation')} <Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setOccupation(pickRandom(OCCUPATIONS)); setErrors((p) => ({ ...p, occupation: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('occupation')]} value={occupation} onChangeText={(v) => { setOccupation(v); setErrors((p) => ({ ...p, occupation: false })); }} placeholder={i('character.occupation')} placeholderTextColor={t.textSecondary} />
      </View>

      {/* 性格 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('character.personalitySep')}<Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setPersonality(pickRandomN(PERSONALITIES, 3).join('\u3001')); setErrors((p) => ({ ...p, personality: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('personality')]} value={personality} onChangeText={(v) => { setPersonality(v); setErrors((p) => ({ ...p, personality: false })); }} placeholder={i('character.personality')} placeholderTextColor={t.textSecondary} />
      </View>

      {/* 趣味 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('character.hobbiesSep')}<Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setHobbies(pickRandomN(HOBBIES, 3).join('\u3001')); setErrors((p) => ({ ...p, hobbies: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('hobbies')]} value={hobbies} onChangeText={(v) => { setHobbies(v); setErrors((p) => ({ ...p, hobbies: false })); }} placeholder={i('character.hobbies')} placeholderTextColor={t.textSecondary} />
      </View>

      {/* 住所 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('character.location')} <Text style={{ color: t.error }}>*</Text></Text>
          <DiceButton onPress={() => { setLocation(pickRandom(LOCATIONS)); setErrors((p) => ({ ...p, location: false })); }} />
        </View>
        <TextInput style={[...inputStyle, errBorder('location')]} value={location} onChangeText={(v) => { setLocation(v); setErrors((p) => ({ ...p, location: false })); }} placeholder={i('character.location')} placeholderTextColor={t.textSecondary} />
      </View>

      {/* 自己紹介 */}
      <View style={styles.field}>
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: t.text }]}>{i('character.bioLabel')} <Text style={{ color: t.error }}>*</Text></Text>
          <TouchableOpacity onPress={handleGenerateBio} disabled={generatingBio} style={styles.aiButton}>
            {generatingBio ? (
              <ActivityIndicator size={14} color={t.brand} />
            ) : (
              <Text style={{ color: t.brand, fontSize: 13, fontWeight: '600' }}>{'\ud83c\udfb2'} {i('character.generateBio')}</Text>
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          style={[...inputStyle, styles.textArea, errBorder('bio')]}
          value={bio}
          onChangeText={(v) => { setBio(v); setErrors((p) => ({ ...p, bio: false })); }}
          placeholder={i('character.bioPlaceholder')}
          placeholderTextColor={t.textSecondary}
          multiline
          numberOfLines={4}
        />
      </View>

      {/* ボタン */}
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.cancelButton, { backgroundColor: t.surface, borderColor: t.border }]} onPress={onCancel}>
          <Text style={[styles.cancelText, { color: t.textSecondary }]}>{i('action.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: t.brand, opacity: isLoading ? 0.6 : 1 }]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitText}>{isLoading ? i('character.saving') : (submitLabel || i('character.create'))}</Text>
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
