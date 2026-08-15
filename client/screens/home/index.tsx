import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Modal, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '@/contexts/UserContext';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { planApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';


interface PlanItem {
  id: string;
  title: string;
  description: string;
  due_date: string;
  is_completed: boolean;
}

// Task card component defined outside to avoid re-creation on each render
const TaskCard = ({
  item,
  onComplete,
  onNavigate,
  onPostpone,
  onDelete,
}: {
  item: PlanItem;
  onComplete: (id: string, current: boolean) => void;
  onNavigate: (id: string) => void;
  onPostpone: (id: string, days: number) => void;
  onDelete: (id: string) => void;
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.taskCard}>
      {/* Checkbox - separate touch target */}
      <TouchableOpacity
        style={styles.checkboxWrap}
        onPress={() => onComplete(item.id, item.is_completed)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={[styles.checkbox, item.is_completed && styles.checkboxDone]}>
          {item.is_completed && <FontAwesome6 name="check" size={12} color="#FFF" />}
        </View>
      </TouchableOpacity>

      {/* Card body - navigates to detail */}
      <TouchableOpacity
        style={styles.taskContent}
        onPress={() => onNavigate(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.taskTitle, item.is_completed && styles.taskTitleDone]}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
        ) : null}
        {item.due_date && (
          <Text style={styles.taskDate}>{item.due_date}</Text>
        )}
      </TouchableOpacity>

      {/* Three-dot menu */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => setMenuVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <FontAwesome6 name="ellipsis-vertical" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Action Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuPopup}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setMenuVisible(false); onNavigate(item.id); }}
            >
              <FontAwesome6 name="eye" size={14} color="#374151" />
              <Text style={styles.menuItemText}>查看详情</Text>
            </TouchableOpacity>
            {!item.is_completed && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuVisible(false); onPostpone(item.id, 1); }}
                >
                  <FontAwesome6 name="clock" size={14} color="#D97706" />
                  <Text style={styles.menuItemText}>延后1天</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuVisible(false); onPostpone(item.id, 3); }}
                >
                  <FontAwesome6 name="clock" size={14} color="#D97706" />
                  <Text style={styles.menuItemText}>延后3天</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => { setMenuVisible(false); onPostpone(item.id, 7); }}
                >
                  <FontAwesome6 name="calendar-plus" size={14} color="#2563EB" />
                  <Text style={styles.menuItemText}>延后1周</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('确认删除', '确定要删除这个任务吗？', [
                  { text: '取消', style: 'cancel' },
                  { text: '删除', style: 'destructive', onPress: () => onDelete(item.id) },
                ]);
              }}
            >
              <FontAwesome6 name="trash" size={14} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>删除任务</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};


export default function HomeScreen() {
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [todayItems, setTodayItems] = useState<PlanItem[]>([]);
  const [weekItems, setWeekItems] = useState<PlanItem[]>([]);
  const [stats, setStats] = useState({ total: 0, completed: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    const fetchPlans = async () => {
      if (!user?.id) return;
      try {
        const result = await planApi.getToday(user.id);
        setTodayItems(result.today_items || []);
        setWeekItems(result.week_items || []);
        if (result.stats) setStats(result.stats);
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      }
    };
    fetchPlans();
  }, [user]));

  const refreshData = async () => {
    if (!user?.id) return;
    try {
      const result = await planApi.getToday(user.id);
      setTodayItems(result.today_items || []);
      setWeekItems(result.week_items || []);
      if (result.stats) setStats(result.stats);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleComplete = async (itemId: string, currentStatus: boolean) => {
    try {
      await planApi.completeItem(itemId, !currentStatus);
      await refreshData();
    } catch (err) {
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  const handleNavigate = (itemId: string) => {
    router.push('/task-detail', { itemId });
  };

  const handlePostpone = async (itemId: string, days: number) => {
    try {
      const item = [...todayItems, ...weekItems].find(i => i.id === itemId);
      if (!item?.due_date) return;
      const current = new Date(item.due_date);
      current.setDate(current.getDate() + days);
      const newDate = current.toISOString().split('T')[0];
      await planApi.rescheduleItem(itemId, newDate);
      await refreshData();
    } catch (err) {
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await planApi.deleteItem(itemId);
      await refreshData();
    } catch (err) {
      Alert.alert('错误', '删除失败，请重试');
    }
  };

  const progress = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const displayName = user?.nickname || '同学';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>你好，{displayName}</Text>
              <Text style={styles.userName}>今日学习进度</Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.navigate('/profile')}>
              <Text style={styles.avatarText}>{initial}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressTitle}>完成进度</Text>
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
              <TaskCard
                key={item.id}
                item={item}
                onComplete={handleComplete}
                onNavigate={handleNavigate}
                onPostpone={handlePostpone}
                onDelete={handleDelete}
              />
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
              <TaskCard
                key={item.id}
                item={item}
                onComplete={handleComplete}
                onNavigate={handleNavigate}
                onPostpone={handlePostpone}
                onDelete={handleDelete}
              />
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

  // Task card styles
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 10 },
  checkboxWrap: { padding: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  taskTitleDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  taskDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  taskDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  menuBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },

  // Menu popup styles
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  menuPopup: { backgroundColor: '#FFF', borderRadius: 16, padding: 8, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  menuItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
});
