import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  simplified?: boolean;
};

export function PineappleMark({ size = 88, simplified = false }: Props) {
  if (simplified) {
    return (
      <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
        <Path
          d="M64 10C72 17 77 25 79 35C86 32 94 33 101 39C95 41 90 45 86 50C97 52 106 58 112 67C104 66 97 68 91 72C95 79 97 86 96 94C88 90 81 89 75 90C74 98 70 107 64 112C58 107 54 98 53 90C47 89 40 90 32 94C31 86 33 79 37 72C31 68 24 66 16 67C22 58 31 52 42 50C38 45 33 41 27 39C34 33 42 32 49 35C51 25 56 17 64 10Z"
          fill="#4E9F6D"
        />
        <Path
          d="M64 34C87 34 106 53 106 77C106 102 88 120 64 120C40 120 22 102 22 77C22 53 41 34 64 34Z"
          fill="#F4B400"
        />
        <Path d="M40 54L87 101" stroke="#D99412" strokeWidth="4" strokeLinecap="round" />
        <Path d="M88 54L41 101" stroke="#D99412" strokeWidth="4" strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <Circle cx="64" cy="64" r="58" fill="url(#glow)" />
      <Path
        d="M64 12C72 18 77 26 78 36C86 33 94 34 101 40C95 42 90 46 87 51C98 53 107 59 112 68C104 67 97 69 91 73C95 80 97 87 96 95C88 92 81 91 75 92C74 100 70 109 64 115C58 109 54 100 53 92C47 91 40 92 32 95C31 87 33 80 37 73C31 69 24 67 16 68C21 59 30 53 41 51C38 46 33 42 27 40C34 34 42 33 50 36C51 26 56 18 64 12Z"
        fill="url(#leaf)"
      />
      <Path
        d="M64 34C87 34 106 53 106 77C106 101 88 120 64 120C40 120 22 101 22 77C22 53 41 34 64 34Z"
        fill="url(#body)"
      />
      <Path d="M40 52L87 99" stroke="#D99412" strokeWidth="4" strokeLinecap="round" />
      <Path d="M32 69L95 110" stroke="#D99412" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <Path d="M88 52L41 99" stroke="#D99412" strokeWidth="4" strokeLinecap="round" />
      <Path d="M96 69L33 110" stroke="#D99412" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <Ellipse cx="43" cy="55" rx="12" ry="18" fill="rgba(255,255,255,0.3)" />
      <Defs>
        <LinearGradient id="leaf" x1="64" y1="12" x2="64" y2="115" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#75BA63" />
          <Stop offset="1" stopColor="#4E9F6D" />
        </LinearGradient>
        <LinearGradient id="body" x1="64" y1="34" x2="64" y2="120" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#FFD76A" />
          <Stop offset="1" stopColor="#F4B400" />
        </LinearGradient>
        <RadialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(64 42) rotate(90) scale(68)">
          <Stop stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F7E7CE" />
        </RadialGradient>
      </Defs>
    </Svg>
  );
}
