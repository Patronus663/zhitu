import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useFocusEffect } from 'expo-router';
import { chatApi } from '@/utils/api';
import { FontAwesome6 } from '@expo/vector-icons';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

const IMAGE_AVATAR = require('@/assets/1788942211508_edit_1282431744545459.png');

const SUGGESTIONS = [
  '今天的学习计划怎么安排？',
  '你能帮我把错题整理成知识点吗？',
  '这道题应该怎么做？',
  '给我的学情提点建议',
];

export default function ChatScreen() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(useCallback(() => {
    if (user) loadMessages();
  }, [user]));

  const loadMessages = async () => {
    if (!user) return;
    try {
      const data = await chatApi.getMessages(user.id);
      setMessages(data.messages || []);
    } catch {
      // Silent
    }
  };

  const sendText = async (raw: string) => {
    if (!raw.trim() || loading || !user) return;
    const userMsg = raw.trim();
    setInput('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const data = await chatApi.send(user.id, userMsg);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: data.reply || '抱歉，我暂时无法回答。' }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: '网络错误，请重试。' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    sendText(input);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={[styles.msgBubble, styles.userBubble]}>
            <Text style={[styles.msgText, styles.userMsgText]}>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiAvatar}>
          <Image
            source={require('@/assets/1788942211508_edit_1282431744545459.png')}
            style={styles.aiAvatarImg}
            resizeMode="cover"
          />
        </View>
        <View style={[styles.msgBubble, styles.aiBubble]}>
          <Text style={[styles.msgText, styles.aiMsgText]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <Screen backgroundColor="#F4F6F0">
      {/* 全屏淡化背景图 */}
      <Image
        source={require('@/assets/1789053755992.jpeg')}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Image source={IMAGE_AVATAR} style={styles.headerIconImg} resizeMode="cover" />
          </View>
          <View>
            <Text style={styles.headerTitle}>和知途聊聊</Text>
            <Text style={styles.headerSub}>你的智能学习助手</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome6 name="comments" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>开始和知途对话吧！</Text>
              <Text style={styles.emptySub}>你可以问学习相关的问题</Text>
              <View style={styles.suggestWrap}>
                {SUGGESTIONS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={styles.suggestChip}
                    onPress={() => { setInput(q); sendText(q); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
        />

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="输入你的问题..."
            placeholderTextColor="#9CA3AF"
            multiline
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <FontAwesome6 name="paper-plane" size={16} color="#FFF" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  bgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(247,249,243,0.4)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'rgba(255,255,255,0.78)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.6)' },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  headerIconImg: { width: 40, height: 40, borderRadius: 20 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  headerSub: { fontSize: 12, color: '#9CA3AF' },
  msgList: { padding: 16, gap: 12 },
  msgBubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  userRow: { alignSelf: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end' },
  userBubble: { backgroundColor: '#7B2D8E', borderBottomRightRadius: 4 },
  aiRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'flex-start', gap: 8, maxWidth: '85%' },
  aiBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 4, flexShrink: 1 },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  aiAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  msgText: { fontSize: 15, lineHeight: 22, color: '#374151' },
  userMsgText: { color: '#FFF' },
  aiMsgText: { },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 100 },
  emptyText: { fontSize: 17, color: '#4B5563', marginTop: 8, fontWeight: '600' },
  emptySub: { fontSize: 13, color: '#6B7280' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.82)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.6)' },
  textInput: { flex: 1, backgroundColor: 'rgba(243,244,246,0.8)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1A1A2E', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7B2D8E', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
  suggestWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 18, paddingHorizontal: 24 },
  suggestChip: { backgroundColor: 'rgba(255,255,255,0.82)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(123,45,142,0.25)' },
  suggestText: { fontSize: 13, color: '#7B2D8E' },
});
