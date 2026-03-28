import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import PixelButton from '../../components/PixelButton';
import { COLORS, FONTS } from '../../constants/theme';

WebBrowser.maybeCompleteAuthSession();

export default function Welcome({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');

      const redirectTo = Linking.createURL('auth-callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams: { hd: 'uchicago.edu', prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const fragment = result.url.split('#')[1] || '';
        const params = Object.fromEntries(new URLSearchParams(fragment));

        if (params.access_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (sessionError) throw sessionError;

          const { data: { user } } = await supabase.auth.getUser();

          if (!user?.email?.endsWith('@uchicago.edu')) {
            await supabase.auth.signOut();
            setError('please use your\n@uchicago.edu account');
            return;
          }

          navigation.navigate('Features');
        } else {
          setError('sign in was cancelled');
        }
      }
    } catch (err) {
      setError('sign in failed.\nplease try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFD4E8', '#FFF5F8', '#E8D4FF']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Top decoration */}
        <View style={styles.topDecor}>
          <Text style={styles.decorChar}>✦</Text>
          <Text style={styles.decorChar}>♡</Text>
          <Text style={styles.decorChar}>✦</Text>
        </View>

        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoBoxWrapper}>
            <View style={styles.logoBoxShadow} />
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>📍</Text>
            </View>
          </View>

          <Text style={styles.title}>REGTRACKER</Text>
          <Text style={styles.tagline}>who really owns the reg?</Text>
        </View>

        {/* Sign in */}
        <View style={styles.signInArea}>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator color={COLORS.dark} size="large" />
          ) : (
            <PixelButton
              label="SIGN IN WITH GOOGLE"
              icon="🌐"
              onPress={handleGoogleSignIn}
              color={COLORS.surface}
            />
          )}

          <Text style={styles.hint}>@uchicago.edu accounts only</Text>
        </View>

        {/* Bottom decoration */}
        <View style={styles.bottomDecor}>
          <Text style={styles.decorChar}>★</Text>
          <Text style={styles.decorChar}>♡</Text>
          <Text style={styles.decorChar}>★</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  topDecor: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  decorChar: {
    fontSize: 18,
    color: COLORS.primary,
    opacity: 0.7,
  },
  logoArea: {
    alignItems: 'center',
    gap: 16,
  },
  logoBoxWrapper: {
    position: 'relative',
    width: 88,
    height: 88,
  },
  logoBoxShadow: {
    position: 'absolute',
    top: 5,
    left: 5,
    width: 88,
    height: 88,
    backgroundColor: COLORS.dark,
  },
  logoBox: {
    width: 88,
    height: 88,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 18,
    color: COLORS.dark,
    letterSpacing: 2,
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  signInArea: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  error: {
    fontFamily: FONTS.pixel,
    fontSize: 9,
    color: COLORS.error,
    textAlign: 'center',
    lineHeight: 18,
  },
  hint: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 4,
  },
  bottomDecor: {
    flexDirection: 'row',
    gap: 16,
  },
});
