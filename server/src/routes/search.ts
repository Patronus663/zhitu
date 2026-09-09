import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { invokeLLM } from '../services/llm.js';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

// POST /api/v1/search - Search questions
router.post('/', async (req, res) => {
  try {
    const { scope, subject, knowledge_points, description, count = 5 } = req.body;
    const user_id = req.authUserId;
    const client = getSupabaseClient();
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // Use LLM to analyze search intent
    const intentPrompt = `分析用户的检索需求，提取关键信息：

用户描述：${description}
指定科目：${subject || '未指定'}
指定知识点：${knowledge_points ? JSON.stringify(knowledge_points) : '未指定'}

请以JSON格式返回（不要包含markdown代码块标记）：
{
  "subject": "科目",
  "keywords": ["关键词1", "关键词2"],
  "knowledge_points": ["知识点1", "知识点2"],
  "difficulty_range": [1, 5]
}`;

    const intentMessages = [{ role: 'user', content: intentPrompt }];
    const intentResult = await invokeLLM(intentMessages, { temperature: 0.3 });

    let searchIntent;
    try {
      const jsonMatch = intentResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) searchIntent = JSON.parse(jsonMatch[0]);
      else searchIntent = { subject: subject || '', keywords: [], knowledge_points: [], difficulty_range: [1, 5] };
    } catch {
      searchIntent = { subject: subject || '', keywords: [], knowledge_points: [], difficulty_range: [1, 5] };
    }

    let questions: any[] = [];

    if (scope === 'cloud') {
      // Search cloud question bank (loose subject matching to avoid missing rows)
      let query = client
        .from('questions')
        .select('*')
        .eq('is_active', true);

      if (searchIntent.subject) {
        query = query.ilike('subject', `%${searchIntent.subject}%`);
      }

      const { data, error } = await query
        .order('rating', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(Math.max(Number(count) * 2, 15));

      if (error) throw new Error(`查询失败: ${error.message}`);
      let candidates: any[] = data || [];

      // If subject filter returns too little, broaden to all cloud questions
      if (candidates.length < Number(count) && searchIntent.subject) {
        const { data: broad } = await client
          .from('questions')
          .select('*')
          .eq('is_active', true)
          .order('rating', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(Math.max(Number(count) * 3, 20));
        const existing = new Set(candidates.map((c: any) => c.id));
        candidates = (broad || []).filter((q: any) => !existing.has(q.id)).concat(candidates);
      }

      questions = candidates;

      // Use LLM to rank by relevance
      if (questions.length > 0) {
        const rankPrompt = `根据用户需求从题目列表中选出最相关的${count}道题目。

用户需求：${description}
搜索关键词：${JSON.stringify(searchIntent.keywords)}
知识点：${JSON.stringify(searchIntent.knowledge_points)}

题目列表（JSON）：
${JSON.stringify(questions.map((q: any) => ({ id: q.id, subject: q.subject, content: q.content?.substring(0, 200), knowledge_points: q.knowledge_points, difficulty: q.difficulty, rating: q.rating })))}

请以JSON格式返回最相关题目的ID列表（不要包含markdown代码块标记）：
{
  "question_ids": ["id1", "id2", ...],
  "reason": "选择原因简述"
}`;

        const rankMessages = [{ role: 'user', content: rankPrompt }];
        const rankResult = await invokeLLM(rankMessages, { temperature: 0.2 }, customHeaders);

        try {
          const jsonMatch = rankResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const ranked = JSON.parse(jsonMatch[0]);
            const rankedIds = ranked.question_ids || [];
            questions = rankedIds
              .map((id: string) => questions.find((q: any) => q.id === id))
              .filter(Boolean)
              .slice(0, Number(count));
          }
        } catch {
          questions = questions.slice(0, Number(count));
        }
      }

      // Fallback: enrich from web when cloud bank is not enough
      if (questions.length < Number(count)) {
        try {
          const sdkClient = new SearchClient(new Config(), customHeaders);
          const need = Math.min(Number(count) - questions.length, 4);
          const searchResp = await sdkClient.webSearch(
            `${(searchIntent.subject || '') + ' ' + description} 题目 典型例题`,
            need,
            true,
          );
          const webQuestions = (searchResp.web_items || []).slice(0, need).map((w: any) => ({
            id: undefined,
            subject: searchIntent.subject || '',
            question_type: '网络题目',
            content: (w.title || '').trim(),
            answer: w.summary || w.snippet || '',
            knowledge_points: searchIntent.knowledge_points || [],
            methods: [],
            difficulty: (searchIntent.difficulty_range && searchIntent.difficulty_range[0]) || 3,
            rating: 0,
            source: '网络',
            source_label: '来源于网络',
            url: w.url,
            site_name: w.site_name,
          }));
          questions = questions.concat(webQuestions);
        } catch {
          // ignore web search failure
        }
      }
    } else {
      // Search user question bank
      const { data, error } = await client
        .from('user_questions')
        .select('*, questions(*)')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(Number(count) * 2);

      if (error) throw new Error(`查询失败: ${error.message}`);

      const userQuestions = data || [];

      if (userQuestions.length > 0) {
        const rankPrompt = `根据用户需求从用户的错题列表中选出最相关的${count}道题目。

用户需求：${description}
搜索关键词：${JSON.stringify(searchIntent.keywords)}

题目列表（JSON）：
${JSON.stringify(userQuestions.map((uq: any) => ({
          id: uq.questions?.id,
          subject: uq.questions?.subject,
          content: uq.questions?.content?.substring(0, 200),
          knowledge_points: uq.questions?.knowledge_points,
        })))}

请以JSON格式返回最相关题目的ID列表（不要包含markdown代码块标记）：
{
  "question_ids": ["id1", "id2", ...]
}`;

        const rankMessages = [{ role: 'user', content: rankPrompt }];
        const rankResult = await invokeLLM(rankMessages, { temperature: 0.2 });

        try {
          const jsonMatch = rankResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const ranked = JSON.parse(jsonMatch[0]);
            const rankedIds = ranked.question_ids || [];
            questions = rankedIds
              .map((id: string) => {
                const uq = userQuestions.find((q: any) => q.questions?.id === id);
                return uq?.questions;
              })
              .filter(Boolean)
              .slice(0, Number(count));
          }
        } catch {
          questions = userQuestions.map((uq: any) => uq.questions).filter(Boolean).slice(0, Number(count));
        }
      }
    }

    // Record usage
    if (user_id) {
      await client.from('usage_records').insert({
        user_id,
        action_type: 'question_search',
        detail: `在${scope === 'cloud' ? '云端题库' : '个人题库'}中检索: ${description}`,
      });
    }

    res.json({
      questions,
      search_intent: searchIntent,
      total: questions.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/search/similar - Search similar questions
router.post('/similar', async (req, res) => {
  try {
    const { question_content, error_analysis, subject, knowledge_points, count = 3 } = req.body;

    const prompt = `基于以下错题信息，生成${count}道相似的练习题。

原题内容：${question_content}
错因分析：${error_analysis || '无'}
科目：${subject}
知识点：${JSON.stringify(knowledge_points)}

请以JSON格式返回（不要包含markdown代码块标记）：
{
  "questions": [
    {
      "content": "题目内容",
      "answer": "参考答案",
      "difficulty": 1-5,
      "similarity_reason": "与原题的关联点"
    }
  ]
}`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.8 });

    let similar;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) similar = JSON.parse(jsonMatch[0]);
      else similar = { questions: [] };
    } catch {
      similar = { questions: [] };
    }

    res.json(similar);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/search/rate - Rate a question (incremental average, consistent with questions /:id/rate)
router.post('/rate', async (req, res) => {
  try {
    const { question_id, rating } = req.body;
    const client = getSupabaseClient();

    const { data: question, error: getErr } = await client
      .from('questions')
      .select('rating, rating_count')
      .eq('id', question_id)
      .maybeSingle();
    if (getErr) throw new Error(`查询失败: ${getErr.message}`);
    if (!question) return res.status(404).json({ error: '题目不存在' });

    const newCount = (question.rating_count || 0) + 1;
    const newRating = Math.round(((question.rating || 3) * (newCount - 1) + rating) / newCount);

    const { data, error } = await client
      .from('questions')
      .update({ rating: newRating, rating_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', question_id)
      .select()
      .single();
    if (error) throw new Error(`评分失败: ${error.message}`);
    res.json({ question: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/search/feedback - Report a question as incorrect
router.post('/feedback', async (req, res) => {
  try {
    const { question_id } = req.body;
    const client = getSupabaseClient();

    // Get the question
    const { data: question } = await client
      .from('questions')
      .select('*')
      .eq('id', question_id)
      .maybeSingle();

    if (!question) {
      return res.status(404).json({ error: '题目不存在' });
    }

    // Reduce recommendation weight: lower the question's rating on each report
    const newRating = Math.max(1, (question.rating ?? 5) - 0.5);
    await client
      .from('questions')
      .update({ rating: newRating, updated_at: new Date().toISOString() })
      .eq('id', question_id);
    res.json({ reduced: true, rating: newRating });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
