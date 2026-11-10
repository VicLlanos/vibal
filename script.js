// script.js — Fixed Camera, Split Database, Restored Hero
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ref as dbRef, onValue, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "./firebase-config.js";

const $ = (s, root = document) => root.querySelector(s);
const escapeHtml=(str='')=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ============================================================
   THREE.JS HELPERS
   ============================================================ */
const MAT = {
  walnut:new THREE.MeshStandardMaterial({color:0x70452f,roughness:.42}),
  oak:new THREE.MeshStandardMaterial({color:0xb98a58,roughness:.48}),
  stone:new THREE.MeshStandardMaterial({color:0x8f9998,roughness:.28}),
  charcoal:new THREE.MeshStandardMaterial({color:0x273238,metalness:.25,roughness:.35})
};

function buildLighting(scene){
  scene.add(new THREE.HemisphereLight(0xe2f0ef,0x202a2d,2.1));
  const key=new THREE.DirectionalLight(0xffd4a7,3.0); key.position.set(4,8,6); key.castShadow=true; scene.add(key);
  const fill=new THREE.DirectionalLight(0x9bbdc8,2.0); fill.position.set(-5,4,-4); scene.add(fill);
  const rim=new THREE.DirectionalLight(0xf29a43,1.1); rim.position.set(0,3,7); scene.add(rim);
}

// Restored fallback model for the Hero Section
function makeFallbackKitchen(){
  const root=new THREE.Group();
  const g=(w,h,d,m,x=0,y=0,z=0)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;};
  root.add(g(3.38,.105,1.72,MAT.stone,0,1.00,0));
  root.add(g(2.92,.14,1.30,MAT.charcoal,0,.18,0));
  root.add(g(.075,.68,1.40,MAT.walnut,-1.48,.56,0));
  root.add(g(.075,.68,1.40,MAT.walnut,1.48,.56,0));
  root.add(g(2.88,.68,.055,MAT.walnut,0,.56,-.68));
  root.add(g(2.88,.075,.10,MAT.walnut,0,.88,.68));
  root.add(g(1.36,.17,.045,MAT.walnut,-.55,.76,.665));
  root.add(g(1.36,.17,.045,MAT.walnut,-.55,.555,.665));
  root.add(g(1.36,.17,.045,MAT.walnut,-.55,.35,.665));
  root.add(g(.345,.59,.055,MAT.oak,.83,.55,.725));
  root.add(g(.345,.59,.055,MAT.oak,1.19,.55,.725));
  return root;
}

