import { distanceMeters, Point } from './geo.service';
import { nearestNeighbor } from './route.service';
export type Job = Point & { id:string; kind:'bin'|'pickup'; address:string; notes?:string };
export type Vehicle = Point & { id:string; capacity:number };
export function allocateStops(trucks:Vehicle[], jobs:Job[]) {
  const groups = trucks.map(truck => ({ truck, jobs:[] as Job[] }));
  const unassigned:Job[] = [];
  // Closest stops are allocated first; a full truck passes later stops to the
  // next nearest available truck. Every job is considered exactly once.
  const ordered = [...jobs].sort((a,b) =>
    Math.min(...trucks.map(t=>distanceMeters(t,a))) - Math.min(...trucks.map(t=>distanceMeters(t,b))) || a.id.localeCompare(b.id));
  for (const job of ordered) {
    const group = groups.filter(g=>g.jobs.length < Math.floor(g.truck.capacity))
      .sort((a,b)=>distanceMeters(a.truck,job)-distanceMeters(b.truck,job)||a.truck.id.localeCompare(b.truck.id))[0];
    if (group) group.jobs.push(job); else unassigned.push(job);
  }
  return {
    routes: groups.filter(g=>g.jobs.length).map(g=>({ truckId:g.truck.id, ...nearestNeighbor(g.truck,g.jobs) })),
    unassigned
  };
}

