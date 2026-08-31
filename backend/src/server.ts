import { app } from './app';import { env } from './config/env';import { prisma } from './config/prisma';
const server=app.listen(env.PORT,()=>console.log(`Earth Forward API listening on ${env.PORT}`));const shutdown=async()=>{server.close();await prisma.$disconnect();};process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
