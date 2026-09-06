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
  Alert,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

interface Plan {
  id: string;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

export default function MyPlansScreen() {
  const router = useSafeRouter();
  const { user } = useUser();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [saving, setSaving] = useState(false);

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
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewStartDate('');
      setNewEndDate('');
      loadPlans();
    } catch (error) {
      Alert.alert('错误', '创建计划失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    Alert.alert('确认删除', '确定要删除这个计划吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await planApi.delete(planId);
            loadPlans();
          } catch (error) {
            Alert.alert('错误', '删除计划失败');
          }
        },
      },
    ]);
  };

  const renderPlanCard = ({ item }: { item: Plan }) => (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planTitleContainer}>
          <FontAwesome6 name="calendar-check" size={18} color="#7B2D8E" />
          <Text style={styles.planTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeletePlan(item.id)}
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
      </View>
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, item.is_active ? styles.activeDot : styles.inactiveDot]} />
        <Text style={styles.statusText}>{item.is_active ? '进行中' : '已结束'}</Text>
      </View>
    </View>
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
          <FontAwesome6 name="calendar-days" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>暂无长期计划</Text>
          <Text style={styles.emptySubtext}>点击右上角 + 添加新计划</Text>
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
        <TouchableWithoutFeedback onPress={() => !saving && setShowAddModal(false)} disabled={Platform.OS === 'web'}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} disabled={Platform.OS === 'web'}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>新建长期计划</Text>
                    <TouchableOpacity onPress={() => setShowAddModal(false)} disabled={saving}>
                      <FontAwesome6 name="xmark" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>计划名称 *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="例如：考研复习计划"
                      value={newTitle}
                      onChangeText={setNewTitle}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>计划描述</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="描述你的计划目标..."
                      value={newDescription}
                      onChangeText={setNewDescription}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  <View style={styles.dateRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>开始日期</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="2026-09-01"
                        value={newStartDate}
                        onChangeText={setNewStartDate}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>结束日期</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="2026-12-31"
                        value={newEndDate}
                        onChangeText={setNewEndDate}
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, (!newTitle.trim() || saving) && styles.submitBtnDisabled]}
                    onPress={handleAddPlan}
                    disabled={!newTitle.trim() || saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>创建计划</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B2D8E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: 16 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  planTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginLeft: 8 },
  deleteBtn: { padding: 8 },
  planDescription: { fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  planFooter: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  dateText: { fontSize: 12, color: '#6B7280', marginLeft: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  activeDot: { backgroundColor: '#10B981' },
  inactiveDot: { backgroundColor: '#9CA3AF' },
  statusText: { fontSize: 12, color: '#6B7280' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', marginBottom: 16 },
  submitBtn: {
    backgroundColor: '#7B2D8E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
