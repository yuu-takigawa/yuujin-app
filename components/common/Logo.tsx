import { Image, StyleSheet } from 'react-native';

interface LogoProps {
  height?: number;
}

export default function Logo({ height = 32 }: LogoProps) {
  // SVG logo with transparent background, works in both light and dark mode
  // Width is auto-calculated from aspect ratio (1548:308 ≈ 5:1)
  const width = height * 5;

  return (
    <Image
      source={require('../../assets/logo.svg')}
      style={[styles.logo, { width, height }]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {},
});
