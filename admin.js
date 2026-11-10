// admin.js — Realtime Database + Base64 (no Firebase Storage)
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  ref as dbRef,
  push,
  set,
  remove,
  onValue,
  get,
  child
} from "firebase/database";
import { auth, db } from "./firebase-config.js";

const $ = (s,root=document)=>root.querySelector(s);
const escapeHtml=(str='')=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ============================================================
   LIMITS (RTDB hard limits: 10 MB single string, 16 MB write)
   ============================================================ */
const LIMITS = {
  GLB_MAX_BYTES: 5 * 1024 * 1024,        // 5 MB raw → ~6.7 MB base64
  DRAWING_MAX_BYTES: 2 * 1024 * 1024,    // 2 MB raw → ~2.7 MB base64
  THUMB_MAX_BYTES: 300 * 1024,           // 300 KB raw → ~400 KB base64
  CERT_MAX_BYTES: 300 * 1024,            // 300 KB raw → ~400 KB base64
  RTDB_FREE_BYTES: 1024 * 1024 * 1024,   // 1 GB free tier
  WARN_AT: 0.70                          // warn at 70% usage
};

/* ============================================================
   FILE READERS
   ============================================================ */
function readFileAsDataURL(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(r.result);
    r.onerror=()=>reject(new Error('File read failed'));
    r.readAsDataURL(file);
  });
}

/* Compress an image file → JPEG dataURL at target size */
async function compressImage(file, maxDim=1200, quality=0.75){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      let {width:w,height:h}=img;
      if(w>maxDim||h>maxDim){
        const scale=maxDim/Math.max(w,h);
        w=Math.round(w*scale);h=Math.round(h*scale);
      }
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext('2d');
      ctx.fillStyle='#111820';
      ctx.fillRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      try{
        resolve(canvas.toDataURL('image/jpeg',quality));
      }catch(e){ reject(e); }
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image decode failed'));};
    img.src=url;
  });
}

function formatBytes(b){
  if(b<1024) return b+' B';
  if(b<1024*1024) return (b/1024).toFixed(1)+' KB';
  if(b<1024*1024*1024) return (b/1024/1024).toFixed(2)+' MB';
  return (b/1024/1024/1024).toFixed(2)+' GB';
}

/* ============================================================
   AUTH
   ============================================================ */
const gate=$('#auth-gate');
const panel=$('#admin-panel');
const loginBtn=$('#login-btn');
const loginStatus=$('#login-status');

loginBtn.addEventListener('click',async()=>{
  const email=$('#login-email').value.trim();
  const pass=$('#login-pass').value;
  if(!email||!pass){ loginStatus.textContent='Enter email and password.'; loginStatus.className='status error'; return; }
  loginBtn.disabled=true;loginStatus.textContent='Signing in…';loginStatus.className='status';
  try{
    await signInWithEmailAndPassword(auth,email,pass);
    loginStatus.textContent='';
  }catch(e){
    console.error(e);
    loginStatus.textContent='Sign-in failed: '+e.message;
    loginStatus.className='status error';
  }finally{loginBtn.disabled=false;}
});

onAuthStateChanged(auth,user=>{
  if(user){ gate.hidden=true; panel.hidden=false; }
  else{ gate.hidden=false; panel.hidden=true; }
});

$('#logout-btn')?.addEventListener('click',async()=>{ await signOut(auth); });

/* ============================================================
   HELPERS
   ============================================================ */
function setStatus(id,msg,type=''){
  const el=$('#'+id);
  el.textContent=msg;
  el.className='status'+(type?` ${type}`:'');
}
function progressController(wrapId){
  const wrap=$('#'+wrapId);
  const bar=wrap.querySelector('div');
  wrap.hidden=false;
  return {
    update(pct){ bar.style.width=pct+'%'; },
    done(){ setTimeout(()=>{wrap.hidden=true;bar.style.width='0';},800); }
  };
}
function snapshotToArray(snap){
  const val=snap.val()||{};
  return Object.entries(val)
    .map(([id,data])=>({id,data:data||{}}))
    .sort((a,b)=>(b.data.createdAt||0)-(a.data.createdAt||0));
}

