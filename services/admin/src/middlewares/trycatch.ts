import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncController = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<unknown>;

const TryCatch = (controller: AsyncController): RequestHandler =>
  (req, res, next) => {
    void controller(req, res, next).catch(next);
  };

export default TryCatch;
