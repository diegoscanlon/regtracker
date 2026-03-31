import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../constants/theme';

export default function Profile() {
  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('onboarding_complete');
    await supabase.auth.signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.pageTitle}>Settings</Text>
      <View style={styles.center}>
        <Pressable onPress={handleSignOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blue,
  },
  pageTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 28,
    color: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    padding: 12,
  },
  signOutText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.error,
    textDecorationLine: 'underline',
  },
});
