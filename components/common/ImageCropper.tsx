/**
 * ImageCropper — 圆形头像裁剪器
 * Modal 全屏覆盖，方形拖拽区 + 圆形视觉遮罩
 * 支持拖拽平移 + 滚轮/双指缩放
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

const OUTPUT_SIZE = 512;

interface Props {
  imageUri: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageUri, onConfirm, onCancel }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const CROP_SIZE = Math.min(screenW - 48, 300);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // 获取图片原始尺寸并计算初始缩放
  useEffect(() => {
    Image.getSize(imageUri, (w, h) => {
      setImgSize({ w, h });
      const fitScale = CROP_SIZE / Math.min(w, h);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
    }, () => {});
  }, [imageUri, CROP_SIZE]);

  const handleWheel = useCallback((e: any) => {
    e.preventDefault();
    setScale((prev) => Math.max(0.1, Math.min(8, prev * (1 - e.deltaY * 0.002))));
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    e.preventDefault?.();
    dragging.current = true;
    const x = e.clientX ?? e.nativeEvent?.pageX ?? 0;
    const y = e.clientY ?? e.nativeEvent?.pageY ?? 0;
    lastPos.current = { x, y };
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (!dragging.current) return;
    e.preventDefault?.();
    const x = e.clientX ?? e.nativeEvent?.pageX ?? 0;
    const y = e.clientY ?? e.nativeEvent?.pageY ?? 0;
    setOffset((prev) => ({
      x: prev.x + (x - lastPos.current.x),
      y: prev.y + (y - lastPos.current.y),
    }));
    lastPos.current = { x, y };
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // 双指缩放（移动端）
  const lastDist = useRef(0);
  const handleTouchStart = useCallback((e: any) => {
    const touches = e.nativeEvent?.touches || e.touches;
    if (touches?.length === 2) {
      const dx = touches[1].pageX - touches[0].pageX;
      const dy = touches[1].pageY - touches[0].pageY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
    } else if (touches?.length === 1) {
      dragging.current = true;
      lastPos.current = { x: touches[0].pageX, y: touches[0].pageY };
    }
  }, []);

  const handleTouchMove = useCallback((e: any) => {
    const touches = e.nativeEvent?.touches || e.touches;
    if (touches?.length === 2) {
      const dx = touches[1].pageX - touches[0].pageX;
      const dy = touches[1].pageY - touches[0].pageY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastDist.current > 0) {
        const ratio = dist / lastDist.current;
        setScale((prev) => Math.max(0.1, Math.min(8, prev * ratio)));
      }
      lastDist.current = dist;
    } else if (touches?.length === 1 && dragging.current) {
      const x = touches[0].pageX;
      const y = touches[0].pageY;
      setOffset((prev) => ({
        x: prev.x + (x - lastPos.current.x),
        y: prev.y + (y - lastPos.current.y),
      }));
      lastPos.current = { x, y };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    dragging.current = false;
    lastDist.current = 0;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (Platform.OS !== 'web') {
      onConfirm(imageUri);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;

    const img = new (window as any).Image() as HTMLImageElement;
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.src = imageUri;
    });

    const displayW = imgSize.w * scale;
    const displayH = imgSize.h * scale;

    // 圆形裁剪
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const drawScale = OUTPUT_SIZE / CROP_SIZE;
    ctx.drawImage(
      img,
      0, 0, img.naturalWidth, img.naturalHeight,
      (offset.x - (displayW - CROP_SIZE) / 2) * drawScale,
      (offset.y - (displayH - CROP_SIZE) / 2) * drawScale,
      displayW * drawScale,
      displayH * drawScale,
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onConfirm(dataUrl);
  }, [imageUri, imgSize, scale, offset, CROP_SIZE, onConfirm]);

  const displayW = imgSize.w * scale;
  const displayH = imgSize.h * scale;

  // 四个暗角遮罩的尺寸（方形区域减去圆形）
  const maskThickness = 1000; // 足够大覆盖屏幕

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.fullscreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* 标题 */}
        <Text style={styles.title}>写真を調整</Text>

        {/* 拖拽操作区域（大方块，触摸友好） */}
        <View
          style={[styles.dragArea, { width: CROP_SIZE + 40, height: CROP_SIZE + 40 }]}
          {...(Platform.OS === 'web' ? {
            onPointerDown: handlePointerDown,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerLeave: handlePointerUp,
            onWheel: handleWheel,
          } as any : {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd,
          })}
        >
          {/* 图片层 */}
          <Image
            source={{ uri: imageUri }}
            style={{
              position: 'absolute',
              width: displayW,
              height: displayH,
              left: (CROP_SIZE + 40 - displayW) / 2 + offset.x,
              top: (CROP_SIZE + 40 - displayH) / 2 + offset.y,
            }}
            resizeMode="cover"
          />

          {/* 圆形遮罩：四个圆角矩形暗边 */}
          <View style={[styles.maskContainer, { width: CROP_SIZE + 40, height: CROP_SIZE + 40 }]} pointerEvents="none">
            {/* 上 */}
            <View style={[styles.maskPiece, { top: 0, left: 0, right: 0, height: 20, backgroundColor: 'rgba(0,0,0,0.65)' }]} />
            {/* 下 */}
            <View style={[styles.maskPiece, { bottom: 0, left: 0, right: 0, height: 20, backgroundColor: 'rgba(0,0,0,0.65)' }]} />
            {/* 左 */}
            <View style={[styles.maskPiece, { top: 0, left: 0, bottom: 0, width: 20, backgroundColor: 'rgba(0,0,0,0.65)' }]} />
            {/* 右 */}
            <View style={[styles.maskPiece, { top: 0, right: 0, bottom: 0, width: 20, backgroundColor: 'rgba(0,0,0,0.65)' }]} />
          </View>

          {/* 圆形边框指示器 */}
          <View
            style={[styles.circleGuide, {
              width: CROP_SIZE,
              height: CROP_SIZE,
              borderRadius: CROP_SIZE / 2,
              top: 20,
              left: 20,
            }]}
            pointerEvents="none"
          />
        </View>

        <Text style={styles.hint}>
          {Platform.OS === 'web' ? 'ドラッグで移動・スクロールで拡大縮小' : 'ドラッグで移動・ピンチで拡大縮小'}
        </Text>

        {/* 缩放指示 */}
        <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>

        {/* 按钮 */}
        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: t.brand }]} onPress={handleConfirm} activeOpacity={0.7}>
            <Text style={styles.confirmText}>確定</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dragArea: {
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? { cursor: 'grab', userSelect: 'none', touchAction: 'none' } as any : {}),
  },
  maskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  maskPiece: {
    position: 'absolute',
  },
  circleGuide: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderStyle: 'dashed',
  },
  hint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
  scaleText: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmBtn: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
