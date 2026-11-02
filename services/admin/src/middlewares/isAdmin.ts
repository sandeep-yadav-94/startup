import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getAdminEmail } from "../config/admin.js";

interface AdminUser {
  _id: string;
  email: string;
  role: string | null;
}

export interface AdminRequest extends Request {
  user?: AdminUser;
}

export const isAdmin = (req: AdminRequest, res: Response, next: NextFunction) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization required" });
  }

  const token = authorization.slice("Bearer ".length);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET is missing from admin service configuration");
    return res.status(500).json({ message: "Admin authentication is not configured" });
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    const user = decoded.user as AdminUser | undefined;
    if (
      !user ||
      typeof user.email !== "string" ||
      user.email.trim().toLowerCase() !== getAdminEmail() ||
      user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Admin access is restricted" });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
};
