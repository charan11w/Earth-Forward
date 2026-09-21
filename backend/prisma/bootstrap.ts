import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
const db=new PrismaClient();
async function main(){
  if(await db.user.count({where:{role:'ADMIN'}})){console.log('An administrator already exists. No sample data was created.');return;}
  const input=z.object({ADMIN_EMAIL:z.string().trim().toLowerCase().pipe(z.email()),ADMIN_PASSWORD:z.string().min(12).max(72),ADMIN_NAME:z.string().trim().min(2)}).parse(process.env);
  await db.user.create({data:{name:input.ADMIN_NAME,email:input.ADMIN_EMAIL,passwordHash:await bcrypt.hash(input.ADMIN_PASSWORD,12),role:'ADMIN'}});
  console.log('Administrator created. Sign in and add your real drivers, trucks and bins.');
}
main().catch(e=>{console.error(e instanceof z.ZodError?'Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) to provision the first administrator.':e);process.exitCode=1;}).finally(()=>db.$disconnect());

