import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TextInput, FlatList, SectionList,
  ScrollView, Image, Pressable, Keyboard, Share, Animated, LayoutAnimation,
  UIManager, Platform,
} from 'react-native';
import { Dimensions } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGeofenceContext } from '../lib/GeofenceContext';
import { COLORS, FONTS } from '../constants/theme';
import GargoyleLoader from '../components/GargoyleLoader';
import FriendsTab from './FriendsTab';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const INVITE_LINK = 'https://regtracker.app/join';
const MIN_DURATION_SECONDS = 10 * 60;

const REACTION_IMAGES = {
  facepalm: require('../assets/reaction-facepalm.png'),
  love: require('../assets/reaction-love.png'),
  flex: require('../assets/reaction-flex.png'),
  allgood: require('../assets/reaction-allgood.png'),
  grind: require('../assets/reaction-grind.png'),
};

const REACTION_KEYS = ['facepalm', 'love', 'flex', 'allgood', 'grind'];

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

function formatSessionDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (sessionDay.getTime() === today.getTime()) return 'TODAY';
  if (sessionDay.getTime() === yesterday.getTime()) return 'YESTERDAY';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatTimeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimer(startedAt) {
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ActiveSessionCard({ session }) {
  const blink = useRef(new Animated.Value(1)).current;
  const [timer, setTimer] = useState(() => formatTimer(session.started_at));

  useEffect(() => {
    const interval = setInterval(() => setTimer(formatTimer(session.started_at)), 1000);
    return () => clearInterval(interval);
  }, [session.started_at]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const name = session.display_name || session.email?.split('@')[0] || 'Anonymous';
  const startTime = new Date(session.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Animated.View style={[styles.activeCard, { opacity: blink }]}>
      <View style={styles.activeLeft}>
        {session.avatar_url ? (
          <Image source={{ uri: session.avatar_url }} style={styles.activityAvatar} />
        ) : (
          <View style={[styles.activityAvatarPlaceholder, { backgroundColor: '#4ADE80' }]}>
            <Text style={styles.activityAvatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.activityInfo}>
          <Text style={styles.activityName} numberOfLines={1}>{name}</Text>
          <Text style={styles.activeTime}>In since {startTime}</Text>
        </View>
      </View>
      <View style={styles.timerWrap}>
        <Text style={styles.timerText}>{timer}</Text>
      </View>
    </Animated.View>
  );
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

  const fontSize = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 18] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Pressable onPress={onPress}>
      <Animated.Text style={[styles.tabText, active && styles.tabTextActive, { fontSize, opacity }]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatStatusTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatLastSession(session) {
  if (!session) return 'No sessions yet';
  const start = new Date(session.started_at);
  const totalSec = session.total_seconds || 0;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);

  const today = new Date();
  const isToday = start.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = start.toDateString() === yesterday.toDateString();

  const dayStr = isToday ? 'Today' : isYesterday ? 'Yesterday' : start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dur = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return `${dayStr} — ${dur}`;
}

export default function Friends({ navigation }) {
  const [activeTab, setActiveTab] = useState('Activity');
  const { isInReg, elapsedSeconds } = useGeofenceContext();
  const [lastSession, setLastSession] = useState(null);
  const borderPulse = useRef(new Animated.Value(0)).current;
  const statusCardScale = useRef(new Animated.Value(1)).current;
  const sparkleAnims = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Border + background tint pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderPulse, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(borderPulse, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    ).start();

    // Sparkles — staggered fade in/out
    sparkleAnims.forEach((anim, i) => {
      const delay = i * 400;
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true }),
            Animated.delay(1600),
          ])
        ).start();
      }, delay);
    });

  }, []);

  // --- Find tab state ---
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [findLoading, setFindLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());
  const [studentCount, setStudentCount] = useState(0);
  const searchTimeout = useRef(null);
  const cancelAnim = useRef(new Animated.Value(0)).current;

  // --- Activity tab state ---
  const [activity, setActivity] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [pickerSessionId, setPickerSessionId] = useState(null);

  // --- Reactions tab state ---
  const [receivedReactions, setReceivedReactions] = useState([]);
  const [reactionsLoading, setReactionsLoading] = useState(true);

  // Fetch current user + users for Find grid
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setFindLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id, status')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = new Set();
      (friendships || []).forEach((f) => {
        friendIds.add(f.user_id === user.id ? f.friend_id : f.user_id);
      });

      const [profilesRes, countRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, email, avatar_url')
          .neq('id', user.id)
          .limit(50),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true }),
      ]);

      const realCount = countRes.count || 0;
      setStudentCount(Math.floor((realCount + 10) * 1.25));
      setUsers((profilesRes.data || []).filter((p) => !friendIds.has(p.id)));
      setFindLoading(false);
    })();
  }, []);

  // Fetch last completed session
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('location_sessions')
        .select('started_at, ended_at, total_seconds')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(1);
      if (data?.[0]) setLastSession(data[0]);
    })();
  }, []);

  // Fetch friend + own activity
  const fetchActivity = useCallback(async () => {
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

    const allUserIds = [...friendIds, user.id];

    // Fetch recent sessions + active sessions from friends + self
    const [{ data: sessions }, { data: activeData }] = await Promise.all([
      supabase
        .from('location_sessions')
        .select('id, user_id, started_at, ended_at')
        .in('user_id', allUserIds)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(50),
      supabase
        .from('location_sessions')
        .select('user_id, started_at')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .limit(1),
    ]);

    // Filter to 10+ min sessions
    const valid = (sessions || [])
      .map((s) => ({
        ...s,
        durationSeconds: (new Date(s.ended_at) - new Date(s.started_at)) / 1000,
      }))
      .filter((s) => s.durationSeconds >= MIN_DURATION_SECONDS);

    // Get profiles for these users
    const userIds = [...new Set(valid.map((s) => s.user_id))];
    const [profilesRes, reactionsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', userIds),
      valid.length > 0
        ? supabase
            .from('session_reactions')
            .select('session_id, user_id, emoji')
            .in('session_id', valid.map((s) => s.id))
        : { data: [] },
    ]);

    const profileMap = {};
    (profilesRes.data || []).forEach((p) => { profileMap[p.id] = p; });

    // Fetch profiles for active session users not already in profileMap
    const activeUserIds = (activeData || []).map((s) => s.user_id).filter((id) => !profileMap[id]);
    if (activeUserIds.length > 0) {
      const { data: activeProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .in('id', activeUserIds);
      (activeProfiles || []).forEach((p) => { profileMap[p.id] = p; });
    }

    // Build active session cards with profile info
    const active = (activeData || []).map((s) => ({
      ...s,
      ...(profileMap[s.user_id] || {}),
    }));
    setActiveSessions(active);

    const reactionsMap = {};
    for (const r of (reactionsRes.data || [])) {
      if (!reactionsMap[r.session_id]) reactionsMap[r.session_id] = [];
      reactionsMap[r.session_id].push(r);
    }

    const enriched = valid.map((s) => ({
      ...s,
      profile: profileMap[s.user_id],
      isMe: s.user_id === user.id,
      reactions: reactionsMap[s.id] || [],
    }));

    // Group by day
    const sections = [];
    let currentDate = null;
    for (const s of enriched) {
      const dateLabel = formatSessionDate(s.started_at);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        sections.push({ title: dateLabel, data: [] });
      }
      sections[sections.length - 1].data.push(s);
    }

    setActivity(sections);
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'Activity') fetchActivity();
  }, [activeTab, fetchActivity]);

  // Fetch reactions others have given to my sessions
  const fetchReceivedReactions = useCallback(async () => {
    setReactionsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setReactionsLoading(false); return; }

    // Get my sessions
    const { data: mySessions } = await supabase
      .from('location_sessions')
      .select('id, started_at, ended_at')
      .eq('user_id', user.id)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(50);

    const validSessions = (mySessions || [])
      .map((s) => ({
        ...s,
        durationSeconds: (new Date(s.ended_at) - new Date(s.started_at)) / 1000,
      }))
      .filter((s) => s.durationSeconds >= MIN_DURATION_SECONDS);

    if (validSessions.length === 0) {
      setReceivedReactions([]);
      setReactionsLoading(false);
      return;
    }

    const sessionIds = validSessions.map((s) => s.id);
    const sessionMap = {};
    validSessions.forEach((s) => { sessionMap[s.id] = s; });

    // Get reactions on my sessions from others
    const { data: rxns } = await supabase
      .from('session_reactions')
      .select('id, session_id, user_id, emoji, created_at')
      .in('session_id', sessionIds)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!rxns || rxns.length === 0) {
      setReceivedReactions([]);
      setReactionsLoading(false);
      return;
    }

    // Get profiles for reactors
    const reactorIds = [...new Set(rxns.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, email, avatar_url')
      .in('id', reactorIds);

    const profileMap = {};
    (profiles || []).forEach((p) => { profileMap[p.id] = p; });

    const enriched = rxns.map((r) => ({
      ...r,
      profile: profileMap[r.user_id],
      session: sessionMap[r.session_id],
    }));

    // Group by day
    const sections = [];
    let currentDate = null;
    for (const r of enriched) {
      const dateLabel = formatSessionDate(r.created_at);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        sections.push({ title: dateLabel, data: [] });
      }
      sections[sections.length - 1].data.push(r);
    }

    setReceivedReactions(sections);
    setReactionsLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'Reactions') fetchReceivedReactions();
  }, [activeTab, fetchReceivedReactions]);

  // Poll for active session status every 10s so the card disappears when you leave
  useEffect(() => {
    if (activeTab !== 'Activity') return;
    const interval = setInterval(async () => {
      if (!currentUserId) return;
      const { data } = await supabase
        .from('location_sessions')
        .select('user_id, started_at')
        .eq('user_id', currentUserId)
        .is('ended_at', null)
        .limit(1);
      const profileRes = await supabase
        .from('profiles')
        .select('id, display_name, email, avatar_url')
        .eq('id', currentUserId)
        .single();
      if (data && data.length > 0 && profileRes.data) {
        setActiveSessions([{ ...data[0], ...profileRes.data }]);
      } else {
        setActiveSessions([]);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab, currentUserId]);

  const handleReaction = async (sessionId, emoji) => {
    if (!currentUserId) return;

    // Optimistic update (sections format)
    setActivity((prev) =>
      prev.map((section) => ({
        ...section,
        data: section.data.map((s) => {
          if (s.id !== sessionId) return s;
          const existing = s.reactions.find((r) => r.user_id === currentUserId);
          if (existing && existing.emoji === emoji) {
            return { ...s, reactions: s.reactions.filter((r) => r.user_id !== currentUserId) };
          }
          const filtered = s.reactions.filter((r) => r.user_id !== currentUserId);
          return { ...s, reactions: [...filtered, { session_id: sessionId, user_id: currentUserId, emoji }] };
        }),
      }))
    );
    setPickerSessionId(null);

    const { data: existing } = await supabase
      .from('session_reactions')
      .select('id, emoji')
      .eq('session_id', sessionId)
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (existing && existing.emoji === emoji) {
      await supabase.from('session_reactions').delete().eq('id', existing.id);
    } else if (existing) {
      await supabase.from('session_reactions').update({ emoji }).eq('id', existing.id);
    } else {
      await supabase.from('session_reactions').insert({ session_id: sessionId, user_id: currentUserId, emoji });
    }
  };

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
        .select('user_id, friend_id, status')
        .eq('status', 'accepted')
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
      status: 'accepted',
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
          <Text style={styles.emptyText}>They're not here!</Text>
          <Pressable style={styles.inviteBtn} onPress={handleInvite}>
            <Image source={require('../assets/phoenix-icon.png')} style={styles.inviteBtnIcon} />
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
            <Pressable
              style={styles.viewBtnSmall}
              onPress={() => navigation.navigate('FriendProfile', { friend: item })}
            >
              <Text style={styles.viewBtnSmallText}>View</Text>
            </Pressable>
          </View>
        )}
      />
    );
  };

  // --- Grid card ---
  const renderFriendCard = ({ item }) => (
    <Pressable style={styles.card} onPress={() => navigation.navigate('FriendProfile', { friend: item })}>
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
    </Pressable>
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
              placeholder={studentCount > 0 ? `Search ${studentCount} students on Reggy` : 'Search...'}
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

    if (activity.length === 0 && activeSessions.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      );
    }

    const animatedBorderColor = borderPulse.interpolate({
      inputRange: [0, 1],
      outputRange: isInReg
        ? ['rgba(38,153,34,0.3)', 'rgba(38,153,34,1)']
        : ['rgba(229,57,53,0.3)', 'rgba(229,57,53,1)'],
    });


    // Sparkle positions around the card edges
    const SPARKLE_POSITIONS = [
      { top: -3, left: '20%' },
      { top: -3, right: '25%' },
      { top: '30%', right: -3 },
      { top: '65%', right: -3 },
      { bottom: -3, right: '20%' },
      { bottom: -3, left: '30%' },
      { top: '60%', left: -3 },
      { top: '25%', left: -3 },
    ];

    const onStatusPressIn = () => {
      Animated.spring(statusCardScale, { toValue: 0.96, useNativeDriver: true, friction: 8, tension: 150 }).start();
    };
    const onStatusPressOut = () => {
      Animated.spring(statusCardScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 200 }).start();
    };

    const statusBanner = (
      <Pressable onPressIn={onStatusPressIn} onPressOut={onStatusPressOut}>
        <Animated.View style={{ transform: [{ scale: statusCardScale }] }}>
          <Animated.View style={[
            styles.statusBanner,
            { borderColor: animatedBorderColor },
          ]}>
            <Text style={styles.statusTitle}>
              {isInReg ? "In the Reg!" : "Not in the Reg!"}
            </Text>
            <Image
              source={require('../assets/feature-card-1.png')}
              style={styles.statusImage}
            />
            <Text style={styles.statusTimer}>
              {isInReg ? formatStatusTime(elapsedSeconds) : formatLastSession(lastSession)}
            </Text>
            <Text style={styles.statusSub}>
              {isInReg ? 'Current session' : 'Since last session'}
            </Text>

            {/* Sparkle particles */}
            {SPARKLE_POSITIONS.map((pos, i) => (
              <Animated.View
                key={`sparkle-${i}`}
                style={[
                  styles.sparkle,
                  pos,
                  { opacity: sparkleAnims[i] },
                ]}
              />
            ))}
          </Animated.View>
        </Animated.View>
      </Pressable>
    );

    return (
      <SectionList
        sections={activity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.activityList}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View>
            {statusBanner}
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const displayName = item.isMe ? 'You' : getName(item.profile);
          const myReaction = item.reactions?.find((r) => r.user_id === currentUserId);
          const otherReactions = item.reactions?.filter((r) => r.user_id !== currentUserId) || [];
          const showPicker = pickerSessionId === item.id;

          const cardScale = new Animated.Value(1);
          const onPressIn = () => {
            Animated.spring(cardScale, { toValue: 0.96, useNativeDriver: true, friction: 8, tension: 150 }).start();
          };
          const onPressOut = () => {
            Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 200 }).start();
          };

          return (
            <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
            <Animated.View style={[styles.activityCard, { transform: [{ scale: cardScale }] }]}>
              <View style={styles.activityRow}>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.activityAvatar} />
                ) : (
                  <View style={styles.activityAvatarPlaceholder}>
                    <Text style={styles.activityAvatarInitial}>
                      {displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.activityDetail}>
                    {formatTime(item.started_at)} · {formatDuration(item.durationSeconds)}
                  </Text>
                </View>
                <View style={styles.reactionArea}>
                  {otherReactions.map((r) => (
                    REACTION_IMAGES[r.emoji]
                      ? <Image key={r.user_id} source={REACTION_IMAGES[r.emoji]} style={styles.reactionImg} />
                      : <Text key={r.user_id} style={styles.reactionEmoji}>{r.emoji}</Text>
                  ))}
                  <Pressable
                    onPress={() => setPickerSessionId(showPicker ? null : item.id)}
                    style={[styles.reactionBtn, myReaction && styles.reactionBtnActive]}
                  >
                    {myReaction && REACTION_IMAGES[myReaction.emoji] ? (
                      <Image source={REACTION_IMAGES[myReaction.emoji]} style={styles.reactionBtnImg} />
                    ) : (
                      <Text style={styles.reactionBtnText}>+</Text>
                    )}
                  </Pressable>
                </View>
              </View>

              {showPicker && (
                <View style={styles.emojiPicker}>
                  {REACTION_KEYS.map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => handleReaction(item.id, key)}
                      style={[
                        styles.emojiOption,
                        myReaction?.emoji === key && styles.emojiOptionActive,
                      ]}
                    >
                      <Image source={REACTION_IMAGES[key]} style={styles.emojiOptionImg} />
                    </Pressable>
                  ))}
                </View>
              )}
            </Animated.View>
            </Pressable>
          );
        }}
      />
    );
  };

  // --- Mine tab ---
  const renderMineTab = () => {
    return (
      <ScrollView contentContainerStyle={styles.mineScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.mineFriendsSection}>
          <Text style={styles.sectionHeader}>My Friends</Text>
        </View>
        <FriendsTab scrollEnabled={false} />

        {/* Suggestions */}
        {users.length > 0 && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionHeader}>Suggestions</Text>
            <View style={styles.suggestionsGrid}>
              {users.slice(0, 20).map((item) => (
                <Pressable key={item.id} style={styles.suggestionCard} onPress={() => navigation.navigate('FriendProfile', { friend: item })}>
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
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  // --- Reactions tab ---
  const renderReactionsTab = () => {
    if (reactionsLoading) {
      return (
        <View style={styles.emptyWrap}>
          <GargoyleLoader size={60} />
        </View>
      );
    }

    if (receivedReactions.length === 0) {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No one has reacted to you yet!</Text>
        </View>
      );
    }

    return (
      <SectionList
        sections={receivedReactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.activityList}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => {
          const name = item.profile?.display_name || item.profile?.email?.split('@')[0] || 'Someone';
          const reactionImage = REACTION_IMAGES[item.emoji];

          return (
            <View style={styles.reactionCard}>
              <View style={styles.activityRow}>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.activityAvatar} />
                ) : (
                  <View style={styles.activityAvatarPlaceholder}>
                    <Text style={styles.activityAvatarInitial}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.activityDetail}>
                    reacted to your {formatDuration(item.session?.durationSeconds)} session
                  </Text>
                </View>
                {reactionImage ? (
                  <Image source={reactionImage} style={styles.reactionCardImg} />
                ) : (
                  <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Activity</Text>

        <View style={styles.tabRow}>
          <AnimatedTab label="Feed" active={activeTab === 'Activity'} onPress={() => setActiveTab('Activity')} />
          <AnimatedTab label="Friends" active={activeTab === 'Mine'} onPress={() => setActiveTab('Mine')} />
          <AnimatedTab label="Reactions" active={activeTab === 'Reactions'} onPress={() => setActiveTab('Reactions')} />
          <AnimatedTab label="Search" active={activeTab === 'Search'} onPress={() => setActiveTab('Search')} />
        </View>

        <View style={styles.divider} />
      </View>

      {/* Tab content */}
      {activeTab === 'Activity' && renderActivityTab()}
      {activeTab === 'Mine' && renderMineTab()}
      {activeTab === 'Reactions' && renderReactionsTab()}
      {activeTab === 'Search' && renderFindTab()}
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

  // Status banner
  statusBanner: {
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingBottom: 14,
    paddingHorizontal: 20,
    gap: 6,
    borderWidth: 3,
    borderColor: 'transparent',
    overflow: 'visible',
    marginBottom: 16,
  },
  statusImage: {
    width: 176,
    height: 176,
    resizeMode: 'contain',
  },
  statusTitle: {
    fontFamily: FONTS.ghibli,
    fontSize: 24,
    color: COLORS.brown,
    textAlign: 'center',
  },
  statusSub: {
    fontFamily: FONTS.ghibli,
    fontSize: 15,
    color: COLORS.brown,
    opacity: 0.5,
    textAlign: 'center',
  },
  statusTimer: {
    fontFamily: FONTS.ghibli,
    fontSize: 20,
    color: COLORS.brown,
    textAlign: 'center',
  },
  sparkle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD700',
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
    alignItems: 'flex-end',
    gap: 20,
    marginTop: 6,
    height: 26,
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
    maxWidth: '48%',
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
  viewBtnSmall: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 50,
  },
  viewBtnSmallText: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.brown,
    fontWeight: '600',
  },

  // Activity list
  activityList: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  sectionHeader: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  activityAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 20,
    color: '#fff',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityName: {
    fontFamily: FONTS.ghibli,
    fontSize: 16,
    color: COLORS.brown,
  },
  activityDetail: {
    fontFamily: FONTS.mono,
    fontSize: 12,
    color: COLORS.brown,
    opacity: 0.5,
  },
  reactionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionEmoji: {
    fontSize: 18,
  },
  reactionImg: {
    width: 43,
    height: 43,
    resizeMode: 'contain',
  },
  reactionBtnImg: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  reactionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(71,53,54,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBtnActive: {
    backgroundColor: 'transparent',
  },
  reactionBtnText: {
    fontSize: 16,
    color: COLORS.brown,
    opacity: 0.35,
  },
  emojiPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(71,53,54,0.1)',
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiOptionActive: {
    backgroundColor: COLORS.yellow,
  },
  emojiOptionText: {
    fontSize: 22,
  },
  emojiOptionImg: {
    width: 54,
    height: 54,
    resizeMode: 'contain',
  },
  reactionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  reactionCardImg: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },

  // Mine tab
  mineScroll: {
    paddingBottom: 120,
  },
  mineFriendsSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  suggestionsSection: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  suggestionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },

  // Active sessions
  activeSection: {
    marginBottom: 8,
    gap: 10,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#4ADE80',
  },
  activeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeTime: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: '#4ADE80',
    fontWeight: '600',
  },
  timerWrap: {
    backgroundColor: '#4ADE80',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timerText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
  },
  inviteBtnIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  inviteBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.brown,
    fontWeight: '600',
  },
});
