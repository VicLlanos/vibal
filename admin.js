// admin.js — With GLB Compression
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { ref as dbRef, push, set, remove, onValue } from "firebase/database";
import { auth, db } from "./firebase-config.js";

const $ = (s,root=document)=>root.querySelector(s);
const escapeHtml=(str='')=>String(str).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const LIMITS = { GLB_MAX_BYTES: 5*1024*1024, DRAWING_MAX_BYTES: 2*1024*1024, RTDB_FREE_BYTES: 1024*1024*1024, WARN_AT: 0.70 };

/* ============ AUTH & HELPERS ============ */
document.querySelectorAll('.auth-tab').forEach(tab=>{
  tab.addEventListener('click',()=>{
    document.querySelectorAll('.auth-tab').forEach(t=>t.classList.toggle('active',t===tab));
    document.querySelectorAll('.auth-pane').forEach(p=>p.classList.remove('active'));
    const pane=$('#pane-'+tab.dataset.tab); if(pane) pane.classList.add('active');
  });
});

const gate=$('#auth-gate'), panel=$('#admin-panel');
onAuthStateChanged(auth,user=>{
  if(user){ gate.hidden=true; panel.hidden=false; const emailEl=$('#logged-email'); if(emailEl) emailEl.textContent=user.email; }
  else{ gate.hidden=false; panel.hidden=true; }
});

$('#login-btn').addEventListener('click',async()=>{
  const email=$('#login-email').value.trim(), pass=$('#login-pass').value;
  if(!email||!pass){ $('#login-status').textContent='Enter email and password.'; return; }
  $('#login-btn').disabled=true; $('#login-status').textContent='Signing in…';
  try{ await signInWithEmailAndPassword(auth,email,pass); $('#login-status').textContent=''; $('#login-pass').value=''; }
  catch(e){ $('#login-status').textContent=e.message; }
  finally{ $('#login-btn').disabled=false; }
});

$('#register-btn').addEventListener('click',async()=>{
  const name=$('#reg-name').value.trim(), email=$('#reg-email').value.trim(), pass=$('#reg-pass').value, pass2=$('#reg-pass2').value;
  if(!email||!pass){ $('#register-status').textContent='Email and password required.'; return; }
  if(pass.length<6){ $('#register-status').textContent='Password min 6 chars.'; return; }
  if(pass!==pass2){ $('#register-status').textContent='Passwords do not match.'; return; }
  $('#register-btn').disabled=true; $('#register-status').textContent='Creating account…';
  try{ const cred=await createUserWithEmailAndPassword(auth,email,pass); if(name) await updateProfile(cred.user,{displayName:name}); $('#register-status').textContent='Account created!'; }
  catch(e){ $('#register-status').textContent=e.message; }
  finally{ $('#register-btn').disabled=false; }
});

$('#logout-btn')?.addEventListener('click',()=>signOut(auth));
function setStatus(id,msg,type=''){ const el=$('#'+id); if(el){ el.textContent=msg; el.className='status'+(type?` ${type}`:''); } }
function progressController(wrapId){ const wrap=$('#'+wrapId); if(!wrap) return {update(){},done(){}}; const bar=wrap.querySelector('div'); wrap.hidden=false; return { update(pct){ bar.style.width=pct+'%'; }, done(){ setTimeout(()=>{wrap.hidden=true;bar.style.width='0';},800); } }; }
function formatBytes(b){ if(b<1024)return b+' B'; if(b<1024*1024)return (b/1024).toFixed(1)+' KB'; if(b<1024*1024*1024)return (b/1024/1024).toFixed(2)+' MB'; return (b/1024/1024/1024).toFixed(2)+' GB'; }
function snapshotToArray(snap){ const val=snap.val()||{}; return Object.entries(val).map(([id,data])=>({id,data:data||{}})).sort((a,b)=>(b.data.createdAt||0)-(a.data.createdAt||0)); }

