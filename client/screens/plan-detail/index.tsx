import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, TouchableWithoutFeedback, Platform } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { planApi } from '@/utils/api';
import { SmartDateInput } from '@/components/SmartDateInput';
import { useUser } from '@/contexts/UserContext';

interface PlanItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  is_completed: boolean;
  sort_order: number;
}

interface Plan {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  is_active: boolean;
  items: PlanItem[];
}

export default function PlanDetailScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ planId: string }>();
  const { user } = useUser();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemDueDate, setNewItemDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPlan = useCallback(async () => {
    if (!user || !params.planId) return;
    try {
      setLoading(true);
      const result = await planApi.getPlanDetail(params.planId);
      setPlan(result);
    } catch (error) {
      console.error('Failed to load plan:', error);
    } finally {
      setLoading(false);
    }
  }, [user, params.planId]);

  useFocusEffect(useCallback(() => { loadPlan(); }, [loadPlan]));

  const handleAddItem = async () => {
    if (!newItemTitle.trim() || !plan) return;
    setSaving(true);
    try {
      await planApi.addItem(plan.id, {
        title: newItemTitle.trim(),
        description: newItemDescription.trim() || undefined,
        due_date: newItemDueDate.trim() || undefined,
      });
      setShowAddItemModal(false);
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemDueDate('');
      loadPlan();
    } catch (error) {
      console.error('Failed to add item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    if (!plan) return;
    try {
      await planApi.updateItem(itemId, { is_completed: !currentStatus });
      loadPlan();
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!plan) return;
    try {
      await planApi.deleteItem(itemId);
      loadPlan();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置';
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getStatusColor = (isCompleted: boolean) => {
    return isCompleted ? '#10B981' : '#D1D5DB';
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B2D8E" />
        </View>
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyText}>计划不存在</Text>
        </View>
      </Screen>
    );
  }

  const completedCount = plan.items.filter(item => item.is_completed).length;
  const totalCount = plan.items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome6 name="chevron-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>计划详情</Text>
        <TouchableOpacity onPress={() => setShowAddItemModal(true)} style={styles.addBtn}>
          <FontAwesome6 name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Info Card */}
        <View style={styles.planCard}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {plan.description && (
            <Text style={styles.planDescription}>{plan.description}</Text>
          )}
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <FontAwesome6 name="calendar-day" size={14} color="#7B2D8E" />
              <Text style={styles.dateText}>开始: {formatDate(plan.start_date)}</Text>
            </View>
            <View style={styles.dateItem}>
              <FontAwesome6 name="calendar-check" size={14} color="#7B2D8E" />
              <Text style={styles.dateText}>结束: {formatDate(plan.end_date)}</Text>
            </View>
          </View>
          
          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>完成进度</Text>
              <Text style={styles.progressPercent}>{progress}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressCount}>{completedCount}/{totalCount} 项已完成</Text>
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>任务列表</Text>
          {plan.items.length === 0 ? (
            <View style={styles.emptyItems}>
              <FontAwesome6 name="list-check" size={32} color="#D1D5DB" />
              <Text style={styles.emptyItemsText}>暂无任务</Text>
              <Text style={styles.emptyItemsSubText}>点击右上角 + 添加任务</Text>
            </View>
          ) : (
            plan.items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleToggleItem(item.id, item.is_completed)}
                >
                  <View style={[styles.checkboxInner, { backgroundColor: getStatusColor(item.is_completed) }]}>
                    {item.is_completed && <FontAwesome6 name="check" size={12} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, item.is_completed && styles.itemTitleCompleted]}>
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={styles.itemDescription}>{item.description}</Text>
                  )}
                  {item.due_date && (
                    <View style={styles.itemDateRow}>
                      <FontAwesome6 name="clock" size={12} color="#6B7280" />
                      <Text style={styles.itemDateText}>截止: {formatDate(item.due_date)}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteItemBtn}
                  onPress={() => handleDeleteItem(item.id)}
                >
                  <FontAwesome6 name="trash" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showAddItemModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => !saving && setShowAddItemModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>添加任务</Text>
                    <TouchableOpacity onPress={() => !saving && setShowAddItemModal(false)}>
                      <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.inputLabel}>任务标题 *</Text>
                    <TextInput
                      style={styles.input}
                      value={newItemTitle}
                      onChangeText={setNewItemTitle}
                      placeholder="输入任务标题"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.inputLabel}>任务描述</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={newItemDescription}
                      onChangeText={setNewItemDescription}
                      placeholder="输入任务描述（可选）"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />

                    <SmartDateInput
                      label="截止日期"
                      value={newItemDueDate || null}
                      onChange={setNewItemDueDate}
                      placeholder="可选"
                      containerStyle={{ marginBottom: 0 }}
                      iconColor="#7B2D8E"
                    />
                  </View>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => !saving && setShowAddItemModal(false)}
                      disabled={saving}
                    >
                      <Text style={styles.cancelBtnText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.confirmBtn, (!newItemTitle.trim() || saving) && styles.confirmBtnDisabled]}
                      onPress={handleAddItem}
                      disabled={!newItemTitle.trim() || saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmBtnText}>添加</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7B2D8E', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 16 },
  planCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  planTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  planDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 12 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: '#6B7280' },
  progressSection: { marginTop: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  progressPercent: { fontSize: 14, fontWeight: '700', color: '#7B2D8E' },
  progressBar: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#7B2D8E', borderRadius: 4 },
  progressCount: { fontSize: 12, color: '#6B7280', marginTop: 6 },
  itemsSection: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  emptyItems: { alignItems: 'center', paddingVertical: 32 },
  emptyItemsText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  emptyItemsSubText: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  itemCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, marginBottom: 8 },
  checkbox: { padding: 4, marginRight: 12 },
  checkboxInner: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  itemTitleCompleted: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  itemDescription: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  itemDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemDateText: { fontSize: 12, color: '#6B7280' },
  deleteItemBtn: { padding: 8 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, fontSize: 15, color: '#111827', marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#F3F4F6' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  confirmBtn: { backgroundColor: '#7B2D8E' },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
