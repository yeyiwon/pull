# PULL — Cozy Magical World Direction v1

## Identity

**PULL은 거대한 마법 풍경 안에서 작은 Moru와 함께 살아가며, 매일 조금씩 달라지는 장소를 발견하고 가꾸는 고품질 cozy magical life world다.**

첫인상은 `와, 예쁘다`이고, 그다음은 `귀엽다 → 저기 뭐가 있지 → 만져보고 싶다 → 내 것으로 만들고 싶다 → 내일 다시 보고 싶다`로 이어져야 한다.

Visual formula:

> **Readable cute silhouettes × crafted material detail × living magical atmosphere**

귀여움은 큰 눈이나 파스텔 필터가 아니라 비율, 명확한 실루엣, 작은 움직임, 생활 흔적에서 만든다. 현재의 물·하늘·날씨·조명 품질은 유지하고, 가까운 공간의 구성과 사물 관계를 바꾼다.

---

## A. Current World Audit

### 현재 구조

실제 V3_FULL은 다음 골격을 가진다.

- 중앙 생활점: `HOME` at `(10, -24)`, 실내/현관 proximity와 cutaway 지원
- 물길: 북쪽으로 이어지는 lake/stream, 양안 promenade와 lamp station
- 산책 동선: 집과 연결되는 promenade, old bridge, lakeside benches
- 원거리 랜드마크: Ancient Tree, Moon Shrine, Hidden Garden, Distant Waterfall
- 원경: 3단 산맥과 반경 78/104/134의 forest bands
- 생활 반응: 의자, tap-to-move, semantic landmark, 계절/시간/날씨, 물, 눈 발자국, World Events
- 렌더링: instancing, shared materials, quality tiers, dynamic day/night, local lights

### 강점

- **PRESERVE — 대기감:** 하늘, 별, 달, 안개, 산맥, 오로라, 유성우가 epic scale을 만든다.
- **PRESERVE — 시간성:** 계절·시간·날씨·Background World가 같은 장소가 계속 사는 느낌을 준다.
- **PRESERVE — 물:** 물길은 cozy 생활권과 epic 원경을 연결할 가장 강한 자산이다.
- **PRESERVE — 이동 기반:** Tap-to-Move, Agent, semantic landmark와 안전한 approach point가 향후 상호작용의 토대다.
- **PRESERVE — 성능 구조:** 반복 수목·꽃·갈대·돌은 instancing과 quality tier를 이미 사용한다.

### 실제 문제

1. **Too large / too empty**
   주요 랜드마크가 대략 수십~백 단위 거리로 흩어져 있다. 이동 중 의미 있는 생활 장면보다 지형·숲의 반복을 보는 시간이 길어질 수 있다.

2. **Too procedural**
   forest bands, landmark 중심 fern/flower loops, shoreline 반복은 생태 mask는 지키지만, “누가 왜 여기에 두었는가”가 약하다.

3. **Insufficient focal sequence**
   집, 다리, 물, 랜드마크는 존재하지만 `집 앞 → 작은 정원 → 우편함 → 다리 → 물가 쉼터`처럼 5~15초 간격의 읽히는 장면으로 연결되지 않는다.

4. **Weak life detail**
   집과 벤치에 기능은 있지만 장화, 물뿌리개, 바구니, 작은 컵, 화단 경계처럼 거주자의 흔적이 부족하다.

5. **Repetition at mobile scale**
   작은 꽃·갈대·돌 수량은 많아도 iPhone에서는 개별 의미보다 패턴으로 합쳐질 수 있다. 중간 크기 prop과 명확한 색 덩어리가 더 필요하다.

6. **Visual identity split**
   원경은 강한 cinematic fantasy인데 근경은 생활 세계보다 procedural nature park에 가깝다. Moru가 “사는 곳”보다 “방문한 풍경”처럼 느껴질 위험이 있다.

7. **Potential visual noise**
   landmark 주위 detail과 계절 particle/event가 겹칠 때 중심과 여백의 리듬이 흐려질 수 있다. 문제는 개수 자체보다 장면 단위의 hierarchy 부족이다.

### 세 방향 비교

| 방향 | 장점 | 한계 | PULL 적합성 |
|---|---|---|---|
| A. Cozy Village | 생활 밀도와 소유감이 가장 강함 | 현재의 원경·마법 이벤트 강점을 축소할 위험 | 높음, 근경에 적합 |
| B. Magical Village | PULL만의 마법성을 생활 공간에 연결 | accent를 남용하면 generic fantasy가 됨 | 높음, 포인트에 적합 |
| C. Cozy Epic | 현재 기술과 원경을 가장 잘 보존 | 근경 밀도 개선 없이 쓰면 지금과 비슷함 | 매우 높음, 전체 골격에 적합 |

