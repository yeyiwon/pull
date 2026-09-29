let blockedPointer=-1
export function blockWorldMovement(pointerId:number){blockedPointer=pointerId}
export function consumeBlockedWorldMovement(pointerId:number){if(blockedPointer!==pointerId)return false;blockedPointer=-1;return true}
