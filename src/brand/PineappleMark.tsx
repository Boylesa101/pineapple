import { Image } from 'expo-image';

type Props = {
  size?: number;
  simplified?: boolean;
};

const iconSource = require('../../assets/logo/pineapple-icon-source.png');
const markSource = require('../../assets/logo/pineapple-mark-source.png');

export function PineappleMark({ size = 88, simplified = false }: Props) {
  return (
    <Image
      source={simplified ? markSource : iconSource}
      style={{ width: size, height: size }}
      contentFit="contain"
    />
  );
}
