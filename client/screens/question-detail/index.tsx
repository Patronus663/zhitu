import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Modal } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { questionApi } from '@/utils/api';
import { shareQuestion } from '@/utils/share';

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
  const params = useSafeSearchParams<{ questionId: string; webQuestion?: any }>();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [isWebQuestion, setIsWebQuestion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadQuestion = useCallback(async () => {
    // 网络来源题目：不查库，直接用检索结果数据展示
    if (params.webQuestion) {
      const w = params.webQuestion;
      setIsWebQuestion(true);
      setQuestion({
        id: w.id || `web-${Date.now()}`,
        content: w.content || '',
        answer: w.answer || '',
        subject: w.subject || '网络题目',
        question_type: w.question_type || '网络题目',
        difficulty: w.difficulty || 3,
        knowledge_points: w.knowledge_points || [],
        methods: w.methods || [],
        error_analysis: undefined,
        wrong_answer: undefined,
        is_mastered: false,
        created_at: new Date().toISOString(),
      } as QuestionDetail);
      setLoading(false);
      return;
    }
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
  }, [params.questionId, params.webQuestion]);

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

  const handleDelete = () => {
    if (!question) return;
    Alert.alert(
      '确认删除',
      '确定要删除这道错题吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await questionApi.deleteQuestion(question.id);
              router.back();
            } catch {
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ]
    );
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
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <FontAwesome6 name="ellipsis-vertical" size={18} color="#6B7280" />
        </TouchableOpacity>
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

        {/* Date / Source */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{isWebQuestion ? '来源' : '录入时间'}</Text>
          <Text style={styles.dateText}>
            {isWebQuestion ? '网络检索结果，仅供参考' : new Date(question.created_at).toLocaleString('zh-CN')}
          </Text>
        </View>
      </ScrollView>

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
            {!isWebQuestion && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push('/question-edit', { questionId: question.id });
                  }}
                >
                  <FontAwesome6 name="pen" size={18} color="#374151" />
                  <Text style={styles.menuItemText}>编辑题目</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                shareQuestion(question);
              }}
            >
              <FontAwesome6 name="share-nodes" size={18} color="#374151" />
              <Text style={styles.menuItemText}>分享题目</Text>
            </TouchableOpacity>
            {!isWebQuestion && (
              <>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    handleDelete();
                  }}
                >
                  <FontAwesome6 name="trash" size={18} color="#DC2626" />
                  <Text style={[styles.menuItemText, { color: '#DC2626' }]}>删除题目</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    color: '#A78BFA',
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
    color: '#111827',
    fontWeight: '600',
  },
  typeText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  dateText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
});
