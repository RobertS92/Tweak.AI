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
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Set trial end date to 3 days from now
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3); // 3-day free trial

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        trialEndDate: trialEndDate,
        planType: "base" // Start with base plan during trial
      });

      req.login(user, (err) => {
        if (err) return next(err);
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
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      
      req.login(user, (loginErr: any) => {
        if (loginErr) return next(loginErr);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        
        // Add trial information if applicable
        let responseUser = { ...userWithoutPassword };
        
        if (user.trialEndDate) {
          const now = new Date();
          const trialEnd = new Date(user.trialEndDate);
          
          // Calculate days remaining in trial
          const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
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
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user;
    
    // Calculate trial information if applicable
    let responseUser = { ...userWithoutPassword };
    
    if (req.user.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(req.user.trialEndDate);
      
      // Calculate days remaining in trial
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Add trial info to response
      // Cast to any to avoid TypeScript errors with additional properties
      const userData = {...responseUser} as any;
      userData.trialDaysRemaining = Math.max(0, daysRemaining);
      userData.isInTrial = daysRemaining > 0;
      responseUser = userData;
    }
    
    res.json(responseUser);
  });
}