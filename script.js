// script.js — Realtime Database + Base64 (no Firebase Storage)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ref as dbRef, onValue } from "firebase/database";
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
  const key=new THREE.DirectionalLight(0xffd4a7,3.0);
  key.position.set(4,8,6);key.castShadow=true;scene.add(key);
  const fill=new THREE.DirectionalLight(0x9bbdc8,2.0);
  fill.position.set(-5,4,-4);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xf29a43,1.1);
  rim.position.set(0,3,7);scene.add(rim);
}

function makeFallbackKitchen(){
  const root=new THREE.Group();
  const g=(w,h,d,m,x=0,y=0,z=0)=>{
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;
  };
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
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;

  const scene=new THREE.Scene();
  buildLighting(scene);

  const camera=new THREE.PerspectiveCamera(35,Math.max(canvas.clientWidth,1)/Math.max(canvas.clientHeight,1),.05,500);

  const grid=new THREE.GridHelper(20,40,0x63818a,0x3c5159);
  grid.material.transparent=true;grid.material.opacity=.23;scene.add(grid);

  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.dampingFactor=.075;
  controls.minDistance=.5;controls.maxDistance=50;

  let object=null;
  let bounds=new THREE.Box3(),center=new THREE.Vector3(),size=new THREE.Vector3(),fitDistance=7;
  let raf=0;

  function frameObject(){
    if(!object)return;
    bounds.setFromObject(object);bounds.getCenter(center);bounds.getSize(size);
    const maxDim=Math.max(size.x,size.y,size.z,.5);
    fitDistance=(maxDim/2)/Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*1.75;
    controls.target.copy(center);
    camera.position.set(center.x+fitDistance*.72,center.y+fitDistance*.72,center.z+fitDistance);
    camera.near=Math.max(.01,fitDistance/100);
    camera.far=fitDistance*30;
    camera.updateProjectionMatrix();
    grid.position.y=bounds.min.y-.04;
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
    const d=fitDistance*1.65;
    const dirs={
      iso:new THREE.Vector3(.72,.72,1),
      front:new THREE.Vector3(0,.08,1),
      side:new THREE.Vector3(1,.08,0),
      top:new THREE.Vector3(0,1,.001)
    };
    const dir=dirs[view]||dirs.iso;
    camera.position.copy(center).add(dir.clone().multiplyScalar(d));
    controls.target.copy(center);controls.update();
  }

  function setWire(v){
    if(!object)return;
    object.traverse(o=>{
      if(o.isMesh&&o.material){
        const mats=Array.isArray(o.material)?o.material:[o.material];
        mats.forEach(m=>{
          if(!m)return;
          if(m.userData._origWire===undefined) m.userData._origWire=m.wireframe;
          m.wireframe=v;
        });
      }
    });
  }

  function setObject(next){
    if(object){scene.remove(object);object=null;}
    object=next;scene.add(object);frameObject();
  }

  function animate(){
    raf=requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene,camera);
  }
  animate();

  return {
    scene,camera,controls,renderer,setView,setWire,setObject,frameObject,
    dispose(){cancelAnimationFrame(raf);ro.disconnect();controls.dispose();renderer.dispose();}
  };
}

/* ============================================================
   BASE64 → ARRAYBUFFER / BLOB HELPERS
   ============================================================ */
