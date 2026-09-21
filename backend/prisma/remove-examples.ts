import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const db=new PrismaClient();
async function main(){
  const examples=[
    {id:'demo-public-bin-1',address:'Lake View Community Bin',latitude:12.974,longitude:77.596},
    {id:'demo-public-bin-2',address:'Metro Public Bin',latitude:12.982,longitude:77.602},
    {id:'demo-public-bin-3',address:'Park Community Bin',latitude:12.969,longitude:77.592}
  ];
  let removed=0,archived=0;
  await db.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(782341)`;
    for(const example of examples){
      const row=await tx.bin.findFirst({where:example,include:{_count:{select:{pickups:true,routeStops:true}}}});
      if(!row||row.updatedAt.getTime()!==row.createdAt.getTime())continue;
      if(row._count.pickups||row._count.routeStops){await tx.bin.update({where:{id:row.id},data:{status:'REMOVED',needsCollection:false}});archived++;}
      else{await tx.bin.delete({where:{id:row.id}});removed++;}
    }
  });
  console.log({removedUntouchedExampleBins:removed,archivedReferencedExamples:archived});
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());

