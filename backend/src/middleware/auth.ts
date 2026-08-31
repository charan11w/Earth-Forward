import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../lib/http';
export const requireAuth:RequestHandler=(req,_res,next)=>{ const token=req.headers.authorization?.replace(/^Bearer\s+/i,''); if(!token) return next(new AppError(401,'Authentication required')); try { req.auth=jwt.verify(token,env.JWT_SECRET) as {userId:string;role:Role}; next(); } catch { next(new AppError(401,'Invalid or expired token')); } };
export const requireRole=(...roles:Role[]):RequestHandler=>(req,_res,next)=> req.auth&&roles.includes(req.auth.role)?next():next(new AppError(403,'Insufficient permissions'));