/* ============ FILE & GLB HELPERS ============ */
function readFileAsDataURL(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error('File read failed')); r.readAsDataURL(file); }); }
async function compressImage(file, maxDim=1200, quality=0.75){
  return new Promise((resolve,reject)=>{
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{ URL.revokeObjectURL(url); let {width:w,height:h}=img; if(w>maxDim||h>maxDim){ const scale=maxDim/Math.max(w,h); w=Math.round(w*scale); h=Math.round(h*scale); }
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h; const ctx=canvas.getContext('2d'); ctx.fillStyle='#111820'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      try{ resolve(canvas.toDataURL('image/jpeg',quality)); }catch(e){ reject(e); } };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Image decode failed'));}; img.src=url;
  });
}

// NEW: Compress GLB using gltf-pipeline
async function compressGLB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        // Compress using Draco (reduces size by up to 90%)
        const results = await GltfPipeline.processGlb(arrayBuffer, {
          dracoOptions: { compressionLevel: 7 }
        });
        // Convert the compressed ArrayBuffer back to a Base64 Data URL
        const blob = new Blob([results.glb], { type: 'model/gltf-binary' });
        const url = await new Promise(r => {
          const fr = new FileReader();
          fr.onload = () => r(fr.result);
          fr.readAsDataURL(blob);
        });
        resolve(url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/* ============ USAGE METER ============ */
function updateUsageMeter(totalBytes, projectCount){
  const pct=Math.min(100,(totalBytes/LIMITS.RTDB_FREE_BYTES)*100);
  $('#usage-fill').style.width=pct.toFixed(1)+'%';
  $('#usage-bar').classList.toggle('warn',pct>=LIMITS.WARN_AT*100);
  $('#usage-pct').textContent=pct.toFixed(1)+' %';
  $('#usage-bytes').textContent=`${formatBytes(totalBytes)} / 1 GB`;
  $('#usage-projects').textContent=`${projectCount} project${projectCount===1?'':'s'}`;
}

/* ============ PROJECTS LIST ============ */
const projectListEl=$('#projects-list');
onValue(dbRef(db,'projects_meta'), snap=>{
    const list=snapshotToArray(snap);
    let bytes=0;
    list.forEach(({data})=>{ bytes+=(data.thumbnailData?.length||0); }); 
    updateUsageMeter(bytes,list.length);

    if(!list.length){ projectListEl.innerHTML='<div class="empty">No projects yet.</div>'; return; }
    projectListEl.innerHTML=list.map(({id,data:p})=>`
      <div class="list-item" data-id="${id}">
        ${p.thumbnailData?`<img class="thumb" src="${p.thumbnailData}" alt="">`:''}
        <div class="info">
          <b>${escapeHtml(p.title||'Untitled')}</b>
          <small>${escapeHtml(p.code||'')} · ${escapeHtml(p.focus||'')}</small>
        </div>
        <div class="actions">
          <button class="danger" data-delete-project="${id}">Delete</button>
        </div>
      </div>`).join('');
    
    projectListEl.querySelectorAll('[data-delete-project]').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if(!confirm('Delete this project?'))return;
        try{ 
          await remove(dbRef(db,'projects_meta/'+btn.dataset.deleteProject)); 
          await remove(dbRef(db,'projects_data/'+btn.dataset.deleteProject)); 
        }
        catch(e){ alert('Delete failed: '+e.message); }
      });
    });
  },
  err=>{ projectListEl.innerHTML='<div class="empty">Load error.</div>'; }
);

/* Live file size notes */
const glbInput=$('input[name="glb"]', $('#project-form')), drawingInput=$('input[name="drawing"]', $('#project-form'));
glbInput?.addEventListener('change',()=>{ const f=glbInput.files[0]; $('#glb-size-note').textContent=f?`${formatBytes(f.size)} — ${f.size>LIMITS.GLB_MAX_BYTES?'⚠️ TOO LARGE':'✓ OK (will compress)'}`:''; });
drawingInput?.addEventListener('change',()=>{ const f=drawingInput.files[0]; $('#drawing-size-note').textContent=f?`${formatBytes(f.size)} — ${f.size>LIMITS.DRAWING_MAX_BYTES?'⚠️ TOO LARGE':'✓ OK'}`:''; });