/* ============================================================
   USAGE METER
   ============================================================ */
function computeApproxUsage(){
  const snapProjects=$('#projects-list');
  const snapCerts=$('#certs-list');
  let totalBytes=0;
  // We estimate from the raw JSON we already have in DOM via data attributes
  totalBytes+=Number(snapProjects?.dataset.bytes||0);
  totalBytes+=Number(snapCerts?.dataset.bytes||0);
  // Experience is tiny — ignore
  return totalBytes;
}

function updateUsageMeter(totalBytes, projectCount){
  const pct=Math.min(100,(totalBytes/LIMITS.RTDB_FREE_BYTES)*100);
  const fill=$('#usage-fill');
  const bar=$('#usage-bar');
  const pctEl=$('#usage-pct');
  const bytesEl=$('#usage-bytes');
  const projEl=$('#usage-projects');
  if(!fill) return;
  fill.style.width=pct.toFixed(1)+'%';
  bar.classList.toggle('warn',pct>=LIMITS.WARN_AT*100);
  pctEl.textContent=pct.toFixed(1)+' %';
  bytesEl.textContent=`${formatBytes(totalBytes)} / 1 GB`;
  projEl.textContent=`${projectCount} project${projectCount===1?'':'s'}`;
}

/* ============================================================
   PROJECTS LIST
   ============================================================ */
const projectListEl=$('#projects-list');
let totalApproxBytes=0;
let projectCount=0;

onValue(
  dbRef(db,'projects'),
  snap=>{
    const list=snapshotToArray(snap);
    projectCount=list.length;
    let bytes=0;
    list.forEach(({data})=>{
      bytes+=(data.modelData?.length||0)+(data.drawingData?.length||0)+(data.thumbnailData?.length||0);
    });
    totalApproxBytes=bytes;
    updateUsageMeter(totalApproxBytes,projectCount);
    projectListEl.dataset.bytes=String(bytes);

    if(!list.length){ projectListEl.innerHTML='<div class="empty">No projects yet.</div>'; return; }
    projectListEl.innerHTML=list.map(({id,data:p})=>`
      <div class="list-item" data-id="${id}">
        ${p.thumbnailData?`<img class="thumb" src="${p.thumbnailData}" alt="">`:''}
        <div class="info">
          <b>${escapeHtml(p.title||'Untitled')}</b>
          <small>${escapeHtml(p.code||'')} · ${escapeHtml(p.focus||'')} · ${formatBytes((p.modelData?.length||0)+(p.drawingData?.length||0))}</small>
        </div>
        <div class="actions">
          <button class="danger" data-delete-project="${id}">Delete</button>
        </div>
      </div>`).join('');
    projectListEl.querySelectorAll('[data-delete-project]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if(!confirm('Delete this project?'))return;
        try{ await remove(dbRef(db,'projects/'+btn.dataset.deleteProject)); }
        catch(e){ alert('Delete failed: '+e.message); }
      });
    });
  },
  err=>{ console.error(err); projectListEl.innerHTML='<div class="empty">Load error: '+err.message+'</div>'; }
);

/* Live file size notes */
const glbInput=$('input[name="glb"]', $('#project-form'));
const drawingInput=$('input[name="drawing"]', $('#project-form'));
glbInput?.addEventListener('change',()=>{
  const f=glbInput.files[0];
  $('#glb-size-note').textContent=f?`${formatBytes(f.size)} — ${f.size>LIMITS.GLB_MAX_BYTES?'⚠️ TOO LARGE (max 5 MB)':'✓ OK'}`:'';
});
drawingInput?.addEventListener('change',()=>{
  const f=drawingInput.files[0];
  $('#drawing-size-note').textContent=f?`${formatBytes(f.size)} — ${f.size>LIMITS.DRAWING_MAX_BYTES?'⚠️ TOO LARGE (max 2 MB)':'✓ OK'}`:'';
});

