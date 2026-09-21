import { describe,it,expect } from 'vitest';
import { allocateStops,Job } from '../src/services/allocation.service';
const job=(id:string,longitude:number):Job=>({id,kind:'bin',address:id,latitude:12,longitude});
const trucks=[{id:'west',latitude:12,longitude:77,capacity:2},{id:'east',latitude:12,longitude:78,capacity:2}];
describe('multi-truck allocation',()=>{
  it('groups nearby points with the nearest truck and visits each once',()=>{
    const plan=allocateStops(trucks,[job('east-2',78.02),job('west-2',77.02),job('east-1',78.01),job('west-1',77.01)]);
    expect(plan.routes.find(r=>r.truckId==='west')!.ordered.map(j=>j.id)).toEqual(['west-1','west-2']);
    expect(plan.routes.find(r=>r.truckId==='east')!.ordered.map(j=>j.id)).toEqual(['east-1','east-2']);
    expect(new Set(plan.routes.flatMap(r=>r.ordered.map(j=>j.id))).size).toBe(4);
    expect(plan.unassigned).toHaveLength(0);
  });
  it('respects capacity and explicitly returns every unassigned stop',()=>{
    const jobs=[job('one',77.01),job('two',77.02),job('three',77.03)];
    const plan=allocateStops([{...trucks[0],capacity:1}],jobs);
    expect(plan.routes[0].ordered).toHaveLength(1);expect(plan.unassigned).toHaveLength(2);
    expect([...plan.routes[0].ordered,...plan.unassigned].map(j=>j.id).sort()).toEqual(jobs.map(j=>j.id).sort());
  });
  it('falls back to the next nearest truck when the first is full',()=>{
    const plan=allocateStops(trucks.map(t=>({...t,capacity:1})),[job('one',77.001),job('two',77.002)]);
    expect(plan.routes).toHaveLength(2);expect(plan.unassigned).toHaveLength(0);
  });
  it('does not produce routes without trucks or collection points',()=>{
    expect(allocateStops([], [job('one',77)]).unassigned).toHaveLength(1);
    expect(allocateStops(trucks,[]).routes).toHaveLength(0);
  });
});

