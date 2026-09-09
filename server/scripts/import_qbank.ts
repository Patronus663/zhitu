import { invokeLLM } from '../src/services/llm';
import { getSupabaseClient } from '../src/storage/database/supabase-client';
import * as fs from 'fs';

interface Unit { year: string; content: string; }
interface Question { content: string; answer: string; subject: string; question_type: string; knowledge_points: string[]; methods: string[]; difficulty: number; source_year?: string; }

const units: Unit[] = JSON.parse(fs.readFileSync('/tmp/units.json', 'utf-8'));

function buildPrompt(content: string, year: string): string {
  return `你是微积分出题助手。以下是《微积分》${year}期末考试试卷内容（包含题干与答案摘要，因来源为文本/PDF提取，文本可能零散甚至有些数学符号错乱，部分公式的分数、下标、上下限等以空格分隔表达）。
请把其中每一道独立的题目整理成规范的题目记录。输出格式要求：每一行只输出一个 JSON 对象，不要输出数组，不要 markdown 代码块标记，不要任何解释。每行形如：
{"content":"题干","answer":"答案或解答要点","subject":"高等数学","question_type":"计算题","knowledge_points":["知识点"],"methods":["方法"],"difficulty":3}
要求：
- 只保留能明确构成一道完整题目的项；辨认不出或过于残缺的片段直接忽略。
- 题干必须完整、可读；答案尽量保留原文要点，没有答案则 answer 置为空字符串。
- 每题都给出 subject、question_type、knowledge_points、methods、difficulty。
- 每题单独一行，行内不要包含真正的换行符（把题干内的换行改成空格）。
- 只能用双引号包裹字符串，字符串内部不能出现未转义的双引号。

试卷原文（${year}）:
${content}`;
}

function tryParseLine(line: string): Question | null {
  const l = line.trim();
  if (!l || l.startsWith('```') || (!l.startsWith('{') && !l.startsWith('['))) return null;
  if (l.startsWith('[')) {
    const m = l.match(/\[([\s\S]*)\]/);
    if (!m) return null;
    try { const arr = JSON.parse('[' + m[1] + ']'); return Array.isArray(arr) && arr[0] ? arr[0] : null; } catch { return null; }
  }
  try { return JSON.parse(l); } catch { return null; }
}

async function main() {
  const mode = process.argv[2] || 'parse';

  if (mode === 'insert') {
    const client = getSupabaseClient();
    const parsed: Question[] = JSON.parse(fs.readFileSync('/tmp/parsed_q.json', 'utf-8'));
    const rows = parsed.map(q => ({
      content: q.content,
      answer: q.answer || '',
      images: [],
      subject: q.subject || '高等数学',
      question_type: q.question_type || '解答题',
      knowledge_points: Array.isArray(q.knowledge_points) ? q.knowledge_points : [],
      methods: Array.isArray(q.methods) ? q.methods : [],
      difficulty: q.difficulty || 3,
      created_by: null,
    }));
    const { data, error } = await client.from('questions').insert(rows).select('id');
    if (error) { console.error('INSERT ERROR:', error.message); process.exit(1); }
    console.log('INSERTED ->', data?.length ?? 0, '道题已写入云端题库');
    return;
  }

  const onlyYear = process.argv[3] || '';
  const targetUnits = onlyYear ? units.filter(u => u.year === onlyYear) : units;
  let all: Question[] = [];
  const errors: string[] = [];
  for (const u of targetUnits) {
    try {
      const raw = await invokeLLM([{ role: 'user', content: buildPrompt(u.content, u.year) }], { temperature: 0.3 });
      const lines = raw.split('\n');
      const rows: Question[] = [];
      for (const line of lines) {
        const q = tryParseLine(line);
        if (q && q.content) rows.push({ ...q, source_year: u.year });
      }
      all.push(...rows);
      console.log(`${u.year} -> ${rows.length} 题`);
    } catch (e: any) {
      errors.push(u.year); console.log(`${u.year} -> 出错: ${e.message}`);
    }
  }
  fs.writeFileSync('/tmp/parsed_q.json', JSON.stringify(all, null, 1), 'utf-8');
  console.log('TOTAL parsed:', all.length, 'errors:', JSON.stringify(errors));
}

main();