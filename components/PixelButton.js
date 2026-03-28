import React, { useRef } from 'react';
import { Animated, Pressable, Text, StyleSheet, View } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

export default function PixelButton({
  label,
  onPress,
  color = COLORS.primary,
  textColor = COLORS.dark,
  style,
  icon,
  small,
  disabled,
}) {
  const pressed = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.timing(pressed, { toValue: 1, duration: 60, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(pressed, { toValue: 0, duration: 80, useNativeDriver: true }).start();
  };

  const translateX = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const translateY = pressed.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
  const shadowOpacity = pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      style={[styles.wrapper, style]}
    >
      <Animated.View style={[styles.shadow, small && styles.shadowSmall, { opacity: shadowOpacity }]} />
      <Animated.View
        style={[
          styles.button,
          small && styles.buttonSmall,
          { backgroundColor: disabled ? COLORS.muted : color, transform: [{ translateX }, { translateY }] },
        ]}
      >
        {icon ? <Text style={[styles.icon, small && styles.iconSmall]}>{icon}</Text> : null}
        <Text style={[styles.label, small && styles.labelSmall, { color: disabled ? '#fff' : textColor }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: COLORS.dark,
  },
  shadowSmall: {
    top: 3,
    left: 3,
    right: -3,
    bottom: -3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: COLORS.dark,
    gap: 10,
  },
  buttonSmall: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: FONTS.pixel,
    fontSize: 10,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 8,
    lineHeight: 14,
  },
  icon: {
    fontSize: 16,
  },
  iconSmall: {
    fontSize: 12,
  },
});
