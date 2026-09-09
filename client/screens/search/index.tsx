import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { searchApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';

export default function SearchScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const [scope, setScope] = useState<'cloud' | 'user'>('cloud');
  const [query, setQuery] = useState('');
  const [count, setCount] = useState('5');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const innerPress = useRef(0);
  const [toast, setToast] = useState<string | null>(null);
  const feedbackTimer = useRef<any>(null);
  useEffect(() => {
    return () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); };
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchApi.search({
        user_id: user?.id,
        scope,
        query: query.trim(),
        count: parseInt(count) || 5,
      });
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = async (questionId: string, rating: number) => {
    if (scope !== 'cloud') return;
    try {
      await searchApi.rate(questionId, user?.id, rating);
    } catch {
      // Silent
    }
  };

  const handleFeedback = async (questionId: string) => {
    innerPress.current = Date.now();
    try {
      await searchApi.feedback(questionId, user?.id);
    } catch {
      // 反馈失败不影响提示，后台尽力降低推荐
    }
    setToast('题目可能有误，已减少此题目推荐');
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => setToast(null), 1000);
  };

  return (
    <Screen backgroundColor="#FAFAF8">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>题目检索</Text>
        <Text style={styles.subtitle}>输入学科、知识点等描述，AI帮你找到相关题目</Text>

        {/* Scope */}
        <View style={styles.scopeRow}>
          <TouchableOpacity style={[styles.scopeBtn, scope === 'cloud' && styles.scopeBtnActive]} onPress={() => setScope('cloud')}>
            <Text style={[styles.scopeText, scope === 'cloud' && styles.scopeTextActive]}>云端题库</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scopeBtn, scope === 'user' && styles.scopeBtnActive]} onPress={() => setScope('user')}>
            <Text style={[styles.scopeText, scope === 'user' && styles.scopeTextActive]}>我的错题</Text>
          </TouchableOpacity>
        </View>

        {/* Query */}
        <View style={styles.field}>
          <Text style={styles.label}>检索描述</Text>
          <TextInput
            style={styles.textArea}
            placeholder="例如：高等数学中关于极限的计算题，难度中等..."
            value={query}
            onChangeText={setQuery}
            multiline
            numberOfLines={3}
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>返回数量</Text>
          <TextInput style={styles.input} value={count} onChangeText={setCount} keyboardType="number-pad" placeholderTextColor="#9CA3AF" />
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <View style={styles.searchBtnContent}>
              <FontAwesome6 name="magnifying-glass" size={16} color="#FFF" />
              <Text style={styles.searchBtnText}>开始检索</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Results */}
        {searched && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>检索结果 ({results.length})</Text>
            {results.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>未找到匹配的题目</Text>
                <Text style={styles.emptySub}>可以尝试调整检索描述或扩大范围</Text>
              </View>
            ) : (
              results.map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.resultCard}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Date.now() - innerPress.current < 350) return;
                    if (item.id) {
                      router.push('/question-detail', { questionId: item.id });
                    } else if (item.source_label) {
                      // 网络来源题目不在题库中，直接携带数据进入展示模式
                      router.push('/question-detail', { webQuestion: item });
                    }
                  }}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultSubject}>{item.subject || '未知科目'}</Text>
                    <Text style={styles.resultType}>{item.question_type || ''}</Text>
                    {item.source_label ? (
                      <View style={styles.webBadge}>
                        <FontAwesome6 name="globe" size={10} color="#2563EB" />
                        <Text style={styles.webBadgeText}>{item.source_label}</Text>
                      </View>
                    ) : null}
                    {scope === 'cloud' && !item.source_label && (
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <TouchableOpacity key={s} onPress={() => { innerPress.current = Date.now(); handleRate(item.id, s); }}>
                            <FontAwesome6 name="star" size={14} color={s <= (item.rating || 0) ? '#C9A96E' : '#E5E7EB'} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                  {item.source_label && (
                    <View style={styles.webNotice}>
                      <Text style={styles.webNoticeText}>网络检索到的相关学习资料（非题库正式题目），仅作参考。</Text>
                    </View>
                  )}
                  <Text style={styles.resultFieldLabel}>题干</Text>
                  <Text style={styles.resultContent} numberOfLines={5}>{item.content}</Text>
                  <Text style={styles.resultFieldLabel}>知识点</Text>
                  <View style={styles.resultTags}>
                    {(item.knowledge_points || []).length > 0 ? (
                      (item.knowledge_points || []).slice(0, 4).map((kp: string, ki: number) => (
                        <Text key={ki} style={styles.resultTag}>{kp}</Text>
                      ))
                    ) : (
                      <Text style={styles.resultNoTag}>暂无对应知识点</Text>
                    )}
                  </View>
                  {scope === 'cloud' && !item.source_label && (
                    <TouchableOpacity style={styles.feedbackBtn} onPress={() => { innerPress.current = Date.now(); handleFeedback(item.id); }}>
                      <Text style={styles.feedbackText}>题目有误？点击反馈</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  scopeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  scopeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  scopeBtnActive: { backgroundColor: '#7B2D8E', borderColor: '#7B2D8E' },
  scopeText: { fontSize: 15, color: '#6B7280', fontWeight: '500' },
  scopeTextActive: { color: '#FFF' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 80 },
  searchBtn: { backgroundColor: '#7B2D8E', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  searchBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  resultsSection: { marginTop: 24 },
  resultsTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 4 },
  emptyText: { color: '#9CA3AF', fontSize: 15 },
  emptySub: { color: '#D1D5DB', fontSize: 13 },
  resultCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultSubject: { fontSize: 12, fontWeight: '600', color: '#7B2D8E', backgroundColor: '#F3E8F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  resultType: { fontSize: 12, color: '#6B7280' },
  webBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  webBadgeText: { fontSize: 10, color: '#2563EB', fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 2, marginLeft: 'auto' },
  resultContent: { fontSize: 15, color: '#1F2937', lineHeight: 24, marginTop: 6, marginBottom: 12 },
  resultFieldLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 4 },
  webNotice: { backgroundColor: '#F0F9FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  webNoticeText: { fontSize: 12, color: '#2563EB', lineHeight: 18 },
  resultNoTag: { fontSize: 12, color: '#D1D5DB' },
  resultTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  resultTag: { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  feedbackBtn: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  feedbackText: { fontSize: 12, color: '#EF4444' },
  toastWrap: { position: 'absolute', top: '42%', left: 0, right: 0, alignItems: 'center', zIndex: 999 },
  toastBox: { backgroundColor: 'rgba(30,30,46,0.94)', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, maxWidth: '88%' },
  toastText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
