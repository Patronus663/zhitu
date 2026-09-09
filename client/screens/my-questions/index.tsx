import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl, Alert, Modal } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useUser } from '@/contexts/UserContext';
import { questionApi } from '@/utils/api';
import { shareQuestion } from '@/utils/share';

interface Question {
  id: string;
  user_question_id: string;
  content: string;
  answer: string;
  subject: string;
  question_type: string;
  knowledge_points: string[];
  methods: string[];
  difficulty: number;
  wrong_answer?: string;
  error_analysis?: string;
  images?: string[];
  created_at: string;
}

export default function MyQuestionsScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  const loadQuestions = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await questionApi.getMyQuestions(user.id);
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadQuestions();
    }, [loadQuestions])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadQuestions();
  }, [loadQuestions]);

  const filteredQuestions = selectedSubject === '全部'
    ? questions
    : questions.filter(q => q.subject === selectedSubject);

  // Dynamically generate subject filters based on questions
  const subjectFilters = ['全部', ...Array.from(new Set(questions.map(q => q.subject).filter(Boolean)))];

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      '数学': '#7B2D8E',
      '物理': '#0EA5E9',
      '化学': '#10B981',
      '生物': '#F59E0B',
      '英语': '#EF4444',
      '语文': '#8B5CF6',
      '历史': '#D97706',
      '地理': '#059669',
      '政治': '#DC2626',
    };
    return colors[subject] || '#6B7280';
  };

  const getDifficultyStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FontAwesome6
        key={i}
        name="star"
        size={12}
        color={i < difficulty ? '#F59E0B' : '#E5E7EB'}
      />
    ));
  };

  const handleDeleteQuestion = (question: Question) => {
    setMenuVisible(false);
    setQuestionToDelete(question);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    setDeleteConfirmVisible(false);
    try {
      await questionApi.deleteQuestion(questionToDelete.id);
      setQuestions((prev) => prev.filter((q) => q.user_question_id !== questionToDelete.user_question_id));
    } catch {
      Alert.alert('错误', '删除失败，请重试');
    }
    setQuestionToDelete(null);
  };

  const handleMenuPress = (item: Question) => {
    setSelectedQuestion(item);
    setMenuVisible(true);
  };

  const handleMenuAction = (action: string) => {
    if (!selectedQuestion) return;
    setMenuVisible(false);
    
    switch (action) {
      case 'view':
        router.push('/question-detail', { questionId: selectedQuestion.id });
        break;
      case 'delete':
        if (selectedQuestion) {
          handleDeleteQuestion(selectedQuestion);
        }
        break;
      case 'share':
        shareQuestion(selectedQuestion);
        break;
    }
  };

  const renderQuestionCard = ({ item }: { item: Question }) => (
    <TouchableOpacity
      style={styles.questionCard}
      onPress={() => router.push('/question-detail', { questionId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.subjectBadge, { backgroundColor: getSubjectColor(item.subject) + '20' }]}>
          <Text style={[styles.subjectText, { color: getSubjectColor(item.subject) }]}>
            {item.subject}
          </Text>
        </View>
        <View style={styles.difficultyContainer}>
          {getDifficultyStars(item.difficulty)}
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => handleMenuPress(item)}
        >
          <FontAwesome6 name="ellipsis-vertical" size={16} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text style={styles.questionContent} numberOfLines={3}>
        {item.content}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{item.question_type}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>

      {item.knowledge_points && item.knowledge_points.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.knowledge_points.slice(0, 3).map((point, index) => (
            <View key={index} style={styles.tagBadge}>
              <Text style={styles.tagText}>{point}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome6 name="inbox" size={48} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>暂无错题</Text>
      <Text style={styles.emptySubtitle}>
        去录入页面添加你的第一道错题吧
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/question-entry')}
      >
        <FontAwesome6 name="plus" size={16} color="#FFFFFF" />
        <Text style={styles.addButtonText}>录入错题</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的错题</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{questions.length}</Text>
          <Text style={styles.statLabel}>总题数</Text>
        </View>
        {subjectFilters.filter(s => s !== '全部').map((subject, index) => (
          [
            <View key={`divider-${index}`} style={styles.statDivider} />,
            <View key={subject} style={styles.statItem}>
              <Text style={styles.statNumber}>
                {questions.filter(q => q.subject === subject).length}
              </Text>
              <Text style={styles.statLabel}>{subject}</Text>
            </View>
          ]
        ))}
      </View>

      <View style={styles.filterBar}>
        {subjectFilters.map((subject) => (
          <TouchableOpacity
            key={subject}
            style={[
              styles.filterButton,
              selectedSubject === subject && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedSubject(subject)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedSubject === subject && styles.filterButtonTextActive,
              ]}
            >
              {subject}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredQuestions}
        renderItem={renderQuestionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* 操作菜单弹窗 */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('view')}
            >
              <FontAwesome6 name="eye" size={18} color="#374151" />
              <Text style={styles.menuItemText}>查看详情</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('share')}
            >
              <FontAwesome6 name="share-nodes" size={18} color="#374151" />
              <Text style={styles.menuItemText}>分享题目</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuAction('delete')}
            >
              <FontAwesome6 name="trash" size={18} color="#DC2626" />
              <Text style={[styles.menuItemText, { color: '#DC2626' }]}>删除题目</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContainer}>
            <FontAwesome6 name="triangle-exclamation" size={32} color="#DC2626" />
            <Text style={styles.deleteModalTitle}>确认删除</Text>
            <Text style={styles.deleteModalText}>确定要删除这道错题吗？此操作不可撤销。</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={styles.deleteModalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#7B2D8E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#7B2D8E',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#7B2D8E',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#7B2D8E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subjectBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  questionContent: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cardFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tagBadge: {
    backgroundColor: '#7B2D8E15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#7B2D8E',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B2D8E',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