### 제안

**C를 공간 골격으로 유지하고, A를 플레이 가능한 근경의 기본 언어로 사용하며, B는 landmark와 밤의 제한된 accent로만 쓴다.**

- 원경: Cozy Epic
- 일상 동선: Cozy Village
- 발견 지점: Magical Village

---

## B. Final Art Direction

### 다섯 원칙

1. **작고 기억나는 생활권** — 첫 60초 동선 안에 집, 정원, 우편함, 물, 다리, 쉼터가 보인다.
2. **장면을 배치한다** — scatter 수량이 아니라 한 화면 안의 micro-scene 관계를 설계한다.
3. **중간 크기 실루엣을 우선한다** — 모바일에서 꽃밭, 우편함, 랜턴, 표지판이 즉시 읽힌다.
4. **마법은 accent다** — lavender/cyan/silver는 발견 지점과 밤에만 집중한다.
5. **모든 prop은 이유가 있다** — 생활, 이동, 돌봄, 휴식, 발견 중 하나를 말한다.

### Material language

- Wood: 따뜻한 색, 넓은 roughness 변화, 모서리 마모
- Stone: 둥근 큰 형태 + 일부 깨진 면 + 지면 접촉 moss
- Foliage: 크기가 다른 2~3 layer와 branch gap
- Flower: stem/leaves/petals/center가 모바일 가까운 거리에서 읽힘
- Metal: mailbox/lantern의 작은 차가운 highlight
- Glass: greenhouse/window에서만 제한된 reflection과 내부 depth
- Water: 현재 shading 유지, shoreline 접촉과 작은 생명만 보강

---

## C. Color and Light Direction

### Day

- Base: fresh leaf green, warm soil, cream stone, honey wood
- Cozy accent: muted coral, butter yellow, barn red 소량
- Magical accent: lavender/cyan은 landmark와 특수 식물만
- 목표: 밝지만 washed-out하지 않고, object group이 색으로 분리됨

### Sunset

- peach/gold의 낮은 방향광
- 집·온실 유리·물에 warm reflection
- 인공조명은 천천히 켜지고 daylight와 공존
- 꽃·지붕·다리 실루엣이 가장 예쁜 시간대로 구성

### Night

- deep cobalt / moon blue 환경
- warm amber window와 lantern pool
- 물에는 길게 끊기는 reflection
- 작은 magical accent는 silver/lavender
- 검은 실루엣 덩어리나 Moru만 밝은 장면을 피함
- “cute night, not horror night”: 색과 재질 정보가 남아야 함

### Winter

- snow surface는 blue-grey shadow + warm window reflection
- 지붕·난간·벤치·나뭇가지에 물리적으로 읽히는 accumulation
- red / evergreen / muted gold는 선택된 생활권에만
- 눈사람, 장작, 작은 lantern, 발자국으로 생활성 강화
- 기존 winter illumination과 snow architecture를 재사용

---

## D. Proposed World Map

```text
                         [ GRAND LANDMARK ]
                     observatory / distant palace
                              ▲
                     [ STAR HILL ]
                  quiet overlook · night sky
                              │ hidden ridge path
             ┌────────────────┴────────────────┐
             │                                 │
      [ MAGICAL FOREST ]                 [ ORCHARD ]
 ancient tree · mushrooms              fruit path · basket
 hidden garden · tiny lights                  │
             │                                 │
             └──────── [ VILLAGE HEART ] ──────┘
                    well · notice board
                  greenhouse · small stall
                              │
                      [ HOME GARDEN ]
             house · mailbox · flower beds
                    porch · kitchen garden
                              │
                         [ OLD BRIDGE ]
                       lantern · river detail
                              │
                    [ RIVER / POND WALK ]
                fish · reeds · stepping stones
                     bench · tiny waterfall
```

핵심은 새 땅을 넓히는 것이 아니라 기존 HOME–OldBridge–water route 주변에 생활 밀도를 집중하고, 기존 먼 landmark는 발견 목적지로 유지하는 것이다.

---

## E. Zone Design

### 1. Home Garden

