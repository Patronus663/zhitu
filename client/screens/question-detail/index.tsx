import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { questionApi } from '@/utils/api';

interface QuestionDetail {
  id: string;
  content: string;
  answer: string;
  subject: string;
  question_type: string;
  difficulty: number;
  knowledge_points: string[];
  methods: string[];
  error_analysis?: string;
  wrong_answer?: string;
  is_mastered: boolean;
  created_at: string;
}

export default function QuestionDetailScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ questionId: string }>();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuestion = useCallback(async () => {
    if (!params.questionId) return;
    try {
      setLoading(true);
      const data = await questionApi.getQuestionDetail(params.questionId);
      setQuestion(data);
    } catch (error) {
      console.error('Failed to load question:', error);
    } finally {
      setLoading(false);
    }
  }, [params.questionId]);

  useFocusEffect(
    useCallback(() => {
      loadQuestion();
    }, [loadQuestion])
  );

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
        size={14}
        color={i < difficulty ? '#F59E0B' : '#E5E7EB'}
      />
    ));
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  if (!question) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>题目不存在</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>题目详情</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Subject and Difficulty */}
        <View style={styles.topBar}>
          <View style={[styles.subjectBadge, { backgroundColor: getSubjectColor(question.subject) + '20' }]}>
            <Text style={[styles.subjectText, { color: getSubjectColor(question.subject) }]}>
              {question.subject}
            </Text>
          </View>
          <View style={styles.difficultyContainer}>
            {getDifficultyStars(question.difficulty)}
          </View>
        </View>

        {/* Question Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>题目内容</Text>
          <View style={styles.questionBox}>
            <Text style={styles.questionText}>{question.content}</Text>
          </View>
        </View>

        {/* Wrong Answer (if exists) */}
        {question.wrong_answer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>我的错误答案</Text>
            <View style={[styles.answerBox, styles.wrongAnswerBox]}>
              <Text style={styles.wrongAnswerText}>{question.wrong_answer}</Text>
            </View>
          </View>
        )}

        {/* Correct Answer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>正确答案</Text>
          <View style={[styles.answerBox, styles.correctAnswerBox]}>
            <Text style={styles.correctAnswerText}>{question.answer}</Text>
          </View>
        </View>

        {/* Error Analysis */}
        {question.error_analysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>错因分析</Text>
            <View style={styles.analysisBox}>
              <Text style={styles.analysisText}>{question.error_analysis}</Text>
            </View>
          </View>
        )}

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>知识点</Text>
          <View style={styles.tagsContainer}>
            {question.knowledge_points?.map((point, index) => (
              <View key={index} style={styles.tagBadge}>
                <Text style={styles.tagText}>{point}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Methods */}
        {question.methods && question.methods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>解题方法</Text>
            <View style={styles.tagsContainer}>
              {question.methods.map((method, index) => (
                <View key={index} style={[styles.tagBadge, styles.methodBadge]}>
                  <Text style={styles.methodText}>{method}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Question Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>题型</Text>
          <Text style={styles.typeText}>{question.question_type}</Text>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>录入时间</Text>
          <Text style={styles.dateText}>
            {new Date(question.created_at).toLocaleString('zh-CN')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholder: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  subjectBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  subjectText: {
    fontSize: 13,
    fontWeight: '600',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  questionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  questionText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
  },
  answerBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  wrongAnswerBox: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  wrongAnswerText: {
    fontSize: 16,
    color: '#B91C1C',
    lineHeight: 24,
    fontWeight: '500',
  },
  correctAnswerBox: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#15803D',
    lineHeight: 24,
    fontWeight: '500',
  },
  analysisBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  analysisText: {
    fontSize: 15,
    color: '#78350F',
    lineHeight: 22,
    fontWeight: '500',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  methodBadge: {
    backgroundColor: '#DDD6FE',
  },
  methodText: {
    fontSize: 14,
    color: '#4C1D95',
    fontWeight: '600',
  },
  typeText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  dateText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
