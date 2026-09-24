import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { LocalNotifications } from '@capacitor/local-notifications'
import type { NotificationCandidate } from '../world/backgroundWorld.ts'
import { backgroundDiagnostics } from '../world/backgroundWorld.ts'
import { resolveBackendEndpoint } from '../api/backend.ts'
import { WORLD_EVENTS,worldEvents,type WorldEventId } from '../world/worldEvents.ts'
import { getBackgroundWorld } from '../world/backgroundWorld.ts'

export const notificationDiagnostics={native:Capacitor.isNativePlatform(),pushRegistered:false,foregroundReceived:0,taps:0,localTests:0,lastError:null as string|null,lastPayload:null as Record<string,unknown>|null}
let attached=false
function applyTapPayload(payload:Record<string,unknown>|null|undefined){if(!payload)return;const id=payload.eventId;if(typeof id==='string'&&WORLD_EVENTS.some(event=>event.id===id))worldEvents.restoreSemantic([id as WorldEventId]);const landmark=payload.landmark;if(typeof landmark==='string')getBackgroundWorld().capture({moruLocation:landmark})}
export async function attachNotificationListeners(){if(attached||!Capacitor.isNativePlatform())return;attached=true
 await PushNotifications.addListener('registration',()=>{notificationDiagnostics.pushRegistered=true})
 await PushNotifications.addListener('registrationError',error=>{notificationDiagnostics.lastError=error.error})
 await PushNotifications.addListener('pushNotificationReceived',notification=>{notificationDiagnostics.foregroundReceived++;notificationDiagnostics.lastPayload=notification.data})
 await PushNotifications.addListener('pushNotificationActionPerformed',action=>{notificationDiagnostics.taps++;notificationDiagnostics.lastPayload=action.notification.data;applyTapPayload(action.notification.data)})
 await LocalNotifications.addListener('localNotificationActionPerformed',action=>{notificationDiagnostics.taps++;notificationDiagnostics.lastPayload=action.notification.extra??null;applyTapPayload(action.notification.extra)})
}
export async function enableRemotePush(){if(!Capacitor.isNativePlatform())return false;await attachNotificationListeners();const permission=await PushNotifications.checkPermissions();const status=permission.receive==='prompt'?await PushNotifications.requestPermissions():permission;if(status.receive!=='granted')return false;await PushNotifications.register();return true}
export async function testLocalNotification(candidate?:NotificationCandidate){if(!Capacitor.isNativePlatform())return false;await attachNotificationListeners();const permission=await LocalNotifications.checkPermissions();const status=permission.display==='prompt'?await LocalNotifications.requestPermissions():permission;if(status.display!=='granted')return false
 await LocalNotifications.schedule({notifications:[{id:731,title:'Moru · PULL',body:candidate?`테스트 · ${candidate.eventType} · ${candidate.landmark??'PULL'}`:'PULL의 조용한 알림 테스트',schedule:{at:new Date(Date.now()+1500)},extra:candidate??{eventId:'TEST',worldTimestamp:Date.now(),landmark:null}}]});notificationDiagnostics.localTests++;return true
}
export async function testRemoteNotificationCopy(candidate:NotificationCandidate,signal?:AbortSignal){backgroundDiagnostics.realCalls++;const response=await fetch(resolveBackendEndpoint('/api/moru-notification'),{method:'POST',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({...candidate,season:'current',timeOfDay:'current'})});if(!response.ok)return {worthNotifying:false,body:'',provider:'FAILED'};return response.json() as Promise<{worthNotifying:boolean;body:string;provider:string}>}
