import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  Share, ScrollView, Image, Pressable, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, LAYOUT } from '../constants/theme';
import { supabase } from '../lib/supabase';
import GargoyleLoader from '../components/GargoyleLoader';
import FriendsTab from './FriendsTab';

const MIN_DURATION_SECONDS = 10 * 60; // 10 minutes

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

function formatDurationFull(totalSeconds) {
  const h = Math.floor((totalSeconds || 0) / 3600);
  const m = Math.floor(((totalSeconds || 0) % 3600) / 60);
  return `${h}h\n${String(m).padStart(2, '0')}m`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function useSessionData() {
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);


  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [profileRes, sessionsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name, email, avatar_url, favorite_floor')
        .eq('id', user.id)
        .single(),
      supabase
        .from('location_sessions')
        .select('id, started_at, ended_at')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false }),
    ]);


    if (profileRes.data) setProfile(profileRes.data);

    const allSessions = sessionsRes.data || [];
    const valid = allSessions
      .map((s) => ({
        ...s,
        durationSeconds: (new Date(s.ended_at) - new Date(s.started_at)) / 1000,
      }))
      .filter((s) => s.durationSeconds >= MIN_DURATION_SECONDS);

    setSessions(valid);

    const lastSession = valid.length > 0 ? valid[0].durationSeconds : 0;
    const weekStart = getWeekStart();
    const thisWeek = valid
      .filter((s) => new Date(s.started_at) >= weekStart)
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    const allTime = valid.reduce((sum, s) => sum + s.durationSeconds, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = valid
      .filter((s) => new Date(s.started_at) >= todayStart)
      .reduce((sum, s) => sum + s.durationSeconds, 0);

    // Daily streak
    const sessionDays = new Set(
      valid.map((s) => {
        const d = new Date(s.started_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      })
    );
    let streak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    const todayKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
    if (!sessionDays.has(todayKey)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (sessionDays.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Peak hours: mean midpoint time-of-day across all sessions
    let peakHours = '—';
    if (valid.length > 0) {
      let totalMinutes = 0;
      for (const s of valid) {
        const start = new Date(s.started_at);
        const end = new Date(s.ended_at);
        const midpoint = new Date((start.getTime() + end.getTime()) / 2);
        totalMinutes += midpoint.getHours() * 60 + midpoint.getMinutes();
      }
      const avgMinutes = Math.round(totalMinutes / valid.length);
      const h = Math.floor(avgMinutes / 60);
      const m = avgMinutes % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      peakHours = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
    }

    // Fetch weekly ranks
    const { data: rankData } = await supabase.rpc('get_weekly_ranks');
    let friendRank = '—';
    let topPercentUchicago = '—';
    if (rankData && rankData.length > 0) {
      const r = rankData[0];
      if (r.friend_rank > 0) friendRank = `#${r.friend_rank}`;
      if (r.uchicago_rank > 0) topPercentUchicago = `#${r.uchicago_rank}`;
    }

    setStats({ lastSession: formatDuration(lastSession), thisWeek: formatDurationFull(thisWeek), allTime: formatDurationFull(allTime), today: formatDurationFull(today), streak, friendRank, topPercentUchicago, peakHours });
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { stats, sessions, profile, loading };
}

const EXTRA_STATS = {
  today: '0h\n00m',
  favoriteFloor: '—',
  peakHours: '—',
  friendRank: '—',
  topPercentUchicago: '—',
};

const TABS = ['Stats', 'Friends', 'Sessions'];

const FLOOR_OPTIONS = ['—', 'Lobby', '2', '3', '4', '5', 'A', 'B', 'Sueto'];

function FloorPickerCard({ value, onChangeFloor }) {
  const scale = useRef(new Animated.Value(1)).current;
  const currentIndex = FLOOR_OPTIONS.indexOf(value) >= 0 ? FLOOR_OPTIONS.indexOf(value) : 0;

  const handlePress = () => {
    const nextIndex = (currentIndex + 1) % FLOOR_OPTIONS.length;
    const nextFloor = FLOOR_OPTIONS[nextIndex];

    // Shrink then pop back
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }),
    ]).start();

    onChangeFloor(nextFloor);
  };

  return (
    <Pressable onPress={handlePress} style={{ flex: 1 }}>
      <Animated.View style={[styles.statCard, { transform: [{ scale }] }]}>
        <Text style={styles.statLabel}>Favorite Floor</Text>
        <Text style={styles.statValue}>{value}</Text>
      </Animated.View>
    </Pressable>
  );
}

