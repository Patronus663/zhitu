import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useUser } from '@/contexts/UserContext';
import { planApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface TaskItem {
  id: string;
  title: string;
  description: string;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

export default function TaskDetailScreen() {
  const router = useSafeRouter();
  const { itemId } = useSafeSearchParams<{ itemId: string }>();
  const { user } = useUser();

  const [item, setItem] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDate, setEditDate] = useState('');
  const [moveDate, setMoveDate] = useState('');

  const fetchItem = useCallback(async () => {
    if (!itemId) return;
    try {
      setLoading(true);
      const result = await planApi.getItem(itemId);
      setItem(result.item);
      setEditTitle(result.item.title);
      setEditDesc(result.item.description || '');
      setEditDate(result.item.due_date || '');
    } catch (err) {
      console.error('Failed to fetch item:', err);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useFocusEffect(() => {
    fetchItem();
  });

  const handleComplete = async () => {
    if (!item) return;
    try {
      const newStatus = !item.is_completed;
      await planApi.completeItem(item.id, newStatus);
      setItem({ ...item, is_completed: newStatus });
    } catch (err) {
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  const handleSaveEdit = async () => {
    if (!item || !editTitle.trim()) return;
    try {
      const updates: { title?: string; description?: string; due_date?: string } = {};
      if (editTitle.trim() !== item.title) updates.title = editTitle.trim();
      if (editDesc.trim() !== (item.description || '')) updates.description = editDesc.trim();
      if (editDate !== (item.due_date || '')) updates.due_date = editDate;

      if (Object.keys(updates).length > 0) {
        await planApi.updateItem(item.id, updates);
        setItem({ ...item, ...updates });
      }
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('确认删除', '确定要删除这个任务吗？删除后无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await planApi.deleteItem(item.id);
            router.back();
          } catch (err) {
            Alert.alert('错误', '删除失败，请重试');
          }
        },
      },
    ]);
  };

  const handlePostpone = async (days: number) => {
    if (!item || !item.due_date) return;
    try {
      const current = new Date(item.due_date);
      current.setDate(current.getDate() + days);
      const newDate = current.toISOString().split('T')[0];
      await planApi.rescheduleItem(item.id, newDate);
      setItem({ ...item, due_date: newDate });
      setEditDate(newDate);
    } catch (err) {
      Alert.alert('错误', '延后失败，请重试');
    }
  };

  const handleMoveToDate = async () => {
    if (!item || !moveDate) return;
    try {
      await planApi.rescheduleItem(item.id, moveDate);
      setItem({ ...item, due_date: moveDate });
      setEditDate(moveDate);
      setDateModalVisible(false);
    } catch (err) {
      Alert.alert('错误', '移动失败，请重试');
    }
  };

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>任务不存在</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>返回</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const isOverdue = item.due_date && item.due_date < getTodayStr() && !item.is_completed;

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
              <FontAwesome6 name="arrow-left" size={18} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>任务详情</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Task Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.statusRow}>
              <TouchableOpacity onPress={handleComplete} style={styles.statusBtn}>
                <View style={[styles.checkbox, item.is_completed && styles.checkboxDone]}>
                  {item.is_completed && <FontAwesome6 name="check" size={14} color="#FFF" />}
                </View>
                <Text style={styles.statusText}>
                  {item.is_completed ? '已完成' : isOverdue ? '已逾期' : '未完成'}
                </Text>
              </TouchableOpacity>
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>逾期</Text>
                </View>
              )}
            </View>

            <Text style={styles.taskTitle}>{item.title}</Text>

            {item.description ? (
              <Text style={styles.taskDesc}>{item.description}</Text>
            ) : null}

            <View style={styles.dateRow}>
              <FontAwesome6 name="calendar" size={14} color="#9CA3AF" />
              <Text style={styles.dateText}>
                {item.due_date || '未设置截止日期'}
              </Text>
            </View>

            {item.completed_at && (
              <View style={styles.dateRow}>
                <FontAwesome6 name="circle-check" size={14} color="#7B2D8E" />
                <Text style={[styles.dateText, { color: '#7B2D8E' }]}>
                  完成于 {new Date(item.completed_at).toLocaleString('zh-CN')}
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.actionsTitle}>操作</Text>

            <TouchableOpacity style={styles.actionItem} onPress={() => setEditModalVisible(true)}>
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8F9' }]}>
                <FontAwesome6 name="pen" size={16} color="#7B2D8E" />
              </View>
              <Text style={styles.actionLabel}>编辑任务</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                setMoveDate(item.due_date || getTodayStr());
                setDateModalVisible(true);
              }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                <FontAwesome6 name="calendar-days" size={16} color="#2563EB" />
              </View>
              <Text style={styles.actionLabel}>移动到...</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>

            {!item.is_completed && (
              <>
                <TouchableOpacity style={styles.actionItem} onPress={() => handlePostpone(1)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <FontAwesome6 name="clock" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.actionLabel}>延后1天</Text>
                  <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => handlePostpone(3)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <FontAwesome6 name="clock" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.actionLabel}>延后3天</Text>
                  <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionItem} onPress={() => handlePostpone(7)}>
                  <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                    <FontAwesome6 name="clock" size={16} color="#D97706" />
                  </View>
                  <Text style={styles.actionLabel}>延后1周</Text>
                  <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={[styles.actionItem, styles.deleteAction]} onPress={handleDelete}>
              <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
                <FontAwesome6 name="trash" size={16} color="#DC2626" />
              </View>
              <Text style={[styles.actionLabel, { color: '#DC2626' }]}>删除任务</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Edit Modal */}
        <Modal visible={editModalVisible} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
            disabled={Platform.OS === 'web'}
          >
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>编辑任务</Text>
                    <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                      <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody}>
                    <Text style={styles.inputLabel}>任务标题</Text>
                    <TextInput
                      style={styles.input}
                      value={editTitle}
                      onChangeText={setEditTitle}
                      placeholder="输入任务标题"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.inputLabel}>任务描述</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={editDesc}
                      onChangeText={setEditDesc}
                      placeholder="输入任务描述（可选）"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />

                    <Text style={styles.inputLabel}>截止日期</Text>
                    <TextInput
                      style={styles.input}
                      value={editDate}
                      onChangeText={setEditDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setEditModalVisible(false)}>
                      <Text style={styles.cancelBtnText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSaveEdit}>
                      <Text style={styles.saveBtnText}>保存</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>

        {/* Move Date Modal */}
        <Modal visible={dateModalVisible} transparent animationType="slide">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDateModalVisible(false)}
            disabled={Platform.OS === 'web'}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>移动到指定日期</Text>
                  <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                    <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.inputLabel}>选择日期</Text>
                  <TextInput
                    style={styles.input}
                    value={moveDate}
                    onChangeText={setMoveDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />

                  <View style={styles.quickDates}>
                    <Text style={styles.quickDatesLabel}>快捷选择：</Text>
                    <View style={styles.quickDatesRow}>
                      {(() => {
                        const today = new Date();
                        const dates = [];
                        for (let i = 1; i <= 7; i++) {
                          const d = new Date(today);
                          d.setDate(d.getDate() + i);
                          const dateStr = d.toISOString().split('T')[0];
                          const label = i === 1 ? '明天' : i === 2 ? '后天' : `${i}天后`;
                          dates.push(
                            <TouchableOpacity
                              key={dateStr}
                              style={styles.quickDateBtn}
                              onPress={() => setMoveDate(dateStr)}
                            >
                              <Text style={styles.quickDateText}>{label}</Text>
                              <Text style={styles.quickDateSub}>{dateStr.slice(5)}</Text>
                            </TouchableOpacity>
                          );
                        }
                        return dates;
                      })()}
                    </View>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setDateModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleMoveToDate}>
                    <Text style={styles.saveBtnText}>确认移动</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: '#6B7280' },
  backBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#7B2D8E', borderRadius: 8 },
  backBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#7B2D8E', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  headerBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFF' },

  infoCard: { margin: 20, backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  statusBtn: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  statusText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  overdueBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  overdueText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },

  taskTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  taskDesc: { fontSize: 15, color: '#4B5563', lineHeight: 22, marginBottom: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  dateText: { fontSize: 13, color: '#6B7280' },

  actionsSection: { paddingHorizontal: 20, paddingBottom: 40 },
  actionsTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 12 },
  actionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  deleteAction: { marginTop: 8 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  modalBody: { padding: 20, maxHeight: 400 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  saveBtn: { backgroundColor: '#7B2D8E' },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },

  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, fontSize: 15, color: '#1A1A2E', marginBottom: 16 },
  textArea: { minHeight: 80 },

  quickDates: { marginTop: 8 },
  quickDatesLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  quickDatesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickDateBtn: { backgroundColor: '#F9FAFB', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  quickDateText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  quickDateSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
});
