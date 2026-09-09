import { invokeLLM } from '../src/services/llm';
import { getSupabaseClient } from '../src/storage/database/supabase-client';

function stripMarkdown(s: string): string {
  let t = s.trim();
  t = t.replace(/^```(?:json)?\s*/i, '');
  t = t.replace(/```\s*$/, '');
  return t.trim();
}

function tryParseArray(raw: string): any[] | null {
  const m = raw.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}

const SYSTEM = '你是严谨的高等数学/微积分解题专家。';

async function processBatch(items: { id: string; content: string }[]) {
  const listText = items
    .map((it) => `<question id="${it.id}">\n${it.content}\n</question>`)
    .join('\n\n');
  const user = `请为下列每道数学题给出【完整、准确的解答】。要求：
1. 若为计算题给出结果与必要步骤，若为证明题给出证明过程，若为展开题给出展开式。
2. 使用自然数学文本表示，可用 Unicode 符号（∫ ∬ ∭ ∑ ∏ √ ∞ → ≤ ≥ ± ² ³ π 等）与 / 表示分数，必要时用 ^{上标} 和 _{下标}，不要使用任何 LaTeX 反斜杠命令（如 \\frac、\\int 等）。
3. 只返回一个 JSON 数组，每个元素形如 {"id":"题目的id","answer":"解答内容"}，id 必须与题目中的 id 完全一致（保留连字符），不要输出任何多余文字。

输入题目：
${listText}`;

  const raw = await invokeLLM(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
    { temperature: 0.3, thinking: 'disabled' }
  );
  const arr = tryParseArray(stripMarkdown(raw));
  return arr || [];
}

async function resolveOne(id: string, content: string): Promise<string | null> {
  const user = `请解答下面这道数学题，给出完整准确的解法与答案。使用自然数学符号（∫ ∬ ∭ ∑ ∏ √ ∞ → ≤ ≥ ± ² ³ π 等），分数用 / ，上标用^{}、下标用_{}，不要使用任何 LaTeX 反斜杠命令。
只返回一个 JSON 对象：{"answer":"解答内容"}，不要输出多余文字。

题目：\n${content}`;
  const raw = await invokeLLM(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
    { temperature: 0.3, thinking: 'disabled' }
  );
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    return obj && obj.answer ? String(obj.answer).trim() : null;
  } catch {
    return null;
  }
}

async function main() {
  const limit = Number(process.argv[2] || 9999);
  const sb = getSupabaseClient();
  const { data, error } = await sb.from('questions').select('id,content,answer');
  if (error) {
    console.error('查询失败', error.message);
    return;
  }
  const bads = (data || []).filter((q: any) => {
    const a = (q.answer || '').trim();
    return (
      !a ||
      ['略', '解', '无', '略解'].includes(a) ||
      a.length < 3
    );
  }).filter((q: any) => !String(q.content || '').includes('中期简报'));
  console.log(`待补答案题目数：${bads.length}`);
  const targets = bads.slice(0, limit);
  console.log(`本次处理：${targets.length}`);

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < targets.length; i += 6) {
    const batch = targets.slice(i, i + 6);
    const ans = await processBatch(batch);
    const done = new Set((ans || []).filter((x: any) => x).map((x: any) => x.id));
    // 先更新批量成功的结果
    for (const item of ans || []) {
      if (item && item.id && item.answer) {
        const { error: upErr } = await sb
          .from('questions')
          .update({ answer: String(item.answer).trim() })
          .eq('id', item.id);
        if (upErr) {
          console.error('更新失败', item.id, upErr.message);
          fail++;
        } else {
          ok++;
        }
      }
    }
    // 未成功的逐题固定点重试
    for (const q of batch) {
      if (done.has(q.id)) continue;
      const oneAns = await resolveOne(q.id, q.content);
      if (oneAns) {
        const { error: upErr } = await sb.from('questions').update({ answer: oneAns }).eq('id', q.id);
        if (!upErr) ok++;
        else fail++;
      } else {
        fail++;
        console.error('单题仍未解决：', q.id, q.content.slice(0, 30));
      }
    }
    console.log(`已处理批次 #${Math.floor(i / 6) + 1} / ${Math.ceil(targets.length / 6)}，累计成功 ${ok}`);
  }
  console.log(`完成：成功补答案 ${ok}，失败 ${fail}`);
}

main();