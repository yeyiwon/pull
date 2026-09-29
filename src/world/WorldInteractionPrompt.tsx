import { useEffect,useMemo,useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture,LinearFilter,SRGBColorSpace,Sprite } from 'three'

function roundedRect(context:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,radius:number){
 context.beginPath();context.roundRect(x,y,width,height,radius);context.fill();context.stroke()
}

export default function WorldInteractionPrompt({label,compact=false}:{label:string;compact?:boolean}){
 const sprite=useRef<Sprite>(null)
 const texture=useMemo(()=>{const canvas=document.createElement('canvas'),context=canvas.getContext('2d')!;canvas.width=compact?128:320;canvas.height=128
  context.scale(2,2);context.fillStyle='rgba(28,36,48,.88)';context.strokeStyle='rgba(255,248,228,.48)';context.lineWidth=1;roundedRect(context,4,4,canvas.width/2-8,46,18)
  context.fillStyle='#fff8e8';context.font=`600 ${compact?24:13}px system-ui, sans-serif`;context.textAlign='center';context.textBaseline='middle';context.fillText(label,canvas.width/4,27)
  context.fillStyle='rgba(28,36,48,.88)';context.beginPath();context.moveTo(canvas.width/4-6,49);context.lineTo(canvas.width/4+6,49);context.lineTo(canvas.width/4,58);context.closePath();context.fill()
  const map=new CanvasTexture(canvas);map.colorSpace=SRGBColorSpace;map.minFilter=LinearFilter;map.magFilter=LinearFilter;map.needsUpdate=true;return map
 },[compact,label])
 useEffect(()=>()=>texture.dispose(),[texture])
 useFrame(({clock})=>{if(!sprite.current)return;const pulse=(Math.sin(clock.elapsedTime*3)+1)/2;sprite.current.position.y=pulse*.06;sprite.current.scale.set((compact?.58:1.35)*(1+pulse*.035),compact?.58:.54,1)})
 return <sprite ref={sprite} renderOrder={30}><spriteMaterial map={texture} transparent depthTest depthWrite={false} toneMapped={false}/></sprite>
}
