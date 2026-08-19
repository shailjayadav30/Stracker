import type {Request,Response, NextFunction } from "express";

export interface AsyncFunction {
  (req: Request, res: Response, next: NextFunction): Promise<unknown>;
}

export interface AsyncHandler {
  (req: Request, res: Response, next: NextFunction): void;
}

const catchAsync = (fn: AsyncFunction): AsyncHandler => {
  return (req:Request, res:Response, next:NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
