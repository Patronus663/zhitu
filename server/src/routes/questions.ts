import { Router } from 'express';
import multer from 'multer';
import { getSupabaseClient } from '../storage/database/supabase-client.js';
import { invokeLLM } from '../services/llm.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// POST /api/v1/questions/analyze-image - Analyze image with LLM vision
router.post('/analyze-image', upload.array('images', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const imageContents = files.map((file) => ({
      type: 'image_url',
      image_url: {
        url: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
        detail: 'high',
      },
    }));

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: '请仔细识别图片中的所有题目内容，包括题目文字、选项、图表等。将识别结果以纯文本格式输出，保留题目的原始结构。如果有图表，请用文字描述图表内容。输出格式：\n\n题目内容：[识别到的题目]\n\n图表描述：[如有图表则描述，否则写"无"]',
          },
          ...imageContents,
        ],
      },
    ];

    const result = await invokeLLM(messages, { temperature: 0.3 });
    res.json({ text: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/questions/analyze - Analyze question content with LLM
router.post('/analyze', async (req, res) => {
  try {
    const { content, wrong_answer, correct_answer } = req.body;

    const prompt = `你是一位教育专家，请分析以下题目信息：

题目内容：${content}
${wrong_answer ? `用户的错误答案：${wrong_answer}` : ''}
${correct_answer ? `用户提供的正确答案：${correct_answer}` : ''}

请以JSON格式返回以下分析结果（不要包含markdown代码块标记）：
{
  "input_type": "题目+错误解答+正确解答" 或 "题目+错误解答" 或 "题目+正确解答" 或 "仅题目",
  "is_valid": true/false,
  "validation_message": "如果题目有误，给出提示信息",
  "subject": "所属科目",
  "question_type": "题型（选择题/填空题/解答题/证明题等）",
  "knowledge_points": ["知识点1", "知识点2"],
  "methods": ["方法1", "方法2"],
  "difficulty": 1-5的整数,
  "error_analysis": "如果提供了错误答案，分析可能的错因",
  "corrected_content": "如果题目本身有误，给出修正后的题目内容",
  "corrected_answer": "如果用户提供的正确答案有误，给出正确答案"
}`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.3 });

    // Parse JSON from result
    let analysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        analysis = { is_valid: true, subject: '未分类', question_type: '未分类', knowledge_points: [], methods: [], difficulty: 3 };
      }
    } catch {
      analysis = { is_valid: true, subject: '未分类', question_type: '未分类', knowledge_points: [], methods: [], difficulty: 3 };
    }

    res.json({ analysis });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/questions/validate-tags - Validate user-modified tags
router.post('/validate-tags', async (req, res) => {
  try {
    const { content, subject, question_type, knowledge_points, methods, difficulty } = req.body;

    const prompt = `请检查以下题目的标签是否合理：

题目内容：${content}
标签信息：
- 科目：${subject}
- 题型：${question_type}
- 知识点：${JSON.stringify(knowledge_points)}
- 方法：${JSON.stringify(methods)}
- 难度：${difficulty}/5

请以JSON格式返回（不要包含markdown代码块标记）：
{
  "is_valid": true/false,
  "message": "如果不合理，说明原因",
  "suggestions": ["建议1", "建议2"]
}`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.3 });

    let validation;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        validation = JSON.parse(jsonMatch[0]);
      } else {
        validation = { is_valid: true, message: '标签合理', suggestions: [] };
      }
    } catch {
      validation = { is_valid: true, message: '标签合理', suggestions: [] };
    }

    res.json({ validation });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/questions - Save question to cloud and user bank
