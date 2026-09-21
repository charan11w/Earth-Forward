import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { asyncHandler,AppError,paramId } from '../../lib/http';
import { requireAuth,requireRole } from '../../middleware/auth';
import { routeInclude } from '../../lib/models';
import { dispatchLock,makePlan,planningData } from '../../services/dispatch.service';
const r=Router();r.use(requireAuth,requireRole('ADMIN','WORKER'));
const inputSchema=z.object({truckIds:z.array(z.string()).min(1).max(50),binIds:z.array(z.string()).max(500).default([]),pickupIds:z.array(z.string()).max(500).default([])});
r.get('/planning',requireRole('ADMIN'),asyncHandler(async(_req,res)=>res.json(await planningData(prisma))));
r.post('/preview',requireRole('ADMIN'),asyncHandler(async(req,res)=>res.json(await makePlan(prisma,inputSchema.parse(req.body)))));
r.post('/generate',requireRole('ADMIN'),asyncHandler(async(req,res)=>{
  const input=inputSchema.parse(req.body);
  const result=await prisma.$transaction(async tx=>{
    await dispatchLock(tx);
    const plan=await makePlan(tx,input),created=[];
    for(const group of plan.routes){
      const route=await tx.route.create({data:{
        truckId:group.truckId,workerId:group.truck.driverId,date:new Date(),clusterId:crypto.randomUUID(),
        totalDistance:group.totalDistance,estimatedMinutes:group.estimatedMinutes+group.ordered.length*3,
        startLatitude:group.truck.currentLatitude,startLongitude:group.truck.currentLongitude,status:'ASSIGNED'
      }});
      for(const [i,job] of group.ordered.entries()){
        await tx.routeStop.create({data:{routeId:route.id,sequence:i+1,latitude:job.latitude,longitude:job.longitude,address:job.address,notes:job.notes,...(job.kind==='bin'?{binId:job.id}:{pickupRequestId:job.id})}});
        if(job.kind==='pickup')await tx.pickupRequest.update({where:{id:job.id},data:{routeId:route.id,status:'ASSIGNED'}});
      }
      await tx.truck.update({where:{id:group.truckId},data:{status:'ASSIGNED'}});
      created.push(await tx.route.findUniqueOrThrow({where:{id:route.id},include:routeInclude}));
    }
    return {routes:created,unassigned:plan.unassigned};
  },{timeout:30000});res.status(201).json(result);
}));
r.get('/',asyncHandler(async(req,res)=>res.json(await prisma.route.findMany({where:req.auth!.role==='WORKER'?{workerId:req.auth!.userId}:{},include:routeInclude,orderBy:{createdAt:'desc'}}))));
r.get('/:id',asyncHandler(async(req,res)=>{
  const route=await prisma.route.findUnique({where:{id:paramId(req)},include:routeInclude});
  if(!route)throw new AppError(404,'Route not found');
  if(req.auth!.role!=='ADMIN'&&route.workerId!==req.auth!.userId)throw new AppError(403,'This route belongs to another driver');
  res.json(route);
}));
export default r;

