import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/contexts/UserContext';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { planApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';

export default function HomeScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const [todayItems, setTodayItems] = useState<any[]>([]);
  const [weekItems, setWeekItems] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const result = await planApi.getToday(user.id);
      setTodayItems(result.today_items || []);
      setWeekItems(result.week_items || []);
      setStats(result.stats || { total: 0, completed: 0 });
    } catch {
      // Silent fail
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleComplete = async (itemId: string, currentStatus: boolean) => {
    try {
      await planApi.completeItem(itemId, !currentStatus);
      await loadData();
    } catch {
      alert('更新失败');
    }
  };

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const dayStr = `星期${weekDays[today.getDay()]}`;

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#FAFAF8">
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7B2D8E" />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{dateStr} {dayStr}</Text>
              <Text style={styles.userName}>你好，{user?.nickname || '同学'}</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/profile')}>
              <Text style={styles.avatarText}>{(user?.nickname || '同')[0]}</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Card */}
          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>今日计划进度</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressSub}>{stats.completed}/{stats.total} 项已完成</Text>
          </View>
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日任务</Text>
            {todayItems.length > 0 && (
              <Text style={styles.sectionBadge}>{todayItems.length}</Text>
            )}
          </View>
          {todayItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <FontAwesome6 name="circle-check" size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>今日暂无待完成任务</Text>
            </View>
          ) : (
            todayItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.taskCard}
                onPress={() => handleComplete(item.id, item.is_completed)}
              >
                <View style={[styles.checkbox, item.is_completed && styles.checkboxDone]}>
                  {item.is_completed && <FontAwesome6 name="check" size={12} color="#FFF" />}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, item.is_completed && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* This Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>本周计划</Text>
            {weekItems.length > 0 && (
              <Text style={styles.sectionBadge}>{weekItems.length}</Text>
            )}
          </View>
          {weekItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>本周暂无更多任务</Text>
            </View>
          ) : (
            weekItems.slice(0, 5).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.taskCard}
                onPress={() => handleComplete(item.id, item.is_completed)}
              >
                <View style={[styles.checkbox, item.is_completed && styles.checkboxDone]}>
                  {item.is_completed && <FontAwesome6 name="check" size={12} color="#FFF" />}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, item.is_completed && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  <Text style={styles.taskDate}>{item.due_date}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>快捷入口</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/question-entry')}>
              <View style={[styles.quickIcon, { backgroundColor: '#F3E8F9' }]}>
                <FontAwesome6 name="camera" size={20} color="#7B2D8E" />
              </View>
              <Text style={styles.quickLabel}>录入错题</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/search')}>
              <View style={[styles.quickIcon, { backgroundColor: '#FEF3C7' }]}>
                <FontAwesome6 name="magnifying-glass" size={20} color="#D97706" />
              </View>
              <Text style={styles.quickLabel}>题目检索</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/plan-create')}>
              <View style={[styles.quickIcon, { backgroundColor: '#DBEAFE' }]}>
                <FontAwesome6 name="calendar-plus" size={20} color="#2563EB" />
              </View>
              <Text style={styles.quickLabel}>制定计划</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/chat')}>
              <View style={[styles.quickIcon, { backgroundColor: '#DCFCE7' }]}>
                <FontAwesome6 name="comments" size={20} color="#16A34A" />
              </View>
              <Text style={styles.quickLabel}>知途聊聊</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#7B2D8E', paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  userName: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  progressCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  progressPercent: { color: '#FFF', fontSize: 24, fontWeight: '700' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#C9A96E', borderRadius: 3 },
  progressSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  sectionBadge: { backgroundColor: '#7B2D8E', color: '#FFF', fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  taskTitleDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  taskDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  taskDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
});
