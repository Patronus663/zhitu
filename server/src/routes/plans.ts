import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { invokeLLM } from '../services/llm.js';

const router = Router();

async function isOwnedPlan(client: SupabaseClient, planId: string, userId: string): Promise<boolean> {
  const { data } = await client
    .from('study_plans')
    .select('id, user_id')
    .eq('id', planId)
    .maybeSingle();
  return !!data && (data as any).user_id === userId;
}

async function isOwnedItem(client: SupabaseClient, itemId: string, userId: string): Promise<boolean> {
  const { data } = await client
    .from('plan_items')
    .select('id, study_plans(user_id)')
    .eq('id', itemId)
    .maybeSingle();
  if (!data) return false;
  const ownerId = (data as any)?.study_plans?.user_id;
  return ownerId === userId;
}

// GET /api/v1/plans/:user_id - Get user's study plans with item stats
router.get('/:user_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data: plans, error } = await client
      .from('study_plans')
      .select('*')
      .eq('user_id', req.authUserId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询失败: ${error.message}`);

    const planList = plans || [];
    if (planList.length === 0) {
      return res.json({ plans: [] });
    }

    const planIds = planList.map((p: any) => p.id);
    const { data: items } = await client
      .from('plan_items')
      .select('plan_id, is_completed')
      .in('plan_id', planIds);

    const statsMap: Record<string, { total: number; completed: number }> = {};
    for (const plan of planList) {
      statsMap[plan.id] = { total: 0, completed: 0 };
    }
    for (const it of items || []) {
      if (statsMap[it.plan_id]) {
        statsMap[it.plan_id].total += 1;
        if (it.is_completed) statsMap[it.plan_id].completed += 1;
      }
    }

    const enriched = planList.map((p: any) => ({
      ...p,
      total_items: statsMap[p.id]?.total || 0,
      completed_items: statsMap[p.id]?.completed || 0,
    }));

    res.json({ plans: enriched });
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
      .eq('user_id', req.authUserId)
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
    const { learning_content, duration_days } = req.body;
    const user_id = req.authUserId;
    const client = getSupabaseClient();

    const effectiveDuration = Math.max(1, Math.min(365, Number(duration_days) || 30));
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + effectiveDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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

计划时长：${effectiveDuration} 天（${startDate} 至 ${endDate}）

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
1. start_date 必须为 ${startDate}，end_date 必须为 ${endDate}，所有任务 due_date 不得超出该区间
2. 计划应该循序渐进，从基础到进阶
3. 每个任务应该具体可执行
4. 时间安排合理，考虑学生实际情况，大约每3-5天安排一个任务
5. 任务数量与计划时长匹配（短计划适当精简，长计划适当增加），保持5-8个任务`;

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
    const { title, description, start_date, end_date, items, plan_type } = req.body;
    const user_id = req.authUserId;
    const client = getSupabaseClient();

    // Only deactivate other daily plans
    const effectivePlanType = plan_type || 'daily';
    if (effectivePlanType === 'daily') {
      await client
        .from('study_plans')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user_id)
        .eq('is_active', true)
        .eq('plan_type', 'daily');
    }

    // Create plan（daily 互斥下线已在上面处理，两种类型都默认激活）
    const { data: plan, error: planErr } = await client
      .from('study_plans')
      .insert({
        user_id,
        title,
        description,
        start_date,
        end_date,
        is_active: true,
        plan_type: effectivePlanType,
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

// DELETE /api/v1/plans/:plan_id - Delete a study plan
router.delete('/:plan_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { plan_id } = req.params;

    if (!(await isOwnedPlan(client, plan_id, req.authUserId))) {
      return res.status(403).json({ error: '无权操作该计划' });
    }

    // Delete plan items first
    await client.from('plan_items').delete().eq('plan_id', plan_id);

    // Delete the plan
    const { error } = await client.from('study_plans').delete().eq('id', plan_id);
    if (error) throw new Error(`删除计划失败: ${error.message}`);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans/:plan_id/items - Add a new item to a plan
router.post('/:plan_id/items', async (req, res) => {
  try {
    const { title, description, due_date, sort_order } = req.body;
    if (!title) {
      return res.status(400).json({ error: '任务标题不能为空' });
    }
    const client = getSupabaseClient();

    if (!(await isOwnedPlan(client, req.params.plan_id, req.authUserId))) {
      return res.status(403).json({ error: '无权操作该计划' });
    }

    // Get max sort_order for this plan
    const { data: existingItems } = await client
      .from('plan_items')
      .select('sort_order')
      .eq('plan_id', req.params.plan_id)
      .order('sort_order', { ascending: false })
      .limit(1);
    const maxOrder = existingItems?.[0]?.sort_order || 0;

    const { data, error } = await client
      .from('plan_items')
      .insert({
        plan_id: req.params.plan_id,
        title,
        description: description || null,
        due_date: due_date || null,
        sort_order: sort_order || maxOrder + 1,
        is_completed: false,
      })
      .select()
      .single();
    if (error) throw new Error(`创建失败: ${error.message}`);
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/plans/items/:item_id/complete - Mark item as complete
router.put('/items/:item_id/complete', async (req, res) => {
  try {
    const { is_completed } = req.body;
    const client = getSupabaseClient();

    if (!(await isOwnedItem(client, req.params.item_id, req.authUserId))) {
      return res.status(403).json({ error: '无权操作该任务' });
    }

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

// GET /api/v1/plans/detail/:plan_id - Get plan detail with items
router.get('/detail/:plan_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    if (!(await isOwnedPlan(client, req.params.plan_id, req.authUserId))) {
      return res.status(403).json({ error: '无权访问该计划' });
    }
    const { data: plan, error: planError } = await client
      .from('study_plans')
      .select('*')
      .eq('id', req.params.plan_id)
      .single();
    if (planError) throw new Error(`查询计划失败: ${planError.message}`);
    if (!plan) {
      res.status(404).json({ error: '计划不存在' });
      return;
    }

    const { data: items, error: itemsError } = await client
      .from('plan_items')
      .select('*')
      .eq('plan_id', req.params.plan_id)
      .order('sort_order', { ascending: true });
    if (itemsError) throw new Error(`查询任务失败: ${itemsError.message}`);

    res.json({ ...plan, items: items || [] });
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
    const ownerId = (data as any)?.study_plans?.user_id;
    if (ownerId !== req.authUserId) {
      return res.status(403).json({ error: '无权访问该任务' });
    }
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/plans/items/:item_id - Update item
router.put('/items/:item_id', async (req, res) => {
  try {
    const { title, description, due_date, sort_order, is_completed } = req.body;
    const client = getSupabaseClient();

    if (!(await isOwnedItem(client, req.params.item_id, req.authUserId))) {
      return res.status(403).json({ error: '无权操作该任务' });
    }

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (due_date !== undefined) updateData.due_date = due_date;
    if (sort_order !== undefined) updateData.sort_order = sort_order;
    if (is_completed !== undefined) updateData.is_completed = is_completed;

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
    if (!(await isOwnedItem(client, req.params.item_id, req.authUserId))) {
      return res.status(403).json({ error: '无权操作该任务' });
    }
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

    if (!(await isOwnedItem(client, req.params.item_id, req.authUserId))) {
      return res.status(403).json({ error: '无权操作该任务' });
    }

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

// GET /api/v1/plans/overdue/:user_id - Get overdue tasks for a user
router.get('/overdue/:user_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    // Get all active plans (daily + long_term)
    const { data: plans } = await client
      .from('study_plans')
      .select('id, title')
      .eq('user_id', req.authUserId)
      .eq('is_active', true);

    if (!plans || plans.length === 0) {
      return res.json({ overdue_items: [] });
    }

    const planIds = plans.map((p: any) => p.id);
    const titleMap: Record<string, string> = {};
    for (const p of plans) titleMap[p.id] = p.title;

    // Get incomplete tasks with due_date < today
    const { data: overdueItems, error } = await client
      .from('plan_items')
      .select('*')
      .in('plan_id', planIds)
      .lt('due_date', today)
      .eq('is_completed', false)
      .order('due_date', { ascending: true });

    if (error) throw new Error(`查询失败: ${error.message}`);
    const items = (overdueItems || []).map((it: any) => ({ ...it, plan_title: titleMap[it.plan_id] }));
    res.json({ overdue_items: items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/plans/move-overdue/:user_id - Move all overdue tasks to today
router.post('/move-overdue/:user_id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    // Get all active plans (daily + long_term)
    const { data: plans } = await client
      .from('study_plans')
      .select('id')
      .eq('user_id', req.authUserId)
      .eq('is_active', true);

    if (!plans || plans.length === 0) {
      return res.json({ moved: 0 });
    }

    const planIds = plans.map((p: any) => p.id);

    // Update all incomplete tasks with due_date < today to today
    const { data, error, count } = await client
      .from('plan_items')
      .update({ due_date: today })
      .in('plan_id', planIds)
      .lt('due_date', today)
      .eq('is_completed', false)
      .select();

    if (error) throw new Error(`移动失败: ${error.message}`);
    res.json({ moved: count || (data ? data.length : 0) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/plans/:user_id/today - Get today's and this week's tasks (across all active plans)
router.get('/:user_id/today', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get all active plans (daily + long_term)
    const { data: plans } = await client
      .from('study_plans')
      .select('id, title')
      .eq('user_id', req.authUserId)
      .eq('is_active', true);

    if (!plans || plans.length === 0) {
      return res.json({
        today_items: [],
        week_items: [],
        stats: {
          today: { total: 0, completed: 0 },
          week: { total: 0, completed: 0 },
        },
      });
    }

    const planIds = plans.map((p: any) => p.id);
    const titleMap: Record<string, string> = {};
    for (const p of plans) titleMap[p.id] = p.title;
    const withPlanTitle = (it: any) => ({ ...it, plan_title: titleMap[it.plan_id] });

    // Today's items - only items due today (not yesterday or earlier)
    const { data: todayItems } = await client
      .from('plan_items')
      .select('*')
      .in('plan_id', planIds)
      .eq('due_date', today)
      .eq('is_completed', false)
      .order('sort_order', { ascending: true });

    // This week's items
    const { data: weekItems } = await client
      .from('plan_items')
      .select('*')
      .in('plan_id', planIds)
      .gt('due_date', today)
      .lte('due_date', weekEnd)
      .eq('is_completed', false)
      .order('due_date', { ascending: true });

    // Get completion stats for today's tasks - fetch all items and count manually
    const { data: allTodayItems } = await client
      .from('plan_items')
      .select('id, is_completed')
      .in('plan_id', planIds)
      .eq('due_date', today);

    const todayTotal = allTodayItems ? allTodayItems.length : 0;
    const todayCompleted = allTodayItems ? allTodayItems.filter(i => i.is_completed).length : 0;

    // Get completion stats for this week's tasks - fetch all items and count manually
    const { data: allWeekItems } = await client
      .from('plan_items')
      .select('id, is_completed')
      .in('plan_id', planIds)
      .gt('due_date', today)
      .lte('due_date', weekEnd);

    const weekTotal = allWeekItems ? allWeekItems.length : 0;
    const weekCompleted = allWeekItems ? allWeekItems.filter(i => i.is_completed).length : 0;

    res.json({
      today_items: (todayItems || []).map(withPlanTitle),
      week_items: (weekItems || []).map(withPlanTitle),
      stats: {
        today: { total: todayTotal || 0, completed: todayCompleted || 0 },
        week: { total: weekTotal || 0, completed: weekCompleted || 0 },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
