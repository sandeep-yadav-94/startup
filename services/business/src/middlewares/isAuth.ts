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
        res.status(500).json({ message: "Please Login Again" });
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