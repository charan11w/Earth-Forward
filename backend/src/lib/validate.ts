import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
export const validate = (schema:ZodType):RequestHandler => (req,res,next) => { const parsed=schema.safeParse({body:req.body,query:req.query,params:req.params}); if(!parsed.success) return res.status(400).json({error:'Validation failed',details:parsed.error.flatten()}); Object.assign(req,parsed.data); next(); };
