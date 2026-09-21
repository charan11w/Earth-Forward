import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { asyncHandler,AppError } from '../../lib/http';
import { safeUser } from '../../lib/models';
import { requireAuth } from '../../middleware/auth';
const r=Router(),credentials=z.object({email:z.string().trim().toLowerCase().pipe(z.email()),password:z.string().min(8).max(72)});
function token(user:{id:string;role:string}){return jwt.sign({userId:user.id,role:user.role},env.JWT_SECRET,{expiresIn:env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']});}
r.post('/register',asyncHandler(async(req,res)=>{
  const {password,...profile}=credentials.extend({name:z.string().trim().min(2).max(100)}).parse(req.body);
  const user=await prisma.user.create({data:{...profile,passwordHash:await bcrypt.hash(password,12)},select:safeUser});
  res.status(201).json({user,token:token(user)});
}));
for(const driver of [false,true])r.post(driver?'/driver/login':'/login',asyncHandler(async(req,res)=>{
  const p=credentials.parse(req.body),found=await prisma.user.findUnique({where:{email:p.email}});
  if(!found||!await bcrypt.compare(p.password,found.passwordHash))throw new AppError(401,'Invalid email or password');
  if(driver&&found.role!=='WORKER')throw new AppError(403,'Use the resident / admin sign-in page for this account');
  if(!driver&&found.role==='WORKER')throw new AppError(403,'Use the truck driver sign-in page for this account');
  const user=await prisma.user.findUniqueOrThrow({where:{id:found.id},select:safeUser});res.json({user,token:token(user)});
}));
r.get('/me',requireAuth,asyncHandler(async(req,res)=>res.json(await prisma.user.findUniqueOrThrow({where:{id:req.auth!.userId},select:safeUser}))));
export default r;