router.post('/', async (req, res) => {
  try {
    const {
      user_id, content, answer, images, subject, question_type,
      knowledge_points, methods, difficulty, wrong_answer,
    } = req.body;

    const client = getSupabaseClient();

    // Insert into cloud question bank
    const { data: question, error: qErr } = await client
      .from('questions')
      .insert({
        content,
        answer,
        images: images || [],
        subject,
        question_type,
        knowledge_points: knowledge_points || [],
        methods: methods || [],
        difficulty: difficulty || 3,
        created_by: user_id,
      })
      .select()
      .single();
    if (qErr) throw new Error(`保存云端题库失败: ${qErr.message}`);

    // Insert into user question bank
    const { data: userQ, error: uqErr } = await client
      .from('user_questions')
      .insert({
        user_id,
        question_id: question.id,
        wrong_answer,
        error_analysis: req.body.error_analysis || null,
      })
      .select()
      .single();
    if (uqErr) throw new Error(`保存用户题库失败: ${uqErr.message}`);

    // Update learning profile with error analysis
    if (wrong_answer && req.body.error_analysis) {
      const { data: profile } = await client
        .from('learning_profiles')
        .select('error_patterns')
        .eq('user_id', user_id)
        .maybeSingle();

      const existingPatterns = profile?.error_patterns || '';
      const newPattern = `\n[${new Date().toISOString().split('T')[0]}] 科目:${subject} 知识点:${JSON.stringify(knowledge_points)} 错因:${req.body.error_analysis}`;
      await client
        .from('learning_profiles')
        .update({ error_patterns: existingPatterns + newPattern, updated_at: new Date().toISOString() })
        .eq('user_id', user_id);
    }

    // Record usage
    await client.from('usage_records').insert({
      user_id,
      action_type: 'question_entry',
      detail: `录入了${subject}题目: ${content.substring(0, 50)}...`,
    });

    res.json({ question, user_question: userQ });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/questions/:id - Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return res.status(404).json({ error: '题目不存在' });
    res.json({ question: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/questions/:id/rate - Rate a question
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    const client = getSupabaseClient();

    const { data: question, error: getErr } = await client
      .from('questions')
      .select('rating, rating_count')
      .eq('id', req.params.id)
      .maybeSingle();
    if (getErr) throw new Error(`查询失败: ${getErr.message}`);
    if (!question) return res.status(404).json({ error: '题目不存在' });

    const newCount = (question.rating_count || 0) + 1;
    const newRating = Math.round(((question.rating || 3) * (newCount - 1) + rating) / newCount);

    const { data, error } = await client
      .from('questions')
      .update({ rating: newRating, rating_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw new Error(`评分失败: ${error.message}`);
    res.json({ question: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/questions/:id/report - Report a question as incorrect
router.post('/:id/report', async (req, res) => {
  try {
    const { reason } = req.body;
    const client = getSupabaseClient();

    const { data: question, error: getErr } = await client
      .from('questions')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (getErr) throw new Error(`查询失败: ${getErr.message}`);
    if (!question) return res.status(404).json({ error: '题目不存在' });

    // Use LLM to verify the question
    const prompt = `请检查以下题目是否有误：

题目内容：${question.content}
${question.answer ? `参考答案：${question.answer}` : ''}
用户反馈：${reason}

请以JSON格式返回（不要包含markdown代码块标记）：
{
  "has_error": true/false,
  "explanation": "解释"
}`;

    const messages = [{ role: 'user', content: prompt }];
    const result = await invokeLLM(messages, { temperature: 0.2 });

    let check;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) check = JSON.parse(jsonMatch[0]);
      else check = { has_error: false, explanation: '无法判断' };
    } catch {
      check = { has_error: false, explanation: '无法判断' };
    }

    if (check.has_error) {
      // Remove question from cloud bank
      await client
        .from('questions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', req.params.id);
    } else {
      // Lower rating
      const newRating = Math.max(1, (question.rating || 3) - 1);
      await client
        .from('questions')
        .update({ rating: newRating, updated_at: new Date().toISOString() })
        .eq('id', req.params.id);
    }

    res.json({ check, question_updated: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/questions - Get user's questions
router.get('/', async (req, res) => {
  try {
    const { user_id, limit = '20', offset = '0' } = req.query;
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('user_questions')
      .select('*, questions(*)')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);
    if (error) throw new Error(`查询失败: ${error.message}`);

    res.json({ questions: data || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
