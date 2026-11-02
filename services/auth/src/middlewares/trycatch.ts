import {Request, Response, RequestHandler, NextFunction} from "express";

const TryCatch = (handler: RequestHandler): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Internal Server Error";
            console.error("Auth request failed:", message);
            res.status(500).json({ message });
        }
    }
}

export default TryCatch;