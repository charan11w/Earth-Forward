import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/http';
export const notFound:RequestHandler=(req,_res,next)=>next(new AppError(404,`Route ${req.method} ${req.path} not found`));
export const errorHandler:ErrorRequestHandler=(err,_req,res,_next)=>{ if(err instanceof ZodError) return res.status(400).json({error:'Please check the submitted fields',details:err.flatten()}); if(err instanceof AppError) return res.status(err.status).json({error:err.message,details:err.details}); if(err instanceof Prisma.PrismaClientKnownRequestError&&err.code==='P2002') return res.status(409).json({error:'A record with this value already exists'}); console.error(err); res.status(500).json({error:'Internal server error'}); };
