# PULL V4 Cozy — Hero Asset Specification

## Status

Phase 2의 큰 형태 전환은 승인된 Hero asset 부재로 인해 **asset production gate**에 있다. Phase 1 procedural tree는 candy-like crown과 수관 아래로 기둥처럼 내려오는 branch artifact가 확인되어 V4 비교 화면에서 비활성화했다. 이를 primitive 조합으로 계속 보정해 최종 아트라고 주장하지 않는다.

## Hero Home production pipeline

2026-09-30부터 `V4_HERO_HOME`의 procedural/code-generated 모델링을 중단한다. 두 차례 기술 prototype은 mobile size, triangle, material, node contract를 검증했지만 animation-film 수준의 visual quality gate를 통과하지 못했다. 실패한 형태를 추가 코드로 반복 보정하지 않는다.

앞으로의 고정 pipeline은 다음과 같다.

```text
2D CONCEPT
→ external high-quality 3D generation/modeling
→ incoming GLB
→ technical optimization
→ PULL asset QA
→ user visual approval
→ V4_COZY integration
```

`scripts/create-v4-hero-home.py`와 `artifacts/v4-hero-home/v4-hero-home.glb`는 **REFERENCE / TECHNICAL PROTOTYPE ONLY**다. production asset, approved Hero Home, runtime candidate가 아니며 registry 또는 `V4_COZY`에 연결하지 않는다. 추가 procedural Hero Home 제작에 이 script를 사용하지 않는다.

### Codex responsibility after pipeline change

Codex가 담당하는 범위:

- incoming GLB 구조와 topology 검사
- triangles, vertices, payload, textures, draw calls 분석
- silhouette를 훼손하지 않는 decimation과 texture compression
- material consolidation과 embedded texture 검증
- PULL world scale, origin, pivot 정렬
- `DoorPivot`, entrance clearance, cutaway/interior node contract 검증
- 기존 collision authority와 semantic Home identity 보존
- wetness, snow, illumination용 seasonal surface 확인
- 승인 이후 V4-only runtime integration
- iPhone memory, frame time, rendering regression QA

Codex가 담당하지 않는 범위:

- primitive/box 조합으로 Hero Home을 새로 모델링
- code-generated procedural house를 final art로 승격
- visual quality 부족을 specification 완화로 통과 처리
- 사용자 승인 전 registry/runtime 연결

이 문서의 triangle, payload, texture, material, draw-call, door, collision, seasonal budget은 pipeline 변경 이후에도 동일한 hard gate다.

현재 후보 검사:

| Candidate | Size | Triangles | Result | Reason |
|---|---:|---:|---|---|
| `pull-tree-hero-a.glb` | 43.3 MB | 55,108 | REJECTED | normal/surface-detail map 없음 |
| `pull-house-hero.glb` | 36.4 MB | 119,692 | REJECTED | normal map 없음, mobile hero budget 초과 |
| `pull-tree-hero-b.glb` | 66.9 MB | 29,502 | REVIEW REQUIRED | structural pass, untracked/unapproved, mobile payload 과다 |

2026-09-30 Hero World Pass 재검사에서도 결과는 동일하다. House 후보는 triangle budget과 surface-detail 계약을 모두 위반한다. Tree B는 단일 primitive, embedded base-color/normal/roughness texture와 29,502 triangles로 구조 검사를 통과했지만 66.9MB payload 때문에 runtime 입장은 보류한다. 현재 승인 가능한 Hero Home은 0개, Hero Tree family는 0/3개다.

후보 GLB는 자동으로 V4에 넣지 않는다. 시각 검토, 최적화, registry approval을 통과한 자산만 `V4_COZY`에 연결한다.

## HOUSE_HERO_V4

### Art goal

Animation-film quality의 compact cozy fantasy home. 한눈에 읽히는 oversized roof와 warm inhabited core를 가지며, toy house나 box kit처럼 보이지 않는다.

### Required silhouette

- 현재 collision footprint와 door 위치를 유지하는 compact body
- 전면에서 크게 읽히는 비대칭 roof sweep
- 처마 깊이와 porch/awning의 실제 depth
- 굵고 짧은 chimney silhouette
- 현재보다 큰 window openings와 recessed frame
- entrance가 roof/window에 묻히지 않는 명확한 hierarchy

### Required structure

```text
HomeRoot
├─ Walls_Cutaway
├─ Roof_Cutaway
├─ DoorPivot
├─ WindowGlass
├─ WindowInteriorCards
├─ Porch
├─ Trim
├─ Chimney
├─ Foundation
└─ SnowReceivers
```

기존 `DoorPivot`, interior entry, cutaway 계약을 유지해야 한다. 완전한 shell 대체가 어렵다면 roof/window/trim/porch detail adapter로 분리한다.

### Materials

- warm plaster/stone: broad color variation, roughness detail
- wood: grain direction과 edge wear
- roof: tile/shingle mid-scale breakup
- glass: warm interior depth, flat emissive rectangle 금지
- foundation: soil/grass contact가 읽히는 base
- embedded base-color + normal + roughness/metallic data

### Mobile budget

- LOD0: ≤ 70k triangles
- LOD1: ≤ 28k triangles at 20–25m
- texture set: 최대 2K, atlas 우선
- delivery GLB 목표: ≤ 12MB
- draw calls: 6 이하

### Delivery dimensions and collision

