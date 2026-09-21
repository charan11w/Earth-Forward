import { configureStore,createSlice,PayloadAction } from '@reduxjs/toolkit';
export type Role='resident'|'worker'|'admin';
export type Session={role:Role;name:string;points:number;token:string;id:string;photoUrl?:string|null};
const empty:Session={role:'resident',name:'',points:0,token:'',id:''};
function restore():Session{
  try{const s=JSON.parse(sessionStorage.getItem('ef-session')||'null');return s&&s.token&&s.token!=='demo'&&['resident','worker','admin'].includes(s.role)?s:empty;}catch{return empty;}
}
const session=createSlice({name:'session',initialState:restore(),reducers:{
  signIn:(_s,a:PayloadAction<Session>)=>a.payload,signOut:()=>empty,
  updateProfile:(s,a:PayloadAction<{name:string;photoUrl?:string|null;trashPoints?:number}>)=>{s.name=a.payload.name;s.photoUrl=a.payload.photoUrl;if(a.payload.trashPoints!==undefined)s.points=a.payload.trashPoints;}
}});
export const {signIn,signOut,updateProfile}=session.actions;
export const store=configureStore({reducer:{session:session.reducer}});
store.subscribe(()=>{const s=store.getState().session;if(s.token)sessionStorage.setItem('ef-session',JSON.stringify(s));else sessionStorage.removeItem('ef-session');});
export type RootState=ReturnType<typeof store.getState>;
export const homeFor=(r:Role)=>r==='admin'?'/admin/dashboard':r==='worker'?'/worker':'/app/dashboard';

