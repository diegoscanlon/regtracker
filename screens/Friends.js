import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, FlatList,
  Image, Pressable, Keyboard, Share, Animated, LayoutAnimation,
  UIManager, Platform, ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../constants/theme';
import GargoyleLoader from '../components/GargoyleLoader';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INVITE_LINK = 'https://regtracker.app/join';
const MIN_DURATION_SECONDS = 10 * 60;

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

function formatTimeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AnimatedTab({ label, active, onPress }) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: active ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 80,
    }).start();
  }, [active]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={{ opacity, transform: [{ scale }], transformOrigin: 'left bottom' }}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function Friends() {
  const [activeTab, setActiveTab] = useState('Find');

  // --- Find tab state ---
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [findLoading, setFindLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const searchTimeout = useRef(null);
  const cancelAnim = useRef(new Animated.Value(0)).current;

  // --- Activity tab state ---
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // Fetch current user + users for Find grid
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFindLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = new Set();
      (friendships || []).forEach((f) => {
        friendIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .neq('id', user.id)
        .limit(50);

      setUsers((profiles || []).filter((p) => !friendIds.has(p.id)));
      setFindLoading(false);
    })();
  }, []);

  // Fetch friend activity
  useEffect(() => {
    if (activeTab !== 'Activity') return;

    (async () => {
      setActivityLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setActivityLoading(false); return; }

      // Get accepted friend IDs
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = (friendships || []).map((f) =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      if (friendIds.length === 0) {
        setActivity([]);
        setActivityLoading(false);
        return;
      }

      // Fetch recent sessions from friends
      const { data: sessions } = await supabase
        .from('location_sessions')
        .select('id, user_id, started_at, ended_at')
        .in('user_id', friendIds)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50);

      // Filter to 10+ min sessions
      const valid = (sessions || [])
        .map((s) => ({
          ...s,
          durationSeconds: (new Date(s.ended_at) - new Date(s.started_at)) / 1000,
        }))
        .filter((s) => s.durationSeconds >= MIN_DURATION_SECONDS);

      // Get profiles for these users
      const userIds = [...new Set(valid.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = {};
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });

      setActivity(valid.map((s) => ({ ...s, profile: profileMap[s.user_id] })));
      setActivityLoading(false);
    })();
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    if (!isSearching || !query.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      const searchTerm = `%${query.trim()}%`;

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      const friendIds = new Set();
      (friendships || []).forEach((f) => {
        friendIds.add(f.user_id === currentUserId ? f.friend_id : f.user_id);
      });

      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .neq('id', currentUserId)
        .or(`display_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .limit(20);

      setSearchResults((data || []).filter((p) => !friendIds.has(p.id)));
      setSearchLoading(false);
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, isSearching, currentUserId]);

  const handleAdd = async (userId) => {
    if (!currentUserId || addedIds.has(userId)) return;
    const [uid, fid] = currentUserId < userId
      ? [currentUserId, userId]
      : [userId, currentUserId];

    await supabase.from('friendships').upsert({
      user_id: uid,
      friend_id: fid,
      status: 'pending',
    });

    setAddedIds((prev) => new Set(prev).add(userId));
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: `see who grinds harder 💪\n${INVITE_LINK}`,
        url: INVITE_LINK,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchFocus = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearching(true);
    Animated.spring(cancelAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  const handleCancel = () => {
    Animated.spring(cancelAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSearching(false);
      setQuery('');
      setSearchResults([]);
    });
    Keyboard.dismiss();
  };

  const getName = (profile) =>
    profile?.display_name || profile?.email?.split('@')[0] || 'Anonymous';

  const cancelOpacity = cancelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const cancelTranslateX = cancelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  // --- Search mode content ---
  const renderSearchContent = () => {
    if (!query.trim()) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>find your friends!</Text>
        </View>
      );
    }

    if (searchLoading) {
      return (
        <View style={styles.emptyWrap}>
          <GargoyleLoader size={60} />
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>can't find them</Text>
          <Pressable style={styles.inviteBtn} onPress={handleInvite}>
            <Text style={styles.inviteBtnText}>Invite to Reggy</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.searchList}
        renderItem={({ item }) => (
          <View style={styles.searchRow}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.searchAvatar} />
            ) : (
              <View style={styles.searchAvatarPlaceholder}>
                <Text style={styles.searchAvatarInitial}>
                  {getName(item).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.searchName} numberOfLines={1}>{getName(item)}</Text>
            <Pressable
              style={[styles.addBtnSmall, addedIds.has(item.id) && styles.addedBtnSmall]}
              onPress={() => handleAdd(item.id)}
              disabled={addedIds.has(item.id)}
            >
              <Text style={[styles.addBtnSmallText, addedIds.has(item.id) && styles.addedBtnSmallText]}>
                {addedIds.has(item.id) ? 'Added!' : 'Add'}
              </Text>
            </Pressable>
          </View>
        )}
      />
    );
  };

  // --- Grid card ---
  const renderFriendCard = ({ item }) => (
    <View style={styles.card}>
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.cardAvatar} />
      ) : (
        <View style={styles.cardAvatarPlaceholder}>
          <Text style={styles.cardAvatarInitial}>
            {getName(item).charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={styles.cardName} numberOfLines={1}>{getName(item)}</Text>
      <Pressable
        style={[styles.addBtn, addedIds.has(item.id) && styles.addedBtn]}
        onPress={() => handleAdd(item.id)}
        disabled={addedIds.has(item.id)}
      >
        <Text style={[styles.addBtnText, addedIds.has(item.id) && styles.addedBtnText]}>
          {addedIds.has(item.id) ? 'Added!' : 'Add'}
        </Text>
      </Pressable>
    </View>
  );

  // --- Find tab ---
  const renderFindTab = () => {
    if (findLoading) {
      return (
        <View style={styles.emptyWrap}>
          <GargoyleLoader size={80} />
        </View>
      );
    }

    return (
      <>
        {/* Search bar */}
        <View style={styles.searchBarRow}>
          <View style={styles.searchBarWrap}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={query}
              onChangeText={setQuery}
              onFocus={handleSearchFocus}
              returnKeyType="search"
            />
          </View>
          {isSearching && (
            <Animated.View style={{ opacity: cancelOpacity, transform: [{ translateX: cancelTranslateX }] }}>
              <Pressable onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>

        {isSearching ? (
          renderSearchContent()
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.grid}
            renderItem={renderFriendCard}
          />
        )}
      </>
    );
  };

  // --- Activity tab ---
  const renderActivityTab = () => {
    if (activityLoading) {
      return (
        <View style={styles.emptyWrap}>
          <GargoyleLoader size={60} />
        </View>
      );
    }

    if (activity.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No friend activity yet</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.activityList}
        renderItem={({ item }) => (
          <View style={styles.activityRow}>
            {item.profile?.avatar_url ? (
              <Image source={{ uri: item.profile.avatar_url }} style={styles.activityAvatar} />
            ) : (
              <View style={styles.activityAvatarPlaceholder}>
                <Text style={styles.activityAvatarInitial}>
                  {getName(item.profile).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.activityInfo}>
              <Text style={styles.activityName} numberOfLines={1}>{getName(item.profile)}</Text>
              <Text style={styles.activityDetail}>
                {formatDuration(item.durationSeconds)} in the Reg
              </Text>
            </View>
            <Text style={styles.activityTime}>{formatTimeAgo(item.ended_at)}</Text>
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Friends</Text>

        <View style={styles.tabRow}>
          <AnimatedTab label="Activity" active={activeTab === 'Activity'} onPress={() => setActiveTab('Activity')} />
          <AnimatedTab label="Find" active={activeTab === 'Find'} onPress={() => setActiveTab('Find')} />
        </View>

        <View style={styles.divider} />
      </View>

      {/* Tab content */}
      {activeTab === 'Find' && renderFindTab()}
      {activeTab === 'Activity' && renderActivityTab()}
    </SafeAreaView>
  );
}

const CARD_GAP = 12;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blue,
  },
  header: {
    paddingHorizontal: 24,
    backgroundColor: COLORS.blue,
  },
  pageTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 38,
    color: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 6,
  },
  tabText: {
    fontFamily: FONTS.mono,
    fontSize: 16,
    color: '#fff',
  },
  tabTextActive: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
  },

  // Search bar
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
  },
  searchBarWrap: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    justifyContent: 'center',
  },
  searchInput: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
  },
  cancelText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },

  // Friends grid
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  cardAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cardAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 24,
    color: '#fff',
  },
  cardName: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.brown,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: COLORS.blue,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  addBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  addedBtn: {
    backgroundColor: COLORS.mint,
  },
  addedBtnText: {
    color: COLORS.brown,
  },

  // Search results list
  searchList: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    gap: 12,
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchAvatarInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 16,
    color: '#fff',
  },
  searchName: {
    flex: 1,
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
  },
  addBtnSmall: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
  },
  addBtnSmallText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.brown,
    fontWeight: '600',
  },
  addedBtnSmall: {
    backgroundColor: COLORS.mint,
  },
  addedBtnSmallText: {
    color: COLORS.brown,
  },

  // Activity list
  activityList: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    gap: 12,
  },
  activityAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  activityAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: '#fff',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  activityDetail: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  activityTime: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },

  // Empty / invite states
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  inviteBtn: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  inviteBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.brown,
    fontWeight: '600',
  },
});
