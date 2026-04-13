import type { ImageContentFit, ImageStyle } from 'expo-image';
import { Image } from 'expo-image';
import type { StyleProp } from 'react-native';

import { useManagedFileUri } from '@/hooks/useManagedFileUri';

type Props = {
  uri: string | null | undefined;
  mimeType?: string | null;
  style: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  enabled?: boolean;
};

export function ManagedFileImage({ uri, mimeType, style, contentFit = 'cover', enabled = true }: Props) {
  const resolvedUri = useManagedFileUri(uri, mimeType, { enabled });

  if (!resolvedUri) {
    return null;
  }

  return <Image source={resolvedUri} style={style} contentFit={contentFit} />;
}
