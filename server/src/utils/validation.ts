import { AppError } from './errors.js';

/**
 * 轻量请求参数校验工具。
 *
 * 用法一（Validator 风格）：users 路由
 *   Validator.check(id === undefined || typeof id === 'string', 'id 格式错误');
 *
 * 用法二（rule/values 风格）：plans 路由
 *   assertValid({ title: str }, { title });                    // 必填字符串
 *   assertValid({ nickname: optStr(32) }, { nickname });       // 可选字符串，最长 32
 */
export class Validator {
  /** 校验布尔断言，失败抛出 400 业务错误 */
  static check(ok: boolean, message: string): void {
    if (!ok) throw new AppError(400, message, 'BAD_REQUEST');
  }
}

interface StringRule {
  kind: 'str';
  max?: number;
  min?: number;
}
type OptStringRule = StringRule & { optional: true };

/** 必填字符串规则；可传入最长长度限制 */
export function str(max?: number): StringRule {
  return { kind: 'str', max };
}
/** 可选字符串规则；可传入最长长度限制 */
export function optStr(max?: number): OptStringRule {
  return { ...str(max), optional: true };
}

/**
 * 按 rules 定义校验 source。
 * @param rules  每条规则：key -> 规则对象（done via str/optStr）
 * @param source 待校验的值对象
 */
export function assertValid(
  rules: Record<string, StringRule | OptStringRule | true>,
  source: Record<string, unknown>
): void {
  for (const [key, rule] of Object.entries(rules)) {
    const value = source[key];
    const isOpt = typeof rule === 'object' && (rule as OptStringRule).optional === true;

    if (value === undefined || value === null || value === '') {
      if (isOpt) continue;
      Validator.check(false, `${key} 不能为空`);
    }

    if (typeof value !== 'string') {
      Validator.check(false, `${key} 必须是字符串`);
    }

    const max = typeof rule === 'object' ? (rule as StringRule).max : undefined;
    if (typeof value === 'string' && max !== undefined && value.length > max) {
      Validator.check(false, `${key} 长度不能超过 ${max}`);
    }
    const min = typeof rule === 'object' ? (rule as StringRule).min : undefined;
    if (typeof value === 'string' && min !== undefined && value.length < min) {
      Validator.check(false, `${key} 长度不能少于 ${min}`);
    }
  }
}