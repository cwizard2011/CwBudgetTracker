import React, { useEffect, useRef, useState } from 'react';
import {
  Image,
  LayoutRectangle,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/Button';
import { Colors } from '../../../theme/colors';
import { NormalizedCropRect, normalizeCropRect, PixelDimensions } from '../../../utils/ocrCrop';

interface MeterCropModalProps {
  visible: boolean;
  imageUri?: string;
  sourceSize?: Partial<PixelDimensions>;
  onCancel: () => void;
  onConfirm: (crop: NormalizedCropRect, dimensions: PixelDimensions) => void;
}

type DragMode = 'move' | 'draw' | 'nw' | 'ne' | 'sw' | 'se';

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  rect: NormalizedCropRect;
}

const DEFAULT_CROP: NormalizedCropRect = { x: 0.06, y: 0.3, width: 0.88, height: 0.4 };
const MIN_CROP_WIDTH = 0.12;
const MIN_CROP_HEIGHT = 0.1;
const HANDLE_HIT_SIZE = 30;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function containedRect(container: LayoutRectangle, source: PixelDimensions): LayoutRectangle {
  const scale = Math.min(container.width / source.width, container.height / source.height);
  const width = source.width * scale;
  const height = source.height * scale;
  return {
    x: (container.width - width) / 2,
    y: (container.height - height) / 2,
    width,
    height,
  };
}

