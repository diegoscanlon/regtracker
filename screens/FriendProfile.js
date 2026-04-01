import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  ScrollView, Image, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS } from '../constants/theme';
import { supabase } from '../lib/supabase';
import GargoyleLoader from '../components/GargoyleLoader';

const MIN_DURATION_SECONDS = 10 * 60;

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

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function StatCard({ label, value, tall, bgColor, textColor, flex, paddingV }) {
  return (
    <View style={[styles.statCard, tall && styles.statCardTall, bgColor && { backgroundColor: bgColor }, flex != null && { flex }, paddingV != null && { paddingVertical: paddingV }]}>
      <Text style={[styles.statLabel, textColor && { color: textColor, opacity: 0.8 }]}>{label}</Text>
      <Text style={[styles.statValue, tall && styles.statValueTall, textColor && { color: textColor }]}>{value}</Text>
    </View>
  );
}

export default function FriendProfile({ route, navigation }) {
  const { friend } = route.params;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(null); // null = loading, true/false = known
  const [addSent, setAddSent] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);

    const weekStart = getWeekStart();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [sessionsRes, weeklyRes, friendshipsRes, profileRes] = await Promise.all([
      supabase
        .from('location_sessions')
        .select('id, started_at, ended_at')
        .eq('user_id', friend.id)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false }),
      supabase
        .from('location_sessions')
        .select('user_id, started_at, ended_at')
        .gte('started_at', weekStart.toISOString())
        .not('ended_at', 'is', null),
      supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${friend.id},friend_id.eq.${friend.id}`),
      supabase
        .from('profiles')
        .select('favorite_floor')
        .eq('id', friend.id)
        .single(),
    ]);

    // Check if this person is our friend
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: friendship } = await supabase
        .from('friendships')
        .select('id')
        .eq('status', 'accepted')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friend.id}),and(user_id.eq.${friend.id},friend_id.eq.${user.id})`)
        .maybeSingle();
      setIsFriend(!!friendship);
    }

    const valid = (sessionsRes.data || [])
      .map((s) => ({
        ...s,
        durationSeconds: (new Date(s.ended_at) - new Date(s.started_at)) / 1000,
      }))
      .filter((s) => s.durationSeconds >= MIN_DURATION_SECONDS);

    const lastSession = valid.length > 0 ? valid[0].durationSeconds : 0;
    const thisWeek = valid
      .filter((s) => new Date(s.started_at) >= weekStart)
      .reduce((sum, s) => sum + s.durationSeconds, 0);
    const allTime = valid.reduce((sum, s) => sum + s.durationSeconds, 0);
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

    // Peak hours
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

    // Compute UChicago rank
    const weeklyTotals = {};
    for (const s of (weeklyRes.data || [])) {
      const dur = (new Date(s.ended_at) - new Date(s.started_at)) / 1000;
      if (dur >= MIN_DURATION_SECONDS) {
        weeklyTotals[s.user_id] = (weeklyTotals[s.user_id] || 0) + dur;
      }
    }
    const sorted = Object.entries(weeklyTotals).sort((a, b) => b[1] - a[1]);
    const uchicagoRank = sorted.findIndex(([uid]) => uid === friend.id) + 1;
    let topPercentUchicago = '—';
    if (uchicagoRank > 0) topPercentUchicago = `#${uchicagoRank}`;

    // Compute friend rank
    const friendIds = new Set(
      (friendshipsRes.data || []).map((f) =>
        f.user_id === friend.id ? f.friend_id : f.user_id
      )
    );
    friendIds.add(friend.id);
    const friendSorted = sorted.filter(([uid]) => friendIds.has(uid));
    const friendRankIdx = friendSorted.findIndex(([uid]) => uid === friend.id) + 1;
    let friendRank = '—';
    if (friendRankIdx > 0) friendRank = `#${friendRankIdx}`;

    const favoriteFloor = profileRes.data?.favorite_floor || '—';

    setStats({
      lastSession: formatDuration(lastSession),
      thisWeek: formatDurationFull(thisWeek),
      allTime: formatDurationFull(allTime),
      today: formatDurationFull(today),
      streak,
      friendRank,
      topPercentUchicago,
      favoriteFloor,
      peakHours,
    });
    setLoading(false);
  }, [friend.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const displayName = friend.display_name || friend.email?.split('@')[0] || 'Anonymous';

  const handleAdd = async () => {
    if (addSent) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [uid, fid] = user.id < friend.id
      ? [user.id, friend.id]
      : [friend.id, user.id];
    await supabase.from('friendships').upsert({
      user_id: uid,
      friend_id: fid,
      status: 'pending',
    });
    setAddSent(true);
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

  const s = stats;

  return (
    <LinearGradient colors={[COLORS.blue, COLORS.blue]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Sticky header */}
        <View style={styles.stickyHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{displayName}</Text>
            {isFriend === false && (
              <Pressable
                style={[styles.addBtn, addSent && styles.addBtnSent]}
                onPress={handleAdd}
                disabled={addSent}
              >
                <Text style={[styles.addBtnText, addSent && styles.addBtnTextSent]}>
                  {addSent ? 'Added!' : 'Add'}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.divider} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Rank cards */}
          <View style={styles.statsRow}>
            <StatCard label="Among Friends" value={s.friendRank} bgColor={COLORS.orange} textColor="#fff" paddingV={20} />
            <StatCard label="At UChicago" value={s.topPercentUchicago} bgColor={COLORS.yellow} textColor={COLORS.brown} paddingV={20} />
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Today" value={s.today} paddingV={24} />
            <StatCard label="This Week" value={s.thisWeek} paddingV={24} />
            <StatCard label="All Time" value={s.allTime} paddingV={24} />
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Last Session" value={s.lastSession} flex={1.4} />
            <StatCard label="Streak" value={`${s.streak}`} flex={0.6} />
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Favorite Floor" value={s.favoriteFloor} />
            <StatCard label="Peak Hours" value={s.peakHours} />
          </View>

          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>{'<'} Back</Text>
          </Pressable>
        </ScrollView>
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
  },
  displayName: {
    fontFamily: FONTS.ghibli,
    fontSize: 38,
    color: '#fff',
    flex: 1,
  },
  addBtn: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 50,
    marginBottom: 4,
  },
  addBtnSent: {
    backgroundColor: COLORS.mint,
  },
  addBtnText: {
    fontFamily: FONTS.mono,
    fontSize: 13,
    color: COLORS.brown,
    fontWeight: '600',
  },
  addBtnTextSent: {
    color: COLORS.brown,
  },
  backBtn: {
    alignSelf: 'center',
    paddingVertical: 16,
  },
  backText: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
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
});
