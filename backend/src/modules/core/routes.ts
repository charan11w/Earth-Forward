import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler,AppError,paramId } from '../../lib/http';
import { safeUser,addressSchema } from '../../lib/models';
import { requireAuth } from '../../middleware/auth';
import { distanceMeters } from '../../services/geo.service';
const r=Router();r.use(requireAuth);
r.get('/users/me',asyncHandler(async(req,res)=>res.json(await prisma.user.findUniqueOrThrow({
  where:{id:req.auth!.userId},select:{...safeUser,addresses:{orderBy:[{isDefault:'desc'},{createdAt:'asc'}]}}
}))));
r.put('/users/me',asyncHandler(async(req,res)=>{
  const data=z.object({
    name:z.string().trim().min(2).max(100),
    phone:z.string().trim().max(30).nullable().optional(),
    photoUrl:z.string().max(350000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable().optional()
  }).parse(req.body);
  res.json(await prisma.user.update({where:{id:req.auth!.userId},data,select:safeUser}));
}));
r.get('/addresses',asyncHandler(async(req,res)=>res.json(await prisma.address.findMany({where:{userId:req.auth!.userId},orderBy:[{isDefault:'desc'},{createdAt:'asc'}]}))));
r.post('/addresses',asyncHandler(async(req,res)=>{
  const input=addressSchema.parse(req.body),userId=req.auth!.userId;
  const saved=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const first=await tx.address.count({where:{userId}})===0;
    if(input.isDefault||first)await tx.address.updateMany({where:{userId},data:{isDefault:false}});
    return tx.address.create({data:{...input,userId,isDefault:input.isDefault||first}});
  });res.status(201).json(saved);
}));
r.put('/addresses/:id',asyncHandler(async(req,res)=>{
  const input=addressSchema.parse(req.body),userId=req.auth!.userId,id=paramId(req);
  res.json(await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const old=await tx.address.findFirst({where:{id,userId}});
    if(!old)throw new AppError(404,'Address not found');
    if(input.isDefault)await tx.address.updateMany({where:{userId},data:{isDefault:false}});
    return tx.address.update({where:{id},data:{...input,isDefault:input.isDefault||old.isDefault}});
  }));
}));
r.delete('/addresses/:id',asyncHandler(async(req,res)=>{
  const id=paramId(req),userId=req.auth!.userId;
  await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const old=await tx.address.findFirst({where:{id,userId},include:{_count:{select:{pickups:true,binRequests:true}}}});
    if(!old)throw new AppError(404,'Address not found');
    if(old._count.pickups||old._count.binRequests)throw new AppError(409,'This address is linked to collection requests and cannot be deleted.');
    await tx.address.delete({where:{id}});
    if(old.isDefault){const next=await tx.address.findFirst({where:{userId},orderBy:{createdAt:'asc'}});if(next)await tx.address.update({where:{id:next.id},data:{isDefault:true}});}
  });res.json({ok:true});
}));
r.post('/bin-requests',asyncHandler(async(req,res)=>{
  const data=z.object({type:z.enum(['HOUSEHOLD','COMMUNITY','PUBLIC']).default('HOUSEHOLD'),size:z.string().min(1),reason:z.string().min(3),addressId:z.string()}).parse(req.body);
  const a=await prisma.address.findFirst({where:{id:data.addressId,userId:req.auth!.userId}});
  if(!a)throw new AppError(404,'Address not found');
  res.status(201).json(await prisma.binRequest.create({data:{...data,userId:req.auth!.userId}}));
}));
r.get('/bin-requests/my',asyncHandler(async(req,res)=>res.json(await prisma.binRequest.findMany({where:{userId:req.auth!.userId},include:{address:true},orderBy:{createdAt:'desc'}}))));
r.get('/bins/nearby',asyncHandler(async(req,res)=>{
  const q=z.object({lat:z.coerce.number().min(-90).max(90),lng:z.coerce.number().min(-180).max(180),radius:z.coerce.number().positive().max(50000).default(2000)}).parse(req.query);
  const bins=await prisma.bin.findMany({where:{status:'ACTIVE',type:{in:['COMMUNITY','PUBLIC']}}});
  res.json(bins.map(bin=>({...bin,distanceMeters:distanceMeters({latitude:q.lat,longitude:q.lng},bin)})).filter(b=>b.distanceMeters<=q.radius).sort((a,b)=>a.distanceMeters-b.distanceMeters));
}));
export default r;

