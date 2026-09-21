import { ActivityType, Prisma } from '@prisma/client';

export function recordActivity(db: Prisma.TransactionClient, userId: string, type: ActivityType, title: string, description?: string, referenceId?: string, metadata?: Prisma.InputJsonValue) {
  return db.userActivity.create({ data: { userId, type, title, description, referenceId, metadata } });
}
