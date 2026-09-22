import { BufferGeometry, Float32BufferAttribute, Shape, ShapeGeometry } from 'three'
export function petalGeometry() {
 const s=new Shape();s.moveTo(0,-.7);s.bezierCurveTo(-.65,-.1,-.7,.7,-.17,.7);s.lineTo(0,.53);s.lineTo(.17,.7);s.bezierCurveTo(.7,.7,.65,-.1,0,-.7)
 return new ShapeGeometry(s,8)
}
export function ginkgoGeometry() {
 const s=new Shape();s.moveTo(-.035,-.85);s.lineTo(.035,-.85);s.lineTo(.075,-.45)
 s.bezierCurveTo(.24,-.12,.8,.1,.83,.57);s.quadraticCurveTo(.4,.88,.08,.66);s.lineTo(0,.5);s.lineTo(-.08,.66);s.quadraticCurveTo(-.4,.88,-.83,.57);s.bezierCurveTo(-.8,.1,-.24,-.12,-.075,-.45);s.closePath()
 return new ShapeGeometry(s,8)
}
export function snowflakeGeometry() {
 const positions:number[]=[]
 function line(x:number,y:number,a:number,b:number,w:number){const length=Math.hypot(a-x,b-y),dx=-(b-y)/length*w,dy=(a-x)/length*w;positions.push(x+dx,y+dy,0,x-dx,y-dy,0,a+dx,b+dy,0,x-dx,y-dy,0,a-dx,b-dy,0,a+dx,b+dy,0)}
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,c=Math.cos(a),s=Math.sin(a);line(0,0,c,s,.025)
  for(const radius of [.4,.7])for(const side of [-1,1]){const b=a+side*Math.PI/3;line(c*radius,s*radius,c*radius+Math.cos(b)*.24,s*radius+Math.sin(b)*.24,.02)}
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));g.computeVertexNormals();return g
}

export function mapleGeometry(){
 const s=new Shape(),points=[[0,-.85],[.06,-.38],[.44,-.45],[.34,-.2],[.85,.1],[.57,.19],[.69,.58],[.34,.48],[.32,.78],[.12,.63],[0,1],[-.12,.63],[-.32,.78],[-.34,.48],[-.69,.58],[-.57,.19],[-.85,.1],[-.34,-.2],[-.44,-.45],[-.06,-.38]]
 points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new ShapeGeometry(s)
}
