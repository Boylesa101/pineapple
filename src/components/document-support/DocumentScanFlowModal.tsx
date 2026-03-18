import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppModal } from '@/components/AppModal';
import { ManagedFileImage } from '@/components/ManagedFileImage';
import { colors, radii, spacing } from '@/constants/theme';

export type DocumentScanStage = 'ready' | 'capturing' | 'processing' | 'extracted' | 'warning' | 'error';

type Props = {
  visible: boolean;
  title: string;
  stage: DocumentScanStage;
  documentLabel: string;
  previewUri?: string | null;
  mimeType?: string | null;
  guidance?: string;
  detail?: string;
  warningText?: string | null;
  onClose: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
};

const stageLabels: Record<DocumentScanStage, string> = {
  ready: 'Position document',
  capturing: 'Hold steady',
  processing: 'Processing',
  extracted: 'Extracted',
  warning: 'Needs review',
  error: 'Try again',
};

export function DocumentScanFlowModal({
  visible,
  title,
  stage,
  documentLabel,
  previewUri,
  mimeType,
  guidance,
  detail,
  warningText,
  onClose,
  onPrimaryAction,
  onSecondaryAction,
  primaryLabel,
  secondaryLabel,
}: Props) {
  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stage !== 'capturing' && stage !== 'processing') {
      scanProgress.stopAnimation();
      scanProgress.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanProgress, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [scanProgress, stage]);

  const sweepTranslate = scanProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });
  const showPreview = Boolean(previewUri) && (!mimeType || mimeType.startsWith('image'));
  const toneColor =
    stage === 'warning' ? colors.warning : stage === 'error' ? colors.danger : stage === 'extracted' ? colors.success : colors.primaryBlue;

  return (
    <AppModal visible={visible} title={title} onClose={onClose}>
      <View style={styles.wrapper}>
        <View style={[styles.stagePill, { borderColor: `${toneColor}33`, backgroundColor: `${toneColor}12` }]}>
          <MaterialIcons
            name={
              stage === 'warning'
                ? 'warning-amber'
                : stage === 'error'
                  ? 'error-outline'
                  : stage === 'extracted'
                    ? 'check-circle-outline'
                    : 'document-scanner'
            }
            size={18}
            color={toneColor}
          />
          <Text style={[styles.stageText, { color: toneColor }]}>{stageLabels[stage]}</Text>
        </View>

        <View style={styles.previewShell}>
          <View style={styles.previewFrame}>
            {showPreview ? (
              <ManagedFileImage uri={previewUri} mimeType={mimeType} style={styles.previewImage} contentFit="cover" />
            ) : (
              <View style={styles.placeholder}>
                <MaterialIcons name="crop-free" size={40} color={colors.primaryBlueSoft} />
                <Text style={styles.placeholderTitle}>{documentLabel}</Text>
                <Text style={styles.placeholderText}>Keep all corners visible, reduce glare, and hold the document flat inside the frame.</Text>
              </View>
            )}
            {(stage === 'capturing' || stage === 'processing') ? (
              <Animated.View style={[styles.sweepLine, { transform: [{ translateY: sweepTranslate }] }]} />
            ) : null}
            <View pointerEvents="none" style={styles.frameOverlay}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.headline}>{guidance || 'Keep the document inside the frame and avoid blur, glare, and cropped edges.'}</Text>
          {detail ? <Text style={styles.detail}>{detail}</Text> : null}
          {warningText ? <Text style={styles.warning}>{warningText}</Text> : null}
        </View>

        {primaryLabel && onPrimaryAction ? <AppButton label={primaryLabel} onPress={onPrimaryAction} /> : null}
        {secondaryLabel && onSecondaryAction ? <AppButton label={secondaryLabel} tone="secondary" onPress={onSecondaryAction} /> : null}
      </View>
    </AppModal>
  );
}

const cornerBase = {
  position: 'absolute' as const,
  width: 34,
  height: 34,
  borderColor: '#9BC4FF',
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  stagePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  stageText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  previewShell: {
    gap: spacing.sm,
  },
  previewFrame: {
    height: 250,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: '#EAF3FF',
    borderWidth: 1,
    borderColor: '#CFE2FF',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  placeholderTitle: {
    color: colors.primaryBlueText,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    textAlign: 'center',
  },
  placeholderText: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  sweepLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: colors.primaryBlue,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cornerTopLeft: {
    ...cornerBase,
    left: 14,
    top: 14,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderTopLeftRadius: 14,
  },
  cornerTopRight: {
    ...cornerBase,
    right: 14,
    top: 14,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderTopRightRadius: 14,
  },
  cornerBottomLeft: {
    ...cornerBase,
    left: 14,
    bottom: 14,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 14,
  },
  cornerBottomRight: {
    ...cornerBase,
    right: 14,
    bottom: 14,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 14,
  },
  copy: {
    gap: spacing.xs,
  },
  headline: {
    color: colors.nightNavy,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  detail: {
    color: colors.textMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  warning: {
    color: colors.warning,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 19,
  },
});
