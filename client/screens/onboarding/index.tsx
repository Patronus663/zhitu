import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

export default function OnboardingScreen() {
  const { createUser } = useUser();
  const router = useSafeRouter();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [major, setMajor] = useState('');
  const [grade, setGrade] = useState('');
  const [learningGoal, setLearningGoal] = useState('');
  const [masteryExpectation, setMasteryExpectation] = useState('');
  const [loading, setLoading] = useState(false);

  const steps = [
    { title: '欢迎使用知途', subtitle: '你的智能学习助手' },
    { title: '基本信息', subtitle: '告诉我们你是谁' },
    { title: '学习目标', subtitle: '你的学习规划' },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleComplete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await createUser({
        nickname: nickname || '同学',
        major,
        grade,
        learning_goal: learningGoal,
        mastery_expectation: masteryExpectation,
      });
      router.replace('/(tabs)');
    } catch {
      alert('创建用户失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor="#FAFAF8">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Progress */}
        <View style={styles.progress}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>知途</Text>
          <Text style={styles.title}>{steps[step].title}</Text>
          <Text style={styles.subtitle}>{steps[step].subtitle}</Text>
        </View>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <View style={styles.welcomeContent}>
            <View style={styles.welcomeIcon}>
              <FontAwesome6 name="book-open" size={48} color="#7B2D8E" />
            </View>
            <Text style={styles.welcomeText}>
              知途是南京大学智能学习助手，帮助你整理错题、制定计划、分析学情，让学习更高效。
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>开始使用</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <View style={styles.formContent}>
            <View style={styles.field}>
              <Text style={styles.label}>你的称呼</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：小明"
                value={nickname}
                onChangeText={setNickname}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>专业</Text>
              <TextInput
                style={styles.input}
                placeholder="例如：计算机科学"
                value={major}
                onChangeText={setMajor}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>年级</Text>
              <View style={styles.gradeRow}>
                {['大一', '大二', '大三', '大四', '研究生'].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.gradeChip, grade === g && styles.gradeChipActive]}
                    onPress={() => setGrade(g)}
                  >
                    <Text style={[styles.gradeChipText, grade === g && styles.gradeChipTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(0)}>
                <Text style={styles.secondaryBtnText}>上一步</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>下一步</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={handleNext}>
              <Text style={styles.skipBtnText}>还没想好，点击下一步跳过</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Learning Goals */}
        {step === 2 && (
          <View style={styles.formContent}>
            <View style={styles.field}>
              <Text style={styles.label}>学习目标</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="例如：本学期掌握数据结构与算法，提高编程能力..."
                value={learningGoal}
                onChangeText={setLearningGoal}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>期望达到的掌握程度</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="例如：能独立完成中等难度的算法题..."
                value={masteryExpectation}
                onChangeText={setMasteryExpectation}
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>上一步</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleComplete}
                disabled={loading}
              >
                <Text style={styles.primaryBtnText}>{loading ? '创建中...' : '开始学习'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.skipBtn} onPress={handleComplete} disabled={loading}>
              <Text style={styles.skipBtnText}>不想填写，点击下一步跳过</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, minHeight: '100%' },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 40 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  progressDotActive: { backgroundColor: '#7B2D8E', width: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 36, fontWeight: '800', color: '#7B2D8E', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#6B7280' },
  welcomeContent: { alignItems: 'center', paddingHorizontal: 16 },
  welcomeIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  welcomeText: { fontSize: 15, color: '#4B5563', lineHeight: 24, textAlign: 'center', marginBottom: 32 },
  formContent: { gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { minHeight: 80 },
  gradeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gradeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB' },
  gradeChipActive: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  gradeChipText: { fontSize: 14, color: '#6B7280' },
  gradeChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  primaryBtn: { flex: 1, backgroundColor: '#7B2D8E', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '500' },
  skipBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  skipBtnText: { color: '#9CA3AF', fontSize: 13, fontWeight: '400' },
});
