import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../stores/authStore';
import { useTheme } from '../../../hooks/useTheme';
import { uploadAvatar } from '../../../services/api';
import ImageCropper from '../../../components/common/ImageCropper';

function safeDisplayName(username: string | undefined, email: string | undefined): string {
  if (!username || username.trim().length === 0) return email?.split('@')[0] || '';
  const hasGarbled = username.includes('\uFFFD') || username.includes('\uFFFE') || username.includes('\uFFFF');
  return hasGarbled ? (email?.split('@')[0] || '') : username;
}

const AVATAR_OPTIONS = [
  '🐱', '🐶', '🐼', '🦊', '🐸', '🐮',
  '🦁', '🐯', '🐺', '🦝', '🐷', '🐨',
  '🦄', '🐲', '🌸', '🌺', '⭐', '🌙',
  '🎵', '🎮', '📚', '🍣', '🎌', '🗾',
];

export default function EditProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const [username, setUsername] = useState(safeDisplayName(user?.username, user?.email));
  const [selectedEmoji, setSelectedEmoji] = useState(user?.avatarEmoji || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cropperImage, setCropperImage] = useState<string | null>(null);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要', 'フォトライブラリへのアクセスを許可してください');
      return;
    }
    const isWeb = Platform.OS === 'web';
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: !isWeb, // Native 用系统裁剪，Web 用自定义裁剪器
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (isWeb) {
      // Web: 弹出圆形裁剪器
      setCropperImage(asset.uri);
    } else {
      // Native: 系统已裁剪，直接上传
      await doUpload(asset.uri, asset.mimeType || 'image/jpeg');
    }
  };

  const doUpload = async (uri: string, mimeType: string) => {
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(uri, mimeType, 'user', user!.id);
      setAvatarUrl(url);
      setSelectedEmoji('');
    } catch (err) {
      Alert.alert('アップロード失敗', (err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCropConfirm = (croppedUri: string) => {
    setCropperImage(null);
    doUpload(croppedUri, 'image/jpeg');
  };

  const handleSave = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('', 'ユーザー名を入力してください');
      return;
    }
    setSaving(true);
    try {
      await updateUser({ username: trimmed, avatarEmoji: selectedEmoji, avatarUrl: avatarUrl || undefined });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const hasImage = !!avatarUrl;
  const currentEmoji = selectedEmoji || user?.username?.charAt(0) || '?';
  const hasEmoji = !!selectedEmoji && !hasImage;

  return (
    <View style={[styles.container, { backgroundColor: t.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: t.border, backgroundColor: t.surface }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} activeOpacity={0.6}>
          <Text style={[styles.headerBackText, { color: t.brand }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text }]}>プロフィール編集</Text>
        <TouchableOpacity
          style={styles.headerSave}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={[styles.headerSaveText, { color: saving ? t.textSecondary : t.brand }]}>
            {saving ? '保存中…' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Current avatar preview */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[styles.avatarPreview, { backgroundColor: t.brandLight, borderColor: t.brand }]}
            onPress={handlePickImage}
            activeOpacity={0.8}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size="large" color={t.brand} />
            ) : hasImage ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : hasEmoji ? (
              <Text style={styles.avatarEmoji}>{currentEmoji}</Text>
            ) : (
              <Text style={[styles.avatarLetter, { color: t.brand }]}>{user?.username?.charAt(0)?.toUpperCase() || '?'}</Text>
            )}
            {/* Camera overlay */}
            {!uploadingAvatar && (
              <View style={[styles.cameraOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
                <Ionicons name="camera" size={22} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          {(hasImage || hasEmoji) && (
            <TouchableOpacity onPress={() => { setAvatarUrl(''); setSelectedEmoji(''); }} activeOpacity={0.7}>
              <Text style={[styles.clearEmoji, { color: t.textSecondary }]}>デフォルトに戻す</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.uploadHint, { color: t.textSecondary }]}>タップして写真を変更</Text>
        </View>

        {/* Emoji grid */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>アバターを選択</Text>
          <View style={styles.emojiGrid}>
            {AVATAR_OPTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiCell,
                  selectedEmoji === emoji && { backgroundColor: t.brandLight, borderColor: t.brand, borderWidth: 2 },
                ]}
                onPress={() => setSelectedEmoji(emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiCellText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Username */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>ユーザー名</Text>
          <TextInput
            style={[
              styles.input,
              {
                color: t.text,
                backgroundColor: t.inputBg,
                borderColor: t.border,
                ...Platform.select({ web: { outlineStyle: 'none' } as any }),
              },
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="ユーザー名を入力"
            placeholderTextColor={t.textSecondary}
            maxLength={30}
            autoCorrect={false}
          />
          <Text style={[styles.inputHint, { color: t.textSecondary }]}>{username.length} / 30</Text>
        </View>

        {/* Email (read-only) */}
        <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.sectionLabel, { color: t.textSecondary }]}>メールアドレス</Text>
          <Text style={[styles.readonlyValue, { color: t.text }]}>{user?.email || ''}</Text>
          <Text style={[styles.inputHint, { color: t.textSecondary }]}>変更不可</Text>
        </View>
      </ScrollView>

      {/* 圆形裁剪器（Web 端） */}
      {cropperImage && (
        <ImageCropper
          imageUri={cropperImage}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropperImage(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  headerBack: { width: 68, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 28, fontWeight: '300', lineHeight: 34 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', textAlign: 'center' },
  headerSave: { width: 68, alignItems: 'center', justifyContent: 'center' },
  headerSaveText: { fontSize: 16, fontWeight: '600' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatarPreview: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88, borderRadius: 44 },
  avatarEmoji: { fontSize: 44 },
  avatarLetter: { fontSize: 36, fontWeight: '700' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearEmoji: { fontSize: 13 },
  uploadHint: { fontSize: 12, marginTop: 2 },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiCell: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiCellText: { fontSize: 26 },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputHint: { fontSize: 12, textAlign: 'right' },
  readonlyValue: { fontSize: 16, paddingVertical: 4 },
});
