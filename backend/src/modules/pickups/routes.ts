import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler,AppError,paramId } from '../../lib/http';
import { requireAuth,requireRole } from '../../middleware/auth';
import { dispatchLock } from '../../services/dispatch.service';
const r=Router();r.use(requireAuth);
r.post('/',requireRole('RESIDENT'),asyncHandler(async(req,res)=>{
  const d=z.object({addressId:z.string(),binId:z.string().optional(),wasteType:z.string().min(2),quantity:z.number().positive().max(1000),accessNotes:z.string().max(1000).optional(),serviceType:z.enum(['NORMAL_PICKUP','EXTRA_CLEANING']).default('NORMAL_PICKUP')}).parse(req.body);
  const result=await prisma.$transaction(async tx=>{
    await dispatchLock(tx);
    const a=await tx.address.findFirst({where:{id:d.addressId,userId:req.auth!.userId}});
    if(!a)throw new AppError(404,'Address not found');
    if(d.binId){
      if(!await tx.bin.findFirst({where:{id:d.binId,ownerUserId:req.auth!.userId,status:'ACTIVE'}}))throw new AppError(404,'Your active household bin was not found');
      if(await tx.pickupRequest.count({where:{binId:d.binId,status:{in:['CREATED','QUEUED','ASSIGNED','IN_PROGRESS']}}}))throw new AppError(409,'This bin already has an active pickup');
    }
    const snapshot={addressLine:a.addressLine,area:a.area,landmark:a.landmark,accessNotes:a.accessNotes,latitude:a.latitude,longitude:a.longitude};
    return tx.pickupRequest.create({data:{...d,userId:req.auth!.userId,latitude:a.latitude,longitude:a.longitude,addressSnapshot:snapshot}});
  });res.status(201).json(result);
}));
r.get('/my',asyncHandler(async(req,res)=>res.json(await prisma.pickupRequest.findMany({where:{userId:req.auth!.userId},include:{address:true,routeStop:true,route:{include:{truck:true,worker:{select:{id:true,name:true,phone:true}}}}},orderBy:{createdAt:'desc'}}))));
r.patch('/:id/cancel',asyncHandler(async(req,res)=>{
  res.json(await prisma.$transaction(async tx=>{
    await dispatchLock(tx);
    const p=await tx.pickupRequest.findFirst({where:{id:paramId(req),userId:req.auth!.userId}});
    if(!p)throw new AppError(404,'Pickup not found');
    if(!['CREATED','QUEUED'].includes(p.status))throw new AppError(409,'This pickup is already assigned or closed');
    return tx.pickupRequest.update({where:{id:p.id},data:{status:'CANCELLED'}});
  }));
}));
export default r;