export function MeterCropModal({ visible, imageUri, sourceSize, onCancel, onConfirm }: MeterCropModalProps) {
  const [stage, setStage] = useState<LayoutRectangle>();
  const [dimensions, setDimensions] = useState<PixelDimensions>({
    width: sourceSize?.width || 1,
    height: sourceSize?.height || 1,
  });
  const [crop, setCrop] = useState<NormalizedCropRect>(DEFAULT_CROP);
  const cropRef = useRef(crop);
  const imageRectRef = useRef<LayoutRectangle | undefined>(undefined);
  const dragRef = useRef<DragState | undefined>(undefined);

  const imageRect = stage && dimensions.width > 0 && dimensions.height > 0
    ? containedRect(stage, dimensions)
    : undefined;
  cropRef.current = crop;
  imageRectRef.current = imageRect;

  useEffect(() => {
    if (!visible || !imageUri) return;
    setCrop(DEFAULT_CROP);
    if (sourceSize?.width && sourceSize?.height) {
      setDimensions({ width: sourceSize.width, height: sourceSize.height });
      return;
    }
    Image.getSize(imageUri, (width, height) => setDimensions({ width, height }));
  }, [imageUri, sourceSize?.height, sourceSize?.width, visible]);

  const pointInImage = (x: number, y: number) => {
    const box = imageRectRef.current;
    if (!box) return undefined;
    if (x < box.x || y < box.y || x > box.x + box.width || y > box.y + box.height) return undefined;
    return {
      x: clamp((x - box.x) / box.width, 0, 1),
      y: clamp((y - box.y) / box.height, 0, 1),
    };
  };

  const hitMode = (touchX: number, touchY: number, point: { x: number; y: number }): DragMode => {
    const box = imageRectRef.current!;
    const current = cropRef.current;
    const corners: Array<{ mode: DragMode; x: number; y: number }> = [
      { mode: 'nw', x: current.x, y: current.y },
      { mode: 'ne', x: current.x + current.width, y: current.y },
      { mode: 'sw', x: current.x, y: current.y + current.height },
      { mode: 'se', x: current.x + current.width, y: current.y + current.height },
    ];
    const handle = corners.find(item => Math.hypot(touchX - (box.x + item.x * box.width), touchY - (box.y + item.y * box.height)) <= HANDLE_HIT_SIZE);
    if (handle) return handle.mode;
    const inside = point.x >= current.x && point.x <= current.x + current.width
      && point.y >= current.y && point.y <= current.y + current.height;
    return inside ? 'move' : 'draw';
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: event => Boolean(pointInImage(event.nativeEvent.locationX, event.nativeEvent.locationY)),
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      const touchX = event.nativeEvent.locationX;
      const touchY = event.nativeEvent.locationY;
      const point = pointInImage(touchX, touchY);
      if (!point) return;
      const mode = hitMode(touchX, touchY, point);
      dragRef.current = { mode, startX: point.x, startY: point.y, rect: cropRef.current };
      if (mode === 'draw') {
        setCrop(normalizeCropRect({
          x: clamp(point.x - MIN_CROP_WIDTH / 2, 0, 1 - MIN_CROP_WIDTH),
          y: clamp(point.y - MIN_CROP_HEIGHT / 2, 0, 1 - MIN_CROP_HEIGHT),
          width: MIN_CROP_WIDTH,
          height: MIN_CROP_HEIGHT,
        }));
      }
    },
    onPanResponderMove: event => {
      const drag = dragRef.current;
      const box = imageRectRef.current;
      if (!drag || !box) return;
      const point = {
        x: clamp((event.nativeEvent.locationX - box.x) / box.width, 0, 1),
        y: clamp((event.nativeEvent.locationY - box.y) / box.height, 0, 1),
      };

      if (drag.mode === 'move') {
        setCrop({
          ...drag.rect,
          x: clamp(drag.rect.x + point.x - drag.startX, 0, 1 - drag.rect.width),
          y: clamp(drag.rect.y + point.y - drag.startY, 0, 1 - drag.rect.height),
        });
        return;
      }

      if (drag.mode === 'draw') {
        const left = Math.min(drag.startX, point.x);
        const top = Math.min(drag.startY, point.y);
        setCrop(normalizeCropRect({
          x: left,
          y: top,
          width: Math.max(MIN_CROP_WIDTH, Math.abs(point.x - drag.startX)),
          height: Math.max(MIN_CROP_HEIGHT, Math.abs(point.y - drag.startY)),
        }));
        return;
      }

      let left = drag.rect.x;
      let right = drag.rect.x + drag.rect.width;
      let top = drag.rect.y;
      let bottom = drag.rect.y + drag.rect.height;
      if (drag.mode.includes('w')) left = Math.min(point.x, right - MIN_CROP_WIDTH);
      if (drag.mode.includes('e')) right = Math.max(point.x, left + MIN_CROP_WIDTH);
      if (drag.mode.includes('n')) top = Math.min(point.y, bottom - MIN_CROP_HEIGHT);
      if (drag.mode.includes('s')) bottom = Math.max(point.y, top + MIN_CROP_HEIGHT);
      setCrop(normalizeCropRect({ x: left, y: top, width: right - left, height: bottom - top }));
    },
    onPanResponderRelease: () => { dragRef.current = undefined; },
    onPanResponderTerminate: () => { dragRef.current = undefined; },
  })).current;

  const selection = imageRect ? {
    left: imageRect.x + crop.x * imageRect.width,
    top: imageRect.y + crop.y * imageRect.height,
    width: crop.width * imageRect.width,
    height: crop.height * imageRect.height,
  } : undefined;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel image crop" onPress={onCancel} style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select meter reading</Text>
          <View style={styles.headerSpacer} />
        </View>
        <Text style={styles.help}>Drag the corners around only the number display. Drag inside the box to move it.</Text>
        <View
          style={styles.stage}
          onLayout={event => setStage(event.nativeEvent.layout)}
          {...panResponder.panHandlers}
        >
          {imageUri && imageRect ? (
            <Image
              source={{ uri: imageUri }}
              resizeMode="contain"
              style={[styles.image, imageRect]}
              onLoad={event => {
                const source = event.nativeEvent.source;
                if (source?.width && source?.height && (!sourceSize?.width || !sourceSize?.height)) {
                  setDimensions({ width: source.width, height: source.height });
                }
              }}
            />
          ) : null}
          {imageRect && selection ? (
            <>
              <View pointerEvents="none" style={[styles.mask, { left: imageRect.x, top: imageRect.y, width: imageRect.width, height: selection.top - imageRect.y }]} />
              <View pointerEvents="none" style={[styles.mask, { left: imageRect.x, top: selection.top + selection.height, width: imageRect.width, height: imageRect.y + imageRect.height - selection.top - selection.height }]} />
              <View pointerEvents="none" style={[styles.mask, { left: imageRect.x, top: selection.top, width: selection.left - imageRect.x, height: selection.height }]} />
              <View pointerEvents="none" style={[styles.mask, { left: selection.left + selection.width, top: selection.top, width: imageRect.x + imageRect.width - selection.left - selection.width, height: selection.height }]} />
              <View pointerEvents="none" accessibilityLabel="Selected meter reading area" style={[styles.selection, selection]}>
                <View style={[styles.handle, styles.nw]} />
                <View style={[styles.handle, styles.ne]} />
                <View style={[styles.handle, styles.sw]} />
                <View style={[styles.handle, styles.se]} />
              </View>
            </>
          ) : null}
        </View>
        <View style={styles.actions}>
          <Button title="Use full image" variant="neutral" onPress={() => setCrop({ x: 0, y: 0, width: 1, height: 1 })} style={styles.action} />
          <Button
            title="Read selected area"
            iconName="document-scanner"
            onPress={() => onConfirm(normalizeCropRect(crop), dimensions)}
            disabled={!imageRect}
            style={styles.actionPrimary}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1220' },
  header: { minHeight: 52, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  headerButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 64 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  help: { color: '#CBD5E1', fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 10 },
  stage: { flex: 1, overflow: 'hidden', backgroundColor: '#020617' },
  image: { position: 'absolute' },
  mask: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.58)' },
  selection: { position: 'absolute', borderColor: Colors.primaryLight, borderWidth: 2 },
  handle: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.primary, borderColor: '#FFFFFF', borderWidth: 2 },
  nw: { left: -10, top: -10 },
  ne: { right: -10, top: -10 },
  sw: { left: -10, bottom: -10 },
  se: { right: -10, bottom: -10 },
  actions: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: '#0B1220' },
  action: { flex: 1 },
  actionPrimary: { flex: 1.4 },
});
