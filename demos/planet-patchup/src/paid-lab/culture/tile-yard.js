import {YardKit} from './kit.js';
import {packMapCells,validateSite} from '../../map-maker-generator.js';
const k=new YardKit(192,140);
// Main salvage workshop: tiled roof, windowed infill and an open lower work bay.
k.roof(48,36,82);
for(const x of [56,86,116])k.post(x,54,140);
k.rect(55,89,65,4,1);k.rect(55,54,65,3,1);
k.wall(59,58,25,29);k.wall(89,58,25,29);
k.rect(61,96,16,30,3);k.rect(61,126,16,14,5);
k.rect(98,100,14,27,3);k.rect(98,127,14,13,5);
// A freestanding gateway reuses exactly the same roof and post pieces.
k.roof(7,77,34);k.post(12,95,140);k.post(32,95,140);
// Low enclosure and a second small shed frame the right-hand junk area.
k.masonry(143,114,37,26);
k.roof(141,78,42);k.post(146,96,114);k.post(174,96,114);
k.rect(149,100,24,3,1);
// Individually grounded stacks: no artificial floating pixels at spawn.
k.crate(81,132);k.crate(81,124);k.crate(123,132,10,8);
k.rubble(19,140,22);k.rubble(151,114,20);k.rubble(163,140,20);
k.rect(134,125,3,15,1);k.rect(137,130,3,10,4);
export const TILE_YARD=validateSite({
 id:'culture-tile-yard-v1',name:'기와 바람땅 · 마른 고물 마당',
 description:'기와 공방, 돌담과 폐자재를 조합한 첫 문화권 아트 테스트. 물과 식생이 없는 시멘트 마당.',
 hint:'문과 공방의 받침을 폭파해 지붕을 무너뜨려 보세요. 돌담과 적재물도 회수 대상이에요.',
 generator:{version:1,seed:'tile-yard-v1',family:'cascade',size:'medium',index:0},
 preview:[{x:57,y:129},{x:87,y:129},{x:117,y:129},{x:13,y:128},{x:33,y:128}],
 data:{width:192,height:156,floorY:140,shapes:packMapCells(k.cells,k.width,k.floorY)},
});

TILE_YARD.structure={version:1,roles:packMapCells(k.roles,k.width,k.floorY)};