/* ============ PROJECT UPLOAD ============ */
$('#project-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.target, fd=new FormData(form);
  const title=fd.get('title').trim(), focus=fd.get('focus').trim(), description=fd.get('description').trim();
  const glbFile=fd.get('glb'), drawingFile=fd.get('drawing'), thumbFile=fd.get('thumbnail');

  const hasGlb = glbFile && glbFile.size > 0;
  const hasDrawing = drawingFile && drawingFile.size > 0;
  const hasThumb = thumbFile && thumbFile.size > 0;

  if(!title){ setStatus('project-status','Title is required.','error'); return; }
  if(!hasGlb && !hasDrawing && !hasThumb){ setStatus('project-status','Upload at least one file.','error'); return; }
  if(hasGlb && glbFile.size>LIMITS.GLB_MAX_BYTES){ setStatus('project-status','GLB too large (max 5MB).','error'); return; }
  if(hasDrawing && drawingFile.size>LIMITS.DRAWING_MAX_BYTES){ setStatus('project-status','Drawing too large (max 2MB).','error'); return; }

  const submitBtn=$('#project-submit'); submitBtn.disabled=true;
  const prog=progressController('project-progress');

  try{
    let modelData='', drawingData='', drawingMime='', drawingType='', thumbnailData='';

    // Compress and read GLB
    if(hasGlb){
      setStatus('project-status','Compressing 3D Model (this may take a moment)...'); 
      prog.update(15); 
      modelData = await compressGLB(glbFile); 
      prog.update(40); 
    }

    if(hasDrawing){
      setStatus('project-status','Processing drawing…');
      const isPdf=(drawingFile.type==='application/pdf')||/\.pdf$/i.test(drawingFile.name);
      if(isPdf){ drawingData=await readFileAsDataURL(drawingFile); drawingMime='application/pdf'; drawingType='pdf'; }
      else{ drawingData=await compressImage(drawingFile,1600,0.82); drawingMime='image/jpeg'; drawingType='image'; }
      prog.update(hasGlb?70:50);
    }
    if(hasThumb){ setStatus('project-status','Compressing thumbnail…'); thumbnailData=await compressImage(thumbFile,600,0.75); prog.update(80); }

    setStatus('project-status','Saving to database…');
    const ts=Date.now();
    const newRef=push(dbRef(db,'projects_meta')); 
    const id=newRef.key;

    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Database timed out. Check your connection.')), 15000));

    // 1. Save Meta
    await Promise.race([
      set(dbRef(db,'projects_meta/'+id), {
        title, focus, description, code:`PROJECT / ${ts.toString(36).toUpperCase().slice(-6)}`,
        thumbnailData, drawingType, 
        hasModel: !!modelData, hasDrawing: !!drawingData,
        createdAt: ts
      }),
      timeout
    ]);

    // 2. Save Heavy Data
    if(modelData || drawingData){
      await Promise.race([
        set(dbRef(db,'projects_data/'+id), { modelData, drawingData, drawingMime }),
        timeout
      ]);
    }

    prog.update(100); setStatus('project-status','Project published ✓','ok');
    form.reset(); $('#glb-size-note').textContent=''; $('#drawing-size-note').textContent=''; prog.done();
  }catch(err){
    console.error(err); setStatus('project-status','Upload failed: '+err.message,'error'); prog.done();
  }finally{ submitBtn.disabled=false; }
});

/* ============ EXPERIENCE ============ */
const expListEl=$('#experience-list');
onValue(dbRef(db,'experience'), snap=>{
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

/* ============ CERTIFICATIONS ============ */
const certListEl=$('#certs-list');
onValue(dbRef(db,'certifications'), snap=>{
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
