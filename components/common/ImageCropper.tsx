/**
 * ImageCropper — 圆形头像裁剪器（主要用于 Web 端）
 * 支持拖拽平移 + 滚轮缩放，确认后输出裁剪后的 data URL
 */
import { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useTheme } from '../../hooks/useTheme';

const CROP_SIZE = 260;
const OUTPUT_SIZE = 512; // 输出分辨率

interface Props {
  imageUri: string;
  onConfirm: (croppedUri: string) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageUri, onConfirm, onCancel }: Props) {
  const t = useTheme();
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);

  // 获取原始图片尺寸
  useState(() => {
    Image.getSize(imageUri, (w, h) => {
      setImgSize({ w, h });
      // 初始缩放：让图片短边填满裁剪框
      const fitScale = CROP_SIZE / Math.min(w, h);
      setScale(fitScale);
    }, () => {});
  });

  const handleWheel = useCallback((e: any) => {
    e.preventDefault();
    setScale((prev) => Math.max(0.2, Math.min(5, prev - e.deltaY * 0.001)));
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX || e.nativeEvent?.pageX, y: e.clientY || e.nativeEvent?.pageY };
  }, []);

  const handlePointerMove = useCallback((e: any) => {
    if (!dragging.current) return;
    const x = e.clientX || e.nativeEvent?.pageX;
    const y = e.clientY || e.nativeEvent?.pageY;
    setOffset((prev) => ({
      x: prev.x + (x - lastPos.current.x),
      y: prev.y + (y - lastPos.current.y),
    }));
    lastPos.current = { x, y };
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleConfirm = useCallback(async () => {
    if (Platform.OS !== 'web') {
      // Native 端直接返回原图（系统裁剪器已处理）
      onConfirm(imageUri);
      return;
    }

    // Web 端：用 canvas 裁剪
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

    // 计算裁剪区域：圆形遮罩中心对应图片的哪个区域
    const displayW = imgSize.w * scale;
    const displayH = imgSize.h * scale;
    // 图片在裁剪框中的位置（裁剪框中心为原点）
    const imgCenterX = offset.x;
    const imgCenterY = offset.y;
    // 裁剪框左上角在图片坐标中的位置
    const cropX = (-imgCenterX + CROP_SIZE / 2 - displayW / 2) * (imgSize.w / displayW) * -1;
    const cropY = (-imgCenterY + CROP_SIZE / 2 - displayH / 2) * (imgSize.h / displayH) * -1;

    // 圆形裁剪
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 绘制图片
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
  }, [imageUri, imgSize, scale, offset, onConfirm]);

  const displayW = imgSize.w * scale;
  const displayH = imgSize.h * scale;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
      <Text style={styles.title}>写真を調整</Text>

      {/* Crop area */}
      <View
        style={styles.cropContainer}
        {...(Platform.OS === 'web' ? {
          onPointerDown: handlePointerDown,
          onPointerMove: handlePointerMove,
          onPointerUp: handlePointerUp,
          onWheel: handleWheel,
        } as any : {
          onTouchStart: handlePointerDown,
          onTouchMove: handlePointerMove,
          onTouchEnd: handlePointerUp,
        })}
      >
        {/* Image layer */}
        <Image
          source={{ uri: imageUri }}
          style={{
            position: 'absolute',
            width: displayW,
            height: displayH,
            left: (CROP_SIZE - displayW) / 2 + offset.x,
            top: (CROP_SIZE - displayH) / 2 + offset.y,
          }}
          resizeMode="cover"
        />

        {/* Circular mask overlay — four dark corners around circle */}
        <View style={styles.maskOverlay} pointerEvents="none">
          <View style={[styles.maskRing, { borderColor: 'rgba(0,0,0,0.6)' }]} />
        </View>

        {/* Circle border */}
        <View style={styles.circleBorder} pointerEvents="none" />
      </View>

      <Text style={styles.hint}>ドラッグで移動・スクロールで拡大縮小</Text>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: t.brand }]} onPress={handleConfirm} activeOpacity={0.7}>
          <Text style={styles.confirmText}>確定</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cropContainer: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    ...(Platform.OS === 'web' ? { cursor: 'grab', userSelect: 'none' } as any : {}),
  },
  maskOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskRing: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: CROP_SIZE / 2,
    borderWidth: CROP_SIZE, // trick: huge border = everything outside circle is dark
  },
  circleBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CROP_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