- **Purpose:** 앱을 켰을 때 돌아온 느낌, 가장 높은 생활 밀도
- **Visual:** oversized roof의 cozy home, 작은 porch, 비대칭 화단, 낮은 울타리
- **Props:** mailbox, boots, watering can, firewood, flower box, 작은 테이블/의자
- **Season:** 봄 꽃봉오리, 여름 채소, 가을 바구니, 겨울 장작·wreath·snowman
- **Day/Night:** 낮에는 정원 색, 밤에는 창문과 현관의 작은 warm pool
- **Future interaction:** mailbox, water, plant, sit, door
- **Connection:** 현관에서 다리와 물이 한눈에 읽히도록 시선축 설정

### 2. Old Bridge + River Threshold

- **Purpose:** 집에서 모험으로 넘어가는 문턱
- **Visual:** 개별 board, 작은 난간, 2~4개의 명확한 lamp, 물가 돌과 꽃
- **Props:** 작은 표지판, 컵이 놓인 bench, reeds, fish shadow
- **Season:** 꽃잎/낙엽/눈 accumulation이 다리 위에 다르게 남음
- **Day/Night:** 밤에는 분리된 light pool과 수면 반사
- **Future interaction:** sit, inspect water, throw/observe, fish reaction
- **Connection:** Home Garden에서 5~10초, Village Heart와 river walk의 분기점

### 3. Village Heart

- **Purpose:** 작은 사회적 중심, 향후 시스템 확장점
- **Visual:** compact square, magical well/fountain, 온실과 notice board
- **Props:** greenhouse, small stall, benches, flower planters, hanging sign
- **Season:** 중앙 장식과 판매대 주변 소품만 바뀜
- **Day/Night:** fountain highlight, greenhouse 내부 warm light
- **Future interaction:** notices, seed/decoration access, small event staging
- **Connection:** Home, orchard, forest가 짧게 갈라지는 hub

### 4. Garden / Farm

- **Purpose:** 향후 성장 loop를 위한 아름다운 무대
- **Visual:** square grid 대신 irregular plots, stepping stones, 부분 울타리
- **Props:** watering can, seed basket, tool rack, original fantasy scare prop
- **Season:** 작물보다 먼저 토양·꽃·울타리의 계절 상태가 변함
- **Day/Night:** 낮 중심, 밤에는 입구 lantern만
- **Future interaction:** plant, water, observe, bloom, harvest
- **Connection:** Home Garden과 greenhouse 사이

### 5. Orchard

- **Purpose:** 산책 중 명확한 리듬과 수집의 예고
- **Visual:** 간격 있는 과일나무, 낮은 길, 바구니가 있는 쉼터
- **Props:** fallen fruit, basket, bench, 작은 새
- **Season:** 꽃 → 열매 → warm foliage → bare/snow branch
- **Day/Night:** dusk silhouette가 중요, 조명은 최소
- **Future interaction:** shake, collect, sit, inspect
- **Connection:** Village Heart에서 Star Hill로 이어지는 완만한 길

### 6. River / Pond Walk

- **Purpose:** 현재 water 품질을 가장 자주 즐기는 산책 공간
- **Visual:** open water를 보존하고 shoreline에만 detail 집중
- **Props:** stepping stones, reeds, lilies, submerged stone, tiny waterfall
- **Season:** 봄 dragonfly, 여름 fish, 가을 leaf drift, 겨울 edge ice
- **Day/Night:** sky/light reflection이 주연
- **Future interaction:** fish reaction, ripple, safe-edge observation
- **Connection:** bridge에서 한 바퀴 돌아 Village Heart로 복귀

### 7. Magical Forest

- **Purpose:** PULL의 마법성과 발견 보상
- **Visual:** Ancient Tree, mossy log, layered canopy, 좁아졌다 열리는 길
- **Props:** crafted mushrooms, fern clusters, unusual plant, 1~2 tiny lights
- **Season:** 기본 생태 변화 위에 드문 magical response
- **Day/Night:** 낮에는 빛기둥, 밤에는 제한된 luminous flora
- **Future interaction:** inspect, discover, listen, rare event observation
- **Connection:** Village Heart에서 시각적으로 가려진 짧은 곁길

### 8. Star Hill

- **Purpose:** 별·유성우·오로라 관람의 명확한 목적지
- **Visual:** 낮은 풀, 둥근 전망석, sky를 가리지 않는 프레임
- **Props:** blanket, tiny telescope/observatory cue, single lantern
- **Season:** foreground color만 바꾸고 sky visibility 유지
- **Day/Night:** 밤이 주연, 낮에는 원경 전망
- **Future interaction:** sit/lie/watch, World Event reaction
- **Connection:** orchard 위쪽, grand landmark를 향한 최종 근경

