import {BASE_COSTS} from './battery-world.js';

// Current expedition only; legacy battery/tool labs keep their original tuning.
export const EXPEDITION_BALANCE = Object.freeze({
  baseCapacity: 60,
  capacityStep: 5,
  capacityLevels: 64,
  efficiencyStep: .02,
  efficiencyLevels: 25,
  baseSuctionRate: 80,
  suctionRateStep: 8,
  baseSuctionRadius: 12,
  suctionRadiusStep: .5,
});
export const EXPEDITION_COLLECTION_UPGRADES=Object.freeze({
  suction:Object.freeze({max:20,cost:120,step:40}),
  range:Object.freeze({max:20,cost:150,step:60}),
});
export const expeditionSuctionRate=(upgrades={})=>EXPEDITION_BALANCE.baseSuctionRate+
  EXPEDITION_BALANCE.suctionRateStep*Math.min(EXPEDITION_COLLECTION_UPGRADES.suction.max,upgrades.suction||0);
export const expeditionSuctionRadius=(upgrades={})=>EXPEDITION_BALANCE.baseSuctionRadius+
  EXPEDITION_BALANCE.suctionRadiusStep*Math.min(EXPEDITION_COLLECTION_UPGRADES.range.max,upgrades.range||0);
export const expeditionCapacity = profile =>
  EXPEDITION_BALANCE.baseCapacity + EXPEDITION_BALANCE.capacityStep * profile.upgrades.capacity;
export const expeditionToolCost = (tool, upgrades) =>
  BASE_COSTS[tool] * (1 - EXPEDITION_BALANCE.efficiencyStep * Math.min(EXPEDITION_BALANCE.efficiencyLevels, upgrades[tool] || 0));
