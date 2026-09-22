export const moruAnimations = [
  {
    "name": "Bubble_Dance",
    "url": "/moru/clips/moru-bubble-dance.glb",
    "duration": 8.125
  },
  {
    "name": "FunnyDancing_03",
    "url": "/moru/clips/moru-funnydancing-03.glb",
    "duration": 8.083333015441895
  },
  {
    "name": "Hop_with_Arms_Raised",
    "url": "/moru/clips/moru-hop-with-arms-raised.glb",
    "duration": 2.4166667461395264
  },
  {
    "name": "Listening_Gesture",
    "url": "/moru/clips/moru-listening-gesture.glb",
    "duration": 9.375
  },
  {
    "name": "Love_You_Pop_Dance",
    "url": "/moru/clips/moru-love-you-pop-dance.glb",
    "duration": 10.041666984558105
  },
  {
    "name": "Pod_Baby_Groove",
    "url": "/moru/clips/moru-pod-baby-groove.glb",
    "duration": 13.375
  },
  {
    "name": "Regular_Jump",
    "url": "/moru/clips/moru-regular-jump.glb",
    "duration": 1.9583333730697632
  },
  {
    "name": "Running",
    "url": "/moru/clips/moru-running.glb",
    "duration": 0.7083333134651184
  },
  {
    "name": "Short_Breathe_and_Look_Around",
    "url": "/moru/clips/moru-short-breathe-and-look-around.glb",
    "duration": 7.916666507720947
  },
  {
    "name": "Skip_Forward_inplace",
    "url": "/moru/clips/moru-skip-forward-inplace.glb",
    "duration": 2.9166667461395264
  },
  {
    "name": "Superlove_Pop_Dance",
    "url": "/moru/clips/moru-superlove-pop-dance.glb",
    "duration": 8.541666984558105
  },
  {
    "name": "Walking",
    "url": "/moru/clips/moru-walking.glb",
    "duration": 1.0833333730697632
  },
  {
    "name": "Wave_One_Hand",
    "url": "/moru/clips/moru-wave-one-hand.glb",
    "duration": 4.166666507720947
  },
  {
    "name": "You_Groove",
    "url": "/moru/clips/moru-you-groove.glb",
    "duration": 13.541666984558105
  },
  {
    "name": "penguin_walk",
    "url": "/moru/clips/moru-penguin-walk.glb",
    "duration": 2.0833332538604736
  }
] as const
export const manifests = { MORU: { actions: moruAnimations } }
export type CharacterId = keyof typeof manifests