### 9. Hidden Places

- **Purpose:** 지도 크기보다 발견 밀도를 높임
- **Visual:** 2~3개만, foliage/rock 뒤에 반쯤 숨음
- **Props:** tiny spring, abandoned tea spot, glowing seed nook
- **Season:** 일부는 특정 계절에만 더 잘 보임
- **Future interaction:** discovery memory, collectible/decoration seed
- **Connection:** 메인 동선에서 3~8초 벗어난 곳

---

## F. Core Loop Candidates

| Loop | 재미 | 반복성 | 모바일 | PULL 적합성 |
|---|---|---|---|---|
| **Wander → Notice → Interact → Remember** | 이동 중 작은 장면과 Moru 반응 발견 | 날씨·계절·시간으로 같은 길도 달라짐 | 짧은 세션에 가장 적합 | **첫 구현에 최적** |
| **Grow → Bloom → Use → Decorate** | 돌본 결과가 World에 남음 | 느린 성장과 계절 변화 | 하루 1~2회에도 적합 | 중기 핵심 loop 후보 |
| **Discover → Keep → Place → Return** | 발견물을 내 공간에 배치 | collection이 소유감으로 연결 | touch placement 설계 필요 | decorating 이후 적합 |

권장 순서:

1. `Wander → Notice → Interact → Remember`
2. `Grow → Bloom → Use → Decorate`
3. `Discover → Keep → Place → Return`

---

## G. Mobile-first Rules

1. 한 화면에 주 focal point 1개, 보조 detail 2~4개만 둔다.
2. 핵심 prop은 현실보다 10~25% 크게 stylize하되 material은 장난감처럼 만들지 않는다.
3. micro detail보다 먼저 silhouette와 mid-scale structure가 읽혀야 한다.
4. 5~15초 이동마다 새로운 micro-scene 또는 명확한 전망 변화가 있어야 한다.
5. 전경 foliage, 중경 생활 prop, 원경 landmark의 3-depth 구성을 유지한다.
6. UI outline 대신 움직임·작은 highlight·반응으로 상호작용 가능성을 알린다.
7. 반복 prop은 instancing/shared material을 쓰되 hero prop은 authored geometry를 쓴다.
8. 화면 아래 touch 영역을 foliage나 큰 prop으로 막지 않는다.
9. 카메라 회전마다 다음 목적지의 silhouette가 하나 이상 보이게 한다.
10. iPhone에서 식별되지 않는 tiny detail은 수를 늘리지 말고 크기·군집·대비를 바꾼다.

### Mobile delight budget

10초 동안 서로 다른 depth에서 3~5개의 느린 움직임만 보이게 한다.

- foreground: flower/grass contact response
- midground: butterfly, lantern sway, water ripple
- background: cloud, waterfall, distant light

모두 같은 주기나 같은 방향으로 움직이지 않는다.

---

## H. First Prototype Slice — `HOME → BRIDGE → RIVER`

### 목적

전체 World를 바꾸기 전에 “PULL이 귀엽고 살고 싶은 세계가 될 수 있는가”를 가장 짧은 동선에서 검증한다.

### V4_COZY_TEST 변경 범위

#### Home micro-scene

- 기존 house 위치·문·interior logic 유지
- exterior silhouette만 cozy proportion으로 시험
- porch, flower box, mailbox, boots, firewood, watering can 추가
- 의도적인 flower bed 2개와 작은 kitchen garden 1개
- 현관에서 다리로 이어지는 명확한 stepping/stone path

#### Bridge micro-scene

- existing OldBridge 위치와 semantic target 유지
- board/support/railing 구조를 가까이서 읽히게 개선
- lamp 수를 제한하고 각 light pool을 분리
- 한쪽 끝에 sign, 반대쪽에 작은 bench/cup vignette

#### River micro-scene

- open water와 현재 shader 유지
- shoreline에만 reeds/flowers/embedded stones 배치
- fish silhouettes 2~4개, dragonfly/butterfly 한 종류
- 작은 ripple과 stepping stones
- water edge negative space 확보

### A/B 구조

- `V3_CURRENT`: 현 production baseline을 그대로 보존
- `V4_COZY_TEST`: Development Studio에서만 선택 가능
- 동일 camera/time/season/quality로 즉시 비교
- 승인 전 V3 asset, layout, renderer path를 삭제하거나 교체하지 않음

### Prototype acceptance

