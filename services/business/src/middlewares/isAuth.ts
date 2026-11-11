import {Request, Response, NextFunction} from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface IUser {
    _id : string;
  email: string;
  name: string;
  image?: string;
  role: "customer" | "merchant" | "rider" | "admin";
  createdAt: Date;
  updatedAt: Date;
    businessId?: string;
}


export interface AuthenticatedRequest extends Request {
    user?: IUser | null;  
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({ message: "Authorization header missing or malformed" });
            return;
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            res.status(401).json({ message: "Token missing" });
            return;
        }
        const decodedValue = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        if (!decodedValue || !decodedValue.user) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        req.user = decodedValue.user as IUser;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ message: "Token expired" });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        console.error("Authentication token verification failed:", error);
        res.status(500).json({ message: "Unable to verify your sign-in" });
    }
}


export const isMerchant =  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if(!user || user.role !== "merchant"){
        res.status(403).json({
            message:"You are not authorized merchant."
        })
        return;
    }
    next();
}