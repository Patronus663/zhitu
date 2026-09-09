import { getSupabaseClient } from '../src/storage/database/supabase-client';

/** 将 LaTeX 命令批量转换为可读的 Unicode 数学符号 */
function convertLaTeX(input: string): string {
  if (!input) return input;
  let s = input;

  // 分数：从最内层开始处理（A、B 内不含花括号）
  let guard = 0;
  while (s.includes('\\frac') && guard++ < 30) {
    const next = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    if (next === s) break;
    s = next;
  }

  // 积分（含上下限可变）
  s = s.replace(/\\int\s*(?:_\{([^{}]*)\})?\s*(?:\^\{([^{}]*)\})?/g, (m, a, b) =>
    a && b ? `∫[${a}到${b}]` : a ? `∫[${a}..]` : b ? `∫[..${b}]` : '∫'
  );

  const rules: Array<[RegExp, string]> = [
    [/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '$1√$2'],
    [/\\sqrt\s*\{([^{}]*)\}/g, '√$1'],
    [/\\sum\s*_\{([^{}]*)\}\s*\^\{([^{}]*)\}/g, '∑($1到$2)'],
    [/\\sum\s*_\{([^{}]*)\}/g, '∑($1)'],
    [/\\sum/g, '∑'],
    [/\\prod\s*_\{([^{}]*)\}/g, '∏($1)'],
    [/\\prod/g, '∏'],
    [/\\cdot/g, '·'],
    [/\\times/g, '×'],
    [/\\cdots/g, '…'],
    [/\\ldots/g, '…'],
    [/\\infty/g, '∞'],
    [/\\pi/g, 'π'],
    [/\\alpha/g, 'α'],
    [/\\beta/g, 'β'],
    [/\\gamma/g, 'γ'],
    [/\\delta/g, 'δ'],
    [/\\theta/g, 'θ'],
    [/\\phi/g, 'ϕ'],
    [/\\varphi/g, 'φ'],
    [/\\mu/g, 'μ'],
    [/\\sigma/g, 'σ'],
    [/\\epsilon/g, 'ε'],
    [/\\varepsilon/g, 'ε'],
    [/\\lambda/g, 'λ'],
    [/\\omega/g, 'ω'],
    [/\\geq/g, '≥'],
    [/\\leq/g, '≤'],
    [/\\neq/g, '≠'],
    [/\\geqslant/g, '≥'],
    [/\\leqslant/g, '≤'],
    [/\\approx/g, '≈'],
    [/\\pm/g, '±'],
    [/\\rightarrow/g, '→'],
    [/\\Rightarrow/g, '→'],
    [/\\longrightarrow/g, '→'],
    [/\\(?:\,\;|\quad|\qquad)/g, ' '],
    [/\\left/g, ''],
    [/\\right/g, ''],
    [/\\text\s*\{([^{}]*)\}/g, '$1'],
    [/\\mathrm\s*\{([^{}]*)\}/g, '$1'],
    [/\\operatorname\s*\{([^{}]*)\}/g, '$1'],
    [/\^\{([^{}]*)\}/g, '^$1'],
    [/\_\{([^{}]*)\}/g, '_$1'],
    [/\\ /g, ' '],
    [/\\[A-Za-z]+/g, ''],
    [/[{}]/g, ''],
    [/\s{2,}/g, ' '],
  ];
  for (const [re, rep] of rules) s = s.replace(re, rep);
  return s.trim();
}

async function main() {
  const client = getSupabaseClient();
  const { data: rows, error } = await client.from('questions').select('id, content, answer');
  if (error) throw new Error(error.message);
  if (!rows) return;

  let changed = 0;
  for (const r of rows) {
    const nc = convertLaTeX(r.content ?? '');
    const na = convertLaTeX(r.answer ?? '');
    const dirty = nc !== (r.content ?? '') || na !== (r.answer ?? '');
    if (!dirty) continue;
    const { error: ue } = await client.from('questions').update({ content: nc, answer: na }).eq('id', r.id);
    if (ue) { console.error('update failed', r.id, ue.message); continue; }
    changed++;
  }
  console.log('共更新题目数:', changed, '/', rows.length);
}

main().catch((e) => { console.error(e); process.exit(1); });