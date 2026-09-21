import type { Prisma,PointTransactionType } from '@prisma/client';
import { AppError } from '../lib/http';
export async function applyPoints(tx:Prisma.TransactionClient,userId:string,amount:number,type:PointTransactionType,referenceId:string,description:string){
  const changed=await tx.user.updateMany({where:{id:userId,...(amount<0?{trashPoints:{gte:-amount}}:{})},data:{trashPoints:{increment:amount}}});
  if(!changed.count)throw new AppError(409,'Insufficient TrashPoints');
  await tx.trashPointTransaction.create({data:{userId,amount,type,referenceId,description}});
  return tx.user.findUniqueOrThrow({where:{id:userId}});
}

