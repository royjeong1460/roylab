import {C01} from './world.js';

export const BATTERY_MAPS=[
  {id:'S01',name:'작업장 간판',description:'밑동을 약하게 만들어 간판을 넘어뜨려요.',
    hint:'기둥 아래를 자른 뒤, 넘어지는 조각을 지켜보세요.',preview:[{x:17,y:125}],data:C01},
  {id:'S02',name:'쌍둥이 고철 타워',description:'더 넓은 현장, 서로 다른 높이의 두 구조물.',
    hint:'두 손가락으로 오른쪽 현장까지 이동해 보세요.',preview:[{x:17,y:165},{x:94,y:165}],
    data:{width:144,height:184,floorY:172,shapes:[
      {rect:[16,80,7,92],color:1},{rect:[23,89,5,6],color:2},{rect:[28,80,30,28],color:3,target:true},
      {rect:[92,60,8,112],color:1},{rect:[63,56,29,30],color:4,target:true},{rect:[100,76,24,22],color:5,target:true},
    ]}},
  {id:'S03',name:'거대 폐처리 시설',description:'넓고 높은 세 동을 원하는 순서로 해체하세요.',
    hint:'전체 보기로 구조를 살피고 확대해서 연결부를 공략하세요.',preview:[{x:15,y:205},{x:87,y:205},{x:162,y:205}],
    data:{width:192,height:224,floorY:212,shapes:[
      {rect:[14,82,8,130],color:1},{rect:[22,58,32,34],color:3,target:true},
      {rect:[86,32,10,180],color:1},{rect:[54,54,32,30],color:4,target:true},{rect:[96,86,34,34],color:5,target:true},
      {rect:[161,70,8,142],color:1},{rect:[133,42,28,38],color:4,target:true},
    ]}},
];
export const mapPixelCount=site=>site.data.shapes.reduce((sum,s)=>sum+s.rect[2]*s.rect[3],0);