/* ============================================================
   PROJECT UPLOAD
   ============================================================ */
$('#project-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.target;
  const fd=new FormData(form);
  const title=(fd.get('title')||'').toString().trim();
  const focus=(fd.get('focus')||'').toString().trim();
  const description=(fd.get('description')||'').toString().trim();
  const glbFile=fd.get('glb');
  const drawingFile=fd.get('drawing');
  const thumbFile=fd.get('thumbnail');

  // Validate
  if(!title){ setStatus('project-status','Title is required.','error'); return; }
  if(!glbFile||!glbFile.size){ setStatus('project-status','GLB model file is required.','error'); return; }
  if(glbFile.size>LIMITS.GLB_MAX_BYTES){
    setStatus('project-status',`GLB too large (${formatBytes(glbFile.size)}). Max 5 MB.`,'error');
    return;
  }
  if(!drawingFile||!drawingFile.size){ setStatus('project-status','Technical drawing is required.','error'); return; }
  if(drawingFile.size>LIMITS.DRAWING_MAX_BYTES){
    setStatus('project-status',`Drawing too large (${formatBytes(drawingFile.size)}). Max 2 MB.`,'error');
    return;
  }

  const submitBtn=$('#project-submit');
  submitBtn.disabled=true;
  const prog=progressController('project-progress');

  try{
    // 1) GLB → Base64
    setStatus('project-status','Reading GLB model…');
    prog.update(10);
    const glbData=await readFileAsDataURL(glbFile);
    prog.update(40);

    // 2) Drawing → Base64 (PDF stays as-is; images get compressed)
    setStatus('project-status','Processing technical drawing…');
    const isPdf=(drawingFile.type==='application/pdf')||/\.pdf$/i.test(drawingFile.name);
    let drawingData, drawingMime, drawingType;
    if(isPdf){
      drawingData=await readFileAsDataURL(drawingFile);
      drawingMime='application/pdf';
      drawingType='pdf';
    }else{
      const compressed=await compressImage(drawingFile,1600,0.82);
      drawingData=compressed;
      drawingMime='image/jpeg';
      drawingType='image';
    }
    prog.update(70);

    // 3) Optional thumbnail
    let thumbnailData='';
    if(thumbFile&&thumbFile.size){
      setStatus('project-status','Compressing thumbnail…');
      thumbnailData=await compressImage(thumbFile,600,0.75);
    }
    prog.update(85);

    // 4) Save
    setStatus('project-status','Saving to Realtime Database…');
    const ts=Date.now();
    const newRef=push(dbRef(db,'projects'));
    await set(newRef,{
      title,focus,description,
      code:`PROJECT / ${ts.toString(36).toUpperCase().slice(-6)}`,
      modelData:glbData,
      drawingData,
      drawingMime,
      drawingType,
      thumbnailData,
      createdAt:ts
    });
    prog.update(100);

    setStatus('project-status','Project published ✓','ok');
    form.reset();
    $('#glb-size-note').textContent='';
    $('#drawing-size-note').textContent='';
    prog.done();
  }catch(err){
    console.error(err);
    setStatus('project-status','Upload failed: '+err.message,'error');
    prog.done();
  }finally{
    submitBtn.disabled=false;
  }
});

/* ============================================================
   EXPERIENCE LIST
   ============================================================ */
