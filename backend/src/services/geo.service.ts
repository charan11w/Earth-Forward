export type Point={latitude:number;longitude:number};
const R=6371000, rad=(v:number)=>v*Math.PI/180;
export function distanceMeters(a:Point,b:Point){ const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude); const x=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
