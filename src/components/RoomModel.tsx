import { useEffect, useId, useRef, useState } from 'react';
import type * as ThreeTypes from 'three';
import { Maximize2, Minus, Plus, RotateCcw, Play, Pause, Hand } from 'lucide-react';
import { useI18n } from '../i18n';

type Room = { id:string; zh:string; en:string; x:number; z:number; w:number; d:number; type:'bed'|'living'|'kitchen'|'bath' };
type Engine = { select:(id:string)=>void; zoom:(delta:number)=>void; reset:()=>void; rotate:(delta:number)=>void; play:(active:boolean)=>void; interact:(active:boolean)=>void };
export default function RoomModel({ beds = 2, baths = 1 }: { beds?:number; baths?:number }) {
  const { L } = useI18n();
  const helpId = useId();
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine|null>(null);
  const [selected,setSelected] = useState('living');
  const selectedRoom = useRef('living');
  const [playing,setPlaying] = useState(false);
  const [interactive,setInteractive] = useState(false);
  const [failed,setFailed] = useState(false);
  const [ready,setReady] = useState(false);
  const bedroomCount = Number.isFinite(beds) ? Math.min(8,Math.max(0,Math.floor(beds))) : 2;
  const bathroomCount = Number.isFinite(baths) ? Math.min(6,Math.max(0,Math.floor(baths))) : 1;
  const width = Math.max(8.4,bedroomCount*2.8);
  const rooms:Room[] = [
    { id:'living',zh:'客餐厅',en:'Living / dining',x:-width/6,z:1.8,w:width*2/3,d:4,type:'living' },
    { id:'kitchen',zh:'厨房',en:'Kitchen',x:width/3,z:2.8,w:width/3,d:2,type:'kitchen' },
    ...Array.from({length:bedroomCount},(_,i)=>({id:'bed'+i,zh:i===0?'主卧':`卧室 ${i+1}`,en:i===0?'Main bedroom':`Bedroom ${i+1}`,x:-width/2+(i+.5)*width/bedroomCount,z:-1.8,w:width/bedroomCount,d:3.2,type:'bed' as const})),
    ...Array.from({length:bathroomCount},(_,i)=>({id:'bath'+i,zh:`卫浴${bathroomCount>1?' '+(i+1):''}`,en:`Bathroom${bathroomCount>1?' '+(i+1):''}`,x:width/3,z:.25+(i+.5)*1.5/bathroomCount,w:width/3,d:1.5/bathroomCount,type:'bath' as const})),
  ];
  const select = (id:string) => { selectedRoom.current=id;setSelected(id); engine.current?.select(id); };
  useEffect(() => {
    const el=host.current!;
    let cancelled=false,started=false;
    let dispose=()=>{};
    setReady(false); setFailed(false); setSelected('living'); setPlaying(false); setInteractive(false);
    selectedRoom.current='living';
    const initialize=async()=>{
    if(started||cancelled)return;
    started=true;
    try {
    const [THREE,{OrbitControls}]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js')]);
    if(cancelled)return;
    const compact=window.matchMedia('(pointer: coarse)').matches||window.innerWidth<600;
    const renderer=new THREE.WebGLRenderer({antialias:!compact,alpha:false,powerPreference:'low-power'});
    dispose=()=>{renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact?1.25:1.6));
    renderer.setClearColor(0xf4f2ee);
    renderer.shadowMap.enabled=!compact; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden','true');
    const scene=new THREE.Scene();
    const camera=new THREE.OrthographicCamera(-8,8,7,-7,.1,100);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enabled=false;
    // OrbitControls.connect() sets touch-action:none; restore scrolling AFTER construction.
    renderer.domElement.style.touchAction='pan-y pinch-zoom';
    controls.enablePan=false; controls.enableZoom=false; controls.enableRotate=false;
    controls.minPolarAngle=.2; controls.maxPolarAngle=Math.PI*.46;
    controls.autoRotateSpeed=.8;
    const hemi=new THREE.HemisphereLight(0xffffff,0xc6b9a9,2.6); scene.add(hemi);
    const light=new THREE.DirectionalLight(0xfffaf2,3.2);light.position.set(-4,12,8);light.castShadow=true;
    light.shadow.mapSize.set(1024,1024); Object.assign(light.shadow.camera,{left:-10,right:10,top:10,bottom:-10});light.shadow.bias=-.001;scene.add(light);
    const geometries:ThreeTypes.BufferGeometry[]=[];const materials:ThreeTypes.Material[]=[];
    dispose=()=>{controls.dispose();light.shadow.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();};
    const material=(color:number)=>{const m=new THREE.MeshStandardMaterial({color,roughness:.85});materials.push(m);return m;};
    const wallMat=material(0xfaf8f1), oak=material(0xbba285), linen=material(0xeee8db), orange=material(0xdc7c48), grey=material(0x67756f);
    function box(x:number,y:number,z:number,w:number,h:number,d:number,mat:ThreeTypes.Material) {
      const g=new THREE.BoxGeometry(w,h,d);geometries.push(g);const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
    }
    box(0,-.23,.2,width+.6,.4,7.8,material(0xe1d8ca));
    const floors=new Map<string,ThreeTypes.Mesh>();
    rooms.forEach(r=>{
      const floor=box(r.x,.015,r.z,r.w-.1,.12,r.d-.1,material(r.type==='bath'?0xd8dfdd:0xdcc7ab));floors.set(r.id,floor);
      box(r.x,.65,r.z-r.d/2,r.w,.95,.12,wallMat);
      if(r.type==='bed'){
        box(r.x-r.w/2,.65,r.z,.1,.95,r.d,wallMat);
        box(r.x,.22,r.z-.1,1.45,.35,2.05,oak);
        box(r.x,.46,r.z-.1,1.4,.19,1.98,linen);
        box(r.x,.58,r.z+.25,1.4,.08,1.25,grey);
        box(r.x-.35,.6,r.z-.77,.56,.13,.35,linen);box(r.x+.35,.6,r.z-.77,.56,.13,.35,linen);
        box(r.x,.72,r.z-1.18,1.5,1,.12,oak);
        box(r.x+1,.37,r.z-.8,.42,.6,.42,oak);
      } else if(r.type==='living'){
        box(r.x-1.1,.11,r.z+.25,2.55,.04,2.7,material(0xf2ece1));
        box(r.x-1.8,.4,r.z+.35,.85,.65,2.25,linen);box(r.x-2.13,.7,r.z+.35,.16,.55,2.25,linen);
        box(r.x-.8,.3,r.z+.3,.65,.4,1.25,oak);box(r.x-.8,.54,r.z+.3,.3,.08,.3,orange);
        box(r.x+.8,.65,r.z-.9,1.1,.1,1.35,oak);
        [-.6,.6].forEach(dx=>{box(r.x+.8+dx,.35,r.z-.9,.38,.48,.5,grey);});
        box(r.x+1.8,.36,r.z+1.2,.35,.6,.35,orange);
        const plant=new THREE.Mesh(new THREE.SphereGeometry(.37,8,6),material(0x687e66));geometries.push(plant.geometry);plant.position.set(r.x+1.8,1,r.z+1.2);scene.add(plant);
      } else if(r.type==='kitchen'){
        box(r.x+r.w/2-.35,.45,r.z,.6,.75,r.d-.2,oak);box(r.x+r.w/2-.35,.86,r.z,.64,.08,r.d-.15,linen);
        box(r.x+r.w/2-.35,.91,r.z,.4,.02,.42,grey);
      } else {
        box(r.x+r.w/2-.5,.28,r.z,.6,.4,Math.min(.7,r.d-.15),linen);box(r.x-r.w/2+.5,.48,r.z,.6,.75,Math.min(.65,r.d-.15),linen);
      }
    });
    box(width/2,.65,.2,.12,.95,7.4,wallMat);
    const ground=box(0,-.5,0,70,.1,70,material(0xf4f2ee));ground.castShadow=false;
    let visible=true,active=false,contextLost=false,frame:number|null=null,lastFrame=0,lastUpdate=0;
    const draw=()=>{if(!contextLost)renderer.render(scene,camera);};
    const reset=()=>{camera.position.set(10,12,13);camera.zoom=1;controls.target.set(0,0,.2);camera.updateProjectionMatrix();controls.update();draw();};
    const onSelect=(id:string)=>{floors.forEach((mesh,key)=>{const m=mesh.material as ThreeTypes.MeshStandardMaterial;m.emissive.setHex(key===id?0x8c3d12:0);m.emissiveIntensity=key===id?.2:0;});draw();};
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight; if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h;const span=aspect<1?9:7;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();draw();};
    const tick=(now:number)=>{
      frame=null;
      if(!active||!visible||document.hidden||contextLost)return;
      // OrbitControls emits change -> draw. Never render twice per frame.
      if(now-lastFrame>=1000/(compact?30:60)-1){controls.update(lastUpdate?Math.min((now-lastUpdate)/1000,.1):1/30);lastUpdate=now;lastFrame=now;}
      frame=requestAnimationFrame(tick);
    };
    const updateLoop=()=>{if(frame!==null)cancelAnimationFrame(frame);frame=null;lastUpdate=0;if(active&&visible&&!document.hidden&&!contextLost)frame=requestAnimationFrame(tick);};
    const stop=()=>{active=false;controls.autoRotate=false;updateLoop();setPlaying(false);};
    controls.addEventListener('change',draw);controls.addEventListener('start',stop);
    const observer=new ResizeObserver(resize);observer.observe(el);
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;updateLoop();});intersection.observe(el);
    document.addEventListener('visibilitychange',updateLoop);
    const interact=(value:boolean)=>{controls.enabled=value;controls.enableRotate=value;renderer.domElement.style.touchAction=value?'none':'pan-y pinch-zoom';};
    const lost=(event:Event)=>{event.preventDefault();contextLost=true;stop();interact(false);setInteractive(false);setReady(false);setFailed(true);};
    renderer.domElement.addEventListener('webglcontextlost',lost);
    engine.current={
      select:onSelect,
      zoom:(delta)=>{camera.zoom=THREE.MathUtils.clamp(camera.zoom+delta,.75,2);camera.updateProjectionMatrix();draw();},
      reset:()=>{stop();interact(false);setInteractive(false);reset();},
      rotate:(delta)=>{stop();camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),delta).add(controls.target);controls.update();draw();},
      play:(value)=>{active=value;controls.autoRotate=value;updateLoop();},
      interact
    };
    const releaseResources=dispose;
    let disposed=false;
    dispose=()=>{if(disposed)return;disposed=true;engine.current=null;active=false;updateLoop();observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',updateLoop);renderer.domElement.removeEventListener('webglcontextlost',lost);controls.removeEventListener('change',draw);controls.removeEventListener('start',stop);releaseResources();};
    reset();resize();onSelect(selectedRoom.current);setReady(true);
    }catch{dispose();engine.current=null;if(!cancelled){setFailed(true);setReady(false);}}
    };
    // Do not download three or allocate a GPU context until the preview is near the viewport.
    const loader=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){loader.disconnect();void initialize();}},{rootMargin:'160px'});
    loader.observe(el);
    return ()=>{cancelled=true;loader.disconnect();dispose();};
  },[bedroomCount,bathroomCount]);
  const current=rooms.find(r=>r.id===selected);
  return <div className="room-model" onKeyDown={e=>{if(e.key==='Escape'){engine.current?.interact(false);setInteractive(false);}}}>
    <div className="model-caption"><span>3D</span>{L('空间示意 · 非房源实景或真实户型', 'Spatial illustration · not the actual property or floor plan')}</div>
    <div className="model-canvas" ref={host} hidden={failed} role="img" aria-label={L('按卧卫数生成的空间示意，非真实户型','Spatial illustration based on room counts, not an actual floor plan')} aria-busy={!ready&&!failed} />
    {!ready&&!failed&&<p role="status">{L('正在加载空间示意…','Loading the spatial illustration…')}</p>}
    {failed && <div className="model-fallback" role="status"><p>{L('设备未能显示 3D，您仍可查看房间列表和房源资料。', '3D could not be displayed on this device. Room labels and listing details remain available.')}</p></div>}
    <div className="model-toolbar" role="group" aria-label={L('空间示意控制','Spatial illustration controls')} aria-describedby={helpId}>
      <button type="button" disabled={!ready||failed} aria-pressed={interactive} onClick={()=>{setInteractive(!interactive);engine.current?.interact(!interactive);}}><Hand size={16} aria-hidden />{interactive?L('退出拖动','Stop dragging'):L('拖动旋转','Drag to rotate')}</button>
      <button type="button" disabled={!ready||failed} aria-label={L('向左旋转','Rotate left')} onClick={()=>engine.current?.rotate(-.3)}><RotateCcw size={17} /></button>
      <button type="button" disabled={!ready||failed} aria-label={L('缩小','Zoom out')} onClick={()=>engine.current?.zoom(-.15)}><Minus size={17} /></button>
      <button type="button" disabled={!ready||failed} aria-label={L('放大','Zoom in')} onClick={()=>engine.current?.zoom(.15)}><Plus size={17} /></button>
      <button type="button" disabled={!ready||failed} aria-label={L('恢复视角','Reset view')} onClick={()=>engine.current?.reset()}><Maximize2 size={17} /></button>
      <button type="button" disabled={!ready||failed} aria-pressed={playing} onClick={()=>{const next=!playing;setPlaying(next);engine.current?.play(next);}}>{playing?<Pause size={16} />:<Play size={16} />}{playing?L('暂停','Pause'):L('环绕预览','Orbit preview')}</button>
    </div>
    <div className="model-room-list" role="group" aria-label={L('选择示意房间','Choose an illustrative room')}>{rooms.map(r=><button key={r.id} type="button" aria-pressed={selected===r.id} onClick={()=>select(r.id)}>{L(r.zh,r.en)}</button>)}</div>
    <p className="model-room-note" id={helpId} aria-live="polite"><strong>{current?L(current.zh,current.en):''}</strong> · {L('仅用于了解空间概念，布局、家具和比例均为示意。可使用旋转和缩放按钮；按 Esc 退出拖动，恢复页面滚动。', 'Layout, furniture and proportions are illustrative only. Use rotation and zoom buttons; press Escape to stop dragging and restore page scrolling.')}</p>
  </div>;
}
