import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, TextInput, Alert, Modal } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { planApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';

export default function TaskDetailScreen() {
  const { itemId } = useSafeSearchParams<{ itemId: string }>();
  const router = useSafeRouter();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveDate, setMoveDate] = useState('');

  useEffect(() => {
    if (itemId) loadItem();
  }, [itemId]);

  const loadItem = async () => {
    try {
      const result = await planApi.getItem(itemId);
      setItem(result.item);
      setEditTitle(result.item?.title || '');
      setEditDesc(result.item?.description || '');
    } catch {
      Alert.alert('错误', '加载任务详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!item) return;
    try {
      await planApi.completeItem(item.id, !item.is_completed);
      await loadItem();
    } catch {
      Alert.alert('错误', '更新失败');
    }
  };

  const handleSaveEdit = async () => {
    if (!item) return;
    try {
      await planApi.updateItem(item.id, { title: editTitle, description: editDesc });
      setEditing(false);
      await loadItem();
    } catch {
      Alert.alert('错误', '保存失败');
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!item) return;
    setShowDeleteConfirm(false);
    try {
      await planApi.deleteItem(item.id);
      router.back();
    } catch {
      alert('删除失败');
    }
  };

  const handleMove = async () => {
    if (!item || !moveDate) return;
    try {
      await planApi.moveItem(item.id, moveDate);
      setShowMoveModal(false);
      await loadItem();
    } catch {
      Alert.alert('错误', '移动失败');
    }
  };

  if (loading) {
    return (
      <Screen safeAreaEdges={['left', 'right']} backgroundColor="#FAFAF8">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen safeAreaEdges={['left', 'right']} backgroundColor="#FAFAF8">
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>任务不存在</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right']} backgroundColor="#FAFAF8">
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="chevron-left" size={18} color="#7B2D8E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>任务详情</Text>
          <TouchableOpacity onPress={() => setShowMenu(true)} style={styles.menuBtn}>
            <FontAwesome6 name="ellipsis-vertical" size={20} color="#7B2D8E" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status Badge */}
        <View style={styles.statusRow}>
          <TouchableOpacity style={styles.statusBadge} onPress={handleToggleComplete}>
            <View style={[styles.statusDot, item.is_completed && styles.statusDotDone]} />
            <Text style={[styles.statusText, item.is_completed && styles.statusTextDone]}>
              {item.is_completed ? '已完成' : '未完成'}
            </Text>
          </TouchableOpacity>
          {item.due_date && (
            <View style={styles.dateBadge}>
              <FontAwesome6 name="calendar" size={12} color="#9CA3AF" />
              <Text style={styles.dateText}>{item.due_date}</Text>
            </View>
          )}
        </View>

        {/* Title & Description */}
        {editing ? (
          <View style={styles.editSection}>
            <TextInput
              style={styles.editTitleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="任务标题"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.editDescInput}
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="任务描述（可选）"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                <Text style={styles.saveBtnText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.infoSection}>
            <Text style={styles.title}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : (
              <Text style={styles.noDesc}>暂无描述</Text>
            )}
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <FontAwesome6 name="clock" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>
              创建于 {new Date(item.created_at).toLocaleDateString('zh-CN')}
            </Text>
          </View>
          {item.completed_at && (
            <View style={styles.metaRow}>
              <FontAwesome6 name="circle-check" size={14} color="#16A34A" />
              <Text style={styles.metaText}>
                完成于 {new Date(item.completed_at).toLocaleDateString('zh-CN')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Menu Modal */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContent}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setEditing(true); }}>
              <FontAwesome6 name="pen" size={16} color="#374151" />
              <Text style={styles.menuItemText}>编辑任务</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setShowMenu(false); setShowMoveModal(true); }}>
              <FontAwesome6 name="calendar-days" size={16} color="#374151" />
              <Text style={styles.menuItemText}>延后/移动日期</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItemDanger} onPress={() => { setShowMenu(false); handleDelete(); }}>
              <FontAwesome6 name="trash" size={16} color="#DC2626" />
              <Text style={styles.menuItemDangerText}>删除任务</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Move Date Modal */}
      <Modal visible={showMoveModal} transparent animationType="slide" onRequestClose={() => setShowMoveModal(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMoveModal(false)}>
          <View style={styles.moveModal}>
            <Text style={styles.moveTitle}>选择新日期</Text>
            <TextInput
              style={styles.moveDateInput}
              value={moveDate}
              onChangeText={setMoveDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.moveActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMoveModal(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleMove}>
                <Text style={styles.saveBtnText}>确认移动</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade" onRequestClose={() => setShowDeleteConfirm(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowDeleteConfirm(false)}>
          <View style={styles.deleteModal}>
            <FontAwesome6 name="trash" size={32} color="#DC2626" style={{ marginBottom: 12 }} />
            <Text style={styles.deleteTitle}>确认删除</Text>
            <Text style={styles.deleteDesc}>确定要删除这个任务吗？此操作不可撤销。</Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
                <Text style={styles.deleteBtnText}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  header: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E' },
  menuBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  statusDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#D1D5DB' },
  statusDotDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  statusText: { fontSize: 13, color: '#6B7280' },
  statusTextDone: { color: '#16A34A' },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  dateText: { fontSize: 13, color: '#6B7280' },
  infoSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  description: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
  noDesc: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },
  editSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16 },
  editTitleInput: { fontSize: 18, fontWeight: '600', color: '#1A1A2E', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  editDescInput: { fontSize: 15, color: '#4B5563', minHeight: 100, paddingVertical: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  metaSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  metaText: { fontSize: 13, color: '#6B7280' },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { color: '#6B7280', fontSize: 14 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7B2D8E' },
  saveBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  menuContent: { backgroundColor: '#FFF', borderRadius: 16, width: 240, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemText: { fontSize: 15, color: '#374151' },
  menuItemDanger: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  menuItemDangerText: { fontSize: 15, color: '#DC2626' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6' },
  moveModal: { backgroundColor: '#FFF', borderRadius: 20, width: 300, padding: 24 },
  moveTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E', marginBottom: 16, textAlign: 'center' },
  moveDateInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', marginBottom: 16 },
  moveActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  deleteModal: { backgroundColor: '#FFF', borderRadius: 20, width: 280, padding: 24, alignItems: 'center' },
  deleteTitle: { fontSize: 17, fontWeight: '600', color: '#1A1A2E', marginBottom: 8 },
  deleteDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  deleteActions: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  deleteBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#DC2626' },
  deleteBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
