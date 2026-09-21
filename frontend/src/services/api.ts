import { store,signOut } from '../store';
export async function api<T=any>(path:string,body?:unknown,method?:string):Promise<T>{
  const token=store.getState().session.token;
  let response:Response;
  try { response=await fetch((import.meta.env.VITE_API_URL||'/api')+path,{
    method:method||(body===undefined?'GET':'POST'),
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  }); } catch { throw new Error('Cannot reach the server. Check your connection and make sure the API is running.'); }
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    if(response.status===401&&!path.startsWith('/auth/'))store.dispatch(signOut());
    throw new Error(data.message||(typeof data.error==='string'?data.error:data.error?.message)||'Unable to complete this request');
  }
  return data;
}

