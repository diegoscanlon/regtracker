import React, { useRef, useEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

export default function GargoyleLoader({ size = 64 }) {
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.7,
          duration: 400,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.Image
      source={require('../assets/gargoyle-loader.png')}
      style={[styles.img, { width: size, height: size, transform: [{ scale }] }]}
    />
  );
}

const styles = StyleSheet.create({
  img: {
    resizeMode: 'contain',
  },
});
