import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends UserType {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "tweak-ai-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[DEBUG] Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`[DEBUG] User ${username} not found`);
          return done(null, false);
        }
        
        const passwordMatches = await comparePasswords(password, user.password);
        console.log(`[DEBUG] Password validation for ${username}: ${passwordMatches ? 'Success' : 'Failed'}`);
        
        if (!passwordMatches) {
          return done(null, false);
        } else {
          console.log(`[DEBUG] User ${username} authenticated successfully with ID: ${user.id}`);
          return done(null, user);
        }
      } catch (err) {
        console.error(`[ERROR] Authentication error:`, err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`[DEBUG] Serializing user with ID: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[DEBUG] Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      if (user) {
        console.log(`[DEBUG] User ID ${id} deserialized successfully`);
      } else {
        console.log(`[DEBUG] User ID ${id} not found during deserialization`);
      }
      done(null, user);
    } catch (err) {
      console.error(`[ERROR] Deserialization error for ID ${id}:`, err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log(`[DEBUG] Register attempt for username: ${req.body.username}`);
      
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        console.log(`[DEBUG] Registration failed - username ${req.body.username} already exists`);
        return res.status(400).json({ error: "Username already exists" });
      }

      // Set trial end date to 3 days from now
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3-day free trial
      console.log(`[DEBUG] Setting trial end date to: ${trialEndDate.toISOString()}`);

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        trialEndDate: trialEndDate,
        planType: "base" // Start with base plan during trial
      });
      
      console.log(`[DEBUG] User created with ID: ${user.id}, username: ${user.username}`);
      
      // Verify session setup before login
      console.log(`[DEBUG] Session before login:`, req.session.id ? 'Session exists' : 'No session yet');

      req.login(user, (err) => {
        if (err) {
          console.error(`[ERROR] Login after registration failed:`, err);
          return next(err);
        }
        
        console.log(`[DEBUG] User ${user.username} (ID: ${user.id}) logged in after registration`);
        console.log(`[DEBUG] Session after login:`, req.session.id);
        console.log(`[DEBUG] Authentication status:`, req.isAuthenticated());
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        
        // Add trial information to response
        // Cast to any to avoid TypeScript errors with additional properties
        const userData = {...userWithoutPassword} as any;
        userData.trialDaysRemaining = 3;
        userData.isInTrial = true;
        const responseUser = userData;
        
        res.status(201).json(responseUser);
      });
    } catch (err) {
      console.error(`[ERROR] Registration error:`, err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log(`[DEBUG] Login endpoint called for username: ${req.body.username}`);
    console.log(`[DEBUG] Session before auth:`, req.session.id || 'No session ID');
    
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
      if (err) {
        console.error(`[ERROR] Authentication error:`, err);
        return next(err);
      }
      
      if (!user) {
        console.log(`[DEBUG] Authentication failed for ${req.body.username}`);
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      console.log(`[DEBUG] Authentication successful for ${req.body.username}, proceeding with login`);
      
      req.login(user, (loginErr: any) => {
        if (loginErr) {
          console.error(`[ERROR] Login error:`, loginErr);
          return next(loginErr);
        }
        
        console.log(`[DEBUG] Login successful for user ID: ${user.id}`);
        console.log(`[DEBUG] Session after login:`, req.session.id);
        console.log(`[DEBUG] Authentication status:`, req.isAuthenticated());
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        
        // Add trial information if applicable
        let responseUser = { ...userWithoutPassword };
        
        if (user.trialEndDate) {
          const now = new Date();
          const trialEnd = new Date(user.trialEndDate);
          
          // Calculate days remaining in trial
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`[DEBUG] Trial days remaining for ${user.username}: ${daysRemaining}`);
          
          // Add trial info to response
          // Cast to any to avoid TypeScript errors with additional properties
          const userData = {...responseUser} as any;
          userData.trialDaysRemaining = Math.max(0, daysRemaining);
          userData.isInTrial = daysRemaining > 0;
          responseUser = userData;
        }
        
        res.status(200).json(responseUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`[DEBUG] GET /api/user - Authentication status:`, req.isAuthenticated());
    console.log(`[DEBUG] Session info:`, req.session ? `Session ID: ${req.session.id}` : 'No session');
    
    if (!req.isAuthenticated()) {
      console.log(`[DEBUG] User not authenticated on /api/user endpoint`);
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    console.log(`[DEBUG] User authenticated - ID: ${req.user.id}, username: ${req.user.username}`);
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user;
    
    // Calculate trial information if applicable
    let responseUser = { ...userWithoutPassword };
    
    if (req.user.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(req.user.trialEndDate);
      
      // Calculate days remaining in trial
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`[DEBUG] Trial days remaining for ${req.user.username}: ${daysRemaining}`);
      
      // Add trial info to response
      // Cast to any to avoid TypeScript errors with additional properties
      const userData = {...responseUser} as any;
      userData.trialDaysRemaining = Math.max(0, daysRemaining);
      userData.isInTrial = daysRemaining > 0;
      responseUser = userData;
    }
    
    console.log(`[DEBUG] Responding to /api/user with data for user ID: ${req.user.id}`);
    res.json(responseUser);
  });
}