import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (s, root=document) => root.querySelector(s);
const material = {
  walnut:new THREE.MeshStandardMaterial({color:0x70452f,roughness:.42}),
  oak:new THREE.MeshStandardMaterial({color:0xb98a58,roughness:.48}),
  pale:new THREE.MeshStandardMaterial({color:0xd5c4a6,roughness:.55}),
  stone:new THREE.MeshStandardMaterial({color:0x8f9998,roughness:.28}),
  charcoal:new THREE.MeshStandardMaterial({color:0x273238,metalness:.25,roughness:.35}),
  black:new THREE.MeshStandardMaterial({color:0x10171b,metalness:.55,roughness:.28}),
  brass:new THREE.MeshStandardMaterial({color:0xc38b45,metalness:.78,roughness:.22}),
  glass:new THREE.MeshPhysicalMaterial({color:0x9db8ba,transparent:true,opacity:.28,roughness:.12,metalness:.08}),
  white:new THREE.MeshStandardMaterial({color:0xe4e0d6,roughness:.5}),
  line:new THREE.LineBasicMaterial({color:0xf0a45b,transparent:true,opacity:.9})
};
const group=()=>new THREE.Group();
function mesh(geo,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;o.receiveShadow=true;return o}
function box(w,h,d,mat,x=0,y=0,z=0){return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z)}
function cyl(rt,rb,h,mat,x=0,y=0,z=0,seg=32){return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat,x,y,z)}
function addPart(root,name,items,offset=[0,0,0]){const part=group();part.name=name;items.forEach(o=>part.add(o));part.userData.home=part.position.clone();part.userData.explodeOffset=new THREE.Vector3(...offset);root.add(part);return part}
function handles(w,y,z,mat=material.brass){const a=[];for(const x of [-w/2,w/2]){a.push(cyl(.018,.018,.12,mat,x,y,z,12));}a.push(box(w,.025,.025,mat,0,y,z+.06));return a}
function makeKitchen(){
 const root=group();
 // carcass and end panels
 addPart(root,'Carcass',[
  box(3.2,.13,1.45,material.walnut,0,-.45,0),
  box(.12,.88,1.45,material.walnut,-1.54,.0,0),box(.12,.88,1.45,material.walnut,1.54,.0,0),
  box(3.0,.12,1.32,material.walnut,0,-.38,0),
  box(3.0,.1,1.3,material.charcoal,0,.36,0)
 ],[0,-.35,0]);
 // stone top with waterfall-like lip
 addPart(root,'Stone worktop',[box(3.48,.16,1.72,material.stone,0,.52,0),box(3.5,.035,1.74,material.white,0,.615,0)],[0,.42,0]);
 // three drawer boxes/fronts
 for(let i=0;i<3;i++){
  const y=.17-i*.27;
  addPart(root,`Drawer ${i+1}`,[box(.88,.22,1.18,material.oak,-.94,y,.08),box(.88,.22,.055,material.walnut,-.94,y,.69),...handles(.32,y,.73)],[0,0,.34+i*.06]);
 }
 // double cabinet doors right
 for(let x of [.52,1.05]){
  addPart(root,'Cabinet door',[box(.49,.78,.055,material.oak,x,-.02,.74),...handles(.18,.0,.80)],[0,0,.25]);
 }
 // adjustable feet
 const feet=[];for(let x of [-1.35,1.35])for(let z of [-.55,.55])feet.push(cyl(.055,.065,.16,material.black,x,-.57,z));
 addPart(root,'Adjustable feet',feet,[0,-.2,0]);
 return root;
}
function makeDining(){
 const root=group();
 addPart(root,'Tabletop',[box(3.15,.16,1.55,material.oak,0,1.55,0),box(3.08,.025,1.48,material.pale,0,1.645,0)],[0,.4,0]);
 const legs=[];for(let x of [-1.34,1.34])for(let z of [-.59,.59])legs.push(box(.14,1.48,.14,material.walnut,x,.78,z));
 addPart(root,'Table legs',legs,[0,-.25,0]);
 addPart(root,'Apron rails',[box(2.65,.18,.12,material.walnut,0,1.32,.62),box(2.65,.18,.12,material.walnut,0,1.32,-.62),box(.12,.18,1.15,material.walnut,1.28,1.32,0),box(.12,.18,1.15,material.walnut,-1.28,1.32,0)],[0,-.15,0]);
 // Four chairs arranged around table, detailed seat, back rails and spindles
 function chair(cx,cz,rot=0){
  const c=group();c.position.set(cx,0,cz);c.rotation.y=rot;
  c.add(box(.82,.12,.78,material.walnut,0,.82,0));
  const legmat=material.oak;
  for(let x of [-.32,.32])for(let z of [-.29,.29])c.add(box(.09,.82,.09,legmat,x,.4,z));
  c.add(box(.82,.12,.12,material.walnut,0,1.38,-.34));
  c.add(box(.82,.12,.12,material.walnut,0,1.03,-.34));
  for(let i=-2;i<=2;i++)c.add(box(.045,.38,.045,material.oak,i*.14,1.2,-.34));
  return c;
 }
 addPart(root,'Dining chairs',[chair(-2.0,0,Math.PI/2),chair(2.0,0,-Math.PI/2),chair(0,-1.2,0),chair(0,1.2,Math.PI)],[0,.05,0]);
 return root;
}
function makeDrawer(){
 const root=group();
 addPart(root,'Cabinet carcass',[box(2.0,2.1,.9,material.walnut,0,.0,0),box(1.82,1.92,.04,material.charcoal,0,.0,.47)],[0,0,0]);
 addPart(root,'Top panel',[box(2.12,.12,1.0,material.oak,0,1.12,0)],[0,.25,0]);
 for(let i=0;i<4;i++){
  const y=.72-i*.48;
  addPart(root,`Drawer ${i+1}`,[box(1.82,.42,.72,material.walnut,0,y,.12),box(1.82,.42,.065,material.oak,0,y,.51),...handles(.48,y,.56)],[0,0,.4+(i*.04)]);
  // runners visible inside on each side
  const runners=[box(.045,.035,.62,material.black,-.88,y-.13,.1),box(.045,.035,.62,material.black,.88,y-.13,.1)];
  addPart(root,'Drawer runners',runners,[0,0,.18]);
 }
 addPart(root,'Plinth',[box(1.9,.13,.82,material.black,0,-1.12,0)],[0,-.15,0]);
 return root;
}
function makeWardrobe(){
 const root=group();
 addPart(root,'Wardrobe carcass',[box(2.9,3.5,.82,material.pale,0,.0,0),box(2.72,3.32,.06,material.walnut,0,0,.44)],[0,0,0]);
 addPart(root,'Top and bottom panels',[box(3.0,.12,.9,material.oak,0,1.81,0),box(3.0,.12,.9,material.oak,0,-1.81,0)],[0,.18,0]);
 // internal shelf bank and hanging bay
 addPart(root,'Shelving',[box(1.12,.08,.72,material.oak,-.78,.55,.02),box(1.12,.08,.72,material.oak,-.78,-.12,.02),box(1.12,.08,.72,material.oak,-.78,-.78,.02),box(.08,2.7,.72,material.oak,-1.34,0,.02)],[0,0,0]);
 addPart(root,'Hanging rail',[cyl(.035,.035,1.25,material.brass,.55,1.1,0,20)],[0,.1,0]);
 addPart(root,'Lower drawer bank',[box(1.18,.45,.7,material.walnut,.78,-1.12,.02),box(1.18,.45,.055,material.oak,.78,-1.12,.4),...handles(.32,-1.12,.44)],[0,0,.28]);
 // two tall slab doors in front
 addPart(root,'Left door',[box(1.42,3.32,.075,material.oak,-.73,0,.49),...handles(.16,.1,.55)],[ -.32,0,.25]);
 addPart(root,'Right door',[box(1.42,3.32,.075,material.walnut,.73,0,.49),...handles(.16,.1,.55)],[ .32,0,.25]);
 addPart(root,'Toe kick',[box(2.72,.18,.72,material.charcoal,0,-1.68,0)],[0,-.1,0]);
 return root;
}
const builders={kitchen:makeKitchen,dining:makeDining,drawer:makeDrawer,wardrobe:makeWardrobe};
const meta={
 kitchen:{code:'CASEWORK STUDY / RV-001',title:'Kitchen island & countertop',desc:'Modular island assembly with stone-look worktop, carcass panels, drawer modules, cabinet fronts, hardware details, and adjustable feet.',focus:'Casework / Worktop',size:'1800 × 900 × 950 mm'},
 dining:{code:'FURNITURE STUDY / RV-002',title:'Dining table & chair set',desc:'Dining furniture set with a layered tabletop, apron rails, four-leg support structure, and coordinated chair assemblies with back rails and spindles.',focus:'Furniture / Joinery',size:'1600 × 800 × 760 mm'},
 drawer:{code:'CASEWORK STUDY / RV-003',title:'Four-drawer storage cabinet',desc:'Freestanding storage cabinet featuring a rigid carcass, four drawer boxes, front panels, pull handles, concealed runner zones, and plinth.',focus:'Drawer / Hardware',size:'1000 × 450 × 1100 mm'},
 wardrobe:{code:'MILLWORK STUDY / RV-004',title:'Built-in wardrobe system',desc:'Full-height wardrobe concept with paired slab doors, internal shelving, hanging rail, lower drawer module, top and bottom panels, and toe-kick.',focus:'Built-in / Storage',size:'1500 × 450 × 2100 mm'}
};
function createScene(canvas,builder,{autoRotate=false}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,canvas.clientWidth/canvas.clientHeight,.1,100);camera.position.set(4.6,3.2,6.2);
 scene.add(new THREE.HemisphereLight(0xe2f0ef,0x202a2d,2));
 const key=new THREE.DirectionalLight(0xffd4a7,2.8);key.position.set(4,7,5);key.castShadow=true;scene.add(key);
 const fill=new THREE.DirectionalLight(0x9bbdc8,1.9);fill.position.set(-5,3,-4);scene.add(fill);
 const amber=new THREE.PointLight(0xf29a43,25,14);amber.position.set(2,2,4);scene.add(amber);
 const object=builder();scene.add(object);
 const bounds=new THREE.Box3().setFromObject(object);
 const center=bounds.getCenter(new THREE.Vector3()),floorY=bounds.min.y-.035;
 const grid=new THREE.GridHelper(14,28,0x63818a,0x3c5159);grid.position.y=floorY;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=2.5;controls.maxDistance=14;controls.target.copy(center);camera.lookAt(center);
 const baseCamera={iso:new THREE.Vector3(4.6,3.2,6.2),front:new THREE.Vector3(0,1.2,8),side:new THREE.Vector3(8,1.2,0),top:new THREE.Vector3(0,9,.01)};
 let wire=false,exploded=false,dimensions=false,raf=0;
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const ro=new ResizeObserver(resize);ro.observe(canvas);
 function setView(view){const pos=baseCamera[view]||baseCamera.iso;camera.position.copy(pos);controls.target.set(0,0,0);controls.update()}
 function setWire(value){wire=value;object.traverse(o=>{if(o.isMesh){if(!o.userData.originalMaterial){o.userData.originalMaterial=o.material;o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()}const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m)m.wireframe=wire})}})}
 function setExploded(value){exploded=value;object.children.forEach((part,i)=>{const home=part.userData.home||new THREE.Vector3();const off=part.userData.explodeOffset||new THREE.Vector3(0,(i%2?1:-1)*.12,0);part.position.copy(home).addScaledVector(off,exploded?1:0)})}
 function animate(){raf=requestAnimationFrame(animate);if(autoRotate&&!controls.enabled)object.rotation.y+=.002;controls.update();renderer.render(scene,camera)}animate();
 return {scene,object,camera,controls,renderer,setView,setWire,setExploded,get exploded(){return exploded},dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose()}};
}
function addDimensionOverlay(container,dimensions){
 let overlay=container.querySelector('.dimension-overlay');
 if(!overlay){overlay=document.createElement('div');overlay.className='dimension-overlay';overlay.innerHTML='<span class="dim dim-width">↔ <b>1800 mm</b></span><span class="dim dim-height">↕ <b>950 mm</b></span><span class="dim dim-depth">↔ <b>900 mm</b></span>';container.appendChild(overlay)}
 overlay.classList.toggle('show',dimensions);
}
let hero,viewer;
try{
 hero=createScene($('#hero-model'),makeKitchen,{autoRotate:true});
 viewer=createScene($('#project-model'),makeKitchen);
 const tabs=[...document.querySelectorAll('.project-tab')];
 function selectModel(key,tab){
  tabs.forEach(t=>{t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',String(t===tab))});
  const data=meta[key];$('#viewer-code').textContent=data.code;$('#project-title').textContent=data.title;$('#project-desc').textContent=data.desc;$('#project-focus').textContent=data.focus;
  const size=$('#project-size');if(size)size.textContent=data.size;
  viewer.scene.remove(viewer.object);viewer.object.traverse(o=>{if(o.isMesh){o.geometry.dispose()}});viewer.object=builders[key]();viewer.scene.add(viewer.object);
  viewer.setWire(false);viewer.setExploded(false);$('#wire-toggle')?.classList.remove('selected');$('#explode-toggle')?.classList.remove('selected');
  addDimensionOverlay($('.viewer-canvas-wrap'),false);
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>selectModel(tab.dataset.model,tab)));
 document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));viewer.setView(btn.dataset.view)}));
 $('#wire-toggle')?.addEventListener('click',e=>{const on=!e.currentTarget.classList.contains('selected');e.currentTarget.classList.toggle('selected',on);viewer.setWire(on)});
 $('#explode-toggle')?.addEventListener('click',e=>{const on=!e.currentTarget.classList.contains('selected');e.currentTarget.classList.toggle('selected',on);viewer.setExploded(on)});
 $('#dims-toggle')?.addEventListener('click',e=>{const on=!e.currentTarget.classList.contains('selected');e.currentTarget.classList.toggle('selected',on);addDimensionOverlay($('.viewer-canvas-wrap'),on)});
}catch(err){console.error('3D model setup error',err);document.querySelectorAll('.viewer-canvas-wrap,.model-stage').forEach(el=>el.classList.add('webgl-unavailable'))}
const menu=$('.menu-toggle'),nav=$('.main-nav');menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
$('#year').textContent=new Date().getFullYear();
