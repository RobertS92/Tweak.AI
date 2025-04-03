/**
 * Authentication debugging utility
 * Adds detailed logging for authentication-related issues
 */
import { Request } from 'express';
import { Session } from 'express-session';

export function debugAuthStatus(req: Request, location: string): void {
  console.log(`[AUTH-DEBUG] Location: ${location}`);
  console.log(`[AUTH-DEBUG] isAuthenticated: ${req.isAuthenticated()}`);
  console.log(`[AUTH-DEBUG] Session exists: ${req.session ? 'Yes' : 'No'}`);
  
  if (req.session) {
    const sessionKeys = Object.keys(req.session);
    console.log(`[AUTH-DEBUG] Session keys: ${sessionKeys.join(', ')}`);
    console.log(`[AUTH-DEBUG] Session ID: ${req.session.id}`);
    console.log(`[AUTH-DEBUG] Passport in session: ${sessionKeys.includes('passport') ? 'Yes' : 'No'}`);
  }
  
  if (req.user) {
    console.log(`[AUTH-DEBUG] User ID: ${(req.user as any).id}`);
    console.log(`[AUTH-DEBUG] Username: ${(req.user as any).username}`);
  } else {
    console.log(`[AUTH-DEBUG] No user object found in request`);
  }
  
  console.log(`[AUTH-DEBUG] Cookies present: ${req.headers.cookie ? 'Yes' : 'No'}`);
  if (req.headers.cookie) {
    console.log(`[AUTH-DEBUG] Cookie header: ${req.headers.cookie}`);
  }
  
  // Check if the request included credentials
  console.log(`[AUTH-DEBUG] Request made with credentials: ${
    req.headers['sec-fetch-mode'] === 'cors' && 
    req.headers['sec-fetch-site'] === 'same-origin' && 
    req.headers['sec-fetch-credentials'] === 'include' ? 'Yes' : 'Unknown'
  }`);
}