- authored world-space footprint: 현재 Home collision footprint 안쪽, 약 `12m × 8m`
- exterior height: chimney 포함 약 `10–12m`
- door pivot/threshold는 현재 `HOME` local contract와 정확히 정렬
- visual mesh는 collision authority가 아니다. 기존 house shell, door trigger, interior cutaway와 entry collision을 그대로 사용한다.
- material slots: 최대 6개 (`wall`, `wood`, `roof`, `glass/interior`, `foundation`, `snow receiver`)

### V4 presentation

- 기존 HOME transform과 door/collision authority 유지
- V4에서만 exterior visual adapter 활성화
- Day/Sunset/Night/Winter/Rain close view 승인 필요

## TREE_HERO_V4 FAMILY

### Art goal

Thick readable trunk, expressive branching, layered soft foliage를 가진 stylized animation-film tree. 구형 수관, broccoli silhouette, 아래로 매달린 기둥 형태를 금지한다.

### Family

- `TREE_HERO_V4_A`: Home framing tree, 넓고 포근한 crown
- `TREE_HERO_V4_B`: Bridge/river threshold tree, 한쪽으로 열린 silhouette
- `TREE_HERO_V4_C`: Garden/river framing tree, 위로 열린 crown과 낮은 비대칭 side branch
- 동일 tree의 단순 scale/rotation 복제가 아니라 trunk/branch/crown 구조가 달라야 함

### Per-asset silhouette and dimensions

| Asset | Silhouette | Authored dimensions | Placement purpose |
|---|---|---:|---|
| `V4_HERO_TREE_A` | 낮고 넓은 canopy, 집 쪽을 감싸는 비대칭 crown | 높이 8–10m, crown 폭 7–9m | Home hero-frame side depth |
| `V4_HERO_TREE_B` | 강 쪽으로 시야가 열리고 반대편 foliage mass가 무거운 형태 | 높이 9–11m, crown 폭 6–8m | Bridge threshold와 river opening |
| `V4_HERO_TREE_C` | 위쪽 sky gap과 낮은 side branch가 읽히는 가벼운 형태 | 높이 7–9m, crown 폭 6–7m | Garden pocket과 river foreground frame |

### Required structure

```text
TreeRoot
├─ Trunk
├─ PrimaryBranches
├─ SecondaryBranches
├─ Canopy_Spring
├─ Canopy_Summer
├─ Canopy_Autumn
├─ Canopy_Winter
├─ SnowReceivers
└─ GroundContactRoots
```

### Geometry rules

- trunk taper와 branch junction이 실제로 연결됨
- branch는 trunk/crown에서 시작하며 crown 아래로 수직 낙하하지 않음
- foliage mass 5–9개, 크기·depth·overlap이 다름
- crown 사이에 sky gap이 남아 입체감이 읽힘
- leaf silhouette는 soft하지만 완전한 sphere가 아님
- roots는 지면과 접촉하되 이동 동선을 침범하지 않음

### Materials and motion

- bark base-color + normal + roughness
- foliage에 front/back response와 subtle subsurface impression
- 계절별 material/mesh variant
- wind는 trunk가 아니라 outer canopy와 secondary branch에 작은 phase difference
- snow는 상향 면에만 축적

### Mobile budget per tree

- LOD0: 28–45k triangles
- LOD1: 10–16k triangles at 16–20m
- optional impostor/LOD2 beyond 45m
- texture set: 최대 2K atlas
- delivery GLB 목표: ≤ 8MB
- draw calls: 3 이하

### Delivery contract per tree

- material slots: 최대 3개 (`bark`, `foliage`, optional `snow receiver`)
- texture budget: 한 tree당 최대 2K atlas 1세트. Family가 같은 bark/foliage atlas를 공유하는 방식을 우선한다.
- seasonal requirement: trunk는 공유하고 Spring/Summer/Autumn foliage color 또는 mesh variant, Winter sparse branch/foliage variant를 제공한다.
- wind requirement: `TreeRoot`는 고정하고 `SecondaryBranches`와 canopy cluster가 개별 phase를 받을 수 있도록 node 또는 vertex-color mask를 제공한다.
- collision: visual trunk와 별개로 단순 capsule/cylinder metadata만 제공한다. roots/canopy가 navigation collision을 만들지 않는다.
- ground contact: root flare는 visual geometry로 제공하되 path와 resident route를 침범하지 않는다.

## PATH / CLEARING ART KIT

Hero house/tree와 별도로 다음은 optimized shared kit로 제작한다.

- compact dirt/stone path ribbon material
- 4–6 embedded edge stone variants
- authored vegetation-border cluster 3종
- flower cluster 3종: stem/leaves/petals/center 포함
- ground-contact moss/soil decals 또는 shader mask

길은 Home에서 Bridge로 휘어지는 하나의 읽히는 mass여야 하며 stepping stone dots만으로 구성하지 않는다.

## Camera contract

향후 승인된 Hero Home은 canonical `V4_COZY`에서 시험한다.

- portrait follow distance: V3 대비 약 8–12% 가까움
- Moru screen size 증가
- Home/Path/Bridge opening이 한 화면 depth로 읽힘
- FOV 급변, movement input 변화, camera collision 변화 금지
- 동일 position/time/season의 V3/V4 screenshot pair로 승인

## Admission gate

1. GLB structural inspection
2. node contract 확인
3. triangle/draw-call/texture/payload budget 확인
4. embedded texture와 PBR maps 확인
5. development preview only 등록
6. Day/Sunset/Night/Winter/Rain visual review
7. iPhone viewport와 device memory/FPS 확인
8. 사용자 승인 후에만 `V4_COZY` runtime placement

Production 기본 World는 `V4_COZY`다. `V3_FULL`은 development regression/reference fallback으로만 유지한다.
