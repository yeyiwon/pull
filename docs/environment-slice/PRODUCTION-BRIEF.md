# PULL — Environment Visual Vertical Slice / 3D 제작 인계

## 현재 판정: FAIL — 제작 asset 대기

2026-09-22 브라우저 메인 뷰(1280×720)를 실제 확인했다. 구조물이 여전히 procedural demo로 읽힌다. 앞선 art pass는 최종 production art가 아니다. 현재 repository의 GLB는 캐릭터용뿐이며 환경용 production GLB는 0개다. 이 문서와 검사 도구를 만드는 것으로 visual 완성을 주장하지 않는다.

**이번 선택:** primitive 추가 조립을 중단하고 별도 3D Asset 제작으로 전환한다. 새로운 작업방은 자동 생성하지 않았다. 이 문서와 `assets.json`을 제작 작업방에 전달할 수 있다.

## Audit (현재 화면 + 소스)

| 대상 | 판정 | 근거 / 조치 |
|---|---|---|
| Home 외피·내부 가구 | PRIMITIVE | 상자형 shell, 기본 가구, 얇은 비례. 타일/창틀 추가로 근본 실루엣이 해결되지 않음. 최우선 제작 |
| Halo | PLACEHOLDER | 반복 곡선 밴드. 오래된 구조물의 조형·표면·시공 설득력 부족 |
| Bridge | PLACEHOLDER | **배치는 ACCEPTABLE/LOCKED**, asset은 반복 plank/기둥 수준. 배치와 품질을 구분 |
| Hero tree | PLACEHOLDER | 분기 구조는 있으나 수관이 반복 변형 덩어리, 수종 식별 약함 |
| Rocks / 이전 crystals | PLACEHOLDER | seed별 변형 표면, 조형된 암석 가족/지질 맥락 부족 |
| Riverbank | PLACEHOLDER | 흙 blend와 반복 돌·풀. 제작된 단면/뿌리/자연스러운 물가 부족 |
| Terrain / path | PLACEHOLDER | 안정적인 기능적 지면은 유지, 시각적 지형·발길 흔적 부족 |
| Grass / giant flower / mushroom | PRIMITIVE 또는 PLACEHOLDER | 반복 leaf ribbon, 단순 꽃 줄기·cap, 근접 디테일 부족 |
| Mountains / floating islands | PLACEHOLDER | 변형된 구면, cliff·soil·root layer 부족 |
| Water / sky / fog | ACCEPTABLE 기반 | 기존 Dream shader 유지. 최종 art 승인 아님; 제작 asset 투입 후 조율 |
| Contact shadows / lighting | ACCEPTABLE 기반 | 형태 평가에 사용 가능. 밝기/bloom으로 결함을 가리지 않음 |
| Environment production GLB | 없음 | PRODUCTION ASSET으로 분류할 항목 없음 |

## 한 구역만 제작

메인 카메라의 Moru(근경), 다리/강변(중경), 집(우측 중경), 대표 나무(좌측), Halo/산(원경)을 하나의 화면으로 다룬다. 나머지 월드로 확대하지 않는다.

- 세계 좌표: meter, +Y up; GLB root에 단위 보정 scale을 숨기지 않는다.
- Home: world `(10,0,-24)`, yaw `-0.12`. footprint 8×7. 현재 shell 최고점 약 5.75. 위치·출입 동선 보존.
- Hero tree: 기존 첫 tree `(-16,0,-12)`, runtime scale 1.2. 제작 local 높이 약 7.6, 바닥 pivot. 가지는 보행로를 침범하지 않는다.
- Halo: `(12,8.8,-57)`, rotation `(0,-0.18,0.13)`, 기존 외부 scale `(1,1.2,0.65)`. local radius 7. arc 범위 `[-0.1,2.65]`, `[3.13,2.35]` (start, length). 열린 공간 유지.
- Bridge: center x=`streamCenter(-9)`, z=-9, yaw=0, scale=1. halfWidth=1.65, halfLength=`streamWidth(-9)+1.9`. Deck y=`0.42*cos(localX/halfLength*pi/2)`. 끝단 높이 0. 폭/길이/곡률/접근로 변경 금지.
- River center=`6+sin(z*0.039)*14+sin(z*0.081)*3`; halfWidth=`3.4+sin(z*0.03)*1.4`; waterY=-0.055. 지면은 `terrain.ts`가 최종 권위. 강변 제작 구간은 z=-40..12, bridge 접근부 비움.
- 우선 rocks: `(-12,.4,-10)` scale `(3,1.7,2)` 및 `(20,.3,-27)` scale `(4.5,2.2,2.7)` 기존 접지 영역 유지.

## 제작 방향

집: 비대칭 처마·두툼한 지붕의 큰 실루엣 → 구조적 목재 결합/깊은 창 → 마모/작은 하드웨어 순서. 복잡도를 균일하게 올리지 않는다. 크림색 회벽·청록 슬레이트·따뜻한 목재·회녹 석재. 건축적인 일관성을 갖춘 동화 속 atelier. 색 입힌 상자나 generic cottage는 불합격.

나무: 하나의 설계된 줄기 흐름, 굵기 변화, 가지가 받치는 수관, 빛이 통과하는 틈. 벚꽃/여름/가을 canopy는 이름으로 분리. 수백 개 sphere나 cone foliage는 불합격. 지면 뿌리는 footprint 안에서 접지.

Halo: 조각된 석재와 불완전한 원형 상징. segment마다 형태·두께·마모가 논리적으로 다르고 무게가 느껴져야 한다. 반복 tube를 GLB로 export하는 것은 해결이 아니다.

