import { Tabs } from 'expo-router';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
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
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetch = () => getUnreadCount().then(setUnreadCount).catch(() => {});
    fetch();
    const interval = setInterval(fetch, 60000); // 每分钟轮询一次
    registerForPushNotifications(); // 注册推送令牌（失败时静默）
    return () => clearInterval(interval);
  }, []);

  const tabBarHeight = 52 + insets.bottom;

  return (
    <Tabs
      safeAreaInsets={{ top: 0, bottom: 0 }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.brand,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
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
          title: 'チャット',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(friends)"
        options={{
          title: '友達',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(news)"
        options={{
          title: 'ニュース',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'newspaper' : 'newspaper-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'マイページ',
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