- iPhone 세로 화면에서 집·길·다리·물이 동시에 관계로 읽힘
- 시작 후 15초 안에 최소 3개의 서로 다른 생활 detail을 발견
- 꽃/우편함/등불이 tiny dot가 아니라 사물로 보임
- 랜덤 scatter보다 authored composition이 먼저 보임
- Day/Night/Winter 모두 기존 시스템으로 자연스럽게 변함
- 현재 V3보다 draw call/memory가 치명적으로 증가하지 않음
- World/Agent semantic IDs와 collision이 유지됨

### 구현하지 않는 것

- farming mechanics
- inventory/currency
- decorating placement
- shops/NPC
- new Moru model
- 전체 지도 재배치
- 새 AI 기능

---

## I. Preserve / Change / Remove or Reduce

### PRESERVE

- V3_FULL renderer and quality tiers
- sky, stars, moon, fog and time interpolation
- weather, snow accumulation, wetness
- water rendering and reflections
- World Events architecture
- Winter illumination architecture
- Moru, Agent, Intelligence, Cloud
- tap-to-move, landmark registry, seat semantics
- instancing/shared material strategy
- current production baseline as `V3_CURRENT`

### CHANGE

- HOME–Bridge–River 근경 composition
- prop silhouette와 scale readability
- 생활 흔적과 object-ground contact
- landmark 사이의 micro-scene rhythm
- 꽃·나무·길의 authored group composition
- 집 exterior의 cozy proportion
- path material/edge storytelling
- ambient life의 소수 정교한 움직임

### REMOVE / REDUCE

- 의미 없는 filler scatter
- 모바일에서 점으로만 보이는 반복 detail
- 같은 형태·간격의 procedural 군집
- 긴 빈 이동 구간
- 모든 곳에 동일한 magical particle
- 기능 없는 건물 수 늘리기
- black-crushed night와 washed-out pastel

---

## J. Priority and Roadmap

### MUST

1. V3_CURRENT/V4_COZY_TEST A/B 경로
2. Home–Bridge–River prototype
3. 모바일 silhouette/composition QA
4. authored micro-scenes와 negative space
5. 기존 계절·시간·날씨·물·Agent 회귀 방지

### SHOULD

1. Village Heart와 greenhouse concept
2. orchard/forest로 이어지는 짧은 route 재구성
3. butterfly/fish/bird 수준의 ambient life
4. interaction feedback language
5. cozy day/night audio direction prototype

### LATER

1. farming/gardening system
2. decorating placement and persistent WorldObject
3. collection loop
4. shops or functional structures
5. additional creatures/NPC
6. birthday or social systems

### Phased implementation

#### Phase 0 — Baseline capture

- V3_CURRENT mobile/desktop reference capture
- draw calls, frame time, memory, landmark travel time 기록
- Home–Bridge–River semantic/collision contract 고정

#### Phase 1 — Static composition prototype

- hero silhouettes, path, authored props, flower beds
- new mechanics 없이 Day에서 먼저 승인

#### Phase 2 — Living material pass

- Night/Winter/Weather 연결
- prop contact, water edge, subtle wind and light motion

#### Phase 3 — Interaction language

- mailbox/flower/water/bench의 작은 deterministic reaction
- UI clutter 없이 touch feedback 검증

#### Phase 4 — World route expansion

- 승인된 언어만 Village Heart → Orchard → Forest에 확장
- 구역별로 하나씩 적용하고 성능 확인

#### Phase 5 — Core loop experiment

- Gardening 또는 Discover/Place 중 하나만 선택해 smallest useful experiment
- retention보다 먼저 “World가 내 것이 되는 느낌”을 검증

---

## Audio Direction

- Day: light, playful, airy; water/foliage가 음악 아래 살아 있음
- Night: calm, warm, magical; 음침한 drone을 기본값으로 쓰지 않음
- Rain: roof/water/stone의 가까운 소리로 포근함 강화
- Winter: sparse sparkling accents + muffled ambience
- Events: cinematic하되 평상시 생활 ambience와 분리

새 asset 제작 전에 zone별 semantic audio state와 가까움/멀어짐의 mix 원칙부터 정의한다.

---

## Decision Gate

다음 단계로 넘어가기 전에 확인할 질문은 하나다.

> **V4_COZY_TEST의 Home–Bridge–River 30초 산책이, 현재 V3보다 더 귀엽고 더 살고 싶으며 PULL의 원경 마법성을 잃지 않는가?**

이 질문에 모바일 실제 화면으로 “예”라고 답한 뒤에만 다른 zone과 game loop를 구현한다.
