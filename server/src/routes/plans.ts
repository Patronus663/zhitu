import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { invokeLLM } from '../services/llm.js';

const router = Router();

// GET /api/v1/plans/:user_id - Get user's study plans
router.get('/:user_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('study_plans')
      .select('*')
      .eq('user_id', req.params.user_id)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ plans: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/plans/:user_id/active - Get active plan with items
router.get('/:user_id/active', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data: plans, error } = await client
      .from('study_plans')
      .select('*')
      .eq('user_id', req.params.user_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw new Error(`查询失败: ${error.message}`);

    if (!plans || plans.length === 0) {
      return res.json({ plan: null, items: [] });
    }

    const plan = plans[0];
    const { data: items } = await client
      .from('plan_items')
      .select('*')
      .eq('plan_id', plan.id)
      .order('sort_order', { ascending: true })
      .order('due_date', { ascending: true });

    res.json({ plan, items: items || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans/generate - Generate study plan with AI
router.post('/generate', async (req, res) => {
  try {
    const { user_id, learning_content } = req.body;
    const client = getSupabaseClient();

    // Get user info and learning profile
    const { data: user } = await client
      .from('users')
      .select('*')
      .eq('id', user_id)
      .maybeSingle();

    const { data: profile } = await client
      .from('learning_profiles')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    const prompt = `作为学习规划专家，请根据以下信息为学生制定学习计划：

学生信息：
- 专业：${user?.major || '未填写'}
- 年级：${user?.grade || '未填写'}
- 学习目标：${user?.learning_goal || '未填写'}

学情档案：
- 擅长领域：${profile?.strengths || '暂无'}
- 薄弱领域：${profile?.weaknesses || '暂无'}

用户想学习的内容：${learning_content}

请制定一个合理的学习计划，以JSON格式返回（不要包含markdown代码块标记）：
{
  "title": "计划标题",
  "description": "计划概述",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "items": [
    {
      "title": "任务标题",
      "description": "任务描述",
      "due_date": "YYYY-MM-DD",
      "sort_order": 1
    }
  ]
}

要求：
1. 计划应该循序渐进，从基础到进阶
2. 每个任务应该具体可执行
3. 时间安排合理，考虑学生实际情况
4. 至少包含5-8个具体任务`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.7 });

    let planData;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) planData = JSON.parse(jsonMatch[0]);
      else planData = { title: '学习计划', description: result, items: [] };
    } catch {
      planData = { title: '学习计划', description: result, items: [] };
    }

    res.json({ plan_data: planData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans - Create study plan
router.post('/', async (req, res) => {
  try {
    const { user_id, title, description, start_date, end_date, items } = req.body;
    const client = getSupabaseClient();

    // Deactivate other plans
    await client
      .from('study_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('is_active', true);

    // Create plan
    const { data: plan, error: planErr } = await client
      .from('study_plans')
      .insert({
        user_id,
        title,
        description,
        start_date,
        end_date,
        is_active: true,
      })
      .select()
      .single();
    if (planErr) throw new Error(`创建计划失败: ${planErr.message}`);

    // Create plan items
    if (items && items.length > 0) {
      const { error: itemsErr } = await client
        .from('plan_items')
        .insert(
          items.map((item: any, index: number) => ({
            plan_id: plan.id,
            title: item.title,
            description: item.description || '',
            due_date: item.due_date || null,
            sort_order: item.sort_order || index,
          }))
        );
      if (itemsErr) throw new Error(`创建任务失败: ${itemsErr.message}`);
    }

    // Get items
    const { data: planItems } = await client
      .from('plan_items')
      .select('*')
      .eq('plan_id', plan.id)
      .order('sort_order', { ascending: true });

    res.json({ plan, items: planItems || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/plans/items/:item_id/complete - Mark item as complete
router.put('/items/:item_id/complete', async (req, res) => {
  try {
    const { is_completed } = req.body;
    const client = getSupabaseClient();

    const updateData: Record<string, any> = { is_completed };
    if (is_completed) {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { data, error } = await client
      .from('plan_items')
      .update(updateData)
      .eq('id', req.params.item_id)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/plans/items/:item_id - Get single item detail
router.get('/items/:item_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('plan_items')
      .select('*, study_plans(title, user_id)')
      .eq('id', req.params.item_id)
      .single();
    if (error) throw new Error(`查询失败: ${error.message}`);
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/plans/items/:item_id - Update item
router.put('/items/:item_id', async (req, res) => {
  try {
    const { title, description, due_date, sort_order } = req.body;
    const client = getSupabaseClient();

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data, error } = await client
      .from('plan_items')
      .update(updateData)
      .eq('id', req.params.item_id)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/plans/items/:item_id - Delete item
router.delete('/items/:item_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from('plan_items')
      .delete()
      .eq('id', req.params.item_id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans/items/:item_id/move - Move item to another date
router.post('/items/:item_id/move', async (req, res) => {
  try {
    const { new_due_date } = req.body;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('plan_items')
      .update({ due_date: new_due_date })
      .eq('id', req.params.item_id)
      .select()
      .single();
    if (error) throw new Error(`移动失败: ${error.message}`);
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/plans/:user_id/today - Get today's and this week's tasks
router.get('/:user_id/today', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get active plan
    const { data: plans } = await client
      .from('study_plans')
      .select('id')
      .eq('user_id', req.params.user_id)
      .eq('is_active', true)
      .limit(1);

    if (!plans || plans.length === 0) {
      return res.json({ today_items: [], week_items: [] });
    }

    const planId = plans[0].id;

    // Today's items
    const { data: todayItems } = await client
      .from('plan_items')
      .select('*')
      .eq('plan_id', planId)
      .lte('due_date', today)
      .eq('is_completed', false)
      .order('sort_order', { ascending: true });

    // This week's items
    const { data: weekItems } = await client
      .from('plan_items')
      .select('*')
      .eq('plan_id', planId)
      .gt('due_date', today)
      .lte('due_date', weekEnd)
      .eq('is_completed', false)
      .order('due_date', { ascending: true });

    // Get completion stats
    const { count: total } = await client
      .from('plan_items')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId);

    const { count: completed } = await client
      .from('plan_items')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId)
      .eq('is_completed', true);

    res.json({
      today_items: todayItems || [],
      week_items: weekItems || [],
      stats: { total: total || 0, completed: completed || 0 },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
