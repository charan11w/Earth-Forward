import type { Prisma, PointTransactionType } from '@prisma/client';
import { AppError } from '../lib/http';
type Tx=Prisma.TransactionClient;
export async function applyPoints(tx:Tx,userId:string,amount:number,type:PointTransactionType,referenceId:string,description:string){ const user=await tx.user.findUniqueOrThrow({where:{id:userId},select:{trashPoints:true}}); if(user.trashPoints+amount<0) throw new AppError(409,'Insufficient TrashPoints'); await tx.trashPointTransaction.create({data:{userId,amount,type,referenceId,description}}); return tx.user.update({where:{id:userId},data:{trashPoints:{increment:amount}}}); }
