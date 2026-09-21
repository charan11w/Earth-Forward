import type { Prisma } from '@prisma/client';
import { AppError } from '../lib/http';
import { activeRoutes,routeInclude,safeUser } from '../lib/models';
import { allocateStops,Job } from './allocation.service';
import { applyPoints } from './points.service';
export async function dispatchLock(tx:Prisma.TransactionClient) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(782341)`; }
export async function planningData(tx:Prisma.TransactionClient) {
  const [trucks,bins,pickups]=await Promise.all([
    tx.truck.findMany({where:{active:true,status:'AVAILABLE',driverId:{not:null},routes:{none:{status:{in:[...activeRoutes]}}}},include:{driver:{select:safeUser}},orderBy:{id:'asc'}}),
    tx.bin.findMany({where:{status:'ACTIVE',needsCollection:true,type:{in:['PUBLIC','COMMUNITY']},routeStops:{none:{route:{status:{in:[...activeRoutes]}}}},pickups:{none:{status:{in:['CREATED','QUEUED','ASSIGNED','IN_PROGRESS']}}}},orderBy:{createdAt:'asc'}}),
    tx.pickupRequest.findMany({where:{status:{in:['CREATED','QUEUED']},routeId:null},include:{address:true,user:{select:safeUser}},orderBy:{createdAt:'asc'}})
  ]);
  const activeWorkers=await tx.route.findMany({where:{status:{in:[...activeRoutes]}},select:{workerId:true}});
  return {trucks:trucks.filter(t=>t.driver?.role==='WORKER'&&!activeWorkers.some(r=>r.workerId===t.driverId)),bins,pickups};
}
export type PlanInput={truckIds:string[];binIds:string[];pickupIds:string[]};
export async function makePlan(tx:Prisma.TransactionClient,input:PlanInput) {
  const data=await planningData(tx);
  const trucks=data.trucks.filter(t=>input.truckIds.includes(t.id));
  const bins=data.bins.filter(b=>input.binIds.includes(b.id)),pickups=data.pickups.filter(p=>input.pickupIds.includes(p.id));
  if(trucks.length!==new Set(input.truckIds).size||bins.length!==new Set(input.binIds).size||pickups.length!==new Set(input.pickupIds).size)
    throw new AppError(409,'A selected truck or collection point is no longer available. Refresh the planner.');
  const jobs:Job[]=[
    ...bins.map(b=>({id:b.id,kind:'bin' as const,address:[b.address,b.area].filter(Boolean).join(', '),notes:[b.landmark,b.accessNotes].filter(Boolean).join(' ? '),latitude:b.latitude,longitude:b.longitude})),
    ...pickups.map(p=>({id:p.id,kind:'pickup' as const,address:[p.address.addressLine,p.address.area].join(', '),notes:[p.address.landmark,p.accessNotes||p.address.accessNotes].filter(Boolean).join(' · '),latitude:p.latitude,longitude:p.longitude}))
  ];
  if(!jobs.length)throw new AppError(400,'Select at least one bin or pending pickup');
  const plan=allocateStops(trucks.map(t=>({...t,latitude:t.currentLatitude,longitude:t.currentLongitude})),jobs);
  return {...plan,routes:plan.routes.map(r=>({...r,truck:trucks.find(t=>t.id===r.truckId)!}))};
}
export async function completeStop(tx:Prisma.TransactionClient,id:string,userId:string,role:string,failed=false) {
  await dispatchLock(tx);
  const stop=await tx.routeStop.findUnique({where:{id},include:{route:true,pickupRequest:true}});
  if(!stop)throw new AppError(404,'Stop not found');
  if(role!=='ADMIN'&&stop.route.workerId!==userId)throw new AppError(403,'This stop is assigned to another driver');
  if(!activeRoutes.includes(stop.route.status as typeof activeRoutes[number])||!['PENDING','IN_PROGRESS'].includes(stop.status))throw new AppError(409,'This stop is already closed');
  const now=new Date();
  await tx.routeStop.update({where:{id},data:{status:failed?'FAILED_ACCESS':'COMPLETED',completedAt:now}});
  if(stop.pickupRequest){
    const p=stop.pickupRequest;
    if(!failed){const amount=p.serviceType==='EXTRA_CLEANING'?-5:10;await applyPoints(tx,p.userId,amount,amount>0?'PICKUP_REWARD':'EXTRA_SERVICE_DEDUCTION',p.id,'Collection confirmed');}
    await tx.pickupRequest.update({where:{id:p.id},data:{status:failed?'FAILED_ACCESS':'COMPLETED',completedAt:failed?null:now,pointsAwarded:failed?0:p.serviceType==='EXTRA_CLEANING'?-5:10}});
  }
  if(stop.binId&&!failed)await tx.bin.update({where:{id:stop.binId},data:{needsCollection:false,lastCollectedAt:now}});
  const remaining=await tx.routeStop.count({where:{routeId:stop.routeId,status:{in:['PENDING','IN_PROGRESS']}}});
  await tx.route.update({where:{id:stop.routeId},data:{status:remaining?'IN_PROGRESS':'COMPLETED',startedAt:stop.route.startedAt||now,...(!remaining?{completedAt:now}:{})}});
  await tx.truck.update({where:{id:stop.route.truckId},data:{status:remaining?'IN_SERVICE':'AVAILABLE',currentLatitude:stop.latitude,currentLongitude:stop.longitude}});
  return tx.route.findUniqueOrThrow({where:{id:stop.routeId},include:routeInclude});
}

