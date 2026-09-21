import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma';
import { asyncHandler,AppError,paramId } from '../../lib/http';
import { safeUser,coordinates,activeRoutes } from '../../lib/models';
import { requireAuth,requireRole } from '../../middleware/auth';
const r=Router();r.use(requireAuth,requireRole('ADMIN'));
r.get('/users',asyncHandler(async(_req,res)=>res.json(await prisma.user.findMany({select:{...safeUser,_count:{select:{pickups:true,addresses:true}},assignedTruck:true},orderBy:{createdAt:'desc'}}))));
r.get('/users/:id',asyncHandler(async(req,res)=>{
  const user=await prisma.user.findUnique({where:{id:paramId(req)},select:{...safeUser,addresses:true,assignedTruck:true,pickups:{include:{address:true},orderBy:{createdAt:'desc'},take:50}}});
  if(!user)throw new AppError(404,'User not found');res.json(user);
}));
r.post('/users',asyncHandler(async(req,res)=>{
  const {password,...data}=z.object({name:z.string().trim().min(2),email:z.string().trim().toLowerCase().pipe(z.email()),password:z.string().min(8).max(72),role:z.enum(['RESIDENT','WORKER'])}).parse(req.body);
  res.status(201).json(await prisma.user.create({data:{...data,passwordHash:await bcrypt.hash(password,12)},select:safeUser}));
}));
const truckSchema=z.object({name:z.string().trim().min(2),registrationNumber:z.string().trim().min(3),capacity:z.number().int().min(1).max(500),currentLatitude:coordinates.latitude,currentLongitude:coordinates.longitude,driverId:z.string().nullable(),active:z.boolean().default(true)});
r.get('/trucks',asyncHandler(async(_req,res)=>res.json(await prisma.truck.findMany({include:{driver:{select:safeUser}},orderBy:{name:'asc'}}))));
for(const method of ['post','put'] as const)r[method]('/trucks'+(method==='put'?'/:id':''),asyncHandler(async(req,res)=>{
  const input=truckSchema.parse(req.body),id=method==='put'?paramId(req):undefined;
  const saved=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(782341)`;
    if(id){const old=await tx.truck.findUnique({where:{id}});if(!old)throw new AppError(404,'Truck not found');if(await tx.route.count({where:{truckId:id,status:{in:[...activeRoutes]}}}))throw new AppError(409,'Finish this truck’s active route before changing its assignment or location.');}
    if(input.driverId){const driver=await tx.user.findFirst({where:{id:input.driverId,role:'WORKER'}});if(!driver)throw new AppError(400,'Choose a driver account');const busy=await tx.truck.findFirst({where:{driverId:input.driverId,...(id?{id:{not:id}}:{})}});if(busy)throw new AppError(409,'This driver is already assigned to another truck');if(await tx.route.count({where:{workerId:input.driverId,status:{in:[...activeRoutes]}}}))throw new AppError(409,'This driver has an active route');}
    return id?tx.truck.update({where:{id},data:input,include:{driver:{select:safeUser}}}):tx.truck.create({data:input,include:{driver:{select:safeUser}}});
  });res.status(id?200:201).json(saved);
}));
const binSchema=z.object({area:z.string().trim().min(2).optional(),landmark:z.string().trim().max(300).optional(),accessNotes:z.string().trim().max(1000).optional(),address:z.string().trim().min(3),type:z.enum(['PUBLIC','COMMUNITY']),size:z.string().trim().min(1),...coordinates,status:z.enum(['ACTIVE','DAMAGED','REMOVED']).default('ACTIVE'),needsCollection:z.boolean().default(true)});
r.get('/bins',asyncHandler(async(_req,res)=>res.json(await prisma.bin.findMany({where:{status:{not:'REMOVED'}},orderBy:{createdAt:'desc'}}))));
for(const method of ['post','put'] as const)r[method]('/bins'+(method==='put'?'/:id':''),asyncHandler(async(req,res)=>{
  const input=binSchema.parse(req.body),id=method==='put'?paramId(req):undefined;
  const saved=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(782341)`;
    if(id){if(!await tx.bin.findUnique({where:{id}}))throw new AppError(404,'Bin not found');if(await tx.routeStop.count({where:{binId:id,route:{status:{in:[...activeRoutes]}}}}))throw new AppError(409,'Finish this bin’s assigned route before editing it');}
    return id?tx.bin.update({where:{id},data:input}):tx.bin.create({data:input});
  });res.status(id?200:201).json(saved);
}));
r.get('/pickups',asyncHandler(async(_req,res)=>res.json(await prisma.pickupRequest.findMany({include:{address:true,user:{select:safeUser},route:{include:{truck:true,worker:{select:safeUser}}}},orderBy:{createdAt:'desc'}}))));
r.get('/bin-requests',asyncHandler(async(_req,res)=>res.json(await prisma.binRequest.findMany({include:{user:{select:safeUser},address:true},orderBy:{createdAt:'desc'}}))));
r.patch('/bin-requests/:id',asyncHandler(async(req,res)=>{
  const status=z.enum(['REQUESTED','APPROVED','SCHEDULED','DELIVERED','REJECTED']).parse(req.body.status);
  res.json(await prisma.binRequest.update({where:{id:paramId(req)},data:{status}}));
}));
r.get('/community-requests',asyncHandler(async(_req,res)=>res.json(await prisma.communityBinRequest.findMany({include:{user:{select:safeUser}},orderBy:{createdAt:'desc'}}))));
r.patch('/community-requests/:id',asyncHandler(async(req,res)=>{
  const status=z.enum(['SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','DEPLOYED']).parse(req.body.status);
  res.json(await prisma.communityBinRequest.update({where:{id:paramId(req)},data:{status}}));
}));
r.get('/rewards',asyncHandler(async(_req,res)=>res.json(await prisma.reward.findMany({orderBy:{createdAt:'desc'}}))));
r.post('/rewards',asyncHandler(async(req,res)=>{
  const data=z.object({name:z.string().trim().min(2),description:z.string().trim().min(3),pointsCost:z.number().int().positive(),stock:z.number().int().nonnegative()}).parse(req.body);
  res.status(201).json(await prisma.reward.create({data}));
}));
r.post('/hotspots/:id/actions',asyncHandler(async(req,res)=>{
  const data=z.object({type:z.enum(['DEPLOY_COMMUNITY_BIN','DEPLOY_BOARD','SEND_MANAGER','CONTACT_NEARBY_HOUSEHOLDS','SCHEDULE_CLEANUP']),description:z.string().min(3)}).parse(req.body);
  res.status(201).json(await prisma.$transaction(async tx=>{
    const h=await tx.wasteHotspot.findUnique({where:{id:paramId(req)}});if(!h)throw new AppError(404,'Hotspot not found');
    const action=await tx.hotspotAction.create({data:{...data,hotspotId:h.id}});
    await tx.wasteHotspot.update({where:{id:h.id},data:{status:'ACTION_PLANNED'}});return action;
  }));
}));
r.get('/dashboard',asyncHandler(async(_req,res)=>{
  const [users,pendingPickups,activeRouteCount,openComplaints,hotspots,bins,trucks]=await Promise.all([
    prisma.user.count(),prisma.pickupRequest.count({where:{status:{in:['CREATED','QUEUED','ASSIGNED','IN_PROGRESS']}}}),
    prisma.route.count({where:{status:{in:[...activeRoutes]}}}),prisma.complaint.count({where:{status:{notIn:['RESOLVED','REJECTED']}}}),
    prisma.wasteHotspot.findMany({where:{status:{not:'RESOLVED'}},orderBy:{complaintCount:'desc'},take:10}),
    prisma.bin.count({where:{status:'ACTIVE'}}),prisma.truck.count({where:{active:true}})
  ]);res.json({counts:{users,pendingPickups,activeRoutes:activeRouteCount,openComplaints,bins,trucks},hotspots});
}));
export default r;