function base64ToArrayBuffer(dataUrl){
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64ToBlobUrl(dataUrl, mime){
  if(!dataUrl) return '';
  if(dataUrl.startsWith('data:')) return dataUrl;
  return `data:${mime||'application/octet-stream'};base64,${dataUrl}`;
}

/* ============================================================
   HERO 3D
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

/* ============================================================
   AUTH
   ============================================================ */
onAuthStateChanged(auth,user=>{
  document.body.classList.toggle('is-admin',!!user);
});

/* ============================================================
   RTDB HELPERS
   ============================================================ */
function snapshotToArray(snap){
  const val=snap.val()||{};
  return Object.entries(val).map(([id,data])=>({id,data:data||{}}));
}
function sortByCreatedAt(arr){
  return arr.sort((a,b)=>(b.data.createdAt||0)-(a.data.createdAt||0));
}

/* ============================================================
   PROJECTS
   ============================================================ */
const projectGrid=$('#project-grid');
const detailOverlay=$('#project-detail');
const gltfLoader=new GLTFLoader();
let detailScene=null;
let projectsCache=[];

function renderProjects(list){
  if(!list.length){
    projectGrid.innerHTML=`<div class="loading-state">No projects published yet.</div>`;
    return;
  }
  projectGrid.innerHTML=list.map(({id,data:p})=>{
    const thumb = p.thumbnailData
      ? `<img src="${p.thumbnailData}" alt="${escapeHtml(p.title||'Project')} thumbnail">`
      : `<div class="placeholder">3D MODEL<br>${escapeHtml(p.title||'Untitled')}</div>`;
    const badge=p.drawingType?`<span class="badge">${escapeHtml(p.drawingType.toUpperCase())}</span>`:'';
    return `
      <article class="project-card" data-id="${id}">
        <div class="project-thumb">${thumb}${badge}</div>
        <div class="project-meta">
          <b>${escapeHtml(p.title||'Untitled')}</b>
          <small>${escapeHtml(p.focus||'')}</small>
        </div>
      </article>`;
  }).join('');

  projectGrid.querySelectorAll('.project-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const hit=projectsCache.find(x=>x.id===card.dataset.id);
      if(hit) openProject(hit.id,hit.data);
    });
  });
}

function openProject(id,data){
  detailOverlay.hidden=false;
  document.body.style.overflow='hidden';

  $('#detail-code').textContent=data.code||`PROJECT / ${id.slice(0,6).toUpperCase()}`;
  $('#detail-title').textContent=data.title||'Untitled';
  $('#detail-desc').textContent=data.description||'';

  const drawPreview=$('#drawing-preview');
  const drawOpen=$('#drawing-open');

  if(data.drawingData){
    const isPdf=(data.drawingType||'').toLowerCase()==='pdf';
    const mime=isPdf?'application/pdf':(data.drawingMime||'image/png');
    const dataUrl=base64ToBlobUrl(data.drawingData, mime);

    if(isPdf){
      drawPreview.innerHTML=`
        <div class="pdf-note">
          PDF TECHNICAL DRAWING<br>
          <a href="${dataUrl}" download="${escapeHtml(data.title||'drawing')}.pdf" class="contact-link" style="margin-top:14px">DOWNLOAD PDF ↗</a>
          <div style="margin-top:10px;font-size:9px;color:#6b7d83">(PDF preview in-browser is limited — download for full view)</div>
        </div>`;
      drawOpen.style.display='block';
      drawOpen.href=dataUrl;
      drawOpen.setAttribute('download',`${(data.title||'drawing').replace(/[^\w-]/g,'_')}.pdf`);
      drawOpen.innerHTML='Download PDF drawing <b>↗</b>';
    }else{
      drawPreview.innerHTML=`
        <a href="${dataUrl}" target="_blank" rel="noopener">
          <img src="${dataUrl}" alt="Technical drawing for ${escapeHtml(data.title||'project')}">
        </a>`;
      drawOpen.style.display='block';
      drawOpen.href=dataUrl;
      drawOpen.removeAttribute('download');
      drawOpen.innerHTML='Open full drawing <b>↗</b>';
    }
  }else{
    drawPreview.innerHTML=`<div class="pdf-note">No drawing attached.</div>`;
    drawOpen.style.display='none';
  }

  const canvas=$('#detail-model');
  if(detailScene){detailScene.dispose();detailScene=null;}
  detailScene=createScene(canvas);

  if(data.modelData){
    try{
      const buffer=base64ToArrayBuffer(data.modelData);
      gltfLoader.parse(
        buffer,
        '',
        gltf=>{ detailScene.setObject(gltf.scene); },
        err=>{
          console.error('GLB parse error',err);
          detailScene.setObject(makeFallbackKitchen());
        }
      );
    }catch(err){
      console.error('GLB decode error',err);
      detailScene.setObject(makeFallbackKitchen());
    }
  }else{
    detailScene.setObject(makeFallbackKitchen());
  }

  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='iso'));
  $('#wire-toggle')?.classList.remove('selected');
}

