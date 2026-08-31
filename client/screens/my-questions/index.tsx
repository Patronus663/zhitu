import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useUser } from '@/contexts/UserContext';
import { questionApi } from '@/utils/api';

interface Question {
  id: string;
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
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {questions.filter(q => q.subject === '数学').length}
          </Text>
          <Text style={styles.statLabel}>数学</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {questions.filter(q => q.subject === '物理').length}
          </Text>
          <Text style={styles.statLabel}>物理</Text>
        </View>
      </View>

      <FlatList
        data={questions}
        renderItem={renderQuestionCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
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
});
