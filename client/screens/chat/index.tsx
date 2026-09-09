import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
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

export default function ChatScreen() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const streamCancelRef = useRef<(() => void) | null>(null);

  // 组件卸载时中断进行中的流式请求
  useEffect(() => () => streamCancelRef.current?.(), []);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    try {
      const data = await chatApi.getMessages(user.id);
      setMessages(data.messages || []);
    } catch {
      // Silent
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    if (user) loadMessages();
  }, [user, loadMessages]));

  const handleSend = async () => {
    if (!input.trim() || loading || !user) return;
    const userMsg = input.trim();
    const assistantId = (Date.now() + 1).toString();
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user' as const, content: userMsg },
      { id: assistantId, role: 'assistant' as const, content: '' },
    ]);
    setLoading(true);

    let received = '';
    let finished = false;
    const appendChunk = (chunk: string) => {
      received += chunk;
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: received } : m)));
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      setLoading(false);
      streamCancelRef.current = null;
    };

    streamCancelRef.current = chatApi.streamChat(user.id, userMsg, {
      onContent: appendChunk,
      onDone: () => {
        if (!received) appendChunk('抱歉，我暂时无法回答。');
        finish();
      },
      onError: async () => {
        // SSE 失败：降级为非流式请求
        try {
          const data = await chatApi.send(user.id, userMsg);
          appendChunk(data.reply || '抱歉，我暂时无法回答。');
        } catch {
          appendChunk('网络错误，请重试。');
        }
        finish();
      },
    });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.msgBubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
      {item.role === 'assistant' && (
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>知</Text>
        </View>
      )}
      <Text style={[styles.msgText, item.role === 'user' && styles.userMsgText]}>
        {item.content || (item.role === 'assistant' && loading ? '…' : '')}
      </Text>
    </View>
  );

  return (
    <Screen backgroundColor="#FAFAF8">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>知途</Text>
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
          contentContainerStyle={styles.msgList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FontAwesome6 name="comments" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>开始和知途对话吧！</Text>
              <Text style={styles.emptySub}>你可以问学习相关的问题</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7B2D8E', justifyContent: 'center', alignItems: 'center' },
  headerIconText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  headerSub: { fontSize: 12, color: '#9CA3AF' },
  msgList: { flex: 1, padding: 16, gap: 12 },
  msgBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, gap: 4 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#7B2D8E', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderBottomLeftRadius: 4, flexDirection: 'row', gap: 8 },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E8F9', justifyContent: 'center', alignItems: 'center' },
  aiAvatarText: { fontSize: 11, fontWeight: '700', color: '#7B2D8E' },
  msgText: { fontSize: 15, lineHeight: 22, color: '#374151' },
  userMsgText: { color: '#FFF' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#D1D5DB' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  textInput: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1A1A2E', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7B2D8E', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#D1D5DB' },
});
