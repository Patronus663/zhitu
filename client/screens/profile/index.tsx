import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { learningApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user } = useUser();
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const router = useSafeRouter();
  const [profile, setProfile] = useState<any>(null);
  const [suggestions, setSuggestions] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await learningApi.getProfile(user.id);
      setProfile(data);
    } catch {
      // Silent
    }
  }, [user]);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  const handleAnalyze = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await learningApi.analyze(user.id);
      setSuggestions(data.suggestions || '暂无建议');
    } catch {
      Alert.alert('分析失败', '请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async () => {
    if (!user || !feedback.trim()) return;
    setFeedbackLoading(true);
    try {
      const data = await learningApi.updateWithFeedback(user.id, feedback);
      setProfile(data);
      setFeedback('');
      setShowFeedback(false);
      Alert.alert('更新成功', '学情信息已更新');
    } catch {
      Alert.alert('更新失败', '请重试');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <Screen backgroundColor="#FAFAF8">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>学情分析</Text>
        <Text style={styles.subtitle}>了解你的学习状况，获取个性化建议</Text>

        {/* Account / Login Card */}
        <View style={styles.accountCard}>
          {isAuthenticated ? (
            <>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>已登录</Text>
                <Text style={styles.accountEmail} numberOfLines={1}>{authUser?.email || '账号已登录'}</Text>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout(); }}>
                <Text style={styles.logoutBtnText}>退出登录</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>账号登录</Text>
                <Text style={styles.accountHint}>登录后可同步云端收藏与进度</Text>
              </View>
              <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/login')}>
                <FontAwesome6 name="right-to-bracket" size={14} color="#FFF" />
                <Text style={styles.loginBtnText}>登录 / 注册</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>学习档案</Text>
          {profile ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>擅长学科</Text>
                <Text style={styles.infoValue}>{profile.strengths || '暂无数据'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>薄弱学科</Text>
                <Text style={styles.infoValue}>{profile.weaknesses || '暂无数据'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>学习习惯</Text>
                <Text style={styles.infoValue}>{profile.learning_habits || '暂无数据'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>掌握知识点</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{profile.mastered_points || '暂无数据'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>薄弱知识点</Text>
                <Text style={styles.infoValue} numberOfLines={2}>{profile.weak_points || '暂无数据'}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>暂无学情数据</Text>
          )}
        </View>

        {/* Analyze Button */}
        <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <View style={styles.analyzeBtnContent}>
              <FontAwesome6 name="lightbulb" size={16} color="#FFF" />
              <Text style={styles.analyzeBtnText}>AI 学习建议</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Suggestions */}
        {suggestions ? (
          <View style={styles.suggestCard}>
            <Text style={styles.suggestTitle}>学习建议</Text>
            <Text style={styles.suggestText}>{suggestions}</Text>
          </View>
        ) : null}

        {/* Feedback */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.feedbackHeader} onPress={() => setShowFeedback(!showFeedback)}>
            <Text style={styles.cardTitle}>更正学情信息</Text>
            <FontAwesome6 name={showFeedback ? 'chevron-up' : 'chevron-down'} size={14} color="#6B7280" />
          </TouchableOpacity>
          {showFeedback && (
            <>
              <TextInput
                style={styles.feedbackInput}
                placeholder="指出当前学情分析不准确的地方..."
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
              <TouchableOpacity style={styles.feedbackBtn} onPress={handleFeedback} disabled={feedbackLoading}>
                {feedbackLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.feedbackBtnText}>提交更正</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 16 },
  accountCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#4F46E5', borderRadius: 16, padding: 16, marginBottom: 20 },
  accountInfo: { flex: 1, marginRight: 12 },
  accountLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 2 },
  accountEmail: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  accountHint: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  loginBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  loginBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  logoutBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#374151', lineHeight: 20 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  analyzeBtn: { backgroundColor: '#7B2D8E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  analyzeBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  analyzeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  suggestCard: { backgroundColor: '#FEF3C7', borderRadius: 16, padding: 16, marginBottom: 16 },
  suggestTitle: { fontSize: 15, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  suggestText: { fontSize: 14, color: '#78350F', lineHeight: 22 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedbackInput: { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80, marginTop: 12 },
  feedbackBtn: { backgroundColor: '#C9A96E', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  feedbackBtnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
});
