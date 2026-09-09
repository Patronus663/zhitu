import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { invokeLLM } from '../services/llm.js';

const router = Router();

// GET /api/v1/learning/:user_id - Get learning profile
router.get('/:user_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('learning_profiles')
      .select('*')
      .eq('user_id', req.authUserId)
      .maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);

    // Also get user info
    const { data: user } = await client
      .from('users')
      .select('nickname, major, grade, learning_goal')
      .eq('id', req.authUserId)
      .maybeSingle();

    res.json({ profile: data, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/learning/analyze - Analyze learning profile with AI
router.post('/analyze', async (req, res) => {
  try {
    const user_id = req.authUserId;
    const client = getSupabaseClient();

    // Get profile and user data
    const { data: profile } = await client
      .from('learning_profiles')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    // Get recent questions
    const { data: recentQuestions } = await client
      .from('user_questions')
      .select('*, questions(content, subject, knowledge_points, difficulty)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get active plans
    const { data: plans } = await client
      .from('study_plans')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    const prompt = `作为教育专家，请根据以下信息分析学生的学习情况并提供建议：

学生信息：
- 专业：${user?.major || '未填写'}
- 年级：${user?.grade || '未填写'}
- 学习目标：${user?.learning_goal || '未填写'}

学情档案：
- 擅长领域：${profile?.strengths || '暂无记录'}
- 薄弱领域：${profile?.weaknesses || '暂无记录'}
- 学习习惯：${profile?.learning_habits || '暂无记录'}
- 错题模式：${profile?.error_patterns || '暂无记录'}

最近错题（${recentQuestions?.length || 0}道）：
${recentQuestions?.map((q: any) => `- [${q.questions?.subject}] ${q.questions?.content?.substring(0, 100)}`).join('\n') || '暂无'}

当前学习计划：
${plans?.map((p: any) => `- ${p.title}`).join('\n') || '暂无'}

请以JSON格式返回分析结果（不要包含markdown代码块标记）：
{
  "summary": "学情总结",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["薄弱点1", "薄弱点2"],
  "suggestions": ["建议1", "建议2", "建议3"],
  "recommended_actions": ["推荐行动1", "推荐行动2"],
  "updated_profile": {
    "strengths": "更新后的擅长领域描述",
    "weaknesses": "更新后的薄弱领域描述",
    "learning_habits": "更新后的学习习惯描述",
    "error_patterns": "更新后的错题模式描述"
  }
}`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.5 });

    let analysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysis = JSON.parse(jsonMatch[0]);
      else analysis = { summary: result, strengths: [], weaknesses: [], suggestions: [], recommended_actions: [] };
    } catch {
      analysis = { summary: result, strengths: [], weaknesses: [], suggestions: [], recommended_actions: [] };
    }

    // Update profile if we have updated data
    if (analysis.updated_profile) {
      await client
        .from('learning_profiles')
        .update({
          ...analysis.updated_profile,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id);
    }

    res.json({ analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/learning/:user_id/feedback - Update learning profile with user feedback
router.post('/:user_id/feedback', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { feedback } = req.body;

    const { data: profile } = await client
      .from('learning_profiles')
      .select('*')
      .eq('user_id', req.authUserId)
      .maybeSingle();

    const prompt = `根据用户反馈，更新学情分析结果。

当前学情：
- 擅长：${profile?.strengths || '无'}
- 薄弱：${profile?.weaknesses || '无'}
- 学习习惯：${profile?.learning_habits || '无'}
- 错题模式：${profile?.error_patterns || '无'}

用户反馈：${feedback}

请以JSON格式返回更新后的学情（不要包含markdown代码块标记）：
{
  "strengths": "更新后的擅长领域",
  "weaknesses": "更新后的薄弱领域",
  "learning_habits": "更新后的学习习惯",
  "mastered_points": "更新后的掌握知识点",
  "weak_points": "更新后的薄弱知识点"
}`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.3 });

    let updated;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) updated = JSON.parse(jsonMatch[0]);
      else updated = { strengths: profile?.strengths, weaknesses: profile?.weaknesses };
    } catch {
      updated = { strengths: profile?.strengths, weaknesses: profile?.weaknesses };
    }

    const { data, error } = await client
      .from('learning_profiles')
      .update({ ...updated, updated_at: new Date().toISOString() })
      .eq('user_id', req.authUserId)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/learning/:user_id - Update learning profile
router.put('/:user_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { strengths, weaknesses, learning_habits, error_patterns, feedback } = req.body;

    if (feedback) {
      // User provided feedback to correct the analysis
      const { data: profile } = await client
        .from('learning_profiles')
        .select('*')
        .eq('user_id', req.authUserId)
        .maybeSingle();

      const prompt = `根据用户反馈，更新学情分析结果。

当前学情：
- 擅长：${profile?.strengths || '无'}
- 薄弱：${profile?.weaknesses || '无'}
- 学习习惯：${profile?.learning_habits || '无'}
- 错题模式：${profile?.error_patterns || '无'}

用户反馈：${feedback}

请以JSON格式返回更新后的学情（不要包含markdown代码块标记）：
{
  "strengths": "更新后的擅长领域",
  "weaknesses": "更新后的薄弱领域",
  "learning_habits": "更新后的学习习惯",
  "error_patterns": "更新后的错题模式"
}`;

      const messages = [{ role: 'user', content: prompt }];
      const result = await invokeLLM(messages, { temperature: 0.3 });

      let updated;
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) updated = JSON.parse(jsonMatch[0]);
        else updated = { strengths: profile?.strengths, weaknesses: profile?.weaknesses };
      } catch {
        updated = { strengths: profile?.strengths, weaknesses: profile?.weaknesses };
      }

      const { data, error } = await client
        .from('learning_profiles')
        .update({ ...updated, updated_at: new Date().toISOString() })
        .eq('user_id', req.authUserId)
        .select()
        .single();
      if (error) throw new Error(`更新失败: ${error.message}`);
      return res.json({ profile: data });
    }

    // Direct update
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (strengths !== undefined) updateData.strengths = strengths;
    if (weaknesses !== undefined) updateData.weaknesses = weaknesses;
    if (learning_habits !== undefined) updateData.learning_habits = learning_habits;
    if (error_patterns !== undefined) updateData.error_patterns = error_patterns;

    const { data, error } = await client
      .from('learning_profiles')
      .update(updateData)
      .eq('user_id', req.authUserId)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json({ profile: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