function createScene(canvas){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(Math.max(canvas.clientWidth,1),Math.max(canvas.clientHeight,1),false);
  renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  const scene=new THREE.Scene();
  buildLighting(scene);
  const camera=new THREE.PerspectiveCamera(40, Math.max(canvas.clientWidth,1)/Math.max(canvas.clientHeight,1), 0.01, 10000);

  const grid=new THREE.GridHelper(10, 20, 0x63818a, 0x3c5159);
  grid.material.transparent=true; grid.material.opacity=.3; scene.add(grid);

  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true; controls.dampingFactor=.075;
  controls.minDistance=0.1; controls.maxDistance=5000;

  let object=null;
  let bounds=new THREE.Box3(), center=new THREE.Vector3(), size=new THREE.Vector3(), maxDim=10;
  let raf=0;

  function fitCameraToObject(){
    if(!object) return;
    object.updateMatrixWorld(true);
    bounds.setFromObject(object); bounds.getCenter(center); bounds.getSize(size);
    
    maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim === 0) maxDim = 10;

    grid.position.y = bounds.min.y;
    grid.scale.set(maxDim * 2, 1, maxDim * 2);

    const fitHeightDistance = maxDim / (2 * Math.tan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = 1.5 * Math.max(fitHeightDistance, fitWidthDistance);

    controls.target.copy(center);
    camera.position.set(center.x + distance * 0.707, center.y + distance * 0.707, center.z + distance * 0.707);
    
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    controls.update();
  }

  const resize=()=>{
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(!w||!h)return;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const ro=new ResizeObserver(resize);ro.observe(canvas);

  function setView(view){
    if(!object)return;
    const d = maxDim * 1.8; 
    if (view === 'iso') camera.position.set(center.x + d, center.y + d, center.z + d);
    else if (view === 'front') camera.position.set(center.x, center.y, center.z + d);
    else if (view === 'side') camera.position.set(center.x + d, center.y, center.z);
    else if (view === 'top') camera.position.set(center.x, center.y + d, center.z + 0.01);
    controls.target.copy(center); controls.update();
  }

  function setWire(v){
    if(!object)return;
    object.traverse(o=>{
      if(o.isMesh&&o.material){
        const mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(m=>{if(!m)return;if(m.userData._origWire===undefined)m.userData._origWire=m.wireframe;m.wireframe=v;});
      }
    });
  }

  function setObject(next){
    if(object){scene.remove(object);object=null;}
    object=next; scene.add(object); fitCameraToObject(); 
  }

  function animate(){raf=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
  animate();

  return {scene,camera,controls,renderer,setView,setWire,setObject,dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();}};
}

function base64ToArrayBuffer(dataUrl){
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64); const len = binary.length; const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function base64ToBlobUrl(dataUrl, mime){ if(!dataUrl) return ''; if(dataUrl.startsWith('data:')) return dataUrl; return `data:${mime||'application/octet-stream'};base64,${dataUrl}`; }

/* ============================================================
   HERO 3D & AUTH
   ============================================================ */
(function initHero(){
  const canvas=$('#hero-model');
  if(!canvas)return;
  try{
    const hero=createScene(canvas);
    hero.setObject(makeFallbackKitchen());
  }catch(e){
    console.error('Hero 3D error',e);
    canvas.parentElement?.classList.add('webgl-unavailable');
  }
})();

onAuthStateChanged(auth,user=>{ document.body.classList.toggle('is-admin',!!user); });

/* ============================================================
   PROJECTS (Split Meta & Data for Instant Load)
   ============================================================ */
const projectGrid=$('#project-grid');
const detailOverlay=$('#project-detail');
const gltfLoader=new GLTFLoader();
let detailScene=null;
let projectsCache=[];

function renderProjects(list){
  if(!list.length){ projectGrid.innerHTML=`<div class="loading-state">No projects published yet.</div>`; return; }
  projectGrid.innerHTML=list.map(({id,data:p})=>{
    let thumb = p.thumbnailData ? `<img src="${p.thumbnailData}" alt="Thumbnail">` : `<div class="placeholder">NO THUMBNAIL</div>`;
    let badge = '';
    if(p.hasModel && p.hasDrawing) badge = `<span class="badge">3D + 2D</span>`;
    else if(p.hasModel) badge = `<span class="badge">3D MODEL</span>`;
    else if(p.hasDrawing && p.drawingType === 'pdf') badge = `<span class="badge">PDF</span>`;
    else if(p.hasDrawing) badge = `<span class="badge">IMAGE</span>`;

    return `
      <article class="project-card" data-id="${id}">
        <div class="project-thumb">${thumb}${badge}</div>
        <div class="project-meta"><b>${escapeHtml(p.title||'Untitled')}</b><small>${escapeHtml(p.focus||'')}</small></div>
      </article>`;
  }).join('');

  projectGrid.querySelectorAll('.project-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const hit=projectsCache.find(x=>x.id===card.dataset.id);
      if(hit) openProject(hit.id,hit.data);
    });
  });
}

async function openProject(id, metaData){
  detailOverlay.hidden=false;
  document.body.style.overflow='hidden';

  $('#detail-code').textContent=metaData.code||`PROJECT / ${id.slice(0,6).toUpperCase()}`;
  $('#detail-title').textContent=metaData.title||'Untitled';
  $('#detail-desc').textContent=metaData.description||'Loading files...';

  $('.detail-drawing').style.display = 'none';
  $('.detail-model-wrap').style.display = 'none';
  $('.detail-body').style.gridTemplateColumns = '1fr';
  $('#drawing-preview').innerHTML = '<div class="pdf-note">Loading files...</div>';
  if(detailScene){detailScene.dispose();detailScene=null;}
  
  try {
    const snapshot = await get(dbRef(db, `projects_data/${id}`));
    const heavyData = snapshot.val() || {};
    
    $('#detail-desc').textContent=metaData.description||'';
    const hasModel = !!(heavyData.modelData && heavyData.modelData.length);
    const hasDrawing = !!(heavyData.drawingData && heavyData.drawingData.length);

    const detailBody = $('.detail-body'), modelWrap = $('.detail-model-wrap'), drawingWrap = $('.detail-drawing');
    if(hasModel && hasDrawing){ detailBody.style.gridTemplateColumns = '1.6fr 1fr'; modelWrap.style.display = ''; drawingWrap.style.display = ''; }
    else if(hasModel && !hasDrawing){ detailBody.style.gridTemplateColumns = '1fr'; modelWrap.style.display = ''; drawingWrap.style.display = 'none'; }
    else if(!hasModel && hasDrawing){ detailBody.style.gridTemplateColumns = '1fr'; modelWrap.style.display = 'none'; drawingWrap.style.display = ''; }
    else { detailBody.style.gridTemplateColumns = '1fr'; modelWrap.style.display = 'none'; drawingWrap.style.display = ''; }

    const drawPreview=$('#drawing-preview'), drawOpen=$('#drawing-open');
    if(hasDrawing){
      const isPdf=(heavyData.drawingType||'').toLowerCase()==='pdf';
      const mime=isPdf?'application/pdf':(heavyData.drawingMime||'image/jpeg');
      const dataUrl=base64ToBlobUrl(heavyData.drawingData, mime);
      if(isPdf){ drawPreview.innerHTML=`<div class="pdf-note">PDF DRAWING<br><a href="${dataUrl}" download="${escapeHtml(metaData.title||'drawing')}.pdf" class="contact-link" style="margin-top:14px">DOWNLOAD PDF ↗</a></div>`; drawOpen.style.display='block'; drawOpen.href=dataUrl; }
      else{ drawPreview.innerHTML=`<a href="${dataUrl}" target="_blank"><img src="${dataUrl}"></a>`; drawOpen.style.display='block'; drawOpen.href=dataUrl; drawOpen.innerHTML='Open full drawing <b>↗</b>'; }
    } else if(metaData.thumbnailData){
      drawPreview.innerHTML=`<a href="${metaData.thumbnailData}" target="_blank"><img src="${metaData.thumbnailData}"></a>`;
      drawOpen.style.display='none';
    } else {
      drawPreview.innerHTML=`<div class="pdf-note">No drawing attached.</div>`; drawOpen.style.display='none';
    }

    if(hasModel){
      detailScene=createScene($('#detail-model'));
      try{
        const buffer=base64ToArrayBuffer(heavyData.modelData);
        gltfLoader.parse(buffer, '', gltf=>{ detailScene.setObject(gltf.scene); }, err=>{ console.error(err); });
      }catch(err){ console.error(err); }
    }

    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='iso'));
    $('#wire-toggle')?.classList.remove('selected');

  } catch (err) {
    console.error('Failed to load project data', err);
    $('#detail-desc').textContent = 'Error loading project files.';
  }
}

