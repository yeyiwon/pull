// Small monochrome motion sketches; independent of the platform emoji font.
export default function GestureGlyph({kind='dance'}:{kind?:string}){
 if(kind==='jump')return <svg className="gesture-glyph glyph-hop" width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
  <path d="M7 27q9 3 18 0" opacity=".45"/>
  <path d="M10 22v3m6-2v3m6-4v3" opacity=".45"/>
  <g className="glyph-body" strokeWidth="1.8" strokeLinejoin="round">
   <circle cx="16" cy="7" r="2.3"/>
   <path d="M16 11v6m0-5-5-2-3-4m8 6 5-2 3-4M16 17l-5 3 3 2m2-5 5 3-3 2"/>
  </g>
 </svg>
 const hop=kind==='skip',penguin=kind==='penguin'
 return <svg className={`gesture-glyph ${hop?'glyph-hop':penguin?'glyph-waddle':'glyph-dance'}`} width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path className="glyph-ground" d="M10 28c3 1 9 1 12 0" opacity=".35"/>
  <g className="glyph-body">
   <path d={penguin?'M10 13c0-10 12-10 12 0l2 9c-2 6-14 6-16 0Z':'M8 16c-1-7 3-11 8-11s9 4 8 11l-1 5c-1 6-13 6-14 0Z'}/>
   <path d="M13 13v1m6-1v1" strokeWidth="2"/>
   <path d={hop?'M8 17 4 13m20 4 4-4M12 24l-2 2m10-2 2 2':penguin?'M8 16 5 21m19-5 3 5M12 25l-3 1m11-1 3 1':'M8 17 4 15m20 2 4-6M12 25l-2 1m10-1 2 1'}/>
   {kind==='bubbleDance'&&<><circle cx="4" cy="6" r="2"/><circle cx="28" cy="23" r="1.5"/></>}
   {kind==='superloveDance'&&<path d="M13 18q3 3 6 0"/>}
   {kind==='funnyDance'&&<path d="m13 17 2 1 3-1"/>}
  </g>
 </svg>
}
