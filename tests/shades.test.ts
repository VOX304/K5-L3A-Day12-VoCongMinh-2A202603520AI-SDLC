import { expect, it } from 'vitest';
import { trace } from '../src/headless/trace.js';
import type { InputFrame, Scenario, Vec3 } from '../src/sim/types.js';

function run(scenario: Scenario, ticks: number, frames: InputFrame[] = [], snapshotEvery = 1) {
  const rows = [...trace({ seed: 42, ticks, snapshotEvery, frames, scenario: { random_motes: false, random_shades: false, ...scenario } })];
  const snaps = rows.filter(r => r.type === 'snapshot');
  return { snaps, events: rows.filter(r => r.type === 'event'), last: snaps.at(-1)! };
}

it('spawns two distant distinct shades at 300, then one per 480 up to six, skipping reserved ids', () => {
  const { events, snaps } = run({ random_shades: true, player: { pos: [37,0,0], flames: 100 }, shades: [{id:'S2', pos:[0,3,0]}] }, 2700, [], 60);
  const spawns = events.filter(e => e.name === 'shade_spawned');
  expect(spawns.map(e => [e.tick, e.data.id])).toEqual([[300,'S1'],[300,'S3'],[780,'S4'],[1260,'S5'],[1740,'S6']]);
  for (const e of spawns) {
    const shade = snaps.find(s => s.tick === e.tick)!.shades.find(s => s.id === e.data.id)!;
    expect(shade.state).toBe('spawning');
    expect(Math.hypot(shade.pos[0], shade.pos[2])).toBeCloseTo(37, 2);
    expect(Math.hypot(shade.pos[0]-37, shade.pos[2])).toBeGreaterThanOrEqual(15);
  }
  expect(snaps[5]!.shades[0]!.pos).not.toEqual(snaps[5]!.shades[2]!.pos);
});

it('detects at 12, moves at four metres per second, retains chase until beyond 18', () => {
  const { snaps } = run({ shades: [{ pos: [12,0,0] }, { pos: [12.01,0,0] }] }, 200, [{ tick: 1, move: [-1,0] }]);
  expect(snaps[1]!.shades.map(s => s.state)).toEqual(['chase','wander']);
  expect(snaps[1]!.shades[0]!.pos[0]).toBeCloseTo(12 - 4/60, 3);
  expect(snaps[160]!.shades[0]!.state).toBe('chase');
  expect(snaps[200]!.shades[0]!.state).toBe('wander');
});

it('applies one hit by numeric id, recoils two metres in 60 ticks, drops half, and protects for 90 ticks', () => {
  const { events, snaps } = run({ player: { carried: 9 }, shades: [
    { id:'S10', pos:[0,0,0] }, { id:'S2', pos:[0,1.5,0] }, { id:'S1', pos:[0,1.501,0] },
  ] }, 91);
  expect(events.map(e => [e.tick,e.data])).toEqual([[1,{by:'shade',flames:2,dropped:4}], [91,{by:'shade',flames:1,dropped:2}]]);
  expect(snaps[1]!.shades.map(s => s.state)).toEqual(['chase','recoil','chase']);
  expect(snaps[61]!.shades[1]!.pos).toEqual([2,1.5,0]);
  expect(snaps[1]!.player.carried).toBe(5);
  for (const m of snaps[1]!.motes) {
    const d = Math.hypot(m.pos[0], m.pos[2]);
    expect(d).toBeGreaterThanOrEqual(1.499);
    expect(d).toBeLessThanOrEqual(2.501);
  }
});

it('expires dropped motes at age 480 before pickup', () => {
  const { snaps } = run({ player: { carried: 2, flames: 30 }, shades: [{ pos: [0,0,0] }] }, 481);
  expect(snaps[480]!.motes.some(m => m.id === 'M1')).toBe(true);
  expect(snaps[481]!.motes.some(m => m.id === 'M1')).toBe(false);
});

it('ends immediately when the final shade hit coincides with dawn', () => {
  const { events, last } = run({ time_left_s: 1/60, player: { flames: 1 }, shades: [{ pos:[1,0,0] }] }, 100);
  expect(events.map(e => e.name)).toEqual(['player_hit','game_over']);
  expect(events[1]!.data).toEqual({ result:'lost', reason:'no_flames' });
  expect(last.tick).toBe(1);
});