function closeDetail(){ detailOverlay.hidden=true; document.body.style.overflow=''; if(detailScene){detailScene.dispose();detailScene=null;} }
$('#detail-close')?.addEventListener('click',closeDetail);
detailOverlay?.addEventListener('click',e=>{ if(e.target===detailOverlay) closeDetail(); });
document.querySelectorAll('[data-view]').forEach(btn=>{ btn.addEventListener('click',()=>{ document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn)); detailScene?.setView(btn.dataset.view); }); });
$('#wire-toggle')?.addEventListener('click',e=>{ const on=!e.currentTarget.classList.contains('selected'); e.currentTarget.classList.toggle('selected',on); detailScene?.setWire(on); });

onValue(dbRef(db,'projects_meta'), snap=>{ projectsCache=sortByCreatedAt(snapshotToArray(snap)); renderProjects(projectsCache); }, err=>{ console.error(err); });

/* ============================================================
   EXPERIENCE
   ============================================================ */
onValue(dbRef(db,'experience'), snap=>{
    const list=sortByCreatedAt(snapshotToArray(snap)); const el=$('#experience-list');
    if(!list.length){ el.innerHTML=`<div class="loading-state">No experience.</div>`; return; }
    el.innerHTML=list.map(({data:x})=>`
      <article class="experience-item">
        <div class="exp-years">${escapeHtml(String(x.years||''))}<span>${x.yearsSuffix||'+'}</span><small>YEARS IN<br>${escapeHtml(x.yearsLabel||'CAD')}</small></div>
        <div>${x.current?`<div class="exp-current"><i class="live-dot"></i> CURRENT</div>`:''}<h2>${escapeHtml(x.company||'')}</h2><p class="role-line">${escapeHtml(x.role||'')}</p><p>${escapeHtml(x.description||'')}</p></div>
      </article>`).join('');
});

/* ============================================================
   CERTIFICATIONS
   ============================================================ */
onValue(dbRef(db,'certifications'), snap=>{
    const list=sortByCreatedAt(snapshotToArray(snap)); const el=$('#cert-grid');
    if(!list.length){ el.innerHTML=`<div class="loading-state">No certifications.</div>`; return; }
    el.innerHTML=list.map(({data:c})=>`<article class="cert-card"><img src="${c.imageData}" data-full="${c.imageData}"><div class="cert-meta"><b>${escapeHtml(c.title||'')}</b><small>${escapeHtml(c.issuer||'')}</small></div></article>`).join('');
    el.querySelectorAll('img').forEach(img=>{ img.addEventListener('click',()=>{ const w=window.open(''); if(w) w.document.write(`<img src="${img.dataset.full}" style="max-width:100%">`); }); });
});

function sortByCreatedAt(arr){return arr.sort((a,b)=>(b.data.createdAt||0)-(a.data.createdAt||0));}
function snapshotToArray(snap){const val=snap.val()||{};return Object.entries(val).map(([id,data])=>({id,data:data||{}}));}
const yearEl=$('#year');if(yearEl) yearEl.textContent=new Date().getFullYear();
