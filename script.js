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
 // Finished island envelope: 3200 W x 1600 D x 950 H (illustrative mm scale).
 // Model is built from separate panels and modules; no solid block is used as the carcass.
 const W=3.2, D=1.55, front=D/2;
 // Recessed plinth and four adjustable levelling feet.
 addPart(root,'Recessed plinth',[
  box(2.92,.14,1.30,material.charcoal,0,.18,0),
  box(2.82,.035,.035,material.black,0,.105,.66),
  box(2.82,.035,.035,material.black,0,.105,-.66)
 ],[0,-.12,0]);
 const feet=[];
 for(const x of [-1.42,1.42]) for(const z of [-.61,.61]){
  feet.push(cyl(.055,.065,.12,material.black,x,.06,z,24));
  feet.push(cyl(.075,.075,.025,material.brass,x,.025,z,24));
 }
 addPart(root,'Levelling feet',feet,[0,-.08,0]);
 // Structural carcass: two end gables, rear panel, rails and floor panel.
 addPart(root,'Carcass panels',[
  box(.075,.68,1.40,material.walnut,-1.48,.56,0),
  box(.075,.68,1.40,material.walnut,1.48,.56,0),
  box(2.88,.68,.055,material.walnut,0,.56,-.68),
  box(2.88,.065,1.32,material.walnut,0,.235,0),
  box(2.88,.075,.10,material.walnut,0,.88,.68),
  box(.075,.62,.10,material.walnut,-1.40,.56,.68),
  box(.075,.62,.10,material.walnut,1.40,.56,.68)
 ],[0,0,0]);
 // Interior divider separates three-drawer stack and double-door cupboard.
 addPart(root,'Module divider',[box(.065,.60,1.28,material.walnut,.30,.55,0)],[0,0,0]);
 // Drawer boxes, face panels and discreet pulls on the left module.
 for(let i=0;i<3;i++){
  const y=.76-i*.205;
  const drawerX=-.55;
  addPart(root,`Drawer module ${i+1}`,[
   box(1.36,.035,.56,material.oak,drawerX,y-.065,.34),
   box(1.36,.17,.045,material.walnut,drawerX,y,.665),
   box(.045,.15,.56,material.walnut,drawerX-.68,y,.34),
   box(.045,.15,.56,material.walnut,drawerX+.68,y,.34),
   box(1.36,.17,.045,material.walnut,drawerX,y,-.0),
   box(.30,.022,.028,material.brass,drawerX,y,.704)
  ],[0,0,.06+i*.025]);
 }
 // Pair of hinged cupboard doors on right with reveal gaps and pulls.
 for(const x of [.83,1.19]){
  addPart(root,'Cupboard door',[
   box(.345,.59,.055,material.oak,x,.55,.725),
   box(.22,.018,.025,material.brass,x+(x<1?-.09:.09),.55,.765)
  ],[0,0,.035]);
 }
 // Continuous worktop with eased-looking edge band and subtle backsplash-free profile.
 addPart(root,'Stone countertop',[
  box(3.38,.105,1.72,material.stone,0,1.00,0),
  box(3.40,.025,1.74,material.white,0,1.065,0),
  box(3.34,.025,.035,material.charcoal,0,.94,.855)
 ],[0,.06,0]);
 // Small inset sink / prep recess at rear-right as a clear functional detail.
 addPart(root,'Inset prep sink',[
  box(.62,.018,.48,material.black,.92,1.083,-.30),
  box(.56,.018,.42,material.charcoal,.92,1.095,-.30),
  box(.035,.045,.035,material.brass,.92,1.12,-.30)
 ],[0,.02,0]);
 // Under-counter toe shadow and front reveals.
 addPart(root,'Front reveal details',[
  box(2.86,.012,.012,material.black,0,.90,.738),
  box(2.86,.012,.012,material.black,0,.205,.738)
 ],[0,0,0]);
 return root;
}
function makeFullKitchen(){
 const root=group();
 // Room-scale concept layout. Coordinates are metres; dimensions are illustrative,
 // not site-verified or construction-approved.
 const parts=(name,items,offset=[0,0,0])=>addPart(root,name,items,offset);
 const baseY=.46, backZ=-1.55;
 parts('Back-run base carcasses',[
  box(4.25,.82,.62,material.walnut,0,baseY,backZ),
  box(4.20,.055,.58,material.oak,0,.055,backZ),
  ...[-1.38,-.48,.48,1.38].map(x=>box(.045,.76,.60,material.oak,x,baseY,backZ))
 ],[0,-.10,0]);
 parts('Left-return base carcasses',[
  box(.62,.82,2.15,material.walnut,-2.15,baseY,-.28),
  box(.58,.055,2.10,material.oak,-2.15,.055,-.28),
  ...[-.92,-.05,.82].map(z=>box(.58,.76,.045,material.oak,-2.15,baseY,z))
 ],[-.10,0,0]);
 parts('Stone worktops',[
  box(4.42,.10,.76,material.stone,0,.91,backZ+.02),
  box(.78,.10,2.22,material.stone,-2.15,.91,-.28),
  box(4.40,.018,.74,material.white,0,.969,backZ+.02),
  box(.76,.018,2.20,material.white,-2.15,.969,-.28)
 ],[0,.04,0]);
 for(let i=0;i<5;i++){
  const x=-1.68+i*.84;
  if(i===1||i===2){
   for(let j=0;j<3;j++){
    const y=.72-j*.235;
    parts(`Back drawer bank ${i+1} · drawer ${j+1}`,[box(.76,.205,.045,material.oak,x,y,-.855),box(.62,.018,.025,material.brass,x,y,-.823)],[0,0,.035]);
   }
  }else parts(`Back base door ${i+1}`,[box(.78,.70,.045,material.oak,x,.47,-.855),box(.24,.025,.025,material.brass,x+.25,.48,-.82)],[0,0,.035]);
 }
 for(let i=0;i<3;i++){
  const z=-.98+i*.70;
  parts(`Return base door ${i+1}`,[box(.045,.70,.64,material.oak,-1.805,.47,z),box(.025,.24,.025,material.brass,-1.77,.48,z+.23)],[.035,0,0]);
 }
 parts('Upper cabinet carcasses',[
  box(3.85,.72,.36,material.pale,0,1.91,backZ),box(3.80,.035,.34,material.oak,0,1.55,backZ),
  ...[-1.25,-.42,.42,1.25].map(x=>box(.035,.68,.34,material.oak,x,1.91,backZ))
 ],[0,.10,0]);
 for(let i=0;i<4;i++){
  const x=-1.43+i*.95;
  parts(`Upper cabinet door ${i+1}`,[box(.91,.68,.045,material.white,x,1.91,-1.345),box(.018,.12,.025,material.brass,x+.36,1.91,-1.305)],[0,0,.035]);
 }
 parts('Tall appliance and pantry housing',[
  box(.82,2.35,.70,material.walnut,2.08,1.18,backZ),box(.78,.045,.66,material.oak,2.08,2.34,backZ),
  box(.035,2.25,.66,material.oak,1.68,1.18,backZ),box(.035,2.25,.66,material.oak,2.48,1.18,backZ)
 ],[.12,0,0]);
 parts('Tall cabinet fronts',[
  box(.75,1.08,.045,material.pale,2.08,1.79,-1.18),box(.75,.98,.045,material.charcoal,2.08,.70,-1.18),
  box(.025,.32,.025,material.brass,2.36,1.79,-1.14),box(.025,.32,.025,material.brass,2.36,.70,-1.14)
 ],[0,0,.05]);
 parts('Sink and faucet',[
  box(.72,.025,.43,material.black,-.95,1.00,-1.52),box(.64,.018,.35,material.charcoal,-.95,1.012,-1.52),
  cyl(.025,.025,.38,material.brass,-.55,1.17,-1.48,20),cyl(.018,.018,.24,material.brass,-.55,1.34,-1.36,20)
 ],[0,.025,0]);
 parts('Cooktop',[
  box(.78,.025,.52,material.black,.65,1.005,-1.50),
  ...[-.22,.22].flatMap(x=>[-.13,.13].map(z=>cyl(.105,.105,.012,material.charcoal,.65+x,1.022,-1.50+z,32)))
 ],[0,.025,0]);
 parts('Built-in oven',[
  box(.72,.56,.48,material.black,.65,.47,-.78),box(.64,.40,.025,material.glass,.65,.48,-.525),
  box(.48,.035,.025,material.brass,.65,.76,-.51),box(.12,.035,.025,material.charcoal,.65,.82,-.51)
 ],[0,0,.08]);
 parts('Backsplash and extractor',[
  box(4.18,.48,.035,material.pale,0,1.25,-1.19),box(1.05,.12,.55,material.charcoal,.65,1.72,-1.45),box(.78,.42,.22,material.black,.65,1.94,-1.50)
 ],[0,.04,0]);
 parts('Island carcass',[
  box(1.85,.78,.78,material.walnut,0,.46,.35),box(1.78,.055,.72,material.oak,0,.07,.35),
  box(.055,.70,.70,material.oak,-.88,.46,.35),box(.055,.70,.70,material.oak,.88,.46,.35),box(1.74,.045,.70,material.oak,0,.82,.35)
 ],[0,-.08,0]);
 for(let i=0;i<3;i++){
  const x=-.58+i*.58;
  parts(`Island drawer ${i+1}`,[box(.53,.66,.045,material.pale,x,.46,.755),box(.22,.022,.025,material.brass,x,.48,.79)],[0,0,.06]);
 }
 parts('Island worktop',[box(2.05,.10,1.02,material.stone,0,.91,.35),box(2.07,.018,1.04,material.white,0,.969,.35)],[0,.04,0]);
 parts('Room reference floor',[box(5.2,.035,4.2,material.charcoal,0,-.035,-.05)]);
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
const builders={kitchen:makeKitchen,fullkitchen:makeFullKitchen,dining:makeDining,drawer:makeDrawer,wardrobe:makeWardrobe};
const meta={
 kitchen:{code:'CASEWORK STUDY / RV-001',title:'Kitchen island & countertop',desc:'Modular island assembly with stone-look worktop, carcass panels, drawer modules, cabinet fronts, hardware details, and adjustable feet.',focus:'Casework / Worktop',size:'Concept envelope · 3400 × 1740 × 1150 mm'},
 fullkitchen:{code:'KITCHEN STUDY / RV-002',title:'Full kitchen cabinetry & appliance layout',desc:'Room-scale L-shaped kitchen concept with base and upper cabinetry, tall pantry and appliance housing, sink and faucet, cooktop, built-in oven, backsplash, stone worktops, and a separate central island.',focus:'Kitchen / Cabinetry / Appliances',size:'Concept footprint · 5200 × 4200 mm · approx. 2400 mm high'},
 dining:{code:'FURNITURE STUDY / RV-003',title:'Dining table & chair set',desc:'Dining furniture set with a layered tabletop, apron rails, four-leg support structure, and coordinated chair assemblies with back rails and spindles.',focus:'Furniture / Joinery',size:'1600 × 800 × 760 mm'},
 drawer:{code:'CASEWORK STUDY / RV-004',title:'Four-drawer storage cabinet',desc:'Freestanding storage cabinet featuring a rigid carcass, four drawer boxes, front panels, pull handles, concealed runner zones, and plinth.',focus:'Drawer / Hardware',size:'1000 × 450 × 1100 mm'},
 wardrobe:{code:'MILLWORK STUDY / RV-005',title:'Built-in wardrobe system',desc:'Full-height wardrobe concept with paired slab doors, internal shelving, hanging rail, lower drawer module, top and bottom panels, and toe-kick.',focus:'Built-in / Storage',size:'1500 × 450 × 2100 mm'}
};
function createScene(canvas,builder,{autoRotate=false}={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.setSize(Math.max(canvas.clientWidth,1),Math.max(canvas.clientHeight,1),false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(35,Math.max(canvas.clientWidth,1)/Math.max(canvas.clientHeight,1),.05,200);
 scene.add(new THREE.HemisphereLight(0xe2f0ef,0x202a2d,2.1));
 const key=new THREE.DirectionalLight(0xffd4a7,3.0);key.position.set(4,8,6);key.castShadow=true;scene.add(key);
 const fill=new THREE.DirectionalLight(0x9bbdc8,2.0);fill.position.set(-5,4,-4);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xf29a43,1.1);rim.position.set(0,3,7);scene.add(rim);
 let object=builder();scene.add(object);
 const grid=new THREE.GridHelper(20,40,0x63818a,0x3c5159);grid.material.transparent=true;grid.material.opacity=.23;scene.add(grid);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=1.5;controls.maxDistance=30;
 let bounds=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3(),fitDistance=7;
 function measureAndFrame(){
  bounds.setFromObject(object);bounds.getCenter(center);bounds.getSize(size);
  const maxDim=Math.max(size.x,size.y,size.z,1);
  fitDistance=(maxDim/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.55;
  controls.target.copy(center);
  camera.position.set(center.x+fitDistance*.72,center.y+fitDistance*.48,center.z+fitDistance);
  camera.near=Math.max(.01,fitDistance/100);camera.far=fitDistance*30;camera.updateProjectionMatrix();
  grid.position.y=bounds.min.y-.04;controls.update();
 }
 measureAndFrame();
 let wire=false,exploded=false,raf=0,spin=autoRotate;
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const ro=new ResizeObserver(resize);ro.observe(canvas);
 function setView(view){
  const d=fitDistance*1.65;
  const positions={
   iso:new THREE.Vector3(.72,.48,1).multiplyScalar(d),
   front:new THREE.Vector3(0,.08,1).multiplyScalar(d),
   side:new THREE.Vector3(1,.08,0).multiplyScalar(d),
   top:new THREE.Vector3(0,1,.001).multiplyScalar(d)
  };
  camera.position.copy(center).add(positions[view]||positions.iso);
  controls.target.copy(center);controls.update();
 }
 function setWire(value){
  wire=value;
  object.traverse(o=>{if(o.isMesh){
   if(!o.userData.wireMaterial){o.userData.wireMaterial=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.userData.solidMaterial=o.material;}
   o.material=value?o.userData.wireMaterial:o.userData.solidMaterial;
   const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m)m.wireframe=value});
  }});
 }
 function setExploded(value){
  exploded=value;
  object.children.forEach((part,i)=>{
   const home=part.userData.home||new THREE.Vector3();
   const off=part.userData.explodeOffset||new THREE.Vector3(0,(i%2?1:-1)*.12,0);
   part.position.copy(home).addScaledVector(off,value?1:0);
  });
 }
 function replaceObject(next){
  scene.remove(object);
  object.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(o.userData.wireMaterial){const mats=Array.isArray(o.userData.wireMaterial)?o.userData.wireMaterial:[o.userData.wireMaterial];mats.forEach(m=>m.dispose())}}});
  object=next;scene.add(object);wire=false;exploded=false;measureAndFrame();
 }
 function animate(){raf=requestAnimationFrame(animate);if(spin&&!controls.state?.dragging)object.rotation.y+=.0015;controls.update();renderer.render(scene,camera)}
 animate();
 return {scene,get object(){return object},camera,controls,renderer,setView,setWire,setExploded,replaceObject,
  dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose()}};
}
function addDimensionOverlay(container,dimensions,key='kitchen'){
 let overlay=container.querySelector('.dimension-overlay');
 if(!overlay){overlay=document.createElement('div');overlay.className='dimension-overlay';container.appendChild(overlay)}
 const labels=key==='fullkitchen'?['≈ 5200 mm · room footprint','≈ 2400 mm · model extent','≈ 4200 mm · room footprint']:key==='kitchen'?['≈ 3400 mm · concept','≈ 1100 mm · concept','≈ 1740 mm · concept']:['Illustrative width','Illustrative height','Illustrative depth'];
 overlay.innerHTML=`<span class="dim dim-width">↔ <b>${labels[0]}</b></span><span class="dim dim-height">↕ <b>${labels[1]}</b></span><span class="dim dim-depth">↔ <b>${labels[2]}</b></span>`;
 overlay.classList.toggle('show',dimensions);
}
let hero,viewer;
try{
 hero=createScene($('#hero-model'),makeKitchen,{autoRotate:false});
 viewer=createScene($('#project-model'),makeKitchen);
 const tabs=[...document.querySelectorAll('.project-tab')];
 function selectModel(key,tab){
  tabs.forEach(t=>{t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',String(t===tab))});
  const data=meta[key];$('#viewer-code').textContent=data.code;$('#project-title').textContent=data.title;$('#project-desc').textContent=data.desc;$('#project-focus').textContent=data.focus;
  const size=$('#project-size');if(size)size.textContent=data.size;
  viewer.replaceObject(builders[key]());
  viewer.setWire(false);viewer.setExploded(false);$('#wire-toggle')?.classList.remove('selected');$('#explode-toggle')?.classList.remove('selected');
  addDimensionOverlay($('.viewer-canvas-wrap'),false,key);
 }
 tabs.forEach(tab=>tab.addEventListener('click',()=>selectModel(tab.dataset.model,tab)));
 document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));viewer.setView(btn.dataset.view)}));
 $('#wire-toggle')?.addEventListener('click',e=>{const on=!e.currentTarget.classList.contains('selected');e.currentTarget.classList.toggle('selected',on);viewer.setWire(on)});
 $('#explode-toggle')?.addEventListener('click',e=>{const on=!e.currentTarget.classList.contains('selected');e.currentTarget.classList.toggle('selected',on);viewer.setExploded(on)});
 $('#dims-toggle')?.addEventListener('click',e=>{const on=!e.currentTarget.classList.contains('selected');e.currentTarget.classList.toggle('selected',on);addDimensionOverlay($('.viewer-canvas-wrap'),on,$('.project-tab.active')?.dataset.model||'kitchen')});
}catch(err){console.error('3D model setup error',err);document.querySelectorAll('.viewer-canvas-wrap,.model-stage').forEach(el=>el.classList.add('webgl-unavailable'))}
const menu=$('.menu-toggle'),nav=$('.main-nav');menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
$('#year').textContent=new Date().getFullYear();
