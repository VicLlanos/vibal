import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (s, root=document) => root.querySelector(s);
const mats = {
  body: new THREE.MeshStandardMaterial({color:0x333e43,metalness:.72,roughness:.28}),
  dark: new THREE.MeshStandardMaterial({color:0x11191e,metalness:.55,roughness:.3}),
  steel: new THREE.MeshStandardMaterial({color:0xaebbc0,metalness:.88,roughness:.22}),
  silver: new THREE.MeshStandardMaterial({color:0x77868c,metalness:.8,roughness:.25}),
  black: new THREE.MeshStandardMaterial({color:0x080d11,metalness:.25,roughness:.23}),
  orange: new THREE.MeshStandardMaterial({color:0xe98d3b,metalness:.55,roughness:.3}),
  glass: new THREE.MeshPhysicalMaterial({color:0x8cb6c1,metalness:.08,roughness:.08,transmission:.45,transparent:true,opacity:.55,thickness:.4}),
  white: new THREE.MeshStandardMaterial({color:0xd7d9d4,metalness:.28,roughness:.35})
};
function matClone(m){return m.clone()}
function mesh(g,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);o.castShadow=true;o.receiveShadow=true;return o}
function box(w,h,d,m,x=0,y=0,z=0,bevel=0){let g;if(bevel){g=new THREE.BoxGeometry(w,h,d,2,2,2)}else g=new THREE.BoxGeometry(w,h,d);return mesh(g,m,x,y,z)}
function cyl(rt,rb,h,m,x=0,y=0,z=0,seg=48){return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m,x,y,z)}
function torus(r,t,m,x=0,y=0,z=0,rx=Math.PI/2){return mesh(new THREE.TorusGeometry(r,t,12,64),m,x,y,z,rx)}
function sphere(r,m,x=0,y=0,z=0,scale=[1,1,1]){const o=mesh(new THREE.SphereGeometry(r,32,20),m,x,y,z);o.scale.set(...scale);return o}
function group(){return new THREE.Group()}
function makeCooker(){
 const g=group();
 g.add(cyl(1.12,1.18,1.45,mats.body,0,0,0));
 g.add(cyl(1.13,1.13,.12,mats.dark,0,-.68,0));
 g.add(torus(1.12,.045,mats.steel,0,.72,0));
 g.add(cyl(1.04,1.04,.12,mats.black,0,.77,0));
 g.add(cyl(.88,.9,.1,mats.steel,0,.86,0));
 // lid dome and handle
 const lid=sphere(1,mats.dark,0,1.04,0,[1,.19,1]);g.add(lid);
 g.add(torus(.86,.035,mats.steel,0,1.04,0));
 g.add(box(.55,.12,.24,mats.black,0,1.29,0,.04));
 g.add(box(.35,.08,.18,mats.orange,0,1.36,0));
 // front control panel
 g.add(box(.72,.48,.08,mats.black,0,.05,1.08));
 g.add(box(.48,.18,.025,mats.glass,0,.18,1.13));
 g.add(torus(.095,.018,mats.orange,0,-.08,1.14));
 for(let i=0;i<3;i++)g.add(sphere(.035,mats.steel,-.2+i*.2,-.22,1.14,[1,.5,1]));
 // side handles
 for(const s of [-1,1]){g.add(box(.16,.16,.48,mats.black,s*1.17,.2,0));g.add(box(.12,.1,.34,mats.steel,s*1.25,.2,0))}
 // feet
 for(const x of [-.72,.72])for(const z of [-.72,.72])g.add(cyl(.12,.13,.18,mats.black,x,-.82,z,24));
 return g;
}
function makeBlender(){
 const g=group();
 // motor base
 g.add(cyl(.78,.85,.9,mats.body,0,-.5,0));
 g.add(torus(.78,.035,mats.steel,0,-.07,0));
 g.add(cyl(.7,.72,.12,mats.dark,0,-.98,0));
 g.add(box(.6,.28,.08,mats.black,0,-.48,.76));
 g.add(box(.38,.1,.025,mats.glass,0,-.42,.81));
 g.add(torus(.11,.02,mats.orange,0,-.65,.81));
 // jar taper
 const jar=mesh(new THREE.CylinderGeometry(.53,.36,1.55,48,1,true),mats.glass,0,.78,0);g.add(jar);
 g.add(cyl(.55,.55,.08,mats.black,0,1.58,0));
 g.add(cyl(.37,.37,.08,mats.steel,0,.0,0));
 g.add(torus(.53,.035,mats.steel,0,1.56,0,0));
 // handle
 g.add(box(.13,.95,.16,mats.dark,.68,.83,0));
 g.add(box(.12,.12,.16,mats.dark,.68,1.28,0));
 g.add(box(.12,.12,.16,mats.dark,.68,.37,0));
 // lid and cap
 g.add(cyl(.57,.57,.13,mats.dark,0,1.7,0));
 g.add(cyl(.19,.19,.15,mats.orange,0,1.83,0));
 // blade hints
 for(let i=0;i<4;i++){const blade=box(.32,.025,.06,mats.steel,0,.08,0);blade.rotation.y=i*Math.PI/2;g.add(blade)}
 return g;
}
function makeFan(){
 const g=group();
 // base and neck
 g.add(cyl(.82,.9,.18,mats.dark,0,-1.08,0));
 g.add(cyl(.67,.67,.08,mats.steel,0,-.96,0));
 g.add(cyl(.12,.16,1.15,mats.silver,0,-.38,0));
 g.add(sphere(.22,mats.body,0,.2,0,[1,1,.85]));
 // head axis along z
 g.add(cyl(.72,.72,.24,mats.dark,0,.42,0));
 g.add(torus(.76,.045,mats.steel,0,.42,.14));
 g.add(torus(.68,.025,mats.silver,0,.42,.18));
 // hub and blades in XY plane
 g.add(cyl(.2,.2,.22,mats.orange,0,.42,.23));
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const b=sphere(.43,mats.white,Math.cos(a)*.32,.42+Math.sin(a)*.32,.2,[.25,.7,.09]);b.rotation.z=a;g.add(b)}
 // front guard rings and radial spokes
 for(let r of [.3,.48,.65,.77])g.add(torus(r,.012,matClone(mats.steel),0,.42,.28,0));
 for(let i=0;i<20;i++){const a=i*Math.PI*2/20;const spoke=box(.018,1.48,.025,mats.silver,0,.42,.27);spoke.rotation.z=a;g.add(spoke)}
 // rear motor cap
 g.add(cyl(.42,.48,.36,mats.body,0,.42,-.24));
 g.add(cyl(.12,.12,.35,mats.steel,0,.42,-.52));
 return g;
}
function makeVacuum(){
 const g=group();
 // main shell angled
 const body=mesh(new THREE.CapsuleGeometry(.48,1.35,8,24),mats.body,0,.1,0,0,0,-.28);g.add(body);
 // dust bin
 g.add(cyl(.39,.43,.88,mats.glass,-.45,-.18,.05,40));
 g.add(torus(.4,.04,mats.steel,-.45,.27,.05,0));
 g.add(cyl(.4,.4,.1,mats.dark,-.45,-.65,.05));
 // handle arch
 const handle=torus(.42,.12,mats.black,.38,.68,0,Math.PI/2);handle.scale.set(1,1.25,1);g.add(handle);
 // nozzle and exhaust
 g.add(mesh(new THREE.CylinderGeometry(.16,.28,.8,32),mats.dark,-.03,-.7,.55,Math.PI/2,0,0));
 g.add(cyl(.22,.22,.08,mats.orange,-.03,-.7,.96,32).rotateX(Math.PI/2));
 g.add(cyl(.25,.28,.14,mats.black,.22,.0,-.4,32));
 // detail seams
 g.add(torus(.48,.025,mats.steel,0,.25,0,0));
 for(let i=0;i<5;i++)g.add(box(.035,.3,.02,mats.silver,.45,.0,-.12+i*.09));
 return g;
}
const builders={cooker:makeCooker,blender:makeBlender,fan:makeFan,vacuum:makeVacuum};
const info={
 cooker:{code:'MODEL STUDY / RV-001',title:'Multi-cooker assembly',desc:'A compact countertop cooking appliance study, organized around a formed outer shell, removable inner vessel, hinged lid, and front-facing control panel.',focus:'Enclosure / Assembly'},
 blender:{code:'MODEL STUDY / RV-002',title:'Countertop blender',desc:'A two-part appliance study separating the motor housing from the transparent blending vessel, lid, handle, and blade interface.',focus:'Part interfaces / Fit'},
 fan:{code:'MODEL STUDY / RV-003',title:'Oscillating table fan',desc:'A desktop air-moving appliance study with a guarded rotor, multi-blade impeller, motor casing, support neck, and weighted base.',focus:'Mechanism / Components'},
 vacuum:{code:'MODEL STUDY / RV-004',title:'Handheld vacuum cleaner',desc:'A compact handheld cleaning-device study exploring ergonomic housing, transparent dust collection, intake geometry, and handle integration.',focus:'Ergonomics / Housing'}
};
function setupScene(canvas, builder, options={}){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.background=null;
 const camera=new THREE.PerspectiveCamera(34,canvas.clientWidth/canvas.clientHeight,.1,100);camera.position.set(4.1,3.0,5.8);
 scene.add(new THREE.HemisphereLight(0xc9e5ec,0x18212a,2.0));
 const key=new THREE.DirectionalLight(0xffd2a1,3.0);key.position.set(4,6,5);key.castShadow=true;scene.add(key);
 const fill=new THREE.DirectionalLight(0x8ab9ce,2.2);fill.position.set(-5,2,-3);scene.add(fill);
 const rim=new THREE.PointLight(0xf29a43,35,12);rim.position.set(2,1,3);scene.add(rim);
 const object=builder();scene.add(object);
 const floor=new THREE.GridHelper(12,24,0x55717b,0x354851);floor.position.y=-1.22;floor.material.transparent=true;floor.material.opacity=.28;scene.add(floor);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=3;controls.maxDistance=10;controls.target.set(0,0,0);
 const resize=()=>{const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const ro=new ResizeObserver(resize);ro.observe(canvas);
 let raf;const animate=()=>{raf=requestAnimationFrame(animate);if(options.autoRotate&&!controls.enabled)object.rotation.y+=.003;controls.update();renderer.render(scene,camera)};animate();
 return {scene,object,controls,dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose()}};
}
let heroScene,projectScene;
try{
 heroScene=setupScene($('#hero-model'),makeCooker,{autoRotate:true});
 projectScene=setupScene($('#project-model'),makeCooker);
 const tabs=[...document.querySelectorAll('.project-tab')];
 tabs.forEach(tab=>tab.addEventListener('click',()=>{
   tabs.forEach(t=>{t.classList.toggle('active',t===tab);t.setAttribute('aria-selected',String(t===tab))});
   const key=tab.dataset.model,meta=info[key];$('#viewer-code').textContent=meta.code;$('#project-title').textContent=meta.title;$('#project-desc').textContent=meta.desc;$('#project-focus').textContent=meta.focus;
   projectScene.scene.remove(projectScene.object);projectScene.object.geometry?.dispose?.();projectScene.object=builders[key]();projectScene.scene.add(projectScene.object);
 }));
}catch(err){console.error('3D preview initialization failed:',err);document.querySelectorAll('.viewer-canvas-wrap,.model-stage').forEach(el=>el.classList.add('webgl-unavailable'))}
const menu=$('.menu-toggle'),nav=$('.main-nav');menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
$('#year').textContent=new Date().getFullYear();
