import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
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
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0 });
  const [weekStats, setWeekStats] = useState({ total: 0, completed: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [quickDatesList, setQuickDatesList] = useState<{ days: number; dateStr: string }[]>([]);
  const [moveDate, setMoveDate] = useState('');
  // Add task modal state
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTarget, setAddTarget] = useState<'today' | 'week'>('today');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  // Hide completed state
  const [hideTodayCompleted, setHideTodayCompleted] = useState(false);
  const [hideWeekCompleted, setHideWeekCompleted] = useState(false);
  // Overdue tasks modal state
  const [overdueModalVisible, setOverdueModalVisible] = useState(false);
  const [overdueItems, setOverdueItems] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const result = await planApi.getToday(user.id);
      setTodayItems(result.today_items || []);
      setWeekItems(result.week_items || []);
      setTodayStats(result.stats?.today || { total: 0, completed: 0 });
      setWeekStats(result.stats?.week || { total: 0, completed: 0 });
    } catch {
      // Silent fail
    }
  }, [user]);

  const checkOverdueTasks = useCallback(async () => {
    if (!user) return;
    try {
      const result = await planApi.getOverdue(user.id);
      if (result.overdue_items && result.overdue_items.length > 0) {
        setOverdueItems(result.overdue_items);
        setOverdueModalVisible(true);
      }
    } catch {
      // Silent fail
    }
  }, [user]);

  const handleMoveOverdueToToday = async () => {
    if (!user) return;
    try {
      await planApi.moveOverdueToToday(user.id);
      setOverdueModalVisible(false);
      setOverdueItems([]);
      await loadData();
    } catch {
      // Silent fail
    }
  };

  const handleDismissOverdue = () => {
    setOverdueModalVisible(false);
    setOverdueItems([]);
  };

  useFocusEffect(useCallback(() => { loadData(); checkOverdueTasks(); }, [loadData, checkOverdueTasks]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleComplete = async (itemId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Determine which list the item is in
    const isTodayItem = todayItems.some(item => item.id === itemId);
    // Optimistic update: update UI immediately
    setTodayItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, is_completed: newStatus } : item
    ));
    setWeekItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, is_completed: newStatus } : item
    ));
    // Update stats: total stays the same, completed changes
    if (isTodayItem) {
      setTodayStats(prev => ({
        total: prev.total,
        completed: newStatus ? prev.completed + 1 : Math.max(0, prev.completed - 1),
      }));
    } else {
      setWeekStats(prev => ({
        total: prev.total,
        completed: newStatus ? prev.completed + 1 : Math.max(0, prev.completed - 1),
      }));
    }

    try {
      await planApi.completeItem(itemId, newStatus);
    } catch {
      // Revert on error
      setTodayItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, is_completed: currentStatus } : item
      ));
      setWeekItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, is_completed: currentStatus } : item
      ));
      if (isTodayItem) {
        setTodayStats(prev => ({
          total: prev.total,
          completed: newStatus ? Math.max(0, prev.completed - 1) : prev.completed + 1,
        }));
      } else {
        setWeekStats(prev => ({
          total: prev.total,
          completed: newStatus ? Math.max(0, prev.completed - 1) : prev.completed + 1,
        }));
      }
      alert('更新失败');
    }
  };

  const handleMenuAction = (action: string) => {
    setMenuVisible(false);
    if (!selectedItem) return;

    if (action === 'edit') {
      router.push(`/task-detail`, { itemId: selectedItem.id });
    } else if (action === 'delete') {
      handleDelete(selectedItem.id);
    } else if (action === 'move') {
      setMoveDate(selectedItem.due_date || '');
      const list = [1, 3, 7].map((days) => {
        const d = new Date(Date.now() + days * 86400000);
        return { days, dateStr: d.toISOString().split('T')[0] };
      });
      setQuickDatesList(list);
      setMoveModalVisible(true);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await planApi.deleteItem(itemId);
      await loadData();
    } catch {
      alert('删除失败');
    }
  };

  const handleMove = async () => {
    if (!selectedItem || !moveDate) return;
    try {
      await planApi.moveItem(selectedItem.id, moveDate);
      setMoveModalVisible(false);
      await loadData();
    } catch {
      alert('移动失败');
    }
  };

  const openMenu = (item: any) => {
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const openAddModal = (target: 'today' | 'week') => {
    setAddTarget(target);
    setNewTaskTitle('');
    setNewTaskDesc('');
    if (target === 'today') {
      setNewTaskDate(new Date().toISOString().split('T')[0]);
    } else {
      const d = new Date(Date.now() + 3 * 86400000);
      setNewTaskDate(d.toISOString().split('T')[0]);
    }
    setAddModalVisible(true);
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      alert('请输入任务标题');
      return;
    }
    if (!user) return;
    try {
      const plans = await planApi.getUserPlans(user.id);
      let activePlan = plans.find((p: any) => p.is_active === true && p.plan_type === 'daily');
      // If no active daily plan exists, create a default one
      if (!activePlan) {
        const result = await planApi.create({
          user_id: user.id,
          title: '我的学习计划',
          description: '自动创建的学习计划',
          plan_type: 'daily',
          items: [],
        });
        activePlan = result.plan;
      }
      // Use the date based on the target (today or week)
      const dueDate = addTarget === 'today'
        ? new Date().toISOString().split('T')[0]
        : newTaskDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      await planApi.addItem(activePlan.id, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        due_date: dueDate,
      });
      setAddModalVisible(false);
      await loadData();
    } catch {
      alert('添加失败');
    }
  };

  const todayTotal = Number(todayStats.total) || 0;
  const todayCompleted = Number(todayStats.completed) || 0;
  const progress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
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
            <Text style={styles.progressSub}>{todayCompleted}/{todayTotal} 项已完成</Text>
          </View>
        </View>

        {/* Today's Tasks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>今日任务</Text>
              {todayItems.length > 0 && (
                <Text style={styles.sectionBadge}>{todayItems.length}</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {todayItems.some(i => i.is_completed) && (
                <TouchableOpacity
                  style={styles.hideBtn}
                  onPress={() => setHideTodayCompleted(!hideTodayCompleted)}
                >
                  <FontAwesome6
                    name={hideTodayCompleted ? 'eye' : 'eye-slash'}
                    size={14}
                    color={hideTodayCompleted ? '#7B2D8E' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal('today')}>
                <FontAwesome6 name="plus" size={16} color="#7B2D8E" />
              </TouchableOpacity>
            </View>
          </View>
          {todayItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <FontAwesome6 name="circle-check" size={32} color="#D1D5DB" />
              <Text style={styles.emptyText}>今日暂无待完成任务</Text>
            </View>
          ) : (
            (hideTodayCompleted ? todayItems.filter(i => !i.is_completed) : todayItems).map((item) => (
              <View key={item.id} style={styles.taskCard}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleComplete(item.id, item.is_completed)}
                >
                  <View style={[styles.checkboxInner, item.is_completed && styles.checkboxDone]}>
                    {item.is_completed && <FontAwesome6 name="check" size={12} color="#FFF" />}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.taskContent}
                  onPress={() => router.push('/task-detail', { itemId: item.id })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.taskTitle, item.is_completed && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  {item.plan_title ? (
                    <Text style={styles.taskPlan} numberOfLines={1}>{item.plan_title}</Text>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.taskDesc} numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuBtn} onPress={() => openMenu(item)}>
                  <FontAwesome6 name="ellipsis-vertical" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* This Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.sectionTitle}>本周计划</Text>
              {weekItems.length > 0 && (
                <Text style={styles.sectionBadge}>{weekStats.completed}/{weekStats.total}</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {weekItems.some(i => i.is_completed) && (
                <TouchableOpacity
                  style={styles.hideBtn}
                  onPress={() => setHideWeekCompleted(!hideWeekCompleted)}
                >
                  <FontAwesome6
                    name={hideWeekCompleted ? 'eye' : 'eye-slash'}
                    size={14}
                    color={hideWeekCompleted ? '#7B2D8E' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={() => openAddModal('week')}>
                <FontAwesome6 name="plus" size={16} color="#7B2D8E" />
              </TouchableOpacity>
            </View>
          </View>
          {weekItems.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>本周暂无更多任务</Text>
            </View>
          ) : (
            (hideWeekCompleted ? weekItems.filter(i => !i.is_completed) : weekItems).slice(0, 5).map((item) => (
              <View key={item.id} style={styles.taskCard}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleComplete(item.id, item.is_completed)}
                >
                  <View style={[styles.checkboxInner, item.is_completed && styles.checkboxDone]}>
                    {item.is_completed && <FontAwesome6 name="check" size={12} color="#FFF" />}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.taskContent}
                  onPress={() => router.push('/task-detail', { itemId: item.id })}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.taskTitle, item.is_completed && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  {item.plan_title ? (
                    <Text style={styles.taskPlan} numberOfLines={1}>{item.plan_title}</Text>
                  ) : null}
                  <Text style={styles.taskDate}>{item.due_date}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuBtn} onPress={() => openMenu(item)}>
                  <FontAwesome6 name="ellipsis-vertical" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
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
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/my-questions')}>
              <View style={[styles.quickIcon, { backgroundColor: '#FEE2E2' }]}>
                <FontAwesome6 name="book" size={20} color="#DC2626" />
              </View>
              <Text style={styles.quickLabel}>我的错题</Text>
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
            <TouchableOpacity style={styles.quickCard} onPress={() => router.push('/my-plans')}>
              <View style={[styles.quickIcon, { backgroundColor: '#EDE9FE' }]}>
                <FontAwesome6 name="calendar-days" size={20} color="#7C3AED" />
              </View>
              <Text style={styles.quickLabel}>我的计划</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Task Menu Modal */}
      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContent}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('edit')}>
              <FontAwesome6 name="pen" size={16} color="#374151" />
              <Text style={styles.menuItemText}>编辑任务</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuAction('move')}>
              <FontAwesome6 name="calendar-days" size={16} color="#374151" />
              <Text style={styles.menuItemText}>延后/移动日期</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItemDanger} onPress={() => handleMenuAction('delete')}>
              <FontAwesome6 name="trash" size={16} color="#DC2626" />
              <Text style={styles.menuItemDangerText}>删除任务</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Move Date Modal */}
      <Modal visible={moveModalVisible} transparent animationType="slide" onRequestClose={() => setMoveModalVisible(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMoveModalVisible(false)}>
          <View style={styles.moveModal}>
            <Text style={styles.moveTitle}>选择新日期</Text>
            <View style={styles.quickDates}>
              {quickDatesList.map(({ days, dateStr }) => (
                <TouchableOpacity
                  key={days}
                  style={styles.quickDateBtn}
                  onPress={() => setMoveDate(dateStr)}
                >
                  <Text style={styles.quickDateText}>+{days}天</Text>
                  <Text style={styles.quickDateSub}>{dateStr}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.moveActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setMoveModalVisible(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleMove}>
                <Text style={styles.saveBtnText}>确认移动</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setAddModalVisible(false)}>
          <View style={styles.menuOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.addModal}>
                  <View style={styles.addModalHeader}>
                    <Text style={styles.addModalTitle}>添加{addTarget === 'today' ? '今日' : '本周'}任务</Text>
                    <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                      <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.addModalBody}>
                    <Text style={styles.addLabel}>任务标题</Text>
                    <TextInput
                      style={styles.addInput}
                      placeholder="输入任务标题"
                      placeholderTextColor="#9CA3AF"
                      value={newTaskTitle}
                      onChangeText={setNewTaskTitle}
                    />
                    <Text style={styles.addLabel}>任务描述（可选）</Text>
                    <TextInput
                      style={[styles.addInput, { height: 80, textAlignVertical: 'top' }]}
                      placeholder="输入任务描述"
                      placeholderTextColor="#9CA3AF"
                      value={newTaskDesc}
                      onChangeText={setNewTaskDesc}
                      multiline
                    />
                    <Text style={styles.addLabel}>截止日期</Text>
                    <TextInput
                      style={styles.addInput}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                      value={newTaskDate}
                      onChangeText={setNewTaskDate}
                    />
                  </View>
                  <View style={styles.moveActions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                      <Text style={styles.cancelBtnText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveBtn} onPress={handleAddTask}>
                      <Text style={styles.saveBtnText}>添加任务</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Overdue Tasks Modal */}
      <Modal visible={overdueModalVisible} transparent animationType="fade" onRequestClose={handleDismissOverdue}>
        <TouchableWithoutFeedback onPress={handleDismissOverdue}>
          <View style={styles.overdueModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.overdueModalContent}>
                <View style={styles.overdueModalIcon}>
                  <FontAwesome6 name="clock" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.overdueModalTitle}>发现未完成的任务</Text>
                <Text style={styles.overdueModalDesc}>
                  你有 {overdueItems.length} 个昨天未完成的任务，是否将它们移动到今天？
                </Text>
                <View style={styles.overdueModalTasks}>
                  {overdueItems.slice(0, 3).map((item, index) => (
                    <View key={item.id || index} style={styles.overdueTaskItem}>
                      <FontAwesome6 name="circle" size={8} color="#9CA3AF" />
                      <Text style={styles.overdueTaskText} numberOfLines={1}>{item.title}</Text>
                    </View>
                  ))}
                  {overdueItems.length > 3 && (
                    <Text style={styles.overdueMoreText}>还有 {overdueItems.length - 3} 个任务...</Text>
                  )}
                </View>
                <View style={styles.overdueModalButtons}>
                  <TouchableOpacity style={styles.overdueBtnCancel} onPress={handleDismissOverdue}>
                    <Text style={styles.overdueBtnCancelText}>否，保持原样</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.overdueBtnConfirm} onPress={handleMoveOverdueToToday}>
                    <Text style={styles.overdueBtnConfirmText}>是，移动到今天</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  checkbox: { padding: 4 },
  checkboxInner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#1A1A2E' },
  taskTitleDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  taskDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  taskPlan: { fontSize: 11, color: '#7B2D8E', marginTop: 2 },
  taskDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  menuBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 },
  quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '500', color: '#374151' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { backgroundColor: '#FFF', borderRadius: 16, width: 240, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 15, color: '#374151' },
  menuItemDanger: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemDangerText: { fontSize: 15, color: '#DC2626' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6' },
  moveModal: { backgroundColor: '#FFF', borderRadius: 20, width: 320, padding: 24 },
  moveTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E', marginBottom: 16, textAlign: 'center' },
  quickDates: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  quickDateBtn: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, alignItems: 'center' },
  quickDateText: { fontSize: 14, fontWeight: '600', color: '#7B2D8E' },
  quickDateSub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  moveActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { color: '#6B7280', fontSize: 14 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7B2D8E' },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  // Add button and modal styles
  addBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center' },
  hideBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  addModal: { backgroundColor: '#FFF', borderRadius: 20, width: 340, padding: 24 },
  addModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addModalTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  addModalBody: { gap: 12, marginBottom: 20 },
  addLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  addInput: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB' },
  // Overdue modal styles
  overdueModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  overdueModalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  overdueModalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  overdueModalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  overdueModalDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  overdueModalTasks: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 20 },
  overdueTaskItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  overdueTaskText: { fontSize: 14, color: '#374151', flex: 1 },
  overdueMoreText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, paddingLeft: 16 },
  overdueModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  overdueBtnCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  overdueBtnCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  overdueBtnConfirm: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#7B2D8E', alignItems: 'center' },
  overdueBtnConfirmText: { fontSize: 14, fontWeight: '600', color: '#FFF' },
});
