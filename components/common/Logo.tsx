import { Platform, Image, StyleSheet } from 'react-native';
import { Asset } from 'expo-asset';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoModule = require('../../assets/logo.svg');

interface LogoProps {
  height?: number;
}

export default function Logo({ height = 32 }: LogoProps) {
  const width = height * 5;

  if (Platform.OS === 'web') {
    // On web, require() for assets returns a string path or { uri }
    const uri = typeof logoModule === 'string' ? logoModule : (logoModule?.default || logoModule?.uri || logoModule);
    return (
      <img
        src={String(uri)}
        style={{ width, height, objectFit: 'contain' } as any}
        alt="Yuujin"
      />
    );
  }

  return (
    <Image
      source={logoModule}
      style={[styles.logo, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
