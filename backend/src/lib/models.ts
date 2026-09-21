import { z } from 'zod';
export const safeUser = { id:true,name:true,email:true,phone:true,photoUrl:true,role:true,trashPoints:true,createdAt:true } as const;
export const coordinates = { latitude:z.number().finite().min(-90).max(90), longitude:z.number().finite().min(-180).max(180) };
export const addressSchema = z.object({
  label:z.string().trim().min(1).max(50).default('Home'),
  isDefault:z.boolean().default(false),
  addressLine:z.string().trim().min(3).max(500),
  area:z.string().trim().min(2).max(200),
  landmark:z.string().trim().max(300).optional(),
  accessNotes:z.string().trim().max(1000).optional(),
  ...coordinates
});
export const activeRoutes = ['PLANNED','ASSIGNED','IN_PROGRESS'] as const;
export const routeInclude = {
  truck: { include: { driver: { select: safeUser } } },
  worker: { select: safeUser },
  stops: { orderBy: { sequence:'asc' as const }, include: {
    bin:true, pickupRequest: { include: { address:true,user:{select:safeUser} } }
  } }
};