강변/돌: 접지면이 있는 여러 조형, 수면 아래/젖은 경계/건조 상부 연결. 바둑알처럼 나열하지 않는다. 물 shader는 runtime 소유; asset에 가짜 평면 물/하늘을 bake하지 않는다.

브리지: 기존 envelope 내부에서 보/장부/목재 휨/마모를 디자인. 시선이나 이동을 막는 새로운 난간 금지. 배치 승인과 조형 승인은 별도.

## Home의 필수 export 계약

`HomeRoot`, `Walls_Cutaway`, `Roof_Cutaway`, `DoorPivot`, `WindowGlass`, `Interior`, `Foundation` 노드 유지.

- House-local floor y=0, 벽 x=±4,z=±3.5. 문 중심 x=1.8,z=3.5, width=2.3,height=3.44.
- `DoorPivot` 위치 `(0.65,0,3.56)` = 왼쪽 hinge. 문은 pivot에서 +X로 열린 너비를 가지며 rotation Y=-0.53π까지 안전하게 열린다. export에서 애니메이션 bake 금지; 기존 homeState로 제어.
- Roof/Walls 재질은 독립 clone 후 cutaway 가능해야 한다. Glass는 별도. 내부는 실제 깊이와 뒤쪽 면 필요.
- 새로운 장식이 기존 실내 collision 및 문 스윕을 침범하면 asset을 수정한다. runtime 이동 로직을 바꿔 맞추지 않는다.

## PBR / delivery

각 GLB와 함께 `.blend`, 텍스처 원본, 라이선스/제작 출처, front/side/back + wireframe + close-up turntable 제공.

- baseColor(sRGB), normal(linear), roughness/metallic(linear), 필요시 AO. 조명·강한 AO를 baseColor에 bake하지 않는다.
- Hero는 단일 flat color 불가. stylized base/roughness variation과 조형 기반 normal을 사용. normal map만으로 큰 형태를 대신하지 않는다.
- 권장 atlas: home 2K 1–2세트, tree/landmark 2K 1세트, kit 1K–2K. 실제 용량/가독성 비교로 결정. default 4K 여러 장 금지.
- OPAQUE 기본, foliage MASK 우선, BLEND는 창 등 필요한 곳만. snow는 독립 upper-surface mask 또는 mesh, wetness mask도 제공. runtime 원본 texture/색공간 보존.
- asset별 triangle 목표는 `assets.json`에 있다. **성능 보장 수치가 아니라 초기 제작 상한**. LOD1≈50%, LOD2≈20%와 draw-call/material 목록 제공. scene 전체 통합 후 실제 iPhone budget 조정.
- 정적 environment의 불필요한 rig/mixer 금지. 필수 extension/압축은 현재 loader 지원 확인 후 사용. embedded texture GLB를 1차 기준으로 한다.

## 반입 / 적용 pipeline

1. 외부 제작 폴더에 전달물 보존. 아직 `public`에 복사하지 않는다.
2. `node scripts/inspect-environment-assets.mjs /absolute/delivery-directory` 실행. JSON 결과의 missing/nodes/materials/maps/triangles/embedded resources 확인.
3. 구조 검사 통과는 `REVIEW_REQUIRED`일 뿐 `PRODUCTION` 승인이 아니다. 검사기는 전체 glTF validator/렌더 테스트를 대체하지 않는다.
4. 승인 후보만 프로젝트 `public/environment/slice-v1/`로 복사하고 SHA-256 고정. 출처·라이선스 기록.
5. 기존 `EnvironmentArtSlots` 중 homeDetail/grove/landmark에 맞는 모델은 adapter로 연결. **homeDetail은 전체 집 교체용이 아니다.** 완성 Home은 기존 shell 렌더를 대체하되 DoorPivot/cutaway adapter와 collision을 보존하는 별도 통합이 필요하다. Bridge·riverbank도 현재 슬롯이 없으므로 실물 도착 후 기존 경계에서 좁게 교체한다. 없는 asset용 loader/네트워크 요청을 미리 켜지 않는다.
6. 동일 화면/조명에서 fallback과 GLB 비교. 검증 후에만 fallback 숨김. 구조/시각 승인 전 default runtime 변경 금지.

## Visual gate / 비교 조건

- 기준: viewport 1280×720, fov48, Moru start=(0,0,1), orbit yaw0,pitch.1, distance11.5. 현재 camera follow 안정화 후 캡처. 별도 인위적 beauty camera로 결함을 숨기지 않는다.
- DAY13 / SUNSET18 / NIGHT0, spring clear, events none, wind .2, growth 고정; 같은 상태로 전후 비교. seasonal rain/winter도 별도.
- close-up house/bridge/tree, 문 열림과 cutaway, orbit 좌우30°/뒤쪽. UI 없이도 큰 형태와 재질이 읽혀야 한다.
- YES/NO: primitive demo로 보이는가? YES면 FAIL. authored animated-film frame으로 보이는가? NO면 FAIL. 수정 iteration은 asset 제작에서 수행.
- 데스크톱 및 실제 iPhone frame time/texture memory/draw calls 관찰. shader errors, 문·bridge·물 이동 확인. screenshots와 성능 수치 제출 후 사용자 art 승인.

## 동결

Moru/Brain/Audio/게임 기능/카메라 조작은 이번 작업에서 수정하지 않았다. Blender 결과 비교 없이 original Meshy로 자동 회귀하지 않는다. Nuu 재도입 금지. Commit/deploy 없음.
