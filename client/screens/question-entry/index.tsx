import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import * as ImagePicker from 'expo-image-picker';
import { createFormDataFile } from '@/utils';
import { questionApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';

export default function QuestionEntryScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const [step, setStep] = useState<'input' | 'analyze' | 'tags' | 'done'>('input');
  const [images, setImages] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [tags, setTags] = useState({ subject: '', question_type: '', knowledge_points: [] as string[], methods: [] as string[], difficulty: 3 });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [kpInput, setKpInput] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [showAiAnswer, setShowAiAnswer] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImages([...images, result.assets[0].uri]);
    }
  };

  const handleAnalyzeImage = async () => {
    if (images.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < images.length; i++) {
        const file = await createFormDataFile(images[i], `image_${i}.jpg`, 'image/jpeg');
        formData.append('images', file as any);
      }
      const result = await questionApi.analyzeImage(formData);
      setContent(result.text);
    } catch {
      Alert.alert('识别失败', '请重试或手动输入题目内容');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeContent = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入题目内容');
      return;
    }
    setLoading(true);
    try {
      const result = await questionApi.analyze({ content, wrong_answer: wrongAnswer || undefined, correct_answer: correctAnswer || undefined });
      setAnalysis(result.analysis);
      if (result.analysis.is_valid === false) {
        Alert.alert('题目可能有误', result.analysis.validation_message || '请检查题目内容');
        return;
      }
      setTags({
        subject: result.analysis.subject || '',
        question_type: result.analysis.question_type || '',
        knowledge_points: result.analysis.knowledge_points || [],
        methods: result.analysis.methods || [],
        difficulty: result.analysis.difficulty || 3,
      });
      setStep('tags');
    } catch {
      Alert.alert('分析失败', '请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAiAnswer = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请先输入题目内容');
      return;
    }
    setAiLoading(true);
    try {
      const result = await questionApi.aiAnswer({ content, wrong_answer: wrongAnswer || undefined });
      setAiResult(result.ai_result);
      setShowAiAnswer(true);
      // Auto-fill tags from AI result
      if (result.ai_result) {
        setTags({
          subject: result.ai_result.subject || tags.subject,
          question_type: result.ai_result.question_type || tags.question_type,
          knowledge_points: result.ai_result.knowledge_points?.length ? result.ai_result.knowledge_points : tags.knowledge_points,
          methods: result.ai_result.methods?.length ? result.ai_result.methods : tags.methods,
          difficulty: result.ai_result.difficulty || tags.difficulty,
        });
        if (result.ai_result.answer) {
          setCorrectAnswer(result.ai_result.answer);
        }
      }
    } catch {
      Alert.alert('AI解答失败', '请重试');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiAnswerAndSave = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请先输入题目内容');
      return;
    }
    setLoading(true);
    try {
      // Get AI answer
      const result = await questionApi.aiAnswer({ content, wrong_answer: wrongAnswer || undefined });
      const aiData = result.ai_result;

      // Auto-save the question with AI-generated data
      await questionApi.create({
        user_id: user?.id,
        content,
        answer: aiData.answer || '',
        images,
        subject: aiData.subject || '',
        question_type: aiData.question_type || '',
        knowledge_points: aiData.knowledge_points || [],
        methods: aiData.methods || [],
        difficulty: aiData.difficulty || 3,
        wrong_answer: wrongAnswer || undefined,
        error_analysis: aiData.common_mistakes?.join('；') || undefined,
      });

      setAiResult(aiData);
      setStep('done');
    } catch {
      Alert.alert('AI解答并保存失败', '请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateAndSave = async () => {
    setLoading(true);
    try {
      // Validate tags
      const valResult = await questionApi.validateTags({ content, ...tags });
      if (valResult.validation.is_valid === false) {
        Alert.alert('标签检查', valResult.validation.message || '标签可能不合理，是否继续保存？', [
          { text: '修改标签', style: 'cancel' },
          { text: '继续保存', onPress: () => saveQuestion() },
        ]);
        return;
      }
      await saveQuestion();
    } catch {
      Alert.alert('保存失败', '请重试');
    } finally {
      setLoading(false);
    }
  };

  const saveQuestion = async () => {
    try {
      await questionApi.create({
        user_id: user?.id,
        content,
        answer: correctAnswer || analysis?.corrected_answer || '',
        images,
        subject: tags.subject,
        question_type: tags.question_type,
        knowledge_points: tags.knowledge_points,
        methods: tags.methods,
        difficulty: tags.difficulty,
        wrong_answer: wrongAnswer || undefined,
        error_analysis: analysis?.error_analysis || undefined,
      });
      setStep('done');
    } catch {
      Alert.alert('保存失败', '请重试');
    }
  };

  const addKnowledgePoint = () => {
    if (kpInput.trim()) {
      setTags({ ...tags, knowledge_points: [...tags.knowledge_points, kpInput.trim()] });
      setKpInput('');
    }
  };

  if (step === 'done') {
    return (
      <Screen backgroundColor="#FAFAF8">
        <View style={styles.doneContainer}>
          <FontAwesome6 name="circle-check" size={64} color="#7B2D8E" />
          <Text style={styles.doneTitle}>录入成功！</Text>
          <Text style={styles.doneText}>题目已保存到云端题库和你的错题库</Text>
          {analysis?.error_analysis && (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisLabel}>错因分析</Text>
              <Text style={styles.analysisText}>{analysis.error_analysis}</Text>
            </View>
          )}
          <View style={styles.doneBtns}>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { setStep('input'); setContent(''); setImages([]); setWrongAnswer(''); setCorrectAnswer(''); setAnalysis(null); }}>
              <Text style={styles.primaryBtnText}>继续录入</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
              <Text style={styles.secondaryBtnText}>返回首页</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="#FAFAF8">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="arrow-left" size={20} color="#7B2D8E" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>错题录入</Text>
            <Text style={styles.headerSub}>拍照或输入题目，AI帮你分析整理</Text>
          </View>
        </View>

        {step === 'input' && (
          <>
            {/* Image Upload */}
            <View style={styles.section}>
              <Text style={styles.label}>题目图片（可选）</Text>
              <View style={styles.imageRow}>
                {images.map((img, idx) => (
                  <View key={idx} style={styles.imageWrapper}>
                    <Image source={{ uri: img }} style={styles.image} />
                    <TouchableOpacity style={styles.removeImg} onPress={() => setImages(images.filter((_, i) => i !== idx))}>
                      <FontAwesome6 name="xmark" size={10} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addImageBtn} onPress={handlePickImage}>
                  <FontAwesome6 name="image" size={20} color="#9CA3AF" />
                  <Text style={styles.addImageText}>相册</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addImageBtn} onPress={handleTakePhoto}>
                  <FontAwesome6 name="camera" size={20} color="#9CA3AF" />
                  <Text style={styles.addImageText}>拍照</Text>
                </TouchableOpacity>
              </View>
              {images.length > 0 && (
                <TouchableOpacity style={styles.recognizeBtn} onPress={handleAnalyzeImage} disabled={loading}>
                  {loading ? <ActivityIndicator color="#7B2D8E" /> : <Text style={styles.recognizeBtnText}>识别图片文字</Text>}
                </TouchableOpacity>
              )}
            </View>

            {/* Text Input */}
            <View style={styles.section}>
              <Text style={styles.label}>题目内容 *</Text>
              <TextInput
                style={styles.textArea}
                placeholder="输入或粘贴题目内容..."
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={6}
                placeholderTextColor="#9CA3AF"
                textAlignVertical="top"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>你的错误答案（可选）</Text>
              <TextInput style={styles.input} placeholder="输入你的错误答案..." value={wrongAnswer} onChangeText={setWrongAnswer} placeholderTextColor="#9CA3AF" multiline />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>正确答案（可选）</Text>
              <TextInput style={styles.input} placeholder="输入正确答案..." value={correctAnswer} onChangeText={setCorrectAnswer} placeholderTextColor="#9CA3AF" multiline />
            </View>

            {/* Two Main Action Buttons */}
            <View style={styles.mainActionBtns}>
              <TouchableOpacity style={styles.aiAnalyzeBtn} onPress={handleAiAnswer} disabled={aiLoading}>
                {aiLoading ? <ActivityIndicator color="#7B2D8E" /> : (
                  <>
                    <FontAwesome6 name="wand-magic-sparkles" size={18} color="#7B2D8E" />
                    <Text style={styles.aiAnalyzeBtnText}>AI 解答和分析</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveQuestion} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <FontAwesome6 name="floppy-disk" size={18} color="#FFF" />
                    <Text style={styles.saveBtnText}>录入</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* AI Answer Display */}
            {showAiAnswer && aiResult && (
              <View style={styles.aiAnswerCard}>
                <View style={styles.aiAnswerHeader}>
                  <FontAwesome6 name="robot" size={18} color="#7B2D8E" />
                  <Text style={styles.aiAnswerTitle}>AI 解答</Text>
                  <TouchableOpacity onPress={() => setShowAiAnswer(false)}>
                    <FontAwesome6 name="xmark" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.aiAnswerContent}>{aiResult.answer}</Text>
                {aiResult.key_points?.length > 0 && (
                  <View style={styles.aiAnswerSection}>
                    <Text style={styles.aiAnswerLabel}>关键知识点</Text>
                    <Text style={styles.aiAnswerText}>{aiResult.key_points.join('\n')}</Text>
                  </View>
                )}
                {aiResult.common_mistakes?.length > 0 && (
                  <View style={styles.aiAnswerSection}>
                    <Text style={styles.aiAnswerLabel}>常见错误提醒</Text>
                    <Text style={styles.aiAnswerText}>{aiResult.common_mistakes.join('\n')}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}

        {step === 'tags' && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>科目</Text>
              <TextInput style={styles.input} value={tags.subject} onChangeText={(t) => setTags({ ...tags, subject: t })} placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>题型</Text>
              <TextInput style={styles.input} value={tags.question_type} onChangeText={(t) => setTags({ ...tags, question_type: t })} placeholderTextColor="#9CA3AF" />
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>知识点</Text>
              <View style={styles.tagRow}>
                {tags.knowledge_points.map((kp, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{kp}</Text>
                    <TouchableOpacity onPress={() => setTags({ ...tags, knowledge_points: tags.knowledge_points.filter((_, i) => i !== idx) })}>
                      <FontAwesome6 name="xmark" size={10} color="#7B2D8E" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <View style={styles.tagInputRow}>
                <TextInput style={[styles.input, { flex: 1 }]} value={kpInput} onChangeText={setKpInput} placeholder="添加知识点..." placeholderTextColor="#9CA3AF" onSubmitEditing={addKnowledgePoint} />
                <TouchableOpacity style={styles.addTagBtn} onPress={addKnowledgePoint}>
                  <Text style={styles.addTagText}>添加</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>难度: {tags.difficulty}/5</Text>
              <View style={styles.diffRow}>
                {[1, 2, 3, 4, 5].map((d) => (
                  <TouchableOpacity key={d} style={[styles.diffBtn, tags.difficulty >= d && styles.diffBtnActive]} onPress={() => setTags({ ...tags, difficulty: d })}>
                    <Text style={[styles.diffText, tags.difficulty >= d && styles.diffTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {analysis?.error_analysis && (
              <View style={styles.analysisCard}>
                <Text style={styles.analysisLabel}>错因分析</Text>
                <Text style={styles.analysisText}>{analysis.error_analysis}</Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep('input')}>
                <Text style={styles.secondaryBtnText}>返回修改</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleValidateAndSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>确认保存</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 16 },
  header: { marginBottom: 20, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A2E' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  section: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB' },
  textArea: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A2E', borderWidth: 1, borderColor: '#E5E7EB', minHeight: 120 },
  imageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { position: 'relative' },
  image: { width: 80, height: 80, borderRadius: 12 },
  removeImg: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  addImageBtn: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 4 },
  addImageText: { fontSize: 10, color: '#9CA3AF' },
  recognizeBtn: { marginTop: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#F3E8F9', borderRadius: 10 },
  recognizeBtnText: { color: '#7B2D8E', fontWeight: '600', fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3E8F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  tagText: { fontSize: 13, color: '#7B2D8E' },
  tagInputRow: { flexDirection: 'row', gap: 8 },
  addTagBtn: { paddingHorizontal: 14, backgroundColor: '#7B2D8E', borderRadius: 12, justifyContent: 'center' },
  addTagText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  diffBtnActive: { backgroundColor: '#7B2D8E' },
  diffText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  diffTextActive: { color: '#FFF' },
  analysisCard: { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 16 },
  analysisLabel: { fontSize: 13, fontWeight: '600', color: '#92400E', marginBottom: 4 },
  analysisText: { fontSize: 14, color: '#78350F', lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryBtn: { flex: 1, backgroundColor: '#7B2D8E', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#6B7280', fontSize: 16, fontWeight: '500' },
  doneContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  doneText: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  doneBtns: { width: '100%', gap: 12, marginTop: 24 },
  aiAnswerBtns: { flexDirection: 'row', gap: 12, marginTop: 12 },
  aiAnswerBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  aiAnswerBtnOutline: { backgroundColor: '#F3E8F9', borderWidth: 1, borderColor: '#E9D5F0' },
  aiAnswerBtnOutlineText: { color: '#7B2D8E', fontSize: 15, fontWeight: '600' },
  aiAnswerBtnSolid: { backgroundColor: '#7B2D8E' },
  aiAnswerBtnSolidText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  aiAnswerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E9D5F0' },
  aiAnswerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  aiAnswerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#7B2D8E' },
  aiAnswerContent: { fontSize: 15, color: '#1A1A2E', lineHeight: 24, backgroundColor: '#FAFAF8', borderRadius: 12, padding: 14 },
  aiAnswerSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3E8F9' },
  aiAnswerLabel: { fontSize: 13, fontWeight: '600', color: '#7B2D8E', marginBottom: 4 },
  aiAnswerText: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  mainActionBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  aiAnalyzeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3E8F9', borderWidth: 1, borderColor: '#E9D5F0', gap: 8 },
  aiAnalyzeBtnText: { fontSize: 15, fontWeight: '600', color: '#7B2D8E' },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#7B2D8E', gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