function closeDetail(){
  detailOverlay.hidden=true;
  document.body.style.overflow='';
  if(detailScene){detailScene.dispose();detailScene=null;}
}
$('#detail-close')?.addEventListener('click',closeDetail);
detailOverlay?.addEventListener('click',e=>{ if(e.target===detailOverlay) closeDetail(); });

document.querySelectorAll('[data-view]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b===btn));
    detailScene?.setView(btn.dataset.view);
  });
});
$('#wire-toggle')?.addEventListener('click',e=>{
  const on=!e.currentTarget.classList.contains('selected');
  e.currentTarget.classList.toggle('selected',on);
  detailScene?.setWire(on);
});

onValue(
  dbRef(db,'projects'),
  snap=>{
    projectsCache=sortByCreatedAt(snapshotToArray(snap));
    renderProjects(projectsCache);
  },
  err=>{
    console.error('Projects subscription error',err);
    projectGrid.innerHTML=`<div class="loading-state">Could not load projects. Check RTDB rules & databaseURL.</div>`;
  }
);

/* ============================================================
   EXPERIENCE
   ============================================================ */
const expList=$('#experience-list');
onValue(
  dbRef(db,'experience'),
  snap=>{
    const list=sortByCreatedAt(snapshotToArray(snap));
    if(!list.length){
      expList.innerHTML=`<div class="loading-state" style="color:#7e8c91;font:11px 'DM Mono';letter-spacing:.1em;padding:40px 0">No experience records yet.</div>`;
      return;
    }
    expList.innerHTML=list.map(({data:x})=>{
      const current=x.current
        ? `<div class="exp-current"><i class="live-dot"></i> CURRENT POSITION</div>`
        : '';
      return `
        <article class="experience-item">
          <div class="exp-years">${escapeHtml(String(x.years||''))}<span>${x.yearsSuffix||'+'}</span>
            <small>YEARS IN<br>${escapeHtml(x.yearsLabel||'CAD & DESIGN')}</small>
          </div>
          <div>
            ${current}
            <h2>${escapeHtml(x.company||'Company')}</h2>
            <p class="role-line">${escapeHtml(x.role||'')}</p>
            <p>${escapeHtml(x.description||'')}</p>
          </div>
        </article>`;
    }).join('');
  },
  err=>{
    console.error('Experience subscription error',err);
    expList.innerHTML=`<div class="loading-state" style="color:#7e8c91;font:11px 'DM Mono';padding:40px 0">Could not load experience.</div>`;
  }
);

/* ============================================================
   CERTIFICATIONS
   ============================================================ */
const certGrid=$('#cert-grid');
onValue(
  dbRef(db,'certifications'),
  snap=>{
    const list=sortByCreatedAt(snapshotToArray(snap));
    if(!list.length){
      certGrid.innerHTML=`<div class="loading-state">No certifications uploaded yet.</div>`;
      return;
    }
    certGrid.innerHTML=list.map(({data:c})=>`
      <article class="cert-card">
        <img src="${c.imageData}" alt="${escapeHtml(c.title||'Certification')}" loading="lazy" data-full="${c.imageData}">
        <div class="cert-meta">
          <b>${escapeHtml(c.title||'Certification')}</b>
          <small>${escapeHtml(c.issuer||'')}</small>
        </div>
      </article>`).join('');
    certGrid.querySelectorAll('img').forEach(img=>{
      img.addEventListener('click',()=>{
        const w=window.open('');
        if(w) w.document.write(`<img src="${img.dataset.full}" style="max-width:100%">`);
      });
    });
  },
  err=>{
    console.error('Cert subscription error',err);
    certGrid.innerHTML=`<div class="loading-state">Could not load certifications.</div>`;
  }
);

/* ============================================================
   NAV / MISC
   ============================================================ */
const menu=$('.menu-toggle'),nav=$('.main-nav');
menu?.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(open));
});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
const yearEl=$('#year');
if(yearEl) yearEl.textContent=new Date().getFullYear();