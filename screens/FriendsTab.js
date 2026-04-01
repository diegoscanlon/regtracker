import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { COLORS, FONTS } from '../constants/theme';
import GargoyleLoader from '../components/GargoyleLoader';

const MIN_DURATION_SECONDS = 10 * 60;

function timeAgo(iso) {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function computeStreak(sessions) {
  const sessionDays = new Set(
    sessions.map((s) => {
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
  return streak;
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

export default function FriendsTab() {
  const navigation = useNavigation();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const friendIds = (friendships || []).map((f) =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );

    const weekStart = getWeekStart();

    const allIds = [...friendIds, user.id];

    // Fetch profiles, friend sessions, ALL weekly sessions for UC rank, and active sessions
    const hasFriends = friendIds.length > 0;
    const [profilesRes, sessionsRes, allWeeklyRes] = await Promise.all([
      hasFriends
        ? supabase.from('profiles').select('id, display_name, email, avatar_url').in('id', friendIds)
        : { data: [] },
      hasFriends
        ? supabase.from('location_sessions').select('user_id, started_at, ended_at').in('user_id', allIds).not('ended_at', 'is', null).order('ended_at', { ascending: false })
        : { data: [] },
      supabase
        .from('location_sessions')
        .select('user_id, started_at, ended_at')
        .gte('started_at', weekStart.toISOString())
        .not('ended_at', 'is', null),
    ]);

    // Build per-friend session data
    const sessionsByUser = {};
    const lastSessionMap = {};

    for (const s of (sessionsRes.data || [])) {
      const dur = (new Date(s.ended_at) - new Date(s.started_at)) / 1000;
      if (dur < MIN_DURATION_SECONDS) continue;

      if (!sessionsByUser[s.user_id]) sessionsByUser[s.user_id] = [];
      sessionsByUser[s.user_id].push(s);

      if (!lastSessionMap[s.user_id]) lastSessionMap[s.user_id] = s.ended_at;
    }

    // Compute UC-wide weekly totals for ranking
    const ucWeeklyTotals = {};
    for (const s of (allWeeklyRes.data || [])) {
      const dur = (new Date(s.ended_at) - new Date(s.started_at)) / 1000;
      if (dur >= MIN_DURATION_SECONDS) {
        ucWeeklyTotals[s.user_id] = (ucWeeklyTotals[s.user_id] || 0) + dur;
      }
    }

    // UC rank: rank among all users
    const ucSorted = Object.entries(ucWeeklyTotals).sort((a, b) => b[1] - a[1]);
    const ucRankMap = {};
    ucSorted.forEach(([uid], i) => { ucRankMap[uid] = i + 1; });

    const enriched = (profilesRes.data || []).map((p) => ({
      ...p,
      lastSeen: lastSessionMap[p.id] || null,
      streak: computeStreak(sessionsByUser[p.id] || []),
      friendRank: ucRankMap[p.id] || '—',
    }));

    setFriends(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFriends(); }, [fetchFriends]);

  const getName = (p) => p.display_name || p.email?.split('@')[0] || 'Anonymous';

  if (loading) {
    return (
      <View style={styles.center}>
        <GargoyleLoader size={60} />
      </View>
    );
  }

  if (friends.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No friends yet — add some from the Friends tab!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={friends}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('FriendProfile', { friend: item })}
        >
          <View style={styles.cardLeft}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {getName(item).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cardInfo}>
              <Text style={styles.name} numberOfLines={1}>{getName(item)}</Text>
              {timeAgo(item.lastSeen) ? (
                <Text style={styles.lastSeen}>{timeAgo(item.lastSeen)}</Text>
              ) : (
                <Text style={styles.statLabel}>No Recent Regs</Text>
              )}
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.streak}</Text>
              <Text style={styles.statLabel}>streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>#{item.friendRank}</Text>
              <Text style={styles.statLabel}>UC rank</Text>
            </View>
            <Text style={styles.chevron}>{'>'}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: FONTS.ghibli,
    fontSize: 20,
    color: '#fff',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  name: {
    fontFamily: FONTS.ghibli,
    fontSize: 16,
    color: COLORS.brown,
  },
  lastSeen: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    color: COLORS.brown,
    opacity: 0.5,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FONTS.ghibli,
    fontSize: 18,
    color: COLORS.brown,
  },
  statLabel: {
    fontFamily: FONTS.mono,
    fontSize: 9,
    color: COLORS.brown,
    opacity: 0.5,
    textTransform: 'uppercase',
  },
  chevron: {
    fontFamily: FONTS.ghibli,
    fontSize: 20,
    color: COLORS.brown,
    opacity: 0.3,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FONTS.mono,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
