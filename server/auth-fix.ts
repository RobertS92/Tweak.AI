/**
 * Apply our auth debugging to all key endpoints
 */
import { Request, Response, NextFunction } from 'express';
import { debugAuthStatus } from './utils/auth-debug';

export function enhancedAuthCheck(req: Request, res: Response, next: NextFunction) {
  debugAuthStatus(req, req.url);
  
  if (!req.isAuthenticated()) {
    console.log("[AUTH-FIX] Authentication required - redirecting to login");
    return res.status(401).json({ 
      message: "You must be logged in",
      requiresAuth: true
    });
  }
  
  next();
}