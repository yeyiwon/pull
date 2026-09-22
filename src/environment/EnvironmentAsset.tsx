import { Component, Suspense, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLoader } from '@react-three/fiber'
import { Mesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { clone } from 'three/addons/utils/SkeletonUtils.js'
import { environmentAssets } from './assetCatalog.ts'
import type { ArtSlot } from './assetCatalog.ts'

class AssetBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
  state={failed:false}
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error:Error){console.warn('Environment art unavailable; preserving baseline:',error.message)}
  render(){return this.state.failed?this.props.fallback:this.props.children}
}
function AuthoredAsset({url}:{url:string}) {
  const asset=useLoader(GLTFLoader,url)
  const scene=useMemo(()=>{
    const result=clone(asset.scene)
    result.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true}})
    return result
  },[asset])
  // Cached source geometry/materials belong to useLoader, not this instance.
  return <primitive object={scene} dispose={null}/>
}
export default function EnvironmentAsset({slot,children}:{slot:ArtSlot;children:ReactNode}) {
  const {url}=environmentAssets[slot]
  if(!url)return children
  return <AssetBoundary key={url} fallback={children}><Suspense fallback={children}><AuthoredAsset url={url}/></Suspense></AssetBoundary>
}
