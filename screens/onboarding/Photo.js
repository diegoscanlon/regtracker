import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import PixelButton from '../../components/PixelButton';
import { COLORS, FONTS } from '../../constants/theme';

export default function Photo({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!photo) {
      navigation.navigate('Invite');
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Upload to Supabase storage
      const ext = photo.split('.').pop();
      const fileName = `${user.id}/avatar.${ext}`;

      const response = await fetch(photo);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${ext}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await supabase.from('profiles').upsert({
        id: user.id,
        avatar_url: publicUrl,
      });

      navigation.navigate('Invite');
    } catch (err) {
      console.error('Upload failed:', err);
      // Continue anyway — photo is optional
      navigation.navigate('Invite');
    } finally {
      setUploading(false);
    }
  };

  return (
    <LinearGradient colors={['#FFE8D4', '#FFF5F8', '#FFD4E8']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.decorChar}>✦ ♡ ✦</Text>
          <Text style={styles.title}>SET YOUR{'\n'}PHOTO</Text>
          <Text style={styles.subtitle}>put a face to the name</Text>
        </View>

        {/* Avatar picker */}
        <Pressable onPress={handlePickPhoto} style={styles.avatarArea}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarShadow} />
            <View style={styles.avatarFrame}>
              {photo ? (
                <Image source={{ uri: photo }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarEmoji}>🐱</Text>
                  <Text style={styles.uploadHint}>TAP TO{'\n'}UPLOAD</Text>
                </View>
              )}
            </View>
          </View>
          {photo ? (
            <Text style={styles.changeText}>tap to change</Text>
          ) : null}
        </Pressable>

        {/* Actions */}
        <View style={styles.actions}>
          {uploading ? (
            <ActivityIndicator color={COLORS.dark} size="large" />
          ) : (
            <>
              <PixelButton
                label={photo ? 'LOOKS GOOD  →' : 'SKIP FOR NOW  →'}
                onPress={handleContinue}
                color={photo ? COLORS.peach : COLORS.surface}
              />
              {photo ? (
                <Pressable onPress={() => setPhoto(null)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>remove photo</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    gap: 14,
  },
  decorChar: {
    fontSize: 18,
    color: COLORS.primary,
    opacity: 0.6,
    letterSpacing: 8,
  },
  title: {
    fontFamily: FONTS.pixel,
    fontSize: 20,
    color: COLORS.dark,
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: 'italic',
  },
  avatarArea: {
    alignItems: 'center',
    gap: 16,
  },
  avatarWrapper: {
    position: 'relative',
    width: 148,
    height: 148,
  },
  avatarShadow: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 140,
    height: 140,
    backgroundColor: COLORS.dark,
  },
  avatarFrame: {
    width: 140,
    height: 140,
    borderWidth: 3,
    borderColor: COLORS.dark,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF0F5',
  },
  avatarEmoji: {
    fontSize: 40,
  },
  uploadHint: {
    fontFamily: FONTS.pixel,
    fontSize: 7,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 14,
  },
  changeText: {
    fontSize: 11,
    color: COLORS.muted,
    textDecorationLine: 'underline',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  removeBtn: { padding: 8 },
  removeText: {
    fontSize: 12,
    color: COLORS.error,
    textDecorationLine: 'underline',
  },
});
