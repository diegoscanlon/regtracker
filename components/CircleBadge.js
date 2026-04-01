import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle as SvgCircle, Path, Text as SvgText, TextPath, Defs } from 'react-native-svg';
import { FONTS } from '../constants/theme';

const BADGE_SIZE = 78;
const BADGE_CENTER = BADGE_SIZE / 2;
const ARC_R = BADGE_CENTER - 10;

export default function CircleBadge({ value, label, color, textColor = '#fff' }) {
  // Arc from 8 o'clock (240°) to 4 o'clock (120°), clockwise through 6 o'clock
  // 8 o'clock: (-sin60, cos60) = (-0.866, 0.5)
  // 4 o'clock: (sin60, cos60) = (0.866, 0.5)
  const startX = BADGE_CENTER - ARC_R * 0.866;
  const startY = BADGE_CENTER - ARC_R * 0.5;
  const endX = BADGE_CENTER + ARC_R * 0.866;
  const endY = BADGE_CENTER - ARC_R * 0.5;
  // large-arc-flag=1 because the arc spans more than 180°
  const arcPath = `M ${startX},${startY} A ${ARC_R},${ARC_R} 0 1,1 ${endX},${endY}`;

  return (
    <View style={styles.circleBadge}>
      <Svg width={BADGE_SIZE} height={BADGE_SIZE}>
        <SvgCircle cx={BADGE_CENTER} cy={BADGE_CENTER} r={BADGE_CENTER} fill={color} />
        <Defs>
          <Path id={`arc-${label}`} d={arcPath} />
        </Defs>
        <SvgText
          fill={textColor}
          fontSize={9}
          fontWeight="600"
        >
          <TextPath href={`#arc-${label}`} startOffset="50%" textAnchor="middle">
            {label}
          </TextPath>
        </SvgText>
      </Svg>
      <Text style={[styles.circleValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circleBadge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleValue: {
    position: 'absolute',
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    textAlign: 'center',
    marginTop: -6,
  },
});
