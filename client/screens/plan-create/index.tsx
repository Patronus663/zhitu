import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { planApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';

export default function PlanCreateScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const [goal, setGoal] = useState('');
  const [duration, setDuration] = useState('7');
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);
  const toastTimer = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const handleGenerate = async () => {
    if (!goal.trim() || !user) return;
    setLoading(true);
    try {
      const data = await planApi.generate(user.id, goal.trim(), parseInt(duration) || 7);
      setGeneratedPlan(data.plan);
    } catch {
      Alert.alert('生成失败', '请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!generatedPlan || !user) return;
    setLoading(true);
    try {
      await planApi.create({
        user_id: user.id,
        title: generatedPlan.title || goal.slice(0, 20),
        description: generatedPlan.description || '',
        plan_type: 'long_term',
        items: generatedPlan.items || [],
      });
      // 弹窗提示，保持 1.5 秒后自动回到创建计划页面
      setToast(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        setToast(false);
        setGeneratedPlan(null);
        setGoal('');
      }, 1500);
    } catch {
      Alert.alert('保存失败', '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor="#FAFAF8">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="arrow-left" size={20} color="#7B2D8E" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>制定学习计划</Text>
            <Text style={styles.subtitle}>AI结合你的学情，为你定制专属学习计划</Text>
          </View>
        </View>

        {!generatedPlan ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>想学习什么？</Text>
              <TextInput
                style={styles.textArea}
                placeholder="例如：本学期学习数据结构，掌握常见算法..."
                value={goal}
                onChangeText={setGoal}
                multiline
                numberOfLines={4}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>计划天数</Text>
              <View style={styles.durationRow}>
                {[
                  { label: '7天', value: '7' },
                  { label: '14天', value: '14' },
                  { label: '30天', value: '30' },
                  { label: '60天', value: '60' },
                ].map((d) => (
                  <TouchableOpacity
                    key={d.value}
                    style={[styles.durBtn, duration === d.value && styles.durBtnActive]}
                    onPress={() => setDuration(d.value)}
                  >
                    <Text style={[styles.durText, duration === d.value && styles.durTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : (
                <View style={styles.genBtnContent}>
                  <FontAwesome6 name="wand-magic-sparkles" size={16} color="#FFF" />
                  <Text style={styles.generateBtnText}>AI 生成计划</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>{generatedPlan.title || '学习计划'}</Text>
              {generatedPlan.description && (
                <Text style={styles.planDesc}>{generatedPlan.description}</Text>
              )}
              <View style={styles.itemsList}>
                {(generatedPlan.items || []).map((item: any, idx: number) => (
                  <View key={idx} style={styles.planItem}>
                    <View style={styles.itemDot}>
                      <Text style={styles.itemDotText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.itemContent}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
                      <Text style={styles.itemDate}>{item.due_date}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setGeneratedPlan(null)}>
                <Text style={styles.secondaryBtnText}>重新生成</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirm} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>确认创建</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>您已创建计划</Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 0 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  textArea: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 100 },
  durationRow: { flexDirection: 'row', gap: 10 },
  durBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  durBtnActive: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  durText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  durTextActive: { color: '#FFF' },
  generateBtn: { backgroundColor: '#7B2D8E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  genBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  planCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  planTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  planDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 16 },
  itemsList: { gap: 12 },
  planItem: { flexDirection: 'row', gap: 12 },
  itemDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center' },
  itemDotText: { fontSize: 12, fontWeight: '700', color: '#7B2D8E' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  itemDesc: { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18 },
  itemDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  btnRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#7B2D8E', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '500' },
  toastWrap: { position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  toastBox: { backgroundColor: '#7B2D8E', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 14, maxWidth: '88%', shadowColor: '#7B2D8E', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  toastText: { color: '#FFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});