function StatCard({ label, value, tall, bgColor, textColor, flex, paddingV }) {
  return (
    <View style={[styles.statCard, tall && styles.statCardTall, bgColor && { backgroundColor: bgColor }, flex != null && { flex }, paddingV != null && { paddingVertical: paddingV }]}>
      <Text style={[styles.statLabel, textColor && { color: textColor, opacity: 0.8 }]}>{label}</Text>
      <Text style={[styles.statValue, tall && styles.statValueTall, textColor && { color: textColor }]}>{value}</Text>
    </View>
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

export default function Stats({ navigation }) {
  const { stats, sessions, profile, loading } = useSessionData();
  const [activeTab, setActiveTab] = useState('Stats');
  const [favoriteFloor, setFavoriteFloor] = useState('—');
  const s = { ...EXTRA_STATS, ...stats };

  const displayName = profile?.display_name || profile?.email?.split('@')[0] || 'You';

  // Sync favorite floor from profile
  useEffect(() => {
    if (profile?.favorite_floor) setFavoriteFloor(profile.favorite_floor);
  }, [profile]);

  const handleChangeFloor = async (floor) => {
    setFavoriteFloor(floor);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dbValue = floor === '—' ? null : floor;
    await supabase.from('profiles').update({ favorite_floor: dbValue }).eq('id', user.id);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `My Reggy Stats\n\n` +
          `Last session: ${s.lastSession}\n` +
          `This week: ${s.thisWeek}\n` +
          `All time: ${s.allTime}\n\n` +
          `Download Reggy → regtracker.app`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={[COLORS.blue, COLORS.blue]} style={styles.gradient}>
        <SafeAreaView style={[styles.safe, { alignItems: 'center', justifyContent: 'center' }]}>
          <GargoyleLoader size={80} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const renderStatsContent = () => (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Rank cards */}
      <View style={styles.statsRow}>
        <StatCard label="Among Friends" value={s.friendRank} bgColor={COLORS.orange} textColor="#fff" paddingV={20} />
        <StatCard label="At UChicago" value={s.topPercentUchicago} bgColor={COLORS.yellow} textColor={COLORS.brown} paddingV={20} />
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Today" value={s.today} tall={false} paddingV={24} />
        <StatCard label="This Week" value={s.thisWeek} tall={false} paddingV={24} />
        <StatCard label="All Time" value={s.allTime} tall={false} paddingV={24} />
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Last Session" value={s.lastSession} flex={1.4} />
        <StatCard label="Streak" value={`${s.streak}`} flex={0.6} />
      </View>

      <View style={styles.statsRow}>
        <FloorPickerCard value={favoriteFloor} onChangeFloor={handleChangeFloor} />
        <StatCard label="Peak Hours" value={s.peakHours} tall={false} />
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
        <Image source={require('../assets/phoenix-icon.png')} style={styles.shareBtnIcon} />
        <Text style={styles.shareBtnText}>Share Stats</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderSessionsContent = () => (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.columnHeaders}>
        <Text style={[styles.colHeader, styles.colDate]}>Date</Text>
        <Text style={[styles.colHeader, styles.colTime]}>Time</Text>
        <Text style={[styles.colHeader, styles.colDuration]}>Duration</Text>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>No sessions yet — go hit the Reg!</Text>
        </View>
      ) : (
        sessions.map((item) => (
          <View key={item.id} style={styles.sessionRow}>
            <Text style={[styles.sessionCell, styles.colDate]}>{formatDate(item.started_at)}</Text>
            <Text style={[styles.sessionCell, styles.colTime]}>{formatTime(item.started_at)}</Text>
            <Text style={[styles.sessionCell, styles.colDuration]}>{formatDuration(item.durationSeconds)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <LinearGradient colors={[COLORS.blue, COLORS.blue]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Sticky header */}
        <View style={styles.stickyHeader}>
          <Text style={styles.displayName}>{displayName}</Text>

          {/* Tab switcher */}
          <View style={styles.tabRow}>
            {TABS.map((tab) => (
              <AnimatedTab
                key={tab}
                label={tab}
                active={activeTab === tab}
                onPress={() => setActiveTab(tab)}
              />
            ))}
          </View>

          <View style={styles.divider} />
        </View>

        {/* Tab content */}
        {activeTab === 'Stats' && renderStatsContent()}
        {activeTab === 'Friends' && <FriendsTab />}
        {activeTab === 'Sessions' && renderSessionsContent()}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
    gap: 20,
  },

  // Sticky header
  stickyHeader: {
    paddingHorizontal: 24,
    backgroundColor: COLORS.blue,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 12,
  },

  displayName: {
    fontFamily: FONTS.ghibli,
    fontSize: 38,
    color: '#fff',
    paddingTop: 16,
    paddingBottom: 12,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  shareBtnIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
  shareBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '600',
  },

  // Tab switcher
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

  // Stat cards
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statCardTall: {
    paddingVertical: 40,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: 12.5,
    color: COLORS.brown,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  statValue: {
    fontFamily: FONTS.ghibli,
    fontSize: 25,
    color: COLORS.brown,
  },
  statValueTall: {
    fontSize: 35,
  },

  // Session history
  columnHeaders: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.25)',
  },
  colHeader: {
    fontFamily: FONTS.avant,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colDate: { flex: 3 },
  colTime: { flex: 2 },
  colDuration: { flex: 2, textAlign: 'right' },
  sessionRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  sessionCell: {
    fontFamily: FONTS.avant,
    fontSize: 14,
    color: '#fff',
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.avant,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
});
