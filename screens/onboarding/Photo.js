import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image,
  SafeAreaView, TouchableOpacity, Animated, ScrollView, ActionSheetIOS, Platform, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, LAYOUT } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const AVATARS = [
  { id: 'phoenix', source: require('../../assets/avatars/phoenix.png') },
  { id: 'gargoyle', source: require('../../assets/avatars/gargoyle.png') },
  { id: 'squirrel', source: require('../../assets/avatars/squirrel.png') },
  { id: 'goose', source: require('../../assets/avatars/goose.png') },
  { id: 'duck', source: require('../../assets/avatars/duck.png') },
];

const YEAR_ROW_1 = ['1st Year', '2nd Year', '3rd Year'];
const YEAR_ROW_2 = ['4th Year', 'Grad', 'Prof'];

const FLOOR_ROW_1 = ['1', '2', '3', '4', '5'];
const FLOOR_ROW_2 = ['A', 'B', 'Sueto'];

const SPRING = { useNativeDriver: true, friction: 7, tension: 40 };

export default function Photo({ navigation }) {
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [customUri, setCustomUri] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [saving, setSaving] = useState(false);

  const avatarScales = useRef(AVATARS.map(() => new Animated.Value(1))).current;
  const uploadScale = useRef(new Animated.Value(1)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // Card entrance animations
  const pictureCardAnim = useRef(new Animated.Value(0)).current;
  const yearCardAnim = useRef(new Animated.Value(0)).current;
  const floorCardAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  const [yearRevealed, setYearRevealed] = useState(false);
  const [floorRevealed, setFloorRevealed] = useState(false);
  const [btnRevealed, setBtnRevealed] = useState(false);

  // Picture card slides in on mount
  useEffect(() => {
    Animated.spring(pictureCardAnim, { toValue: 1, ...SPRING }).start();
  }, []);

  // Year card slides in when avatar is selected
  useEffect(() => {
    if (selectedAvatar && !yearRevealed) {
      setYearRevealed(true);
      Animated.spring(yearCardAnim, { toValue: 1, ...SPRING }).start();
    }
  }, [selectedAvatar, yearRevealed]);

  // Floor card slides in when year is selected
  useEffect(() => {
    if (selectedYear && !floorRevealed) {
      setFloorRevealed(true);
      Animated.spring(floorCardAnim, { toValue: 1, ...SPRING }).start();
    }
  }, [selectedYear, floorRevealed]);

  // Button appears when floor is selected
  useEffect(() => {
    if (selectedFloor && !btnRevealed) {
      setBtnRevealed(true);
      Animated.spring(btnAnim, { toValue: 1, ...SPRING }).start();
    }
  }, [selectedFloor, btnRevealed]);

  const animStyle = (anim) => ({
    opacity: anim,
    transform: [{
      translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
    }],
  });

  const handleAvatarTap = useCallback((index, id) => {
    setSelectedAvatar(id);
    setCustomUri(null);
    Animated.sequence([
      Animated.spring(avatarScales[index], { toValue: 0.9, useNativeDriver: true, friction: 8, tension: 150 }),
      Animated.spring(avatarScales[index], { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
    ]).start();
  }, []);

  const pickImage = async (useCamera) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Camera Permission', 'Camera access is needed to take a selfie.');
        return;
      }
    }

    const opts = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);

    if (!result.canceled && result.assets?.[0]) {
      setCustomUri(result.assets[0].uri);
      setSelectedAvatar('custom');
    }
  };

  const handleUploadPress = () => {
    Animated.sequence([
      Animated.spring(uploadScale, { toValue: 0.9, useNativeDriver: true, friction: 8, tension: 150 }),
      Animated.spring(uploadScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }),
    ]).start();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take a Selfie', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImage(true);
          if (buttonIndex === 2) pickImage(false);
        },
      );
    } else {
      Alert.alert('Upload Photo', '', [
        { text: 'Take a Selfie', onPress: () => pickImage(true) },
        { text: 'Choose from Library', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const handleContinue = async () => {
    if (!selectedAvatar || !selectedYear || !selectedFloor) return;
    setSaving(true);

    Animated.spring(btnScale, {
      toValue: 0.92,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const updates = { year: selectedYear, favorite_floor: selectedFloor };

        if (selectedAvatar === 'custom' && customUri) {
          const ext = customUri.split('.').pop();
          const fileName = `${user.id}.${ext}`;
          const resp = await fetch(customUri);
          const blob = await resp.blob();
          const arrayBuffer = await new Response(blob).arrayBuffer();

          await supabase.storage
            .from('avatars')
            .upload(fileName, arrayBuffer, {
              contentType: `image/${ext}`,
              upsert: true,
            });

          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          updates.avatar_url = urlData.publicUrl;
        } else {
          updates.avatar_preset = selectedAvatar;
        }

        await supabase.from('profiles').update(updates).eq('id', user.id);
      } catch (e) {
        console.error('Failed to save profile:', e);
      } finally {
        setSaving(false);
        navigation.navigate('Invite');
      }
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Your Reggy</Text>

          {/* Picture section */}
          <Animated.View style={[styles.pictureSection, animStyle(pictureCardAnim)]}>
            <Text style={styles.sectionTitle}>Picture</Text>
            <View style={styles.pictureGrid}>
              <Pressable onPress={handleUploadPress}>
                <Animated.View style={[
                  styles.pictureCircle,
                  selectedAvatar === 'custom' && customUri && styles.pictureCircleSelected,
                  { transform: [{ scale: uploadScale }] },
                ]}>
                  {selectedAvatar === 'custom' && customUri ? (
                    <Image source={{ uri: customUri }} style={styles.pictureImage} />
                  ) : (
                    <Text style={styles.uploadLabel}>Upload</Text>
                  )}
                </Animated.View>
              </Pressable>

              {AVATARS.map((avatar, i) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <Pressable key={avatar.id} onPress={() => handleAvatarTap(i, avatar.id)}>
                    <Animated.View style={[
                      styles.pictureCircle,
                      isSelected && styles.pictureCircleSelected,
                      { transform: [{ scale: avatarScales[i] }] },
                    ]}>
                      <Image source={avatar.source} style={styles.pictureImage} />
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Year section */}
          <Animated.View style={[styles.section, animStyle(yearCardAnim)]}>
            <Text style={styles.sectionTitle}>Year</Text>
            <View style={styles.chipRow}>
              {YEAR_ROW_1.map((year) => {
                const isSelected = selectedYear === year;
                return (
                  <Pressable
                    key={year}
                    onPress={() => setSelectedYear(year)}
                    style={[styles.yearChip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.chipRowCentered}>
              {YEAR_ROW_2.map((year) => {
                const isSelected = selectedYear === year;
                return (
                  <Pressable
                    key={year}
                    onPress={() => setSelectedYear(year)}
                    style={[styles.yearChip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {year}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          {/* Floor section */}
          <Animated.View style={[styles.section, animStyle(floorCardAnim)]}>
            <Text style={styles.sectionTitle}>Favorite Floor</Text>
            <View style={styles.chipRow}>
              {FLOOR_ROW_1.map((floor) => {
                const isSelected = selectedFloor === floor;
                return (
                  <Pressable
                    key={floor}
                    onPress={() => setSelectedFloor(floor)}
                    style={[styles.floorChip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {floor}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.chipRowCentered}>
              {FLOOR_ROW_2.map((floor) => {
                const isSelected = selectedFloor === floor;
                return (
                  <Pressable
                    key={floor}
                    onPress={() => setSelectedFloor(floor)}
                    style={[styles.floorChipWide, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {floor}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Continue button */}
        <Animated.View style={[styles.bottom, animStyle(btnAnim), { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={1}
            disabled={saving}
          >
            <Text style={styles.continueBtnLabel}>
              {saving ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.blue },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 140,
    gap: 16,
  },
  title: {
    fontFamily: FONTS.ghibli,
    fontSize: 38,
    color: '#fff',
  },

  // Sections
  section: {
    gap: 14,
  },
  pictureSection: {
    gap: 14,
  },
  sectionTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 24,
    color: '#fff',
  },

  // Picture grid
  pictureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  pictureCircle: {
    width: 85,
    height: 85,
    borderRadius: 43,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  pictureCircleSelected: {
    borderColor: COLORS.green,
  },
  pictureImage: {
    width: '100%',
    height: '100%',
  },
  uploadLabel: {
    fontFamily: FONTS.ghibli,
    fontSize: 15,
    color: COLORS.brown,
    opacity: 0.4,
  },

  // Chip rows
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  chipRowCentered: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  yearChip: {
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  floorChip: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floorChipWide: {
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.green,
  },
  chipText: {
    fontFamily: FONTS.ghibli,
    fontSize: 15,
    color: COLORS.brown,
  },
  chipTextSelected: {
    color: '#fff',
  },

  // Bottom button
  bottom: {
    ...LAYOUT.bottomContainer,
  },
  continueBtn: {
    ...LAYOUT.actionBtn,
    backgroundColor: '#fff',
  },
  continueBtnLabel: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: COLORS.brown,
  },
});
