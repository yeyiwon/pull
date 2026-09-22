export const skyVertex = `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

export const skyFragment = `
uniform float uTime;
uniform float uArcAwakening,uDistantLight;
uniform float uPhase,uQuality,uRays;
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDirection;
uniform float uDay;
uniform float uNight;
uniform vec3 uMoonDirection;
uniform float uAurora;
uniform float uMeteor;
uniform float uHaze;
uniform float uRain,uMoonSize,uCrescent,uStars,uRainbow,uLightning,uShower,uCloudGlow;
varying vec3 vDirection;
float square(float x) { return x * x; }
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float haze(vec3 p) {
  return sin(p.x * 2.1 + sin(p.z * 1.4)) * sin(p.z * 1.8 + p.y * 2.0);
}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return noise2(p)*.57+noise2(p*2.03+13.)*.28+noise2(p*4.07+29.)*.15;}
void main() {
  vec3 d = normalize(vDirection);
  vec3 horizon = uHorizon;
  vec3 night = uTop;
  float height = pow(max(d.y, 0.0), .55);
  vec3 color = mix(horizon, night, height);
  float horizonAir=exp(-max(0.,d.y)*7.5)*(.055+uHaze*.018);
  float solarForward=pow(max(0.,dot(d,uSunDirection)),12.);
  color+=mix(vec3(.12,.17,.23),vec3(.34,.15,.08),1.-uDay)*horizonAir*(1.-uNight);
  color+=vec3(.28,.12,.065)*solarForward*exp(-max(d.y,0.)*3.)*(1.-uNight)*(.3+(1.-uDay)*.7);
  color*=1.-uNight*height*.22;
  // Two independent cloud decks, shaded by density gradients rather than a flat overlay.
  vec2 cloudUV=d.xz/max(.12,d.y+.15)*.82;
  vec2 drift=vec2(uTime*.0018,uTime*.00045);
  float coarse=fbm(cloudUV+drift);
  float fine=uQuality>.5?fbm(cloudUV*2.3-drift*.65):coarse;
  float density=coarse*.76+fine*.24;
  float cloud=smoothstep(.50-uRain*.16,.73,density)*smoothstep(.0,.09,d.y);
  float highCloud=smoothstep(.54,.78,fbm(cloudUV*vec2(.34,1.7)+vec2(5.,-uTime*.0006)))*smoothstep(.02,.2,d.y);
  vec3 celestial=normalize(mix(uSunDirection,uMoonDirection,uNight));
  float gradient=(noise2(cloudUV+drift+celestial.xz*.16)-noise2(cloudUV+drift))*.75;
  float silver=pow(max(0.,dot(d,celestial)),18.);
  float warm=(1.-uNight)*(1.-smoothstep(.08,.65,uSunDirection.y));
  vec3 cloudShade=mix(vec3(.26,.34,.47),vec3(.012,.021,.042),uNight);
  vec3 cloudLit=mix(vec3(.84,.88,.92),vec3(.09,.13,.22),uNight);
  cloudLit=mix(cloudLit,vec3(.82,.55,.38),warm*.52);
  vec3 cloudColor=mix(cloudShade,cloudLit,clamp(.48+gradient*3.4,0.,1.));
  cloudColor+=mix(vec3(.3,.23,.16),vec3(.10,.14,.21),uNight)*silver*(1.-cloud)*2.;
  cloudColor*=1.-uRain*.36;
  float cloudOpacity=1.-exp(-cloud*(1.65+uRain*2.));
  color=mix(color,mix(cloudLit,uHorizon,.35),highCloud*.23*(1.-uRain));
  color=mix(color,cloudColor,cloudOpacity);
  // A partial atmospheric arc, not a portal: broad scale, broken visibility, no independent bloom source.
  vec3 arcAxis=normalize(vec3(.13,-.24,-1.));
  vec3 arcEast=normalize(cross(vec3(0.,1.,0.),arcAxis)),arcNorth=cross(arcAxis,arcEast);
  vec2 arcUV=vec2(dot(d,arcEast),dot(d,arcNorth));
  float arcRadius=length(arcUV),arcAngle=atan(arcUV.y,arcUV.x);
  float arcLine=(1.-smoothstep(.0015,.006+fwidth(arcRadius),abs(arcRadius-.64)));
  float arcBreak=smoothstep(-.2,.15,sin(arcAngle*2.1-1.2))*smoothstep(.05,.2,d.y)*step(.0,dot(d,arcAxis));
  float arcVeil=fbm(arcUV*8.+vec2(.2,uTime*.0002));
  float arcPresence=(.045+(1.-uDay)*.06+uNight*.28+uArcAwakening*.16)*(1.-cloudOpacity)*(.25+arcVeil*.65)*(1.-uRain*.8);
  color=mix(color,mix(uHorizon,vec3(.45,.52,.65),uNight*.6),arcLine*arcBreak*arcPresence);
  color+=vec3(.08,.13,.12)*uDistantLight*exp(-pow((d.y-.04)*30.,2.))*pow(max(0.,dot(d,normalize(vec3(-.5,.04,-1.)))),24.);
  color+=vec3(.012,.018,.03)*uArcAwakening*exp(-pow((arcRadius-.64)*24.,2.))*arcBreak*(1.-cloudOpacity);
  vec3 moonDir=uMoonDirection;
  float angular=length(d-moonDir),moonRadius=.043*uMoonSize;
  float moonDisc=1.-smoothstep(moonRadius,moonRadius+max(.0007,fwidth(angular)),angular);
  color+=vec3(.035,.045,.08)*exp(-angular*angular*32.)*uNight*(1.-cloudOpacity*.9);
  if(moonDisc>0.){
    vec3 east=normalize(cross(vec3(0.,1.,0.),moonDir)),north=cross(moonDir,east);
    vec2 lunar=vec2(dot(d,east),dot(d,north))/moonRadius;
    vec3 normal=vec3(lunar,sqrt(max(.0,1.-dot(lunar,lunar))));
    float maria=smoothstep(.34,.65,fbm(lunar*3.2+4.));
    float relief=0.;
    for(int i=0;i<14;i++){
      float k=float(i);vec2 center=vec2(hash(vec2(k,7.)),hash(vec2(k,19.)))*1.8-.9;
      float radius=.035+hash(vec2(k,33.))*.14;
      vec2 q=lunar-center;float dist=length(q)/radius;
      relief+=exp(-square((dist-1.)*8.))*.055-exp(-dist*dist*3.)*.04;
      normal.xy+=q/max(.02,length(q))*exp(-square((dist-.87)*6.))*.025;
    }
    normal.xy+=(vec2(noise2(lunar*78.),noise2(lunar.yx*84.))-.5)*.025;
    normal=normalize(normal);
    float phaseAngle=mix(uPhase,2.4,uCrescent);
    vec3 lunarLight=normalize(vec3(sin(phaseAngle),.07,cos(phaseAngle)));
    float lambert=max(0.,dot(normal,lunarLight));
    float surface=.51+maria*.15+relief+(noise2(lunar*105.)-.5)*.035;
    vec3 lunarColor=vec3(.78,.82,.87)*surface*(.035+lambert*.95);
    color=mix(color,lunarColor,moonDisc*uNight*(1.-cloudOpacity));
  }
  vec3 rayEast=normalize(cross(vec3(0.,1.,0.),uSunDirection));
  float fan=dot(d,rayEast)/max(.12,length(d-uSunDirection));
  float shafts=pow(max(0.,sin(fan*31.+.3)+sin(fan*57.)*.3),4.);
  color+=vec3(.16,.125,.08)*min(1.,shafts)*exp(-square(length(d-uSunDirection))*2.)*smoothstep(.0,.08,d.y)*(1.-smoothstep(.2,.65,d.y))*uRays*(1.-cloud);
  float sunAngle = length(d - uSunDirection);
  float sun = 1.0 - smoothstep(.032, .049, sunAngle);
  color += vec3(.85, .5, .21) * exp(-sunAngle * sunAngle * 100.0) * uDay * .3;
  color = mix(color, vec3(1.0, .85, .57), sun * uDay * .8 * (1.-cloudOpacity));
  vec2 uv = vec2(atan(d.z, d.x) / 6.2831853 + .5, asin(d.y) / 3.1415926 + .5);
  vec2 grid = uv * vec2(150.0, 80.0);
  vec2 cell = floor(grid);
  float seed = hash(cell);
  vec2 offset = vec2(hash(cell + 3.1), hash(cell + 7.7)) * .6 + .2;
  float starRadius=mix(.026,.075,pow(hash(cell+23.),5.));
  vec2 starDelta=fract(grid)-offset;
  float star=exp(-dot(starDelta,starDelta)/max(.0003,starRadius*starRadius));
  float twinkle = .88 + .12 * sin(uTime * (.4 + seed) + seed * 80.0);
  color += mix(vec3(.55,.67,1.),vec3(1.,.83,.65),hash(cell+12.)) * (1.+step(.994,seed)*1.9) * star * step(1.0-(.045+.09*fbm(uv*9.))*uStars, seed) * twinkle * uNight * smoothstep(.03, .25, d.y) * (1.0 - cloudOpacity) * (1.0 - moonDisc);
  float milky=exp(-square((d.y-.45-d.x*.23)*7.));
  color+=vec3(.017,.019,.035)*milky*fbm(uv*25.)*uNight*(1.-cloud)*(1.-moonDisc)*step(.5,uQuality);
  float curtain = exp(-square((d.y - .3 - sin(uv.x * 23.0 + uTime * .015) * .07) * 13.0));
  color += vec3(.045, .17, .13) * curtain * pow(max(0.0, sin(uv.x * 9.0)), 4.0) * uAurora;
  vec2 streak = vec2(uv.x - .63, uv.y - .69);
  float along = dot(streak, normalize(vec2(1.0, -.45)));
  float across = abs(dot(streak, normalize(vec2(.45, 1.0))));
  float travel = fract(uTime * .5) * .16 - .08;
  float meteor = exp(-across * across * 1000000.0) * exp(-square((along - travel) * 100.0));
  color += vec3(.6, .7, .9) * meteor * max(uMeteor,uShower);
  for(int i=0;i<3;i++){
    float k=float(i);vec2 q=uv-vec2(.19+k*.16,.62+k*.04);
    float lane=abs(q.y+q.x*.45),head=fract(uTime*.17+k*.29)*.3-.15;
    color+=vec3(.35,.48,.65)*exp(-lane*lane*900000.)*exp(-square((q.x-head)*110.))*uShower;
  }
  float radius=length(vec2(d.x,d.y+.13));
  float bow=exp(-square((radius-.62)*95.));
  float second=exp(-square((radius-.69)*95.))*max(0.,uRainbow-1.)*.4;
  vec3 rainbow=.5+.5*cos(vec3(0.,2.1,4.2)+(radius-.62)*170.);
  color+=rainbow*(bow*min(1.,uRainbow)+second)*smoothstep(0.,.05,d.y)*.22;
  float flash=pow(max(0.,sin(uTime*.19)),90.)*uLightning;
  color+=vec3(.22,.26,.4)*flash*cloud*exp(-d.y*4.);
  color+=vec3(.06,.025,.1)*highCloud*uCloudGlow;
  color=mix(color,color*vec3(.5,.62,.75),uRain*.6);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export const waterVertex = `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`
export const waterFragment = `
uniform float uTime;
uniform float uGlow;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(0.0, 0.15, 1.0 - vUv.x);
  float wave = sin(vUv.y * 310.0 + sin(vUv.x * 15.0 + uTime * 0.17) * 2.0 - uTime * 0.24);
  float shimmer = pow(max(0.0, wave), 14.0) * 0.12;
  vec3 color = mix(vec3(0.07, 0.4, 0.48), vec3(0.35, 0.75, 0.69), vUv.x);
  color *= .75 + uGlow * .25;
  color += shimmer * vec3(0.5, 0.6, 0.7);
  gl_FragColor = vec4(color, edge * 0.78);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`
