import { Router } from 'express';
import { prisma } from '../../config/prisma';
import { asyncHandler,AppError,paramId } from '../../lib/http';
import { requireAuth,requireRole } from '../../middleware/auth';
import { routeInclude } from '../../lib/models';
import { completeStop,dispatchLock } from '../../services/dispatch.service';
const r=Router();r.use(requireAuth,requireRole('WORKER','ADMIN'));
r.get('/routes',asyncHandler(async(req,res)=>res.json(await prisma.route.findMany({where:req.auth!.role==='WORKER'?{workerId:req.auth!.userId}:{},include:routeInclude,orderBy:{createdAt:'desc'}}))));
r.post('/routes/:id/start',asyncHandler(async(req,res)=>{
  res.json(await prisma.$transaction(async tx=>{
    await dispatchLock(tx);
    const route=await tx.route.findUnique({where:{id:paramId(req)}});
    if(!route)throw new AppError(404,'Route not found');
    if(req.auth!.role!=='ADMIN'&&route.workerId!==req.auth!.userId)throw new AppError(403,'Not your route');
    if(route.status!=='ASSIGNED')throw new AppError(409,'Route has already started or finished');
    await tx.truck.update({where:{id:route.truckId},data:{status:'IN_SERVICE'}});
    await tx.pickupRequest.updateMany({where:{routeId:route.id,status:'ASSIGNED'},data:{status:'IN_PROGRESS'}});
    return tx.route.update({where:{id:route.id},data:{status:'IN_PROGRESS',startedAt:new Date()},include:routeInclude});
  }));
}));
for(const action of ['complete','failed-access'])r.post('/stops/:id/'+action,asyncHandler(async(req,res)=>{
  res.json(await prisma.$transaction(tx=>completeStop(tx,paramId(req),req.auth!.userId,req.auth!.role,action==='failed-access'),{timeout:15000}));
}));
r.post('/pickups/:id/complete',asyncHandler(async(req,res)=>{
  const stop=await prisma.routeStop.findUnique({where:{pickupRequestId:paramId(req)}});
  if(!stop)throw new AppError(404,'Assigned pickup not found');
  res.json(await prisma.$transaction(tx=>completeStop(tx,stop.id,req.auth!.userId,req.auth!.role)));
}));
export default r;

