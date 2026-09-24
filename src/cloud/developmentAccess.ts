export function isDevelopmentGuest(dev:boolean,rawUrl:string){
 if(!dev)return false
 try{return new URL(rawUrl).searchParams.get('guest')==='1'}catch{return false}
}