const expListEl=$('#experience-list');
onValue(
  dbRef(db,'experience'),
  snap=>{
    const list=snapshotToArray(snap);
    if(!list.length){ expListEl.innerHTML='<div class="empty">No experience records yet.</div>'; return; }
    expListEl.innerHTML=list.map(({id,data:x})=>`
      <div class="list-item" data-id="${id}">
        <div class="info">
          <b>${escapeHtml(x.company||'Company')}</b>
          <small>${escapeHtml(x.role||'')} · ${escapeHtml(String(x.years||''))}${escapeHtml(x.yearsSuffix||'')} yrs${x.current?' · CURRENT':''}</small>
        </div>
        <div class="actions">
          <button class="danger" data-delete-exp="${id}">Delete</button>
        </div>
      </div>`).join('');
    expListEl.querySelectorAll('[data-delete-exp]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if(!confirm('Delete this experience record?'))return;
        try{ await remove(dbRef(db,'experience/'+btn.dataset.deleteExp)); }
        catch(e){ alert('Delete failed: '+e.message); }
      });
    });
  },
  err=>{ console.error(err); expListEl.innerHTML='<div class="empty">Load error.</div>'; }
);

$('#experience-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  const company=(fd.get('company')||'').toString().trim();
  if(!company){ setStatus('experience-status','Company is required.','error'); return; }
  try{
    setStatus('experience-status','Saving…');
    const newRef=push(dbRef(db,'experience'));
    await set(newRef,{
      company,
      role:(fd.get('role')||'').toString().trim(),
      years:Number(fd.get('years')||0)||'',
      yearsSuffix:(fd.get('yearsSuffix')||'').toString().trim(),
      yearsLabel:(fd.get('yearsLabel')||'').toString().trim(),
      current:(fd.get('current')||'no').toString()==='yes',
      description:(fd.get('description')||'').toString().trim(),
      createdAt:Date.now()
    });
    setStatus('experience-status','Experience added ✓','ok');
    e.target.reset();
  }catch(err){
    console.error(err);
    setStatus('experience-status','Failed: '+err.message,'error');
  }
});

/* ============================================================
   CERTIFICATIONS LIST
   ============================================================ */
const certListEl=$('#certs-list');
onValue(
  dbRef(db,'certifications'),
  snap=>{
    const list=snapshotToArray(snap);
    if(!list.length){ certListEl.innerHTML='<div class="empty">No certifications yet.</div>'; return; }
    certListEl.innerHTML=list.map(({id,data:c})=>`
      <div class="list-item" data-id="${id}">
        ${c.imageData?`<img class="thumb" src="${c.imageData}" alt="">`:''}
        <div class="info">
          <b>${escapeHtml(c.title||'Certification')}</b>
          <small>${escapeHtml(c.issuer||'')} · ${formatBytes(c.imageData?.length||0)}</small>
        </div>
        <div class="actions">
          <button class="danger" data-delete-cert="${id}">Delete</button>
        </div>
      </div>`).join('');
    certListEl.querySelectorAll('[data-delete-cert]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if(!confirm('Delete this certification?'))return;
        try{ await remove(dbRef(db,'certifications/'+btn.dataset.deleteCert)); }
        catch(e){ alert('Delete failed: '+e.message); }
      });
    });
  },
  err=>{ console.error(err); certListEl.innerHTML='<div class="empty">Load error.</div>'; }
);

$('#cert-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  const title=(fd.get('title')||'').toString().trim();
  const issuer=(fd.get('issuer')||'').toString().trim();
  const imageFile=fd.get('image');

  if(!title){ setStatus('cert-status','Title is required.','error'); return; }
  if(!imageFile||!imageFile.size){ setStatus('cert-status','Image file is required.','error'); return; }

  const prog=progressController('cert-progress');
  try{
    setStatus('cert-status','Compressing image…');
    prog.update(30);
    const imageData=await compressImage(imageFile,1200,0.78);
    prog.update(75);

    setStatus('cert-status','Saving to Realtime Database…');
    const newRef=push(dbRef(db,'certifications'));
    await set(newRef,{
      title,
      issuer,
      imageData,
      createdAt:Date.now()
    });
    prog.update(100);

    setStatus('cert-status','Certification added ✓','ok');
    e.target.reset();
    prog.done();
  }catch(err){
    console.error(err);
    setStatus('cert-status','Upload failed: '+err.message,'error');
    prog.done();
  }
});