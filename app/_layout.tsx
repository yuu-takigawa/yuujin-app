import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  JosefinSans_300Light,
  JosefinSans_400Regular,
} from '@expo-google-fonts/josefin-sans';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_700Bold,
    JosefinSans_300Light,
    JosefinSans_400Regular,
  });

  return (
    <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="conversation/[conversationId]" />
          <Stack.Screen name="add-friend" />
          <Stack.Screen name="character/[characterId]" />
          <Stack.Screen name="create-character" />
          <Stack.Screen name="edit-character" />
          <Stack.Screen name="article/[articleId]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="membership" />
        </Stack>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}
