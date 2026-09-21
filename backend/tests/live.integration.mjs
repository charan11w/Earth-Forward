import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient(),base=process.env.TEST_API_URL||'http://127.0.0.1:4000/api';
const run=Date.now().toString(),password='IntegrationPass123';
async function call(path,body,token,method){const r=await fetch(base+path,{method:method||(body===undefined?'GET':'POST'),headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,data:await r.json()};}
test('real profiles, administration, multi-truck routing and driver authorization',async t=>{
  const userIds=[],truckIds=[],binIds=[],routeIds=[];let admin,resident,drivers=[],address,pickup,plan;
  try{
    const user=await db.user.create({data:{name:'Integration Admin',email:run+'-admin@example.test',role:'ADMIN',passwordHash:await bcrypt.hash(password,10)}});userIds.push(user.id);
    admin=(await call('/auth/login',{email:user.email,password})).data;
    await t.test('registration stays minimal, driver login is separate, and admin APIs are protected',async()=>{
      const r=await call('/auth/register',{name:'Integration Resident',email:run+'-resident@example.test',password,role:'ADMIN'});
      assert.equal(r.status,201);resident=r.data;userIds.push(resident.user.id);assert.equal(resident.user.role,'RESIDENT');assert.equal(resident.user.phone,null);
      assert.equal((await call('/admin/users',undefined,resident.token)).status,403);
      assert.equal((await call('/routes',undefined,resident.token)).status,403);
      for(const side of ['west','east']){
        const created=await call('/admin/users',{name:side+' driver',email:run+'-'+side+'@example.test',password,role:'WORKER'},admin.token);
        assert.equal(created.status,201);userIds.push(created.data.id);
        assert.equal((await call('/auth/login',{email:created.data.email,password})).status,403);
        const login=await call('/auth/driver/login',{email:created.data.email,password});assert.equal(login.status,200);drivers.push(login.data);
      }
      assert.equal((await call('/auth/driver/login',{email:resident.user.email,password})).status,403);
      assert.equal((await call('/admin/users/'+resident.user.id,undefined,admin.token)).data.email,resident.user.email);
    });
    await t.test('profile details and one default map address persist per user',async()=>{
      const profile=await call('/users/me',{name:'Updated Resident',phone:'1234567890',photoUrl:null},resident.token,'PUT');assert.equal(profile.status,200);assert.equal(profile.data.phone,'1234567890');
      const payload={label:'Home',addressLine:'Integration House',area:'Test Area',landmark:'Blue gate',accessNotes:'Ring bell',latitude:12,longitude:77.001,isDefault:true};
      const a=await call('/addresses',payload,resident.token);assert.equal(a.status,201);address=a.data;
      const b=await call('/addresses',{...payload,label:'Work',longitude:77.002},resident.token);assert.equal(b.status,201);
      assert.equal((await call('/addresses',undefined,resident.token)).data.filter(a=>a.isDefault).length,1);
      assert.equal((await call('/addresses/'+address.id,{...payload,label:'Stolen'},drivers[0].token,'PUT')).status,404);
      const p=await call('/pickups',{addressId:address.id,wasteType:'DRY',quantity:1,accessNotes:'Blue gate'},resident.token);assert.equal(p.status,201);pickup=p.data;
      assert.equal(pickup.longitude,address.longitude);
    });
    await t.test('admin can add trucks and bins, and cannot assign one driver twice',async()=>{
      for(let i=0;i<2;i++){
        const body={name:'Integration Truck '+i,registrationNumber:'TEST-'+run+'-'+i,capacity:3,currentLatitude:12,currentLongitude:i?78:77,driverId:drivers[i].user.id,active:true};
        const r=await call('/admin/trucks',body,admin.token);assert.equal(r.status,201);truckIds.push(r.data.id);
        const duplicate=await call('/admin/trucks',{...body,registrationNumber:'DUP-'+run+'-'+i},admin.token);assert.equal(duplicate.status,409);
      }
      for(const [i,lng] of [77.005,77.006,78.005,78.006].entries()){
        const r=await call('/admin/bins',{address:'Integration Bin '+run+'-'+i,area:'Test Area',type:'PUBLIC',size:'120L',latitude:12,longitude:lng,needsCollection:true},admin.token);assert.equal(r.status,201);binIds.push(r.data.id);
      }
    });
    await t.test('nearby stops form separate routes and concurrent assignment cannot duplicate work',async()=>{
      const body={truckIds,binIds,pickupIds:[pickup.id]},preview=await call('/routes/preview',body,admin.token);
      assert.equal(preview.status,200);assert.equal(preview.data.routes.length,2);
      const west=preview.data.routes.find(r=>r.truckId===truckIds[0]),east=preview.data.routes.find(r=>r.truckId===truckIds[1]);
      assert.ok(west.ordered.every(j=>j.longitude<77.5));assert.ok(east.ordered.every(j=>j.longitude>77.5));
      const results=await Promise.all([call('/routes/generate',body,admin.token),call('/routes/generate',body,admin.token)]);
      plan=results.find(r=>r.status===201).data;routeIds.push(...plan.routes.map(r=>r.id));
      assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
      assert.equal(new Set(plan.routes.flatMap(r=>r.stops.map(s=>s.binId||s.pickupRequestId))).size,5);
      assert.equal((await call('/admin/trucks/'+truckIds[0],{name:'Changed',registrationNumber:'CHANGED-'+run,capacity:3,currentLatitude:12,currentLongitude:77,driverId:drivers[0].user.id},admin.token,'PUT')).status,409);
    });
    await t.test('driver sees only assigned routes and cannot complete another driver’s stop',async()=>{
      const west=plan.routes.find(r=>r.truckId===truckIds[0]),east=plan.routes.find(r=>r.truckId===truckIds[1]);
      const mine=await call('/worker/routes',undefined,drivers[0].token);assert.ok(mine.data.every(r=>r.workerId===drivers[0].user.id));
      assert.equal((await call('/routes/'+east.id,undefined,drivers[0].token)).status,403);
      assert.equal((await call('/worker/stops/'+east.stops[0].id+'/complete',{},drivers[0].token)).status,403);
      assert.equal((await call('/worker/routes/'+west.id+'/start',{},drivers[0].token)).status,200);
    });
    await t.test('collection is recorded once, awards real points, and releases the truck',async()=>{
      const west=plan.routes.find(r=>r.truckId===truckIds[0]),pickupStop=west.stops.find(s=>s.pickupRequestId===pickup.id);
      const results=await Promise.all([call('/worker/stops/'+pickupStop.id+'/complete',{},drivers[0].token),call('/worker/stops/'+pickupStop.id+'/complete',{},drivers[0].token)]);
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
      assert.equal((await call('/wallet',undefined,resident.token)).data.balance,10);
      assert.equal(await db.trashPointTransaction.count({where:{referenceId:pickup.id}}),1);
      for(const s of west.stops.filter(s=>s.id!==pickupStop.id))assert.equal((await call('/worker/stops/'+s.id+'/complete',{},drivers[0].token)).status,200);
      assert.equal((await db.route.findUnique({where:{id:west.id}})).status,'COMPLETED');
      assert.equal((await db.truck.findUnique({where:{id:truckIds[0]}})).status,'AVAILABLE');
      for(const id of west.stops.filter(s=>s.binId).map(s=>s.binId))assert.equal((await db.bin.findUnique({where:{id}})).needsCollection,false);
    });
  }finally{
    // Delete only records created by this test, in foreign-key order.
    await db.routeStop.deleteMany({where:{routeId:{in:routeIds}}});
    await db.pickupRequest.deleteMany({where:{userId:{in:userIds}}});
    await db.route.deleteMany({where:{id:{in:routeIds}}});
    await db.truck.deleteMany({where:{id:{in:truckIds}}});
    await db.bin.deleteMany({where:{id:{in:binIds}}});
    await db.trashPointTransaction.deleteMany({where:{userId:{in:userIds}}});
    await db.address.deleteMany({where:{userId:{in:userIds}}});
    await db.user.deleteMany({where:{id:{in:userIds}}});
    await db.$disconnect();
  }
});

