import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();

// POST /api/v1/users - Create or get user
router.post('/', async (req, res) => {
  try {
    const { id, nickname, major, grade, learning_goal, mastery_expectation, personalized_info } = req.body;
    const client = getSupabaseClient();

    // Check if user exists
    if (id) {
      const { data: existing, error: checkErr } = await client
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (checkErr) throw new Error(`查询失败: ${checkErr.message}`);
      if (existing) {
        return res.json({ user: existing });
      }
    }

    // Create new user
    const { data, error } = await client
      .from('users')
      .insert({
        nickname: nickname || '同学',
        major,
        grade,
        learning_goal,
        mastery_expectation,
        personalized_info,
        is_onboarded: true,
      })
      .select()
      .single();
    if (error) throw new Error(`创建失败: ${error.message}`);

    // Create learning profile
    await client.from('learning_profiles').insert({
      user_id: data.id,
      strengths: '',
      weaknesses: '',
      learning_habits: '',
      error_patterns: '',
    });

    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return res.status(404).json({ error: '用户不存在' });
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { nickname, major, grade, learning_goal, mastery_expectation, personalized_info, is_onboarded } = req.body;
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (nickname !== undefined) updateData.nickname = nickname;
    if (major !== undefined) updateData.major = major;
    if (grade !== undefined) updateData.grade = grade;
    if (learning_goal !== undefined) updateData.learning_goal = learning_goal;
    if (mastery_expectation !== undefined) updateData.mastery_expectation = mastery_expectation;
    if (personalized_info !== undefined) updateData.personalized_info = personalized_info;
    if (is_onboarded !== undefined) updateData.is_onboarded = is_onboarded;

    const { data, error } = await client
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json({ user: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
