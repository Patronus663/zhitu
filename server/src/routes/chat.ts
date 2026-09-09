import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { streamLLM, invokeLLM } from '../services/llm.js';
import { HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

// GET /api/v1/chat/:user_id/messages - Get recent chat messages
router.get('/:user_id/messages', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('chat_messages')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ messages: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/chat/:user_id/messages - Send a message and get a reply (non-streaming)
router.post('/:user_id/messages', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { content } = req.body;
    const client = getSupabaseClient();

    // Get user info and learning profile for context
    const { data: user } = await client
      .from('users')
      .select('nickname, major, grade, learning_goal')
      .eq('id', user_id)
      .maybeSingle();

    const { data: profile } = await client
      .from('learning_profiles')
      .select('strengths, weaknesses, learning_habits')
      .eq('user_id', user_id)
      .maybeSingle();

    // Get recent chat history for context
    const { data: history } = await client
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Save user message
    await client.from('chat_messages').insert({
      user_id,
      role: 'user',
      content,
    });

    // Record usage
    await client.from('usage_records').insert({
      user_id,
      action_type: 'chat_interaction',
      detail: `用户提问: ${content.substring(0, 50)}`,
    });

    // Build messages for LLM
    const systemPrompt = `你是"知途"，南京大学智能学习助手。你的职责是帮助学生学习、解答问题、提供学习建议。

当前学生信息：
- 称呼：${user?.nickname || '同学'}
- 专业：${user?.major || '未填写'}
- 年级：${user?.grade || '未填写'}
- 学习目标：${user?.learning_goal || '未填写'}

学生学情：
- 擅长：${profile?.strengths || '暂无记录'}
- 薄弱：${profile?.weaknesses || '暂无记录'}

请根据学生的实际情况，提供个性化的、有针对性的回答。回答要专业但亲切，像一位耐心的学长/学姐。回答简洁明了，不超过300字。`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add history (reversed to chronological order)
    if (history && history.length > 0) {
      const reversed = [...history].reverse();
      for (const msg of reversed) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content });

    const result = await invokeLLM(messages, { temperature: 0.7 });

    // Save assistant response
    const { data: assistantMsg } = await client.from('chat_messages').insert({
      user_id,
      role: 'assistant',
      content: result,
    }).select().single();

    res.json({ reply: result, message: assistantMsg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/chat/:user_id/stream - Stream chat response (SSE)
router.post('/:user_id/stream', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { message } = req.body;
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const client = getSupabaseClient();

    // Get user info and learning profile for context
    const { data: user } = await client
      .from('users')
      .select('nickname, major, grade, learning_goal')
      .eq('id', user_id)
      .maybeSingle();

    const { data: profile } = await client
      .from('learning_profiles')
      .select('strengths, weaknesses, learning_habits')
      .eq('user_id', user_id)
      .maybeSingle();

    // Get recent chat history for context
    const { data: history } = await client
      .from('chat_messages')
      .select('role, content')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Save user message
    await client.from('chat_messages').insert({
      user_id,
      role: 'user',
      content: message,
    });

    // Record usage
    await client.from('usage_records').insert({
      user_id,
      action_type: 'chat_interaction',
      detail: `用户提问: ${message.substring(0, 50)}`,
    });

    // Build messages for LLM
    const systemPrompt = `你是"知途"，南京大学智能学习助手。你的职责是帮助学生学习、解答问题、提供学习建议。

当前学生信息：
- 称呼：${user?.nickname || '同学'}
- 专业：${user?.major || '未填写'}
- 年级：${user?.grade || '未填写'}
- 学习目标：${user?.learning_goal || '未填写'}

学生学情：
- 擅长：${profile?.strengths || '暂无记录'}
- 薄弱：${profile?.weaknesses || '暂无记录'}

请根据学生的实际情况，提供个性化的、有针对性的回答。回答要专业但亲切，像一位耐心的学长/学姐。`;

    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add history (reversed to chronological order)
    if (history && history.length > 0) {
      const reversed = [...history].reverse();
      for (const msg of reversed) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    try {
      const stream = streamLLM(messages, { temperature: 0.7 }, customHeaders);

      for await (const chunk of stream) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    } catch (streamErr: any) {
      // Fallback to non-streaming
      const result = await invokeLLM(messages, { temperature: 0.7 }, customHeaders);
      fullResponse = result;
      res.write(`data: ${JSON.stringify({ content: result })}\n\n`);
    }

    // Save assistant response
    await client.from('chat_messages').insert({
      user_id,
      role: 'assistant',
      content: fullResponse,
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.end();
    }
  }
});

// DELETE /api/v1/chat/:user_id/history - Clear chat history
router.delete('/:user_id/history', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('chat_messages')
      .delete()
      .eq('user_id', req.params.user_id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
