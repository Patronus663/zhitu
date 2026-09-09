import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { questionApi } from '@/utils/api';

export default function QuestionEditScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ questionId: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [content, setContent] = useState('');
  const [answer, setAnswer] = useState('');
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [errorAnalysis, setErrorAnalysis] = useState('');
  const [subject, setSubject] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [knowledgePoints, setKnowledgePoints] = useState('');
  const [methods, setMethods] = useState('');
  const [difficulty, setDifficulty] = useState(3);

  const loadQuestion = useCallback(async () => {
    if (!params.questionId) return;
    try {
      setLoading(true);
      const q = await questionApi.getQuestionDetail(params.questionId);
      setContent(q.content || '');
      setAnswer(q.answer || '');
      setWrongAnswer(q.wrong_answer || '');
      setErrorAnalysis(q.error_analysis || '');
      setSubject(q.subject || '');
      setQuestionType(q.question_type || '');
      setKnowledgePoints((q.knowledge_points || []).join('、'));
      setMethods((q.methods || []).join('、'));
      setDifficulty(q.difficulty || 3);
    } catch {
      Alert.alert('加载失败', '无法获取题目信息');
    } finally {
      setLoading(false);
    }
  }, [params.questionId]);

  useFocusEffect(
    useCallback(() => {
      loadQuestion();
    }, [loadQuestion])
  );

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '题目内容不能为空');
      return;
    }
    if (!params.questionId || saving) return;
    setSaving(true);
    try {
      const parseList = (s: string) =>
        s.split(/[、,，;；\n]/).map((x) => x.trim()).filter(Boolean);
      await questionApi.updateQuestion(params.questionId, {
        content: content.trim(),
        answer: answer.trim(),
        wrong_answer: wrongAnswer.trim(),
        error_analysis: errorAnalysis.trim(),
        subject: subject.trim(),
        question_type: questionType.trim(),
        knowledge_points: parseList(knowledgePoints),
        methods: parseList(methods),
        difficulty,
      });
      Alert.alert('保存成功', '题目已更新');
      router.back();
    } catch (e: any) {
      Alert.alert('保存失败', e?.message || '请重试');
    } finally {
      setSaving(false);
    }
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

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#FAFAF8">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="chevron-left" size={20} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑题目</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Text style={styles.label}>题目内容</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>正确答案</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={answer}
            onChangeText={setAnswer}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>我的错误答案</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={wrongAnswer}
            onChangeText={setWrongAnswer}
            multiline
            textAlignVertical="top"
            placeholder="可留空"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>错因分析</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={errorAnalysis}
            onChangeText={setErrorAnalysis}
            multiline
            textAlignVertical="top"
            placeholder="可留空"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>科目</Text>
            <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholderTextColor="#9CA3AF" />
          </View>
          <View style={[styles.field, styles.halfField]}>
            <Text style={styles.label}>题型</Text>
            <TextInput style={styles.input} value={questionType} onChangeText={setQuestionType} placeholderTextColor="#9CA3AF" />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>知识点（用顿号或逗号分隔）</Text>
          <TextInput style={styles.input} value={knowledgePoints} onChangeText={setKnowledgePoints} placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>解题方法（用顿号或逗号分隔）</Text>
          <TextInput style={styles.input} value={methods} onChangeText={setMethods} placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>难度</Text>
          <View style={styles.difficultyRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.difficultyChip, difficulty === n && styles.difficultyChipActive]}
                onPress={() => setDifficulty(n)}
              >
                <Text style={[styles.difficultyChipText, difficulty === n && styles.difficultyChipTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>保存修改</Text>}
        </TouchableOpacity>
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  content: { flex: 1, padding: 20 },
  field: { marginBottom: 16 },
  halfField: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  difficultyRow: { flexDirection: 'row', gap: 10 },
  difficultyChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  difficultyChipActive: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  difficultyChipText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  difficultyChipTextActive: { color: '#FFFFFF' },
  saveBtn: {
    backgroundColor: '#7B2D8E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
