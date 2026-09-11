import type { Request, Response, NextFunction } from 'express';

/**
 * 应用自定义错误类型
 * 统一业务错误码与 HTTP 状态码的映射关系，
 * 供路由抛出、由 errorHandler 中间件统一序列化。
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, 'BAD_REQUEST', details);
export const unauthorized = (message = '未登录或登录已失效') =>
  new AppError(401, message, 'UNAUTHORIZED');
export const forbidden = (message = '无权访问该资源') =>
  new AppError(403, message, 'FORBIDDEN');
export const notFound = (message = '资源不存在') => new AppError(404, message, 'NOT_FOUND');
export const conflict = (message = '资源冲突') => new AppError(409, message, 'CONFLICT');

/**
 * 404 兜底路由：未匹配到任何路由时返回统一 JSON，而非默认 HTML。
 */
export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: '接口不存在' },
  });
}

/**
 * 统一错误处理中间件：捕获同步异常与 async 异常，
 * 序列化为结构化 JSON，避免堆栈信息泄露（生产环境）。
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // 请求体 JSON 解析失败
  if (err instanceof SyntaxError && 'body' in (err as any)) {
    return res.status(400).json({
      success: false,
      error: { code: 'BAD_REQUEST', message: '请求体 JSON 格式不合法' },
    });
  }

  // Multer 文件上传错误（文件过大等）
  if (err && (err as any).name === 'MulterError') {
    return res.status(413).json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: '文件大小超过限制（最大 10MB）' },
    });
  }

  // 其他未知错误：记日志，返回通用 500（不暴露内部信息）
  // eslint-disable-next-line no-console
  console.error('[UnhandledError]', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
}