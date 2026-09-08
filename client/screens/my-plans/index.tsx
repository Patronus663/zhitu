import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useUser } from '@/contexts/UserContext';
import { planApi } from '@/utils/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

interface Plan {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  total_items: number;
  completed_items: number;
  created_at: string;
}

function statusIsActive(plan: Plan): boolean {
  if (plan.total_items === 0) return false;
  if (Number(plan.completed_items) >= Number(plan.total_items)) return false;
  return true;
}

function getPlanStatus(plan: Plan): string {
  if (plan.total_items === 0) return '待添加任务';
  if (Number(plan.completed_items) >= Number(plan.total_items)) return '已完成';
  return '进行中';
}

export default function MyPlansScreen() {
  const router = useSafeRouter();
  const { user } = useUser();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await planApi.getUserPlans(user.id);
      setPlans(result || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans])
  );

  const handleAddPlan = async () => {
    if (!user?.id || !newTitle.trim()) return;
    setSaving(true);
    try {
      await planApi.create({
        user_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        start_date: newStartDate || undefined,
        end_date: newEndDate || undefined,
        plan_type: 'long_term',
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewStartDate('');
      setNewEndDate('');
      loadPlans();
    } catch (error) {
      console.error('Failed to create plan:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = (planId: string) => {
    setPlanToDelete(planId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setDeleting(true);
    try {
      await planApi.delete(planToDelete);
      setShowDeleteModal(false);
      setPlanToDelete(null);
      loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    } finally {
      setDeleting(false);
    }
  };

  const renderPlanCard = ({ item }: { item: Plan }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() => router.push('/plan-detail', { planId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.planHeader}>
        <View style={styles.planTitleContainer}>
          <FontAwesome6 name="calendar-check" size={18} color="#7B2D8E" />
          <Text style={styles.planTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={(e) => {
            e.stopPropagation();
            handleDeletePress(item.id);
          }}
        >
          <FontAwesome6 name="trash" size={14} color="#EF4444" />
        </TouchableOpacity>
      </View>
      {item.description ? (
        <Text style={styles.planDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <View style={styles.planFooter}>
        {item.start_date ? (
          <View style={styles.dateTag}>
            <FontAwesome6 name="calendar" size={10} color="#6B7280" />
            <Text style={styles.dateText}>开始: {item.start_date}</Text>
          </View>
        ) : null}
        {item.end_date ? (
          <View style={styles.dateTag}>
            <FontAwesome6 name="calendar-xmark" size={10} color="#6B7280" />
            <Text style={styles.dateText}>结束: {item.end_date}</Text>
          </View>
        ) : null}
        <View style={[styles.statusTag, statusIsActive(item) ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, statusIsActive(item) ? styles.statusTextActive : styles.statusTextInactive]}>
            {getPlanStatus(item)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B2D8E" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FontAwesome6 name="chevron-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的计划</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addBtn}>
          <FontAwesome6 name="plus" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {plans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="calendar-xmark" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>暂无计划</Text>
          <Text style={styles.emptySubText}>点击右上角 + 创建你的第一个长期计划</Text>
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Plan Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={() => !saving && setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <KeyboardAvoidingView
                style={styles.modalContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>创建新计划</Text>
                    <TouchableOpacity onPress={() => !saving && setShowAddModal(false)}>
                      <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.modalBody}>
                    <Text style={styles.inputLabel}>计划名称 *</Text>
                    <TextInput
                      style={styles.input}
                      value={newTitle}
                      onChangeText={setNewTitle}
                      placeholder="输入计划名称"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.inputLabel}>计划描述</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={newDescription}
                      onChangeText={setNewDescription}
                      placeholder="输入计划描述（可选）"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                    />

                    <Text style={styles.inputLabel}>开始日期</Text>
                    <TextInput
                      style={styles.input}
                      value={newStartDate}
                      onChangeText={setNewStartDate}
                      placeholder="YYYY-MM-DD（可选）"
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.inputLabel}>结束日期</Text>
                    <TextInput
                      style={styles.input}
                      value={newEndDate}
                      onChangeText={setNewEndDate}
                      placeholder="YYYY-MM-DD（可选）"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => !saving && setShowAddModal(false)}
                      disabled={saving}
                    >
                      <Text style={styles.cancelBtnText}>取消</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtn, (!newTitle.trim() || saving) && styles.saveBtnDisabled]}
                      onPress={handleAddPlan}
                      disabled={!newTitle.trim() || saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>创建</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => !deleting && setShowDeleteModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.deleteModalContent}>
                <View style={styles.deleteIconContainer}>
                  <FontAwesome6 name="triangle-exclamation" size={32} color="#EF4444" />
                </View>
                <Text style={styles.deleteTitle}>确认删除</Text>
                <Text style={styles.deleteMessage}>确定要删除这个计划吗？此操作不可撤销。</Text>
                <View style={styles.deleteBtnRow}>
                  <TouchableOpacity
                    style={[styles.deleteActionBtn, styles.deleteCancelBtn]}
                    onPress={() => !deleting && setShowDeleteModal(false)}
                    disabled={deleting}
                  >
                    <Text style={styles.deleteCancelBtnText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteActionBtn, styles.deleteConfirmBtn]}
                    onPress={handleConfirmDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.deleteConfirmBtnText}>删除</Text>
                    )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B2D8E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  planTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  planFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusTextActive: {
    color: '#16A34A',
  },
  statusTextInactive: {
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveBtn: {
    backgroundColor: '#7B2D8E',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  deleteMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteCancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  deleteCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteConfirmBtn: {
    backgroundColor: '#EF4444',
  },
  deleteConfirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
