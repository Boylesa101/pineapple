import type { ImageContentFit, ImageStyle } from 'expo-image';
import { Image } from 'expo-image';
import type { StyleProp } from 'react-native';

import { useManagedFileUri } from '@/hooks/useManagedFileUri';

type Props = {
  uri: string | null | undefined;
  mimeType?: string | null;
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
};

export function ManagedFileImage({ uri, mimeType, style, contentFit = 'cover' }: Props) {
  const resolvedUri = useManagedFileUri(uri, mimeType);

  if (!resolvedUri) {
    return null;
  }

  return <Image source={resolvedUri} style={style} contentFit={contentFit} />;
}
