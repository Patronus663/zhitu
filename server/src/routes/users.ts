import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Validator } from '../utils/validation.js';
import { AppError } from '../utils/errors.js';

const router = Router();

// POST /api/v1/users - Create or get user
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { id, nickname, major, grade, learning_goal, mastery_expectation, personalized_info } = req.body;

    // 参数校验：id 可选，若提供须为合法 UUID；nickname 若提供须为 1-32 字符
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    Validator.check(id === undefined || (typeof id === 'string' && UUID_RE.test(id)), 'id 必须为 UUID 或省略');
    Validator.check(nickname === undefined || (typeof nickname === 'string' && nickname.length >= 1 && nickname.length <= 32), 'nickname 长度须为 1-32');

    const client = getSupabaseClient();

    // Check if user exists
    if (id) {
      const { data: existing, error: checkErr } = await client
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (checkErr) throw new AppError(500, '查询失败', 'DB_ERROR', checkErr.message);
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
    if (error) throw new AppError(500, '创建失败', 'DB_ERROR', error.message);

    // Create learning profile
    await client.from('learning_profiles').insert({
      user_id: data.id,
      strengths: '',
      weaknesses: '',
      learning_habits: '',
      error_patterns: '',
    });

    res.json({ user: data });
  })
);

// GET /api/v1/users/:id - Get user by ID
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new AppError(500, '查询失败', 'DB_ERROR', error.message);
    if (!data) throw new AppError(404, '用户不存在', 'NOT_FOUND');
    res.json({ user: data });
  })
);

// PUT /api/v1/users/:id - Update user
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = getSupabaseClient();
    const { nickname, major, grade, learning_goal, mastery_expectation, personalized_info, is_onboarded } = req.body;
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (nickname !== undefined) {
      Validator.check(typeof nickname === 'string' && nickname.length >= 1 && nickname.length <= 32, 'nickname 长度须为 1-32');
      updateData.nickname = nickname;
    }
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
    if (error) throw new AppError(500, '更新失败', 'DB_ERROR', error.message);
    res.json({ user: data });
  })
);

export default router;