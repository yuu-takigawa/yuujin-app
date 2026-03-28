import { Tabs, useRouter, useSegments } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useLocale } from '../../hooks/useLocale';
import { useEffect, useState } from 'react';
import { getUnreadCount, registerPushToken } from '../../services/api';

async function registerForPushNotifications() {
  if (Platform.OS === 'web') return;
  try {
    const { default: Notifications } = await import('expo-notifications');
    const Constants = (await import('expo-constants')).default;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    // EAS projectId 必须在 app.json extra.eas.projectId 配置
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return; // 未配置 EAS 项目时跳过

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token.data) {
      await registerPushToken(token.data, 'expo');
    }
  } catch {
    // 推送注册失败不影响主功能
  }
}

export default function MainLayout() {
  const t = useTheme();
  const { t: i } = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = () => getUnreadCount().then(setUnreadCount).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 60000); // 每分钟轮询一次
    registerForPushNotifications(); // 注册推送令牌（失败时静默）
    return () => clearInterval(interval);
  }, []);

  const safeBottom = Math.max(insets.bottom, 16);
  const tabBarHeight = 52 + safeBottom;

  return (
    <Tabs
      safeAreaInsets={{ top: 0, bottom: 0 }}
      screenOptions={{
        headerShown: false,
        // @ts-expect-error gestureEnabled 在 expo-router bottom-tabs 中未声明但实际有效
        gestureEnabled: false,
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight,
          paddingBottom: safeBottom,
        },
        tabBarItemStyle: {
          paddingTop: 6,
          paddingBottom: 4,
        },
        tabBarLabel: ({ focused, children }: { focused: boolean; children: string }) => (
          <Text
            style={{
              fontSize: 11,
              color: focused ? t.brand : t.textSecondary,
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="(chat)"
        options={{
          title: i('chat.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            // 已经在 chat tab 但在子页面 → 回到主页
            if (segments[1] === '(chat)' && segments.length > 2) {
              e.preventDefault();
              router.replace('/(main)/(chat)');
            }
          },
        }}
      />
      <Tabs.Screen
        name="(friends)"
        options={{
          title: i('friends.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (segments[1] === '(friends)' && segments.length > 2) {
              e.preventDefault();
              router.replace('/(main)/(friends)');
            }
          },
        }}
      />
      <Tabs.Screen
        name="(news)"
        options={{
          title: i('news.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={24} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (segments[1] === '(news)' && segments.length > 2) {
              e.preventDefault();
              router.replace('/(main)/(news)');
            }
          },
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: i('profile.title'),
          tabBarIcon: ({ color, focused }) => (
            <View>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FF3B30' }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            if (segments[1] === '(profile)' && segments.length > 2) {
              e.preventDefault();
              router.replace('/(main)/(profile)');
            }
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
