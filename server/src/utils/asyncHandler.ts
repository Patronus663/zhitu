import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 包装异步路由处理器：将 rejected promise 转发给统一错误处理中间件。
 * Express 4 不会自动捕获 async 抛出的异常，必须显式包装。
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}