it('pulses before contact, uses a 3D sphere and numeric id order, and pushes only for 15 ticks', () => {
  const { snaps, events } = run({ player: { carried: 6 }, shades: [
    { id:'S10', pos:[0,0.8,0] }, { id:'S3', pos:[0,5.801,0] }, { id:'S2', pos:[5,0.8,0] },
  ] }, 121, [{tick:0,pulse:true}]);
  expect(events[0]).toEqual({type:'event',tick:1,name:'pulse',data:{stunned_ids:['S2','S10']}});
  expect(snaps[1]).toMatchObject({player:{carried:3,flames:3},score:10});
  for (const t of [15,16,120]) expect(snaps[t]!.shades[2]).toMatchObject({state:'stunned',pos:[4,0.8,0]});
  expect(snaps[121]!.shades[2]!.state).toBe('chase');
});

it('charges even on a miss and only fires on an affordable rising edge after 180 ticks', () => {
  const { events, last } = run({ player:{carried:8} }, 362, [
    {tick:0,pulse:true},{tick:1,pulse:false},{tick:178,pulse:true},{tick:179,pulse:false},
    {tick:180,pulse:true},{tick:181,pulse:false},{tick:360,pulse:true},
  ]);
  expect(events.map(e => [e.tick,e.data])).toEqual([[1,{stunned_ids:[]}],[181,{stunned_ids:[]}]]);
  expect(last.player.carried).toBe(2);
});

it('lighting ejects an overlapping shade before contact and blocks inward chase at six metres', () => {
  const { snaps, events } = run({ player:{carried:1}, lanterns:[{id:'L1',pos:[0,0,0],deposited:9}],
    shades:[{pos:[0,0.8,0]}, {pos:[-7,0.8,0]}] }, 60, [{tick:0,interact:true}]);
  expect(events.map(e => e.name)).toEqual(['deposit','lantern_lit']);
  expect(snaps[30]!.shades.map(s => s.pos[0])).toEqual([6,-6]);
  expect(snaps[60]!.shades.map(s => s.pos[0])).toEqual([6,-6]);
});

it('applies the 30 active mote cap even when scenario motes occupy no spawn sites', () => {
  const { snaps } = run({ random_motes:true, motes:Array.from({length:29}, () => [3,0,3] as Vec3) }, 480, [], 240);
  expect(snaps.map(s => s.motes_active)).toEqual([29,30,30]);
});

it('can recover a dropped mote after the hit without waiting for invulnerability to expire', () => {
  const scenario: Scenario = { player: { carried: 2 }, shades: [{ pos: [0,0,0] }] };
  const drop = run(scenario, 1).last.motes[0]!.pos;
  const radius = Math.hypot(drop[0], drop[2]);
  const { events, last } = run(scenario, 16, [{ tick: 1, move: [drop[0]/radius, drop[2]/radius] }]);
  expect(events.map(e => e.name)).toEqual(['player_hit','mote_picked']);
  expect(events[1]!.tick).toBeGreaterThan(1);
  expect(last).toMatchObject({ player: { carried: 2, flames: 2 }, motes_active: 0 });
});

it('lets a scheduled shade start moving only after its 30 spawning ticks', () => {
  const { snaps } = run({ random_shades: true }, 330);
  expect(snaps[299]!.shades).toEqual([]);
  expect(snaps[329]!.shades).toEqual(snaps[300]!.shades);
  expect(snaps[330]!.shades.map(s => s.state)).toEqual(['wander','wander']);
});

it('resolves pickup and deposit before testing whether a pulse is affordable', () => {
  const { events, last } = run({ player: { carried: 3 }, motes: [[0,0,0]],
    lanterns: [{ id: 'L1', pos: [0,0,0], deposited: 8 }] }, 1, [{ tick: 0, interact: true, pulse: true }]);
  expect(events.map(e => e.name)).toEqual(['mote_picked','deposit','lantern_lit']);
  expect(last.player.carried).toBe(2);
});
