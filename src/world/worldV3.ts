export type WorldV3Landmark={
 id:string
 displayName:string
 kind:'ancient-tree'|'moon-shrine'|'hidden-garden'|'old-bridge'
 visual:readonly [number,number]
 approach:readonly [number,number]
 tags:readonly string[]
}

// Visual centres and safe approach points remain separate so Agent movement never
// aims at the middle of a trunk, ruin or bridge railing.
export const WORLD_V3_LANDMARKS:readonly WorldV3Landmark[]=[
 {id:'AncientTree',displayName:'Ancient Tree',kind:'ancient-tree',visual:[-56,47],approach:[-50,43],tags:['ancient tree','giant tree','고대 나무','큰 나무']},
 {id:'MoonShrine',displayName:'Moon Shrine',kind:'moon-shrine',visual:[62,57],approach:[57,52],tags:['moon shrine','observatory','달 전망대','신전']},
 {id:'HiddenGarden',displayName:'Hidden Garden',kind:'hidden-garden',visual:[-55,-48],approach:[-49,-45],tags:['hidden garden','garden','숨은 정원','정원']},
 {id:'OldBridge',displayName:'Old Bridge',kind:'old-bridge',visual:[-2,-9],approach:[-5,-10],tags:['old bridge','bridge','오래된 다리','다리']},
]

export const V3_MOUNTAIN_LAYERS=[
 {color:'#53647a',mist:'#8293a4',positions:[[-155,-8,-184,70,42,48],[-55,-15,-205,88,47,43],[62,-19,-222,96,52,49],[165,-13,-180,75,44,55]]},
 {color:'#657588',mist:'#91a0ad',positions:[[-200,-18,-72,52,30,67],[-135,-20,124,65,34,58],[7,-25,185,104,39,44],[134,-21,132,69,37,61]]},
 {color:'#748395',mist:'#9ca8b2',positions:[[-118,-15,-116,42,25,33],[-38,-18,-134,48,29,29],[48,-17,-142,51,31,32],[126,-14,-111,44,28,38],[-112,-18,87,41,24,33],[91,-19,101,47,27,36]]},
] as const

// A ring rather than a uniform field: openings preserve lake, house and horizon views.
export const V3_FOREST_BANDS=[
 {radius:78,count:58,scale:[1.2,2.1] as const,gaps:[-.18,.36,2.25]},
 {radius:104,count:52,scale:[1.5,2.6] as const,gaps:[.05,2.2]},
 {radius:134,count:40,scale:[2.0,3.2] as const,gaps:[-.05,2.15]},
] as const
