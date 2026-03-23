/**
 * ImageCropper — 圆形头像裁剪器
 * Modal 全屏 + 直接 DOM 事件监听（解决 RN Web 触摸不响应问题）
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

  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragAreaRef = useRef<View>(null);

  // 拖拽状态
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastDist = useRef(0);
  const lastScale = useRef(1);

  // 获取图片尺寸
  useEffect(() => {
    Image.getSize(imageUri, (w, h) => {
      const fitScale = CROP_SIZE / Math.min(w, h);
      setImgSize({ w, h });
      scaleRef.current = fitScale;
      lastScale.current = fitScale;
      offsetRef.current = { x: 0, y: 0 };
      rerender();
    }, () => {});
  }, [imageUri, CROP_SIZE]);

  // 直接挂载 DOM 事件（Web 端）
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = (dragAreaRef.current as any)?._nativeTag
      ?? (dragAreaRef.current as any);
    // 在 RN Web 中，ref.current 背后是一个 DOM node
    // 通过 findDOMNode 或直接访问
    let el: HTMLElement | null = null;
    try {
      // RN Web 的 View ref 可以直接当 HTMLElement 用
      el = node as unknown as HTMLElement;
      if (!el?.addEventListener) {
        // fallback: 用 querySelector 找
        el = document.querySelector('[data-cropper-area]') as HTMLElement;
      }
    } catch { /* */ }
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      scaleRef.current = Math.max(0.1, Math.min(8, scaleRef.current * (1 - e.deltaY * 0.003)));
      rerender();
    };

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
      el!.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      offsetRef.current = {
        x: offsetRef.current.x + dx,
        y: offsetRef.current.y + dy,
      };
      lastPos.current = { x: e.clientX, y: e.clientY };
      rerender();
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    const getTouchDist = (touches: TouchList) => {
      const dx = touches[1].clientX - touches[0].clientX;
      const dy = touches[1].clientY - touches[0].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    });

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        lastDist.current = getTouchDist(e.touches);
        lastScale.current = scaleRef.current;
        dragging.current = false;
      } else if (e.touches.length === 1) {
        dragging.current = true;
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2 && lastDist.current > 0) {
        const dist = getTouchDist(e.touches);
        const ratio = dist / lastDist.current;
        scaleRef.current = Math.max(0.1, Math.min(8, lastScale.current * ratio));
        rerender();
      } else if (e.touches.length === 1 && dragging.current) {
        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        offsetRef.current = {
          x: offsetRef.current.x + (x - lastPos.current.x),
          y: offsetRef.current.y + (y - lastPos.current.y),
        };
        lastPos.current = { x, y };
        rerender();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastDist.current = 0;
      }
      if (e.touches.length === 0) {
        dragging.current = false;
      } else if (e.touches.length === 1) {
        // 从双指切回单指，重置拖拽起点
        dragging.current = true;
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointerleave', onPointerUp);
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el!.removeEventListener('wheel', onWheel);
      el!.removeEventListener('pointerdown', onPointerDown);
      el!.removeEventListener('pointermove', onPointerMove);
      el!.removeEventListener('pointerup', onPointerUp);
      el!.removeEventListener('pointerleave', onPointerUp);
      el!.removeEventListener('touchstart', onTouchStart);
      el!.removeEventListener('touchmove', onTouchMove);
      el!.removeEventListener('touchend', onTouchEnd);
    };
  }, [imgSize]);

  const handleConfirm = useCallback(async () => {
    if (Platform.OS !== 'web') {
      onConfirm(imageUri);
      return;
    }

    const scale = scaleRef.current;
    const offset = offsetRef.current;

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
  }, [imageUri, imgSize, CROP_SIZE, onConfirm]);

  const scale = scaleRef.current;
  const offset = offsetRef.current;
  const displayW = imgSize.w * scale;
  const displayH = imgSize.h * scale;
  const areaSize = CROP_SIZE + 60;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.fullscreen, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.title}>写真を調整</Text>

        {/* 操作区域 */}
        <View
          ref={dragAreaRef}
          // @ts-ignore
          dataSet={{ cropperArea: true }}
          style={[styles.dragArea, {
            width: areaSize,
            height: areaSize,
          }]}
        >
          {/* 图片 */}
          <View pointerEvents="none">
            <Image
              source={{ uri: imageUri }}
              style={{
                position: 'absolute',
                width: displayW,
                height: displayH,
                left: (areaSize - displayW) / 2 + offset.x,
                top: (areaSize - displayH) / 2 + offset.y,
              }}
              resizeMode="cover"
            />
          </View>

          {/* 暗角遮罩（圆形外的四角） */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* 上边暗条 */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            {/* 下边暗条 */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            {/* 左边暗条 */}
            <View style={{ position: 'absolute', top: 30, left: 0, bottom: 30, width: 30, backgroundColor: 'rgba(0,0,0,0.6)' }} />
            {/* 右边暗条 */}
            <View style={{ position: 'absolute', top: 30, right: 0, bottom: 30, width: 30, backgroundColor: 'rgba(0,0,0,0.6)' }} />
          </View>

          {/* 圆形虚线指示 */}
          <View
            style={{
              position: 'absolute',
              top: 30,
              left: 30,
              width: CROP_SIZE,
              height: CROP_SIZE,
              borderRadius: CROP_SIZE / 2,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.5)',
              borderStyle: 'dashed',
            }}
            pointerEvents="none"
          />
        </View>

        <Text style={styles.hint}>
          ドラッグで移動・{Platform.OS === 'web' ? 'スクロール' : 'ピンチ'}で拡大縮小
        </Text>
        <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>

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
