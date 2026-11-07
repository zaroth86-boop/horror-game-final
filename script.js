(()=>{
'use strict';
/* ================= CONFIG ================= */
const CONFIG={
  SERVER_URL:window.location.origin,   // ISI setelah deploy, contoh: 'https://nama-app-kamu.onrender.com'
  SEND_HZ:12
};

/* ================= UTIL ================= */
const $=id=>document.getElementById(id);
if(typeof THREE==='undefined'){$('loadText').textContent='Three.js gagal dimuat. Periksa koneksi internet lalu muat ulang.';return;}
const V3=THREE.Vector3,TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const rnd=(a,b)=>a+Math.random()*(b-a);
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
const S={graphics:'medium',shadow:'low',res:.85,mouse:1,touch:1,master:.8,music:.6,sfx:.8,bright:1.2,mobile:isTouch,name:'',char:'arga'};
let SEEN={};
try{Object.assign(S,JSON.parse(localStorage.getItem('tlh_s')||'{}'));SEEN=JSON.parse(localStorage.getItem('tlh_seen')||'{}');}catch(e){}
const saveS=()=>{try{localStorage.setItem('tlh_s',JSON.stringify(S));}catch(e){}};
const markSeen=id=>{SEEN[id]=1;try{localStorage.setItem('tlh_seen',JSON.stringify(SEEN));}catch(e){}};
const ITEM={fuse:'Sekering',key_storage:'Kunci Gudang',photo:'Potongan Foto',tape:'Kaset Lama',key_brass:'Kunci Kuningan'};
const OBJ_TEXT=['Cari sumber listrik: temukan sekering lalu nyalakan panel listrik','Temukan 3 potongan foto keluarga','Cari kunci gudang','Temukan rekaman lama lalu putar di TV','Temukan 3 kunci kuningan dan buka kamar terlarang','Temukan rahasia THE WIDOW','KABUR! Keluar lewat gerbang bersama tim'];
const NOTES={
  note_k:['CATATAN DI MEJA','"Arga... jangan biarkan mereka masuk ke kamar belakang. Kalau kamu membaca ini, berarti kamu sudah pulang."\n\n— Ibu'],
  note_a:['BUKU HARIAN ARGA','"Ibu bilang, kalau ada yang memanggil namamu dari lorong, jangan pernah menjawab. Tadi malam suara itu memanggilku lagi."'],
  painting:['LUKISAN KELUARGA','Ayah, Ibu, dan Arga kecil. Di belakang mereka ada sosok perempuan berbaju putih. Wajahnya sengaja dicoret dengan cat hitam.'],
  photoFrame:['FOTO LAMA','Empat orang berdiri di foto ini. Seingatmu keluarga ini hanya bertiga.']
};
const G={mode:'loading',sock:null,room:null,me:null,token:null,ready:false,players:{},objective:0,prog:'',power:false,inv:[],
  hp:100,down:false,stam:100,exhausted:false,pos:new V3(-3,.15,14.5),yaw:0,pitch:0,crouch:false,fl:false,crouchT:false,runT:false,
  cut:null,look:null,Wt:null,wo:null,t:0,tension:0,flicker:0,car:null,interT:0,fearT:0,stepD:0,bob:0,
  paused:false,invOpen:false,noteOpen:false,ending:false,locked:false,settingsFrom:null,target:null,reviving:null,spawned:false,shake:0};

/* ================= AUDIO (prosedural) ================= */
const A={ctx:null};
function audioInit(){
  if(A.ctx){if(A.ctx.state==='suspended')A.ctx.resume();return;}
  try{A.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  const c=A.ctx;A.master=c.createGain();A.music=c.createGain();A.sfx=c.createGain();
  A.music.connect(A.master);A.sfx.connect(A.master);A.master.connect(c.destination);
  const len=c.sampleRate*2;A.nb=c.createBuffer(1,len,c.sampleRate);const d=A.nb.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  audioVol();
  const w=noiseSrc(true),wf=c.createBiquadFilter();wf.type='bandpass';wf.frequency.value=420;wf.Q.value=.6;
  const wg=c.createGain();wg.gain.value=.09;w.connect(wf);wf.connect(wg);wg.connect(A.music);w.start();
  const lfo=c.createOscillator(),lg=c.createGain();lfo.frequency.value=.12;lg.gain.value=.05;lfo.connect(lg);lg.connect(wg.gain);lfo.start();
  const r=noiseSrc(true),rf=c.createBiquadFilter();rf.type='highpass';rf.frequency.value=2500;const rg=c.createGain();rg.gain.value=.03;r.connect(rf);rf.connect(rg);rg.connect(A.music);r.start();
  const o1=c.createOscillator(),o2=c.createOscillator(),df=c.createBiquadFilter(),dg=c.createGain();
  o1.type=o2.type='sawtooth';o1.frequency.value=55;o2.frequency.value=55.8;df.type='lowpass';df.frequency.value=180;dg.gain.value=.12;
  o1.connect(df);o2.connect(df);df.connect(dg);dg.connect(A.music);o1.start();o2.start();
  const t1=c.createOscillator(),t2=c.createOscillator(),tg=c.createGain();t1.frequency.value=233;t2.frequency.value=246.9;tg.gain.value=0;
  t1.connect(tg);t2.connect(tg);tg.connect(A.music);t1.start();t2.start();
  A.mus={dg,tg,df};
}
function audioVol(){if(!A.ctx)return;const t=A.ctx.currentTime;A.master.gain.setTargetAtTime(S.master,t,.05);A.music.gain.setTargetAtTime(S.music,t,.05);A.sfx.gain.setTargetAtTime(S.sfx,t,.05);}
function musicMode(m){if(!A.ctx)return;const t=A.ctx.currentTime,M=A.mus;
  M.dg.gain.setTargetAtTime(m==='cut'?.2:m==='game'?.09:.13,t,.5);M.df.frequency.setTargetAtTime(m==='cut'?300:180,t,.5);}
function noiseSrc(loop){const s=A.ctx.createBufferSource();s.buffer=A.nb;s.loop=loop;return s;}
function outNode(pos){if(!pos)return A.sfx;const p=A.ctx.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=2;p.rolloffFactor=1.4;p.maxDistance=60;
  if(p.positionX){p.positionX.value=pos.x;p.positionY.value=pos.y;p.positionZ.value=pos.z;}else p.setPosition(pos.x,pos.y,pos.z);p.connect(A.sfx);return p;}
function tone(f,d,type,v,dst,f2,delay){const c=A.ctx,t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.02,d/3));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g);g.connect(dst);o.start(t);o.stop(t+d+.05);}
function nz(d,v,ft,ff,q,dst,delay){const c=A.ctx,t=c.currentTime+(delay||0),s=noiseSrc(false),f=c.createBiquadFilter(),g=c.createGain();f.type=ft;f.frequency.value=ff;f.Q.value=q;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+Math.min(.03,d/3));g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(dst);s.start(t,Math.random(),d+.1);}
function sfx(n,pos){if(!A.ctx)return;const d=outNode(pos);
  switch(n){
    case 'step':nz(.09,.35,'lowpass',500+rnd(-80,120),.7,d);break;
    case 'door':tone(160,.9,'sawtooth',.12,d,80);nz(.7,.2,'bandpass',300,3,d);break;
    case 'slam':tone(90,.5,'sine',.9,d,35);nz(.35,.8,'lowpass',250,.7,d);break;
    case 'creak':tone(240,1.2,'sawtooth',.1,d,150);nz(1,.1,'bandpass',500,8,d);break;
    case 'whisper':for(let i=0;i<5;i++)nz(.35,.22,'bandpass',2200+rnd(-500,900),9,d,i*.28);break;
    case 'tv':nz(.8,.35,'bandpass',2800,.5,d);break;
    case 'phone':for(let i=0;i<6;i++){tone(440,.18,'square',.07,d,null,i*.4);tone(480,.18,'square',.07,d,null,i*.4+.02);}break;
    case 'sting':[220,233,311].forEach(f=>tone(f*2,1.6,'sawtooth',.12,d,f*.9));nz(.4,.5,'lowpass',900,.5,d);break;
    case 'pick':tone(660,.12,'sine',.25,d,990);break;
    case 'click':tone(1200,.04,'square',.1,d);break;
    case 'power':nz(.5,.5,'lowpass',400,1,d);tone(60,1.2,'sawtooth',.2,d,120);break;
    case 'heart':tone(60,.2,'sine',.8,d,40);tone(55,.2,'sine',.6,d,38,.28);break;
    case 'hit':tone(120,.35,'sawtooth',.5,d,40);nz(.3,.7,'lowpass',700,.6,d);break;
    case 'knock':tone(110,.08,'sine',.8,d);tone(100,.08,'sine',.8,d,null,.22);tone(105,.08,'sine',.8,d,null,.45);break;
    case 'scream':tone(900,.8,'sawtooth',.18,d,300);tone(1200,.8,'square',.06,d,500);break;
    case 'car':tone(70,2,'sawtooth',.08,d,60);nz(2,.15,'lowpass',200,.5,d);break;
  }}
const _f=new V3(),_u=new V3();
function audioListener(){if(!A.ctx)return;const l=A.ctx.listener,p=camera.position;_f.set(0,0,-1).applyQuaternion(camera.quaternion);_u.set(0,1,0).applyQuaternion(camera.quaternion);
  if(l.positionX){l.positionX.value=p.x;l.positionY.value=p.y;l.positionZ.value=p.z;l.forwardX.value=_f.x;l.forwardY.value=_f.y;l.forwardZ.value=_f.z;l.upX.value=_u.x;l.upY.value=_u.y;l.upZ.value=_u.z;}
  else{l.setPosition(p.x,p.y,p.z);l.setOrientation(_f.x,_f.y,_f.z,_u.x,_u.y,_u.z);}}

/* ================= THREE: DASAR ================= */
const canvas=$('gameCanvas');
let renderer,scene,camera,moon,hemi,flash,yardLight,winGlow,poolN=7;const pool=[];
function initThree(){
  renderer=new THREE.WebGLRenderer({canvas,antialias:!S.mobile,powerPreference:'high-performance'});
  renderer.outputEncoding=THREE.sRGBEncoding;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x0c1120);scene.fog=new THREE.FogExp2(0x121a2b,.016);
  camera=new THREE.PerspectiveCamera(72,1,.05,400);camera.rotation.order='YXZ';scene.add(camera);
  hemi=new THREE.HemisphereLight(0xa4b4dc,0x3b3126,.62);scene.add(hemi);scene.add(new THREE.AmbientLight(0x343b50,.4));
  moon=new THREE.DirectionalLight(0xa9bcff,.8);moon.position.set(-18,30,22);const sc=moon.shadow.camera;sc.left=-20;sc.right=20;sc.top=20;sc.bottom=-20;sc.near=1;sc.far=90;
  moon.shadow.bias=-.0006;scene.add(moon,moon.target);
  poolN=S.mobile?4:7;for(let i=0;i<poolN;i++){const l=new THREE.PointLight(0xffd2a0,0,10,1.5);scene.add(l);pool.push({l,room:null});}
  yardLight=new THREE.PointLight(0xffc97a,.9,16,1.6);yardLight.position.set(-3,3.2,10.5);scene.add(yardLight);
  flash=new THREE.SpotLight(0xfff1d0,0,24,.5,.55,1.3);flash.position.set(.15,-.12,0);flash.target.position.set(0,0,-6);camera.add(flash,flash.target);
  window.addEventListener('resize',onResize);onResize();
}
function onResize(){const w=innerWidth,h=innerHeight;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2)*S.res);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  $('rotateHint').classList.toggle('hidden',!(isTouch&&h>w&&G.mode==='game'));if(G.mode==='char')setPreviewOffset();}
function applyGfx(){
  const lo=S.graphics==='low'||S.mobile,sh=S.shadow!=='off';
  renderer.toneMappingExposure=S.bright;renderer.shadowMap.enabled=sh;moon.castShadow=sh;
  const ms=S.shadow==='high'?2048:1024;moon.shadow.mapSize.set(ms,ms);if(moon.shadow.map){moon.shadow.map.dispose();moon.shadow.map=null;}
  moon.intensity=sh?.8:.4;scene.fog.density=lo?.022:.016;if(G.tufts)G.tufts.visible=!lo;
  for(const k in M)M[k].needsUpdate=true;onResize();
}

/* ================= TEKSTUR & MATERIAL ================= */
const M={};
function mkTex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.encoding=THREE.sRGBEncoding;t.anisotropy=4;return t;}
function speck(g,w,h,n,a,sz){for(let i=0;i<n;i++){g.fillStyle='rgba('+(Math.random()<.5?'0,0,0':'255,255,255')+','+rnd(0,a)+')';g.fillRect(rnd(0,w),rnd(0,h),rnd(1,sz||2),rnd(1,sz||2));}}
function buildMaterials(){
  const T=S.mobile?128:256;
  const std=(n,c,r,m,map,ex)=>{const x=new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r,metalness:m||0},ex||{}));if(map)x.map=map;x.name=n;M[n]=x;return x;};
  std('planks',0xffffff,.7,0,mkTex(T,T,(g,w,h)=>{for(let i=0;i<8;i++){g.fillStyle='hsl(28,'+(35+rnd(0,10))+'%,'+(38+rnd(-4,6))+'%)';g.fillRect(i*w/8,0,w/8,h);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(i*w/8,0,2,h);}speck(g,w,h,600,.25,3);}));
  std('wallpaper',0xffffff,.95,0,mkTex(T,T,(g,w,h)=>{g.fillStyle='#cdbf9b';g.fillRect(0,0,w,h);g.fillStyle='#c3b48f';for(let x=0;x<w;x+=w/8)g.fillRect(x,0,w/16,h);speck(g,w,h,500,.12,3);}));
  std('ext',0xffffff,.95,0,mkTex(T,T,(g,w,h)=>{g.fillStyle='#a8a291';g.fillRect(0,0,w,h);for(let i=0;i<30;i++){g.fillStyle='rgba(40,40,30,'+rnd(.03,.1)+')';g.fillRect(rnd(0,w),0,rnd(2,8),h);}speck(g,w,h,700,.2,3);}));
  std('tile',0xffffff,.35,0,mkTex(T,T,(g,w,h)=>{g.fillStyle='#8a8e88';g.fillRect(0,0,w,h);for(let x=0;x<4;x++)for(let y=0;y<4;y++){g.fillStyle='#cdd1ca';g.fillRect(x*w/4+2,y*h/4+2,w/4-4,h/4-4);}}));
  std('stone',0xffffff,.9,0,mkTex(T,T,(g,w,h)=>{g.fillStyle='#4a4741';g.fillRect(0,0,w,h);for(let i=0;i<14;i++){g.fillStyle='hsl(40,6%,'+rnd(30,42)+'%)';g.fillRect(rnd(0,w),rnd(0,h),rnd(30,70),rnd(20,40));}speck(g,w,h,600,.2,3);}));
  std('rug',0xffffff,1,0,mkTex(T,T,(g,w,h)=>{g.fillStyle='#7a2f2a';g.fillRect(0,0,w,h);g.strokeStyle='#c9a15a';g.lineWidth=6;g.strokeRect(10,10,w-20,h-20);g.lineWidth=2;g.strokeRect(26,26,w-52,h-52);speck(g,w,h,300,.2);}));
  std('wood',0x5b3f2a,.6);std('woodL',0x8d6a45,.65);std('fabric',0x6e4c3c,1);std('fabricB',0x44586e,1);std('cloth',0xddd6c6,1);
  std('metal',0x8d9094,.4,.8);std('black',0x131313,.5);std('white',0xe9e5db,.6);std('brass',0xb28f3d,.35,.8);std('paper',0xd8ccae,.9);std('ceramic',0xe8e8e4,.25);
  std('book1',0x6a2a2a,.8);std('book2',0x2a4a5a,.8);std('book3',0x55552a,.8);std('iron',0x1b1b1d,.5,.6);std('fence',0x77746b,.9);std('candle',0xe8dfc8,.8);
  std('mirror',0xbfc8d4,.05,.95);std('leaf',0x213c24,.9,0,null,{flatShading:true});
  std('shade',0xf2d9a0,.8,0,null,{emissive:0xffc477,emissiveIntensity:.35});
  std('glass',0xa8c0dc,.1,0,null,{transparent:true,opacity:.3,emissive:0x1b2a46,emissiveIntensity:.6,depthWrite:false});
  std('roofm',0xffffff,.9,0,mkTex(T,T,(g,w,h)=>{g.fillStyle='#4a2b25';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=h/8){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y,w,3);}speck(g,w,h,500,.2,3);}));
  const gt=mkTex(T,T,(g,w,h)=>{g.fillStyle='#2c3b22';g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle='hsl('+rnd(85,115)+','+rnd(25,40)+'%,'+rnd(12,24)+'%)';g.fillRect(rnd(0,w),rnd(0,h),rnd(1,3),rnd(2,6));}});
  gt.repeat.set(140,140);std('grass',0xffffff,1,0,gt);
  const rt=mkTex(T,T,(g,w,h)=>{g.fillStyle='#24262b';g.fillRect(0,0,w,h);speck(g,w,h,900,.25,2);});rt.repeat.set(160,2);std('road',0xffffff,.95,0,rt);
  std('bark',0x3b2e22,1);
}

/* ================= MERGE STATIC GEOMETRY ================= */
const unitBox=new THREE.BoxGeometry(1,1,1);
class Merge{
  constructor(){this.b={};this.tr=null;}
  push(x,y,z,ry){this.tr={x,y,z,c:Math.cos(ry),s:Math.sin(ry)};}
  pop(){this.tr=null;}
  box(m,w,h,d,x,y,z,ry){
    const B=this.b[m]||(this.b[m]={p:[],n:[],u:[],i:[]}),pa=unitBox.attributes.position.array,na=unitBox.attributes.normal.array,ua=unitBox.attributes.uv.array,ix=unitBox.index.array;
    const base=B.p.length/3,cs=Math.cos(ry||0),sn=Math.sin(ry||0),T=this.tr;
    for(let i=0;i<24;i++){
      const f=(i/4)|0,dm=f<2?[d,h]:f<4?[w,d]:[w,h];
      let px=pa[i*3]*w,py=pa[i*3+1]*h,pz=pa[i*3+2]*d,nx=na[i*3],ny=na[i*3+1],nz=na[i*3+2],qx,qz;
      qx=px*cs+pz*sn;qz=-px*sn+pz*cs;px=qx;pz=qz;qx=nx*cs+nz*sn;qz=-nx*sn+nz*cs;nx=qx;nz=qz;
      px+=x;py+=y+h/2;pz+=z;
      if(T){qx=px*T.c+pz*T.s;qz=-px*T.s+pz*T.c;px=qx+T.x;pz=qz+T.z;py+=T.y;qx=nx*T.c+nz*T.s;qz=-nx*T.s+nz*T.c;nx=qx;nz=qz;}
      B.p.push(px,py,pz);B.n.push(nx,ny,nz);B.u.push(ua[i*2]*dm[0]/2,ua[i*2+1]*dm[1]/2);
    }
    for(let i=0;i<ix.length;i++)B.i.push(ix[i]+base);
  }
  finish(parent){
    for(const k in this.b){const B=this.b[k],g=new THREE.BufferGeometry();
      g.setAttribute('position',new THREE.Float32BufferAttribute(B.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(B.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(B.u,2));g.setIndex(B.i);
      const m=new THREE.Mesh(g,M[k]);m.castShadow=k!=='glass';m.receiveShadow=true;parent.add(m);}
    this.b={};
  }
}
let MG;const COL=[];let CF=1;
const addCol=(x1,z1,x2,z2,f,id)=>COL.push({x1,z1,x2,z2,f:f===undefined?CF:f,id});
const b=(m,w,h,d,x,y,z,ry)=>MG.box(m,w,h,d,x,y,z,ry||0);
function col(x,z,w,d){const T=MG.tr;if(!T){addCol(x-w/2,z-d/2,x+w/2,z+d/2);return;}
  let a=1e9,c=-1e9,e=1e9,f=-1e9;
  for(const sx of[-1,1])for(const sz of[-1,1]){const lx=x+sx*w/2,lz=z+sz*d/2,wx=T.x+lx*T.c+lz*T.s,wz=T.z-lx*T.s+lz*T.c;a=Math.min(a,wx);c=Math.max(c,wx);e=Math.min(e,wz);f=Math.max(f,wz);}
  addCol(a,e,c,f);}
function place(x,y,z,ry,fn){MG.push(x,y,z,ry);fn();MG.pop();}

/* ================= OBJEK INTERAKTIF ================= */
const OB={};
function reg(id,type,x,y,z,o){OB[id]=Object.assign({id,type,p:new V3(x,y,z),s:{},r:2.1},o||{});return OB[id];}
function hasItem(n){return G.inv.indexOf(n)>=0;}
const dynGroup=()=>{const g=new THREE.Group();scene.add(g);return g;};
let DYN;
function wall(ax,az,bx,bz,y0,h,f,mat,gaps,out){
  gaps=gaps||[];const alongX=Math.abs(bz-az)<1e-6,a=alongX?ax:az,e=alongX?bx:bz,fix=alongX?az:ax;
  const gs=gaps.map(g=>[g[0]-g[1]/2,g[0]+g[1]/2]).sort((p,q)=>p[0]-q[0]);let cur=a;const segs=[];
  for(const g of gs){if(g[0]>cur)segs.push([cur,g[0]]);cur=g[1];}if(e>cur)segs.push([cur,e]);
  const seg=(s,t,yy,hh,c)=>{const L=t-s,m=(s+t)/2;
    if(alongX){b(mat,L,hh,.2,m,yy,fix);if(out)b('ext',L,hh,.05,m,yy,fix+out*.125);if(c)addCol(s,fix-.1,t,fix+.1,f);}
    else{b(mat,.2,hh,L,fix,yy,m);if(out)b('ext',.05,hh,L,fix+out*.125,yy,m);if(c)addCol(fix-.1,s,fix+.1,t,f);}};
  segs.forEach(s=>seg(s[0],s[1],y0,h,true));gs.forEach(g=>seg(g[0],g[1],y0+2.1,h-2.1,false));
}
function win(x,y0,z,axis,w,h,n){w=w||1.1;h=h||1.3;const sy=y0+.95;
  if(axis==='x'){b('white',w+.16,.08,.26,x,sy-.08,z);b('white',w+.16,.08,.26,x,sy+h,z);b('white',.08,h+.08,.26,x-w/2-.04,sy-.04,z);b('white',.08,h+.08,.26,x+w/2+.04,sy-.04,z);b('white',.04,h,.27,x,sy,z);b('glass',w,h,.22,x,sy,z);
    b('fabric',.3,h+.2,.06,x-w/2-.2,sy-.1,z+n*.16);b('fabric',.3,h+.2,.06,x+w/2+.2,sy-.1,z+n*.16);}
  else{b('white',.26,.08,w+.16,x,sy-.08,z);b('white',.26,.08,w+.16,x,sy+h,z);b('white',.26,h+.08,.08,x,sy-.04,z-w/2-.04);b('white',.26,h+.08,.08,x,sy-.04,z+w/2+.04);b('white',.27,h,.04,x,sy,z);b('glass',.22,h,w,x,sy,z);
    b('fabric',.06,h+.2,.3,x+n*.16,sy-.1,z-w/2-.2);b('fabric',.06,h+.2,.3,x+n*.16,sy-.1,z+w/2+.2);}}
const SW=[[0,0],[1,-1],[-1,-1],[1,1],[-1,1]].slice(1);
const corners=[[-1,-1],[1,-1],[-1,1],[1,1]];
function table(x,y,z,ry,w,d,h){place(x,y,z,ry,()=>{b('wood',w,.05,d,0,h-.05,0);corners.forEach(c=>b('wood',.06,h-.05,.06,c[0]*(w/2-.06),0,c[1]*(d/2-.06)));col(0,0,w,d);});}
function chair(x,y,z,ry){place(x,y,z,ry,()=>{b('woodL',.42,.04,.42,0,.44,0);b('woodL',.42,.5,.04,0,.48,-.19);corners.forEach(c=>b('woodL',.04,.44,.04,c[0]*.18,0,c[1]*.18));col(0,0,.45,.45);});}
function sofa(x,y,z,ry,len,m){m=m||'fabric';place(x,y,z,ry,()=>{b(m,len,.42,.9,0,0,0);b(m,len,.5,.22,0,.42,-.34);b(m,.22,.3,.9,-len/2+.11,.42,0);b(m,.22,.3,.9,len/2-.11,.42,0);b(m,len-.5,.14,.5,0,.42,.1);col(0,0,len,.9);});}
function bed(x,y,z,ry){place(x,y,z,ry,()=>{b('wood',1.5,.3,2.05,0,0,0);b('cloth',1.4,.2,1.95,0,.3,0);b('fabricB',1.42,.08,1.2,0,.5,.35);b('cloth',.5,.12,.3,-.35,.5,-.8);b('cloth',.5,.12,.3,.35,.5,-.8);b('wood',1.6,.9,.08,0,0,-1.05);col(0,0,1.55,2.1);});}
function shelf(x,y,z,ry,w,h){place(x,y,z,ry,()=>{b('wood',.04,h,.35,-w/2+.02,0,0);b('wood',.04,h,.35,w/2-.02,0,0);b('wood',w,h,.03,0,0,-.16);
  for(let i=0;i<=4;i++)b('wood',w,.03,.35,0,.05+i*(h-.1)/4,0);
  for(let i=0;i<4;i++){let xx=-w/2+.1;const yy=.08+i*(h-.1)/4;while(xx<w/2-.15){const bw=rnd(.03,.07);b('book'+(1+(Math.random()*3|0)),bw,rnd(.2,.3),.2,xx,yy,0);xx+=bw+.012;}}col(0,0,w,.4);});}
function counter(x,y,z,ry,w,d){place(x,y,z,ry,()=>{b('woodL',w,.85,d,0,0,0);b('stone',w+.02,.05,d+.03,0,.85,0);col(0,0,w,d);});}
function cabinet(x,y,z,ry,w,h,d){place(x,y,z,ry,()=>{b('wood',w,h,d,0,0,0);b('woodL',w-.06,h-.1,.02,0,.05,d/2);b('brass',.03,.12,.03,0,h*.5,d/2+.02);col(0,0,w,d);});}
function lamp(x,y,z){place(x,y,z,0,()=>{b('brass',.12,.05,.12,0,0,0);b('brass',.04,.28,.04,0,.05,0);b('shade',.26,.2,.26,0,.33,0);});}
function plates(x,y,z){b('ceramic',.22,.015,.22,x,y,z);b('ceramic',.22,.015,.22,x+.3,y,z+.05);b('ceramic',.06,.1,.06,x+.12,y,z+.25);b('ceramic',.06,.1,.06,x+.22,y,z+.25);}
function drawerUnit(id,x,y,z,ry,w,h,d){
  place(x,y,z,ry,()=>{b('wood',w,h,d-.04,0,0,-.02);b('woodL',w+.02,.03,d+.02,0,h,0);b('woodL',w-.06,h*.5,.03,0,.04,d/2-.01);col(0,0,w,d);});
  const s=Math.sin(ry),c=Math.cos(ry),g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;DYN.add(g);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(w-.08,h*.28,.04),M.woodL);fr.castShadow=true;fr.position.set(0,h*.72,d/2);g.add(fr);
  const hd=new THREE.Mesh(new THREE.BoxGeometry(.14,.025,.03),M.brass);hd.position.set(0,0,.03);fr.add(hd);
  const tr=new THREE.Mesh(new THREE.BoxGeometry(w-.12,.1,.34),M.black);tr
  .position.set(0,-.03,-.19);fr.add(tr);
  const lz=d/2+.2,o=reg(id,'drawer',x+lz*s,y+h*.72,z+lz*c,{front:fr,d});
  o.upd=dt=>{const t=d/2+(o.s.o?.32:0);fr.position.z=lerp(fr.position.z,t,Math.min(1,dt*8));};
  return{x:x+(d/2+.17)*s,y:y+h*.72+.07,z:z+(d/2+.17)*c};
}
function door(id,cx,cz,w,y0,axis,sw){
  const hx=axis==='x'?cx-w/2:cx,hz=axis==='x'?cz:cz-w/2,a0=axis==='x'?0:-Math.PI/2;
  const piv=new THREE.Group();piv.position.set(hx,y0,hz);piv.rotation.y=a0;DYN.add(piv);
  const p=new THREE.Mesh(new THREE.BoxGeometry(w-.04,2.06,.05),id==='d_front'||id==='d_forbid'?M.wood:M.woodL);p.position.set(w/2,1.03,0);p.castShadow=true;piv.add(p);
  [.04,-.04].forEach(zz=>{const hd=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),M.brass);hd.position.set(w-.12,1.0,zz*1.6);piv.add(hd);});
  const f=y0>2?2:1;if(axis==='x')addCol(cx-w/2,cz-.12,cx+w/2,cz+.12,f,id);else addCol(cx-.12,cz-w/2,cx+.12,cz+w/2,f,id);
  const o=reg(id,'door',cx,y0+1.1,cz,{cur:a0,r:2.4});
  o.upd=dt=>{const t=o.s.o?a0+sw*1.55:a0;o.cur=lerp(o.cur,t,Math.min(1,dt*5));piv.rotation.y=o.cur;};
}
function pickMesh(item){const g=new THREE.Group(),em=(c,i)=>new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.5,emissive:c,emissiveIntensity:i||.25});
  const add=(geo,m,x,y,z,rx,rz)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;if(rz)o.rotation.z=rz;o.castShadow=true;g.add(o);return o;};
  if(item==='fuse'){add(new THREE.CylinderGeometry(.025,.025,.1,10),em(0xdddddd,.3),0,.03,0,0,Math.PI/2);add(new THREE.CylinderGeometry(.03,.03,.02,10),em(0xb28f3d),.05,.03,0,0,Math.PI/2);add(new THREE.CylinderGeometry(.03,.03,.02,10),em(0xb28f3d),-.05,.03,0,0,Math.PI/2);}
  else if(item==='photo'){const m=add(new THREE.BoxGeometry(.13,.006,.09),em(0xd8ccae,.35),0,.01,0);m.rotation.y=rnd(0,TAU);add(new THREE.BoxGeometry(.11,.007,.07),em(0x554433,.2),0,.011,0).rotation.y=m.rotation.y;}
  else if(item==='tape'){add(new THREE.BoxGeometry(.1,.016,.065),em(0x222222,.3),0,.01,0);add(new THREE.CylinderGeometry(.014,.014,.018,10),em(0xffffff,.4),-.025,.012,0);add(new THREE.CylinderGeometry(.014,.014,.018,10),em(0xffffff,.4),.025,.012,0);}
  else{const c=item==='key_storage'?0xaaaaaa:0xd9b34a;add(new THREE.TorusGeometry(.025,.008,6,12),em(c,.5),-.05,.012,0,Math.PI/2);add(new THREE.BoxGeometry(.09,.008,.01),em(c,.5),.01,.012,0);add(new THREE.BoxGeometry(.01,.008,.025),em(c,.5),.045,.012,.01);}
  return g;}
function pick(id,item,x,y,z,hidden){const g=pickMesh(item);g.position.set(x,y,z);DYN.add(g);
  const o=reg(id,'pick',x,y+.1,z,{item,g,by:y,r:2.1});if(hidden)o.s.v=0;
  o.upd=()=>{const vis=o.s.g!==1&&o.s.v!==0;g.visible=vis;if(vis){g.rotation.y+=.01;g.position.y=o.by+Math.sin(G.t*2+x)*.008;}};return o;}
function swPlate(id,x,y,z,ry){const m=new THREE.Mesh(new THREE.BoxGeometry(.09,.13,.02),M.white);m.position.set(x,y,z);m.rotation.y=ry;DYN.add(m);
  const l=new THREE.Mesh(new THREE.BoxGeometry(.025,.05,.02),M.black);l.position.z=.012;m.add(l);reg(id,'switch',x,y,z,{r:1.9});}
function drawFamily(g,w,h,morph){g.fillStyle='#b9a98a';g.fillRect(0,0,w,h);g.fillStyle='rgba(60,40,20,.25)';g.fillRect(0,0,w,h);
  [.2,.4,.6,.8].forEach((fx,i)=>{const x=fx*w,y=h*.42;g.fillStyle='#3a3a44';g.fillRect(x-w*.07,y+h*.14,w*.14,h*.5);g.fillStyle='#d9b99a';
    if(morph&&i===3){g.beginPath();g.ellipse(x,y+6,w*.05,h*.2,0,0,TAU);g.fill();g.fillStyle='#000';g.beginPath();g.ellipse(x-w*.02,y,w*.012,h*.04,0,0,TAU);g.ellipse(x+w*.02,y,w*.012,h*.04,0,0,TAU);g.fill();g.fillRect(x-w*.02,y+h*.1,w*.04,h*.02);}
    else{g.beginPath();g.arc(x,y,w*.06,0,TAU);g.fill();g.fillStyle='#222';g.fillRect(x-w*.025,y-h*.02,w*.012,h*.02);g.fillRect(x+w*.013,y-h*.02,w*.012,h*.02);}});}
function picture(x,y,z,ry,w,h,morph){const c=document.createElement('canvas');c.width=256;c.height=Math.round(256*h/w);const g=c.getContext('2d');drawFamily(g,c.width,c.height,morph);
  const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;const grp=new THREE.Group();grp.position.set(x,y,z);grp.rotation.y=ry;DYN.add(grp);
  const fr=new THREE.Mesh(new THREE.BoxGeometry(w+.1,h+.1,.04),M.wood);grp.add(fr);const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:t,roughness:.8}));pl.position.z=.025;grp.add(pl);
  return{redraw:m=>{drawFamily(g,c.width,c.height,m);t.needsUpdate=true;}};}
const tvc=document.createElement('canvas');tvc.width=64;tvc.height=40;const tvg=tvc.getContext('2d'),tvt=new THREE.CanvasTexture(tvc);let tvAcc=0;
function tvDraw(on){if(!on){tvg.fillStyle='#050608';tvg.fillRect(0,0,64,40);}else{const im=tvg.createImageData(64,40);for(let i=0;i<im.data.length;i+=4){const v=Math.random()*255|0;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=Math.min(255,v*1.05);im.data[i+3]=255;}tvg.putImageData(im,0,0);}tvt.needsUpdate=true;}
let clock,photoFrame;
function makeClock(x,y,z,ry){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;DYN.add(g);
  const f=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.05,24),M.white);f.rotation.x=Math.PI/2;g.add(f);g.add(new THREE.Mesh(new THREE.TorusGeometry(.25,.02,8,24),M.wood));
  const mk=(len,wd)=>{const p=new THREE.Group(),m=new THREE.Mesh(new THREE.BoxGeometry(wd,len,.01),M.black);m.position.y=len/2-.02;p.add(m);p.position.z=.035;g.add(p);return p;};
  const hp=mk(.12,.02),mp=mk(.18,.014);return{set:(h,m)=>{hp.rotation.z=-((h%12)+m/60)/12*TAU;mp.rotation.z=-m/60*TAU;}};}

/* ================= RUMAH & LINGKUNGAN ================= */
const ROOMS=[
  {id:'living',sw:'sw_living',p:[-3,2.5,2.8],base:1},{id:'family',sw:'sw_family',p:[2,2.5,2.8],base:1},
  {id:'kitchen',sw:'sw_kitchen',p:[-4,2.5,-2.2],base:1},{id:'dining',sw:'sw_dining',p:[0,2.5,-2.2],base:1},
  {id:'storage',p:[4,2.5,-3.5],base:.6},{id:'stairs',p:[5,2.7,2],base:.5},
  {id:'hall2',sw:'sw_hall2',p:[0,5.5,-1.5],base:.9},{id:'arga',sw:'sw_arga',p:[-3.5,5.5,2.2],base:1},
  {id:'guest',sw:'sw_guest',p:[1.5,5.5,2.2],base:1},{id:'forbid',p:[-3.5,5.4,-3.7],base:.9,c:0xff9a60}
];
function buildHouse(){
  MG=new Merge();DYN=dynGroup();CF=1;
  b('planks',12.4,.15,10.4,0,0,0);b('tile',4,.01,5.5,-4,.15,-2.25);b('tile',2,.01,2.5,3,.15,-.75);b('stone',4,.01,3,4,.15,-3.5);
  b('planks',10.1,.1,10.2,-1.05,2.9,0);b('planks',2.1,.1,4.6,5.05,2.9,-2.8);b('planks',6.2,.1,2,-3,2.9,6.1);
  b('wallpaper',10,.02,10,-1,2.88,0);b('wallpaper',12.2,.1,10.2,0,5.8,0);
  wall(-6,5,6,5,0,2.9,1,'wallpaper',[[-3,1.2]],1);wall(-6,-5,6,-5,0,2.9,1,'wallpaper',[],-1);wall(-6,-5,-6,5,0,2.9,1,'wallpaper',[],-1);wall(6,-5,6,5,0,2.9,0,'wallpaper',[],1);
  wall(0,.5,0,5,0,2.9,1,'wallpaper',[[3,1.2]]);wall(-6,.5,4,.5,0,2.9,1,'wallpaper',[[-4,1.2],[1,1.2]]);wall(-2,-5,-2,.5,0,2.9,1,'wallpaper',[[-2,1.2]]);
  wall(2,-5,2,.5,0,2.9,1,'wallpaper',[[-3.5,.9],[-.8,.9]]);wall(2,-2,6,-2,0,2.9,1,'wallpaper',[]);wall(4,-2,4,5,0,2.9,1,'wallpaper',[[4.35,1.1]]);wall(4,-.5,6,-.5,0,2.9,1,'wallpaper',[]);
  CF=2;
  wall(-6,5,6,5,3,2.8,2,'wallpaper',[[-3,1]],1);wall(-6,-5,6,-5,3,2.8,2,'wallpaper',[],-1);wall(-6,-5,-6,5,3,2.8,2,'wallpaper',[],-1);wall(6,-5,6,5,3,2.8,2,'wallpaper',[],1);
  wall(-6,-.5,4,-.5,3,2.8,2,'wallpaper',[[-3.5,.9],[1.5,.9]]);wall(-1,-.5,-1,5,3,2.8,2,'wallpaper',[]);wall(4,-.5,4,5,3,2.8,2,'wallpaper',[]);
  wall(-6,-2.5,6,-2.5,3,2.8,2,'wallpaper',[[-3.5,.9]]);wall(-1,-5,-1,-2.5,3,2.8,2,'wallpaper',[]);
  b('wood',6.2,.06,.06,-3,4,7.1);b('wood',6.2,.06,.06,-3,3.1,7.1);b('wood',.06,.06,2,-6.05,4,6.1);b('wood',.06,.06,2,.05,4,6.1);
  for(let i=0;i<=12;i++)b('wood',.05,.9,.05,-6+i*.5,3,7.1);addCol(-6.1,7.05,.1,7.15,2);addCol(-6.1,5,-6,7.1,2);addCol(0,5,.1,7.1,2);
  for(let i=0;i<15;i++)b('wood',1.7,.15+(i+1)*.19,.34,5,0,4.6-(i+.5)*.34);
  win(-1.2,.15,5,'x',1.2,1.3,-1);win(-5,.15,5,'x',1.1,1.3,-1);win(2.2,.15,5,'x',1.2,1.3,-1);win(-4,.15,-5,'x',1.1,1.3,1);win(1.2,.15,-5,'x',1.1,1.3,1);
  win(-6,.15,-2.7,'z',1.1,1.3,1);win(-6,3,-1.5,'z',.9,1.4,1);win(-5,3,5,'x',1.1,1.3,-1);win(-6,3,2.2,'z',1.1,1.3,1);win(.2,3,5,'x',1.1,1.3,-1);win(6,2,1.5,'z',1,1.3,-1);
  // Ruang tamu
  CF=1;const F1=.15,F2=3;
  b('rug',3,.01,2.2,-3.3,F1,2.4);sofa(-3.3,F1,1.25,0,2.1);table(-3.3,F1,2.55,0,1.1,.6,.42);shelf(-5.75,F1,3.6,Math.PI/2,1.2,1.9);
  sofa(-.9,F1,3.9,-Math.PI/2,1.1,'fabricB');cabinet(-.6,F1,1.1,Math.PI,.5,.6,.4);lamp(-.6,F1+.6,1.1);
  // Ruang keluarga
  b('rug',2.6,.01,2,2,F1,3.2);cabinet(2,F1,.85,0,1.5,.5,.45);b('black',1.1,.6,.06,2,.7,.88);b('black',.4,.04,.2,2,.65,.9);
  sofa(2,F1,3.6,Math.PI,2.2);cabinet(3.55,F1,1.7,-Math.PI/2,.9,.8,.4);lamp(3.55,F1+.8,1.7);
  // Dapur
  counter(-5.65,F1,-4.1,Math.PI/2,.6,.75);b('white',.7,1.8,.7,-5.6,F1,-4.55,0);b('black',.03,.5,.03,-5.2,F1+.9,-4.4);
  counter(-5.65,F1,-3.45,Math.PI/2,.6,.6);b('black',.4,.02,.4,-5.6,F1+.9,-3.45);b('metal',.22,.14,.22,-5.6,F1+.92,-3.4);
  counter(-5.65,F1,-2.6,Math.PI/2,.6,1);plates(-5.75,F1+.9,-2.8);counter(-5.65,F1,-1.7,Math.PI/2,.6,.9);b('metal',.45,.03,.4,-5.62,F1+.9,-1.7);b('metal',.03,.2,.03,-5.85,F1+.9,-1.7);
  b('wood',.35,.7,2.6,-5.78,1.5,-2.7);table(-3.6,F1,-2.6,0,1.1,.8,.75);chair(-3.6,F1,-3.3,0);chair(-3.6,F1,-1.9,Math.PI);plates(-3.9,F1+.75,-2.6);
  // Ruang makan
  b('rug',2.4,.01,1.6,0,F1,-2.2);table(0,F1,-2.2,0,2,1,.76);[-.6,.6].forEach(xx=>{chair(xx,F1,-3.0,0);chair(xx,F1,-1.4,Math.PI);});plates(-.7,F1+.76,-2.4);plates(.1,F1+.76,-2.0);
  cabinet(.4,F1,-4.7,0,1.2,1.9,.4);b('metal',.4,.5,.1,-1.2,1.2,-4.85);
  // Kamar mandi
  place(3.65,F1,-1.4,-Math.PI/2,()=>{b('ceramic',.4,.4,.4,0,0,0);b('ceramic',.4,.5,.15,0,.4,-.2);col(0,0,.45,.5);});
  b('mirror',.6,.7,.03,3,1.3,.38);b('ceramic',.5,.12,.4,3,.85,.3);
  // Gudang
  shelf(4,F1,-4.75,0,2.4,1.9);b('woodL',.6,.5,.6,5.3,F1,-3);b('woodL',.5,.4,.5,5.35,F1+.5,-3);b('woodL',.6,.5,.6,3.4,F1,-2.5);col(5.3,-3,.7,.7);col(3.4,-2.5,.7,.7);
  // Lantai 2: lorong
  CF=2;b('rug',9,.01,1,-1,F2,-1.5);table(1,F2,-2.25,0,1.2,.35,.8);lamp(.6,F2+.8,-2.25);
  [-5,-2,2.4,4.8].forEach((xx,i)=>{b('woodL',.5,.6,.04,xx,4.4,-2.38);b('paper',.4,.5,.045,xx,4.45,-2.38);});
  // Kamar Arga
  b('rug',2.4,.01,1.8,-3.5,F2,2.4);bed(-4.9,F2,2.3,Math.PI/2);cabinet(-1.8,F2,-.1,0,1.2,1.9,.6);
  // Kamar tamu
  bed(2.5,F2,3.9,Math.PI);cabinet(3.7,F2,1.8,-Math.PI/2,1.3,1.9,.6);
  // Kamar terlarang
  table(-3.5,F2,-4.3,0,1.4,.7,.8);b('candle',.06,.18,.06,-4.1,F2+.8,-4.3);b('candle',.06,.14,.06,-2.9,F2+.8,-4.3);b('black',.3,.06,.2,-3.1,F2+.8,-4.6);
  for(let i=0;i<8;i++)b('woodL',.35,.45,.03,-5.7+i*.65,4.4,-4.9);
  shelf(-5.7,F2,-3.8,Math.PI/2,1.4,1.7);b('black',.35,.14,.22,-5.55,F2+1.05,-3.8);
  // Balkon
  table(-4.2,F2,6.2,0,.8,.6,.7);chair(-4.9,F2,6.2,Math.PI/2);chair(-3.5,F2,6.2,-Math.PI/2);
  // Atap
  const roof=new THREE.Mesh(new THREE.ConeGeometry(8.8,3.2,4),M.roofm);roof.rotation.y=Math.PI/4;roof.scale.set(1.08,1,.92);roof.position.y=7.4;roof.castShadow=true;scene.add(roof);
  b('ext',.9,2,.9,3,5.8,-2);
  MG.finish(scene);
  // Pintu
  door('d_front',-3,5,1.2,.15,'x',1);door('d_bath',2,-.8,.9,.15,'z',1);door('d_storage',2,-3.5,.9,.15,'z',1);
  door('d_arga',-3.5,-.5,.9,3,'x',-1);door('d_guest',1.5,-.5,.9,3,'x',-1);door('d_forbid',-3.5,-2.5,.9,3,'x',1);door('d_balc',-3,5,1,3,'x',-1);
  // Laci & item
  let d=drawerUnit('dr_k1',-5.65,F1,-.8,Math.PI/2,.8,.9,.6);pick('it_fuse','fuse',d.x,d.y,d.z,true);
  d=drawerUnit('dr_l1',-5.6,F1,1.8,Math.PI/2,1.2,.9,.5);pick('it_ph1','photo',d.x,d.y,d.z,true);
  d=drawerUnit('dr_b1',3,F1,.2,Math.PI,.8,.8,.5);pick('it_keyst','key_storage',d.x,d.y,d.z,true);
  d=drawerUnit('dr_a1',-1.8,F2,4.65,Math.PI,1,.75,.55);pick('it_k1','key_brass',d.x,d.y,d.z,true);
  d=drawerUnit('dr_g1',1.3,F2,4.65,Math.PI,.5,.55,.4);pick('it_k2','key_brass',d.x,d.y,d.z,true);
  pick('it_ph2','photo',1.6,.68,.95);pick('it_ph3','photo',-4.2,F2+.72,6.2);pick('it_tape','tape',3.6,F1+.78,-4.7);pick('it_k3','key_brass',1.3,F2+.82,-2.25,true);
  // Saklar
  swPlate('sw_living',-2,1.3,4.88,Math.PI);swPlate('sw_family',.12,1.3,1.5,Math.PI/2);swPlate('sw_kitchen',-2.14,1.3,-3.6,-Math.PI/2);swPlate('sw_dining',1.88,1.3,-2.4,Math.PI/2);
  swPlate('sw_hall2',3,4.3,-.62,Math.PI);swPlate('sw_arga',-2.7,4.3,-.38,0);swPlate('sw_guest',2.5,4.3,-.38,0);
  // Breaker, TV, buku, catatan, lukisan
  reg('breaker','breaker',-1.2,1.45,-4.7,{});
  const tv=new THREE.Mesh(new THREE.PlaneGeometry(.98,.54),new THREE.MeshBasicMaterial({map:tvt}));tv.position.set(2,1,.915);DYN.add(tv);tvDraw(false);reg('tv','tv',2,1,1.2,{r:2.6});
  const bk=new THREE.Mesh(new THREE.BoxGeometry(.3,.06,.22),M.fabric);bk.position.set(-3.5,F2+.83,-4.2);DYN.add(bk);reg('book','book',-3.5,F2+.9,-4.2,{});
  const note=(id,x,y,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(.2,.28),new THREE.MeshStandardMaterial({color:0xd8ccae,roughness:1}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);DYN.add(m);reg(id,'note',x,y+.05,z,{r:2});};
  note('note_k',-3.6,F1+.76,-2.6);note('note_a',-1.8,F2+.77,4.4);
  picture(-4.4,1.6,.62,0,1.2,.8,true);reg('painting','photo',-4.4,1.6,1.0,{r:2.4});
  const pf=picture(-1.2,1.6,.62,0,.5,.4,false);photoFrame=pf;reg('photoFrame','photo',-1.2,1.6,1.0,{r:2.4});
  clock=makeClock(-5.87,1.95,2.7,Math.PI/2);clock.set(23,40);
  winGlow=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.3),new THREE.MeshBasicMaterial({color:0xffc06a}));winGlow.position.set(-5,4.1,5.13);winGlow.visible=false;scene.add(winGlow);
}
function addFence(x1,z1,x2,z2,gaps){
  const alongX=Math.abs(z2-z1)<1e-6,a=alongX?x1:z1,e=alongX?x2:z2,fix=alongX?z1:x1,gs=(gaps||[]).map(g=>[g[0]-g[1]/2,g[0]+g[1]/2]);let cur=a;const segs=[];
  gs.forEach(g=>{if(g[0]>cur)segs.push([cur,g[0]]);cur=g[1];});if(e>cur)segs.push([cur,e]);
  segs.forEach(s=>{const L=s[1]-s[0],m=(s[0]+s[1])/2;
    if(alongX){b('fence',L,.05,.04,m,.35,fix);b('fence',L,.05,.04,m,1,fix);for(let x=s[0];x<=s[1];x+=.24)b('fence',.06,1.1,.02,x,0,fix);for(let x=s[0];x<=s[1];x+=2)b('fence',.12,1.25,.12,x,0,fix);addCol(s[0],fix-.08,s[1],fix+.08,0);}
    else{b('fence',.04,.05,L,fix,.35,m);b('fence',.04,.05,L,fix,1,m);for(let z=s[0];z<=s[1];z+=.24)b('fence',.02,1.1,.06,fix,0,z);for(let z=s[0];z<=s[1];z+=2)b('fence',.12,1.25,.12,fix,0,z);addCol(fix-.08,s[0],fix+.08,s[1],0);}});}
function makeTree(x,z,s){const g=new THREE.Group();g.position.set(x,0,z);const t=new THREE.Mesh(new THREE.CylinderGeometry(.22*s,.38*s,4*s,8),M.bark);t.position.y=2*s;t.castShadow=true;g.add(t);
  for(let i=0;i<5;i++){const l=new THREE.Mesh(new THREE.IcosahedronGeometry((1.3+rnd(0,.6))*s,1),M.leaf);l.position.set(rnd(-1,1)*s,(4+rnd(-.2,1.2))*s,rnd(-1,1)*s);l.castShadow=true;g.add(l);}
  scene.add(g);addCol(x-.5*s,z-.5*s,x+.5*s,z+.5*s,0);}
function makeCar(){const g=new THREE.Group(),paint=new THREE.MeshStandardMaterial({color:0x4f6b63,roughness:.55,metalness:.4});
  const mm=(geo,mat,x,y,z)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;g.add(o);return o;};
  mm(new THREE.BoxGeometry(4.2,.7,1.8),paint,0,.65,0);mm(new THREE.BoxGeometry(2.3,.6,1.7),M.glass,-.3,1.3,0);mm(new THREE.BoxGeometry(2.4,.06,1.8),paint,-.3,1.63,0);
  [[-1.4,-.82],[-1.4,.82],[.8,-.82],[.8,.82]].forEach(p=>mm(new THREE.BoxGeometry(.06,.6,.06),paint,p[0],1.3,p[1]));
  [[-1.3,-.9],[-1.3,.9],[1.3,-.9],[1.3,.9]].forEach(p=>{const w=mm(new THREE.CylinderGeometry(.34,.34,.25,14),M.black,p[0],.34,p[1]);w.rotation.x=Math.PI/2;});
  [-.6,.6].forEach(z=>{mm(new THREE.SphereGeometry(.12,8,6),new THREE.MeshBasicMaterial({color:0xfff2b0}),2.1,.75,z);mm(new THREE.SphereGeometry(.1,8,6),new THREE.MeshBasicMaterial({color:0x992222}),-2.1,.75,z);});
  mm(new THREE.BoxGeometry(.2,.15,1.9),M.metal,2.15,.4,0);mm(new THREE.BoxGeometry(.2,.15,1.9),M.metal,-2.15,.4,0);
  mm(new THREE.BoxGeometry(.5,.6,1.5),M.black,-.9,.85,0);mm(new THREE.BoxGeometry(.4,.4,.55),M.black,.35,.75,-.4);mm(new THREE.BoxGeometry(.4,.4,.55),M.black,.35,.75,.4);
  const ppl=new THREE.Group();g.add(ppl);const a=makeHuman(CHAR.arga),r=makeHuman(CHAR.raka);
  [[a,-.4],[r,.4]].forEach(p=>{p[0].g.position.set(.35,.5,p[1]);p[0].g.rotation.y=Math.PI/2;ppl.add(p[0].g);p[0].anim=3;p[0].ph=0;poseHuman(p[0],3,1);});
  g.userData.ppl=ppl;g.userData.hum=[a,r];return g;}
function buildWorld(){
  const gm=new THREE.Mesh(new THREE.PlaneGeometry(400,400),M.grass);gm.rotation.x=-Math.PI/2;gm.receiveShadow=true;scene.add(gm);
  const rd=new THREE.Mesh(new THREE.PlaneGeometry(400,6),M.road);rd.rotation.x=-Math.PI/2;rd.position.set(0,.02,22);rd.receiveShadow=true;scene.add(rd);
  MG=new Merge();CF=0;
  for(let x=-60;x<60;x+=6)b('white',2,.01,.15,x,.03,22);
  for(let z=5.6;z<16;z+=1)b('stone',1.3,.06,.9,-3+rnd(-.12,.12),0,z);
  addFence(-14,16,14,16,[[-3,2.4]]);addFence(-14,5,-14,16);addFence(14,5,14,16);addFence(-14,5,-6.1,5);addFence(6.1,5,14,5);
  b('stone',.4,2.3,.4,-4.4,0,16);b('stone',.4,2.3,.4,-1.6,0,16);b('iron',3.2,.12,.12,-3,2.1,16);addCol(-4.6,15.8,-4.2,16.2,0);addCol(-1.8,15.8,-1.4,16.2,0);
  [[-4.1,1],[-1.9,1]].forEach(g=>{b('iron',.04,.06,1.2,g[0],.4,15.4);b('iron',.04,.06,1.2,g[0],1.3,15.4);for(let i=0;i<6;i++)b('iron',.03,1.5,.03,g[0],0,14.85+i*.22);});
  for(let x=-60;x<60;x+=4)if(Math.abs(x)>1)b('stone',.5,.3,.5,x,0,18.4);
  [[-4.6,8],[-1.4,12],[-4.6,14.6]].forEach(p=>{b('iron',.08,2.4,.08,p[0],0,p[1]);b('shade',.22,.22,.22,p[0],2.4,p[1]);});
  const wx=9,wz=9;b('stone',1.6,.7,1.6,wx,0,wz);b('wood',.1,2.2,.1,wx-.7,0,wz);b('wood',.1,2.2,.1,wx+.7,0,wz);b('wood',1.7,.08,.1,wx,2.1,wz);b('black',1.2,.04,1.2,wx,.69,wz);addCol(wx-.9,wz-.9,wx+.9,wz+.9,0);
  [[-30,-10],[-24,34],[22,-20],[30,36],[-45,10],[42,6],[0,-32],[-14,-32]].forEach(p=>{const w=rnd(6,9),d=rnd(6,8);b('ext',w,3.6,d,p[0],0,p[1]);b('glass',1,1,.1,p[0]-1,1.2,p[1]+d/2+.01);b('glass',1,1,.1,p[0]+1.5,1.2,p[1]+d/2+.01);
    const r=new THREE.Mesh(new THREE.ConeGeometry(w*.78,2.4,4),M.roofm);r.rotation.y=Math.PI/4;r.scale.z=d/w;r.position.set(p[0],4.8,p[1]);scene.add(r);});
  MG.finish(scene);
  [[-9,12,1.3],[10,13,1.1],[-12,22.5,1.5],[14,26,1.2],[-20,15,1.4],[22,12,1.3],[-8,-12,1.5],[12,-10,1.2],[30,15,1.6],[-34,25,1.4]].forEach(t=>makeTree(t[0],t[1],t[2]));
  // pohon mati dekat rumah
  const dt=new THREE.Group();dt.position.set(-9,0,2);const tr=new THREE.Mesh(new THREE.CylinderGeometry(.2,.35,5,7),M.bark);tr.position.y=2.5;dt.add(tr);
  for(let i=0;i<6;i++){const br=new THREE.Mesh(new THREE.CylinderGeometry(.03,.07,2,5),M.bark);br.position.set(Math.cos(i)*.5,3.2+i*.3,Math.sin(i)*.5);br.rotation.z=Math.cos(i)*1;br.rotation.x=Math.sin(i)*1;dt.add(br);}scene.add(dt);addCol(-9.4,1.6,-8.6,2.4,0);
  // rumput liar (instanced)
  const N=S.mobile?160:420,gi=new THREE.InstancedMesh(new THREE.ConeGeometry(.06,.55,3),M.leaf,N),dm=new THREE.Object3D();
  for(let i=0;i<N;i++){let x,z,k=0;do{x=rnd(-40,40);z=rnd(-20,50);k++;}while(k<20&&((Math.abs(x)<8&&z>-7&&z<7)||(Math.abs(x+3)<1&&z>5&&z<17)||(z>18.5&&z<25.5)));
    dm.position.set(x,.27,z);dm.rotation.set(rnd(-.2,.2),rnd(0,TAU),rnd(-.2,.2));dm.scale.setScalar(rnd(.6,1.6));dm.updateMatrix();gi.setMatrixAt(i,dm.matrix);}
  gi.frustumCulled=false;scene.add(gi);G.tufts=gi;
  const bi=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.6,0),M.leaf,30);
  for(let i=0;i<30;i++){dm.position.set(rnd(-13,13),.3,rnd(6,15.5));if(Math.abs(dm.position.x+3)<1.5)dm.position.x+=3;dm.rotation.set(0,rnd(0,TAU),0);dm.scale.setScalar(rnd(.6,1.3));dm.updateMatrix();bi.setMatrixAt(i,dm.matrix);}scene.add(bi);
  // langit
  const sp=new Float32Array(900);for(let i=0;i<300;i++){const a=rnd(0,TAU),e=rnd(.15,1.3),r=250;sp[i*3]=Math.cos(a)*Math.cos(e)*r;sp[i*3+1]=Math.sin(e)*r;sp[i*3+2]=Math.sin(a)*Math.cos(e)*r;}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(sp,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xcfd8ff,size:1.2,sizeAttenuation:false,fog:false})));
  const mo=new THREE.Mesh(new THREE.SphereGeometry(9,16,12),new THREE.MeshBasicMaterial({color:0xdfe6ff,fog:false}));mo.position.set(-90,110,-160);scene.add(mo);
  G.car=null;const car=makeCar();car.position.set(-40,0,22);scene.add(car);G.carObj=car;
}

/* ================= KARAKTER ================= */
const CHAR={
  arga:{skin:0xd9a679,shirt:0x3b5a7a,pants:0x2c2c34,hair:0x1c1410,name:'ARGA'},
  raka:{skin:0xc98f62,shirt:0x8a3b2f,pants:0x1f3a56,hair:0x0f0c0a,name:'RAKA'},
  dion:{skin:0xe0b48c,shirt:0x4c6b4a,pants:0x3a3226,hair:0x2a1c10,name:'DION',glasses:1,pack:1},
  naya:{skin:0xe3b894,shirt:0xc8c2b0,pants:0x3a2c4a,hair:0x17110d,name:'NAYA',long:1}
};
  function makeHuman(p){
  const g=new THREE.Group(),J={},mt=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85}),skin=mt(p.skin),shirt=mt(p.shirt),pants=mt(p.pants),hair=mt(p.hair),shoe=mt(0x1a1a1a);
  const mesh=(geo,m,x,y,z,par)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;(par||g).add(o);return o;};
  const piv=(x,y,z,par)=>{const o=new THREE.Group();o.position.set(x,y,z);par.add(o);return o;};
  J.hips=piv(0,1.02,0,g);mesh(new THREE.BoxGeometry(.34,.2,.2),pants,0,0,0,J.hips);J.torso=piv(0,.1,0,J.hips);
  mesh(new THREE.CylinderGeometry(.19,.16,.56,10),shirt,0,.28,0,J.torso);
  [-.23,.23].forEach(x=>mesh(new THREE.SphereGeometry(.075,8,6),shirt,x,.52,0,J.torso));
  J.head=piv(0,.62,0,J.torso);mesh(new THREE.CylinderGeometry(.04,.045,.08,8),skin,0,-.02,0,J.torso);
  const hd=mesh(new THREE.SphereGeometry(.105,14,12),skin,0,.12,0,J.head);hd.scale.set(1,1.15,1);
  mesh(new THREE.SphereGeometry(.113,14,8,0,TAU,0,Math.PI*.55),hair,0,.14,-.005,J.head);mesh(new THREE.ConeGeometry(.02,.05,6),skin,0,.11,.105,J.head).rotation.x=Math.PI/2;
  [-.04,.04].forEach(x=>mesh(new THREE.SphereGeometry(.014,6,6),mt(0x111111),x,.15,.095,J.head));
  if(p.long){mesh(new THREE.BoxGeometry(.2,.35,.06),hair,0,-.02,-.1,J.head);}
  if(p.glasses){mesh(new THREE.BoxGeometry(.17,.03,.01),mt(0x111111),0,.15,.105,J.head);}
  if(p.pack)mesh(new THREE.BoxGeometry(.3,.38,.14),mt(0x333a44),0,.3,-.17,J.torso);
  const arm=s=>{const a=piv(s*.24,.5,0,J.torso);mesh(new THREE.CylinderGeometry(.052,.046,.3,8),shirt,0,-.15,0,a);const f=piv(0,-.3,0,a);mesh(new THREE.CylinderGeometry(.042,.036,.28,8),skin,0,-.14,0,f);
    mesh(new THREE.BoxGeometry(.07,.1,.04),skin,0,-.33,0,f);mesh(new THREE.BoxGeometry(.02,.06,.02),skin,s*.04,-.3,.02,f);return[a,f];};
  [J.aL,J.fL]=arm(-1);[J.aR,J.fR]=arm(1);
  const leg=s=>{const l=piv(s*.09,-.08,0,J.hips);mesh(new THREE.CylinderGeometry(.075,.06,.45,8),pants,0,-.225,0,l);const k=piv(0,-.45,0,l);mesh(new THREE.CylinderGeometry(.058,.05,.44,8),pants,0,-.22,0,k);mesh(new THREE.BoxGeometry(.09,.06,.22),shoe,0,-.46,.05,k);return[l,k];};
  [J.lL,J.kL]=leg(-1);[J.rL,J.kR]=leg(1);
  const cg=new THREE.ConeGeometry(1.4,6,16,1,true);cg.translate(0,-3,0);cg.rotateX(-Math.PI/2);
  const cone=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:0xfff1c0,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));cone.position.set(.12,.1,.2);cone.visible=false;J.head.add(cone);
  g.scale.setScalar(.92);return{g,J,cone,anim:0,ph:0,lay:0};
}
function poseHuman(H,code,dt,spd){
  const J=H.J,k=Math.min(1,(dt||.016)*12),s=Math.sin(H.ph),t=G.t;
  const T={lL:0,rL:0,lK:0,rK:0,aL:0,aR:0,fL:-.08,fR:-.08,tx:Math.sin(t*1.5)*.012,hy:1.02,hx:0};
  if(code===1||code===4){T.lL=s*.6;T.rL=-s*.6;T.lK=Math.max(0,-s)*.8;T.rK=Math.max(0,s)*.8;T.aL=-s*.5;T.aR=s*.5;}
  if(code===2){T.lL=s*1.05;T.rL=-s*1.05;T.lK=Math.max(0,-s)*1.4+.3;T.rK=Math.max(0,s)*1.4+.3;T.aL=-s*1.1;T.aR=s*1.1;T.fL=T.fR=-1.2;T.tx=.2;}
  if(code===3||code===4){T.hy=.72;T.lL+=-1;T.rL+=-1;T.lK+=1.7;T.rK+=1.7;T.tx=.25;}
  if(code===5){T.aR=-1.3;T.fR=-.3;}
  if(code===6){T.aL=-2.5;T.aR=-2.5;T.hx=-.3;T.tx=-.15;}
  if(H.fl&&code!==6&&code!==5){T.aR=-1.35;T.fR=-.25;}
  const set=(o,a,v)=>{o.rotation.x+=(v-o.rotation.x)*k;};
  set(J.lL,0,T.lL);set(J.rL,0,T.rL);set(J.kL,0,T.lK);set(J.kR,0,T.rK);set(J.aL,0,T.aL);set(J.aR,0,T.aR);set(J.fL,0,T.fL);set(J.fR,0,T.fR);set(J.torso,0,T.tx);set(J.head,0,T.hx);
  J.hips.position.y+=(T.hy-J.hips.position.y)*k;
  const lay=code===7?1:0;H.lay+=(lay-H.lay)*k;H.g.rotation.x=-H.lay*1.45;
}
function makeWidow(){
  const g=new THREE.Group(),J={},mats=[];
  const mt=(c,e)=>{const m=new THREE.MeshStandardMaterial({color:c,roughness:.95,transparent:true,opacity:1,emissive:e||0});m.userData.c=c;m.userData.e=e||0;mats.push(m);return m;};
  const dress=mt(0xc9c2b0,0x15151c),skin=mt(0xb9b4a8,0x0e0e12),hair=mt(0x050505),dk=mt(0x000000),gl=mt(0xffffff,0x888888);
  const add=(geo,m,x,y,z,par)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;(par||g).add(o);return o;};
  const piv=(x,y,z,par)=>{const o=new THREE.Group();o.position.set(x,y,z);par.add(o);return o;};
  J.body=piv(0,0,0,g);add(new THREE.CylinderGeometry(.13,.46,1.25,14),dress,0,.68,0,J.body);add(new THREE.CylinderGeometry(.16,.13,.5,10),dress,0,1.5,0,J.body);add(new THREE.CylinderGeometry(.04,.045,.14,8),skin,0,1.82,0,J.body);
  J.head=piv(0,1.95,0,J.body);const f=add(new THREE.SphereGeometry(.11,14,12),skin,0,0,0,J.head);f.scale.set(1,1.2,1);
  [-.04,.04].forEach(x=>{add(new THREE.SphereGeometry(.03,8,8),dk,x,.02,.09,J.head);add(new THREE.SphereGeometry(.009,6,6),gl,x,.02,.118,J.head);});
  add(new THREE.BoxGeometry(.06,.012,.01),dk,0,-.06,.105,J.head);add(new THREE.SphereGeometry(.022,8,6),dk,0,-.075,.098,J.head).scale.set(1,1.4,.6);
  add(new THREE.SphereGeometry(.125,12,8,0,TAU,0,Math.PI*.58),hair,0,.02,-.01,J.head);add(new THREE.BoxGeometry(.3,1.1,.12),hair,0,-.5,-.08,J.head);
  add(new THREE.BoxGeometry(.07,.8,.2),hair,-.12,-.35,0,J.head);add(new THREE.BoxGeometry(.07,.8,.2),hair,.12,-.35,0,J.head);add(new THREE.BoxGeometry(.13,.65,.03),hair,.045,-.2,.115,J.head);
  const arm=s=>{const a=piv(s*.2,1.7,0,J.body);add(new THREE.CylinderGeometry(.03,.025,.5,6),skin,0,-.25,0,a);const fo=piv(0,-.5,0,a);add(new THREE.CylinderGeometry(.025,.02,.5,6),skin,0,-.25,0,fo);
    add(new THREE.SphereGeometry(.035,6,6),skin,0,-.52,0,fo);for(let i=-2;i<=2;i++)add(new THREE.BoxGeometry(.01,.13,.01),skin,i*.012,-.6,0,fo);return[a,fo];};
  [J.aL,J.fL]=arm(-1);[J.aR,J.fR]=arm(1);
  let nx=0,tilt=0;
  return{g,J,setAlpha:a=>{mats.forEach(m=>m.opacity=a);g.visible=a>.02;},setDark:d=>mats.forEach(m=>{m.color.setHex(d?0x030303:m.userData.c);m.emissive.setHex(d?0:m.userData.e);}),
    anim:(t,dt,st)=>{const ch=st===3,k=Math.min(1,dt*6);if(t>nx){tilt=rnd(-.6,.6)*(ch?.4:1);nx=t+rnd(.6,2.4);}
      J.head.rotation.z+=(tilt-J.head.rotation.z)*.15;J.head.rotation.y=Math.sin(t*.7)*.15;J.body.rotation.x+=((ch?.35:.04)-J.body.rotation.x)*k;J.body.rotation.z=Math.sin(t*.8)*.03;
      J.aL.rotation.x+=((ch?-1.5:-.1+Math.sin(t*1.3)*.08)-J.aL.rotation.x)*k;J.aR.rotation.x+=((ch?-1.5:-.1+Math.sin(t*1.1+1)*.08)-J.aR.rotation.x)*k;
      J.fL.rotation.x=Math.sin(t*2)*.1;J.fR.rotation.x=Math.sin(t*2.3)*.1;J.body.position.y=Math.sin(t*1.7)*.03;}};
}
function nameTag(name){const c=document.createElement('canvas');c.width=256;c.height=64;const g=c.getContext('2d');g.font='bold 30px Georgia';g.textAlign='center';g.fillStyle='#e9e1d3';g.shadowColor='#000';g.shadowBlur=6;g.fillText(name,128,42);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));s.scale.set(1.1,.28,1);s.position.y=2.15;return s;}
let widow;const WD={pos:new V3(0,-50,0),r:0,al:0};
function addRemote(p){if(p.id===G.me||G.players[p.id])return;const H=makeHuman(CHAR[p.char]||CHAR.arga);H.g.position.set(p.x||0,p.y||0,p.z||0);H.g.add(nameTag(p.name));scene.add(H.g);
  G.players[p.id]={id:p.id,name:p.name,char:p.char,H,pos:new V3(p.x||0,p.y||0,p.z||0),tgt:new V3(p.x||0,p.y||0,p.z||0),tr:0,ry:0,anim:0,fl:0,hp:100,down:false};}
function clearRemotes(){for(const id in G.players){scene.remove(G.players[id].H.g);}G.players={};}

/* ================= INPUT ================= */
const K={},JOY={x:0,y:0};
const kd=e=>{K[e.code]=true;};
window.addEventListener('keydown',e=>{
  if(G.mode!=='game')return;if(['Tab','Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.repeat)return;K[e.code]=true;
  if(e.code==='KeyE')pressInteract();if(e.code==='KeyF'&&!G.cut)toggleFlash();if(e.code==='Tab')toggleInv();
});
window.addEventListener('keyup',e=>{K[e.code]=false;if(e.code==='KeyE')releaseInteract();});
document.addEventListener('mousemove',e=>{if(G.mode!=='game'||!G.locked||G.cut||G.down&&false)return;G.yaw-=e.movementX*.0022*S.mouse;G.pitch=clamp(G.pitch-e.movementY*.0022*S.mouse,-1.4,1.4);});
canvas.addEventListener('click',()=>{if(G.mode==='game'&&!isTouch&&!G.cut&&!G.locked&&!G.paused&&!G.invOpen&&!G.noteOpen&&!G.ending&&canvas.requestPointerLock)canvas.requestPointerLock();});
document.addEventListener('pointerlockchange',()=>{G.locked=document.pointerLockElement===canvas;if(!G.locked&&G.mode==='game'&&!G.paused&&!G.invOpen&&!G.noteOpen&&!G.cut&&!G.ending)setPause(true);});
function toggleFlash(){G.fl=!G.fl;sfx('click');}
function bindTouch(){
  const jz=$('joyZone'),base=$('joyBase'),knob=$('joyKnob');let jid=null;
  const jm=e=>{const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;let dx=e.clientX-cx,dy=e.clientY-cy;const m=Math.hypot(dx,dy);if(m>R){dx*=R/m;dy*=R/m;}
    knob.style.transform='translate('+dx+'px,'+dy+'px)';JOY.x=dx/R;JOY.y=dy/R;};
  jz.addEventListener('pointerdown',e=>{if(jid!==null)return;jid=e.pointerId;jz.setPointerCapture(jid);jm(e);e.preventDefault();});
  jz.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
  const je=e=>{if(e.pointerId!==jid)return;jid=null;JOY.x=JOY.y=0;knob.style.transform='translate(0,0)';};
  jz.addEventListener('pointerup',je);jz.addEventListener('pointercancel',je);
  const lz=$('lookZone');let lid=null,lx=0,ly=0;
  lz.addEventListener('pointerdown',e=>{if(lid!==null)return;lid=e.pointerId;lz.setPointerCapture(lid);lx=e.clientX;ly=e.clientY;});
  lz.addEventListener('pointermove',e=>{if(e.pointerId!==lid||G.cut)return;G.yaw-=(e.clientX-lx)*.005*S.touch;G.pitch=clamp(G.pitch-(e.clientY-ly)*.005*S.touch,-1.4,1.4);lx=e.clientX;ly=e.clientY;});
  const le=e=>{if(e.pointerId===lid)lid=null;};lz.addEventListener('pointerup',le);lz.addEventListener('pointercancel',le);
  const hold=(id,dn,up)=>{const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();dn();});if(up){['pointerup','pointercancel','pointerleave'].forEach(n=>el.addEventListener(n,up));}};
  hold('tbInteract',pressInteract,releaseInteract);
  hold('tbRun',()=>{G.runT=!G.runT;$('tbRun').classList.toggle('on',G.runT);});
  hold('tbCrouch',()=>{G.crouchT=!G.crouchT;$('tbCrouch').classList.toggle('on',G.crouchT);});
  hold('tbFlash',()=>{if(!G.cut)toggleFlash();$('tbFlash').classList.toggle('on',G.fl);});
  hold('tbInv',toggleInv);hold('tbPause',()=>setPause(true));
}

/* ================= UI HELPER ================= */
G.st={};G.eye=1.62;G.hbT=0;G.pfDone=0;
function ov(id,show){const e=$(id);e.classList.toggle('hidden',!show);e.classList.toggle('active',show);}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===id));}
let toastT=0,subT=0;
function toast(m,d){const e=$('toast');e.textContent=m;e.classList.remove('hidden');toastT=d||2.5;}
function sub(m,d){const e=$('subtitle');if(!m){e.classList.add('hidden');return;}e.textContent=m;e.classList.remove('hidden');subT=d||3;}
function hurt(){const e=$('hurtOverlay');e.style.opacity=1;setTimeout(()=>{e.style.opacity=0;},160);}
function emit(ev,d){if(G.sock&&G.sock.connected)G.sock.emit(ev,d);}
function setSrv(t,c){const e=$('serverStatus');e.textContent=t;e.className='server-status '+(c||'');}
function lockPtr(){if(isTouch||G.locked||!canvas.requestPointerLock)return;try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
const cnt=n=>G.inv.filter(x=>x===n).length;

/* ================= INVENTORY, NOTE, PAUSE ================= */
function toggleInv(){if(G.mode!=='game'||G.cut||G.ending||G.down)return;G.invOpen=!G.invOpen;
  if(G.invOpen){if(document.exitPointerLock)document.exitPointerLock();renderInv();}else lockPtr();ov('inventory',G.invOpen);}
function renderInv(){const ul=$('invList');ul.innerHTML='';(G.invObjs||[]).forEach(it=>{const li=document.createElement('li');li.textContent=ITEM[it.item]||it.item;
  const bt=document.createElement('button');bt.className='btn small';bt.textContent='JATUHKAN';bt.style.display='block';bt.style.marginTop='6px';
  bt.onclick=()=>{const fx=-Math.sin(G.yaw),fz=-Math.cos(G.yaw);emit('drop',{id:it.id,x:G.pos.x+fx*.8,y:G.pos.y+.03,z:G.pos.z+fz*.8});};li.appendChild(bt);ul.appendChild(li);});
  $('invEmpty').style.display=(G.invObjs&&G.invObjs.length)?'none':'block';}
function openNote(t,b){$('noteTitle').textContent=t;$('noteBody').textContent=b;G.noteOpen=true;if(document.exitPointerLock)document.exitPointerLock();ov('noteViewer',true);}
function closeNote(){G.noteOpen=false;ov('noteViewer',false);lockPtr();}
function setPause(v){if(G.mode!=='game'||G.ending||G.cut)return;G.paused=v;ov('pause',v);if(v){if(document.exitPointerLock)document.exitPointerLock();}else lockPtr();}
window.addEventListener('keydown',e=>{if(e.code==='Escape'&&G.mode==='game'&&!G.locked&&!G.cut){if(G.invOpen)toggleInv();else if(G.noteOpen)closeNote();else setPause(!G.paused);}});
window.addEventListener('blur',()=>{for(const k in K)K[k]=false;releaseInteract();});

/* ================= SETTINGS ================= */
const SET=[['set-graphics','graphics'],['set-shadow','shadow'],['set-res','res','out-res'],['set-mouse','mouse','out-mouse'],['set-touch','touch','out-touch'],['set-master','master','out-master'],['set-music','music','out-music'],['set-sfx','sfx','out-sfx'],['set-bright','bright','out-bright']];
function syncSettingsUI(){SET.forEach(([id,k,out])=>{$(id).value=S[k];if(out)$(out).textContent=(+S[k]).toFixed(2);});$('set-mobile').checked=!!S.mobile;}
function bindSettings(){syncSettingsUI();
  SET.forEach(([id,k,out])=>{const el=$(id);el.addEventListener('input',()=>{S[k]=el.tagName==='SELECT'?el.value:parseFloat(el.value);if(out)$(out).textContent=(+S[k]).toFixed(2);saveS();audioVol();applyGfx();});});
  $('set-mobile').addEventListener('change',e=>{S.mobile=e.target.checked;if(S.mobile){S.graphics='low';S.res=Math.min(S.res,.7);}saveS();syncSettingsUI();applyGfx();});}

/* ================= INTERAKSI ================= */
const _d=new V3();
function findTarget(){
  if(G.cut||G.down||G.paused||G.invOpen||G.noteOpen||G.ending){G.target=null;return;}
  camera.getWorldDirection(_f);let best=null,bs=-9;
  for(const id in OB){const o=OB[id];if(o.type==='pick'&&(o.s.g===1||o.s.v===0))continue;
    _d.copy(o.p).sub(camera.position);const dist=_d.length();if(dist>o.r)continue;_d.divideScalar(dist||1);const dot=_d.dot(_f);if(dot<.8&&dist>.9)continue;
    const sc=dot*2-dist*.2;if(sc>bs){bs=sc;best=o;}}
  let rv=null;for(const id in G.players){const p=G.players[id];if(p.down&&p.pos.distanceTo(G.pos)<2.2){rv=p;break;}}
  G.target=rv?{revive:rv}:best;
}
function promptText(o){
  if(o.revive)return 'HOLD E: REVIVE '+o.revive.name;
  switch(o.type){
    case 'door':return o.s.l?'DOOR LOCKED':(o.s.o?'CLOSE DOOR':'OPEN DOOR');
    case 'drawer':return o.s.o?'CLOSE DRAWER':'OPEN DRAWER';
    case 'pick':return 'PICK UP '+(ITEM[o.item]||'').toUpperCase();
    case 'switch':return 'TURN LIGHT ON/OFF';
    case 'breaker':return G.st.power?'POWER PANEL (ON)':'USE POWER PANEL';
    case 'tv':return (hasItem('tape')&&!G.st.tv)?'WATCH TAPE':'TURN TV ON/OFF';
    case 'note':return 'READ NOTE';case 'book':return 'READ OLD BOOK';case 'photo':return 'INSPECT PHOTO';case 'gate':return 'OPEN GATE';
  }return 'INTERACT';
}
function pressInteract(){
  if(G.mode!=='game'||G.cut||G.paused||G.invOpen||G.ending)return;
  if(G.noteOpen){closeNote();return;}
  const t=G.target;if(!t)return;
  if(t.revive){G.reviving={id:t.revive.id,t:0};return;}
  doAct(t);
}
function releaseInteract(){G.reviving=null;$('reviveBox').classList.add('hidden');}
function doAct(o){
  G.interT=.5;sfx('click');
  if(o.type==='note'||o.id==='painting'){const n=NOTES[o.id];if(n)openNote(n[0],n[1]);}
  else if(o.id==='photoFrame'&&G.st.cuts&&G.st.cuts[3]){const n=NOTES.photoFrame;openNote(n[0],n[1]);}
  emit('act',{id:o.id});
}
function updDyn(dt){
  for(const id in OB){const o=OB[id];if(o.upd)o.upd(dt);}
  if(G.st.tv){tvAcc+=dt;if(tvAcc>.1){tvAcc=0;tvDraw(true);}G.tvT=(G.tvT||0)-dt;if(G.tvT<=0){G.tvT=3;sfx('tv',OB.tv.p);}}
}

/* ================= STATE DARI SERVER ================= */
function applyState(st,silent){
  const prev=G.st||{};G.st=st;
  for(const id in OB){const o=OB[id];
    if(o.type==='door'){const d=(st.doors&&st.doors[id])||{},no=d.o?1:0;if(!silent&&(o.s.o||0)!==no)sfx('door',o.p);o.s.o=no;o.s.l=d.l?1:0;}
    else if(o.type==='drawer'){const no=(st.dr&&st.dr[id])?1:0;if(!silent&&(o.s.o||0)!==no)sfx('creak',o.p);o.s.o=no;}
  }
  const L={dr_k1:'it_fuse',dr_l1:'it_ph1',dr_b1:'it_keyst',dr_a1:'it_k1',dr_g1:'it_k2'};
  for(const d in L)if(OB[L[d]])OB[L[d]].s.v=(st.dr&&st.dr[d])?1:0;
  OB.it_k3.s.v=st.obj>=4?1:0;
  for(const id in OB){const o=OB[id];if(o.type!=='pick')continue;const v=st.items&&st.items[id];
    if(Array.isArray(v)){o.s.g=0;o.s.v=1;o.p.set(v[0],v[1]+.1,v[2]);o.by=v[1];o.g.position.set(v[0],v[1],v[2]);}
    else o.s.g=v===1?1:0;}
  G.invObjs=st.inv||[];G.inv=G.invObjs.map(i=>i.item);if(G.invOpen)renderInv();
  if(!!st.tv!==!!G.tvOn){G.tvOn=!!st.tv;tvDraw(G.tvOn);}
  const c2=st.cuts&&st.cuts[2]&&!(G.cut&&G.cut.id===2);clock.set(23,c2?47:40);
  if(st.cuts&&st.cuts[3]&&!G.pfDone&&!G.cut){G.pfDone=1;photoFrame.redraw(true);}
  if(!silent&&st.power&&!prev.power)sfx('power');
  if(prev.obj!==undefined&&st.obj!==prev.obj&&!silent){toast('OBJECTIVE: '+OBJ_TEXT[st.obj],4);sfx('pick');}
  G.objective=st.obj||0;updObjective();
}
function updObjective(){let t=OBJ_TEXT[G.objective]||'-';if(G.objective===1)t+=' ('+Math.min(3,cnt('photo'))+'/3)';if(G.objective===4)t+=' ('+Math.min(3,cnt('key_brass'))+'/3)';$('objectiveText').textContent=t;}

/* ================= CUTSCENE ================= */
const cw=(x,y,z,r,dark)=>{G.cw=x===null?null:{x,y,z,r,dark:!!dark};};
const ZERO={x:0,y:0,z:0};
const stp=()=>sfx('step',{x:0,y:3.4,z:-1.5});
const CUTS={
 1:{title:'THE ARRIVAL',shots:[
  {d:5,c0:[-30,1.3,26.5],c1:[-18,1.5,26.5],l0:[-36,1,22],l1:[-24,1,22],cx:[-40,-26],f:()=>sfx('car',{x:-30,y:1,z:22})},
  {d:4.5,rel:1,c0:[-.5,1.3,0],c1:[-.5,1.3,.08],l0:[2,1.1,0],cx:[-26,-17],subs:[[.4,'ARGA: "Udah sepuluh tahun... akhirnya gue balik lagi."',3.8]]},
  {d:4.5,rel:1,c0:[-.5,1.3,.1],c1:[-.45,1.32,0],l0:[2,1.1,.2],cx:[-17,-10],subs:[[.4,'RAKA: "Rumah ini masih bikin gue nggak nyaman."',3.8]]},
  {d:4,c0:[-12,1.4,26],c1:[-8,1.5,25],l0:[-9,1,22],l1:[-3,1,22],cx:[-10,-3],eo:1},
  {d:5.5,c0:[-9,2.2,25],c1:[-6,2.6,24],l0:[-3,3,5],l1:[-4.5,4.2,5],ev:[[2.4,()=>{winGlow.visible=true;sfx('click');}]],subs:[[2.5,'Lampu lantai dua tiba-tiba menyala.',2.6]]}
 ]},
 2:{title:'THE FIRST SIGNAL',shots:[
  {d:3,c0:[-3,1.6,3.2],c1:[-3,1.55,3.6],l0:[-3,1.3,5],ev:[[1.1,()=>sfx('slam',{x:-3,y:1.3,z:5})]],subs:[[1.2,'Pintu depan tertutup sendiri.',1.8]]},
  {d:3.2,c0:[-4.3,1.7,2.2],c1:[-5,1.9,2.6],l0:[-5.87,1.95,2.7],ev:[[.2,()=>{clock.set(23,47);sfx('click');}]],subs:[[.3,'Jam dinding berhenti pada pukul 23.47.',2.6]]},
  {d:3.2,c0:[2,1.35,3.8],c1:[2,1.25,3],l0:[2,1,.9],ev:[[0,()=>sfx('tv',{x:2,y:1,z:.9})]]},
  {d:5.5,c0:[1.5,1.6,3.5],c1:[2.6,1.7,2.8],l0:[4.8,3.2,-.5],l1:[5,3.1,-.7],subs:[[.2,'SUARA PEREMPUAN: "Arga... kamu sudah pulang?"',3]],
   ev:[[.1,()=>sfx('whisper',{x:5,y:3,z:-.7})],[1.6,()=>{cw(5,3,-.7,0,true);sfx('sting');}],[4.2,()=>cw(null)]]}
 ]},
 3:{title:'THE FIRST APPEARANCE',shots:[
  {d:4.5,c0:[-1.2,1.6,2.4],c1:[-1.2,1.6,1.5],l0:[-1.2,1.6,.62],ev:[[1.5,()=>{photoFrame.redraw(true);sfx('creak',{x:-1.2,y:1.6,z:.6});}]],subs:[[2,'Salah satu wajah di foto itu perlahan berubah...',2.5]]},
  {d:3,c0:[-1.2,1.7,1.6],c1:[-1.2,1.7,1.6],l0:[-1.2,1.6,.62],l1:[-1.2,2.7,.2],ev:[[.2,stp],[.8,stp],[1.4,stp],[2,stp]]},
  {d:5,c0:[-5,4.65,-1.5],c1:[-4.6,4.6,-1.5],l0:[3.5,4.4,-1.5],subs:[[1.1,'Seseorang berdiri di ujung lorong.',2.4]],
   ev:[[1,()=>cw(3.8,3,-1.5,-Math.PI/2,false)],[2.1,()=>{G.flicker=1.2;}],[3.2,()=>{G.flicker=1;cw(null);}]]}
 ]},
 4:{title:'THE FORBIDDEN ROOM',shots:[
  {d:4,c0:[-3.5,4.6,-.9],c1:[-3.5,4.5,-2.2],l0:[-3.5,4.2,-4.5],subs:[[.3,'Pintu kamar terlarang terbuka perlahan...',3]]},
  {d:5,c0:[-3.5,4.5,-3.3],c1:[-3.3,4.4,-4],l0:[-3.5,4,-4.8],l1:[-3.5,3.9,-4.3],subs:[[.3,'Foto keluarga... kaset lama... dan sebuah rekaman.',3.5]]},
  {d:6.5,c0:[-3.4,4.2,-3.2],c1:[-3.5,4,-3.7],l0:[-3.5,3.8,-4.3],ev:[[0,()=>sfx('tv',{x:-3.5,y:4,z:-4.3})]],
   subs:[[.3,'REKAMAN: "Kami tahu dia sudah ada di rumah ini jauh sebelum Arga lahir."',3],[3.5,'REKAMAN: "Kami mengurungnya di kamar belakang... tapi dia selalu ingin keluar."',3]]}
 ]},
 5:{title:'THE FINAL REVELATION',shots:[
  {d:6,c0:[-3.5,4.7,-3.4],c1:[-3.5,4.2,-3.9],l0:[-3.5,3.85,-4.2],ev:[[3.2,()=>sfx('sting')]],subs:[[.4,'Nama Arga sudah tertulis di buku lama ini.',2.6],[3.2,'Tulisan tangan ibunya sendiri.',2.6]]},
  {d:4.5,black:'YOU WERE NEVER SUPPOSED TO RETURN.',c0:[-3.5,4.2,-3.9],l0:[-3.5,3.85,-4.2],ev:[[.5,()=>sfx('whisper',{x:-3.5,y:4,z:-3})]]}
 ]}
};
function playCut(id){
  const C=CUTS[id];if(!C||G.cut||G.mode!=='game')return;
  if(G.invOpen)toggleInv();if(G.noteOpen)closeNote();if(G.paused)setPause(false);releaseInteract();
  if(document.exitPointerLock&&G.locked)document.exitPointerLock();
  G.cut={id,C,i:-1,t:0,fired:{}};
  if(id===1){G.carObj.position.set(-40,0,22);G.carObj.userData.ppl.visible=true;winGlow.visible=false;}
  $('cutscene').classList.remove('hidden');$('hud').classList.add('hidden');
  $('btnSkipCut').classList.toggle('hidden',!SEEN[id]);$('cutSubtitle').textContent='';
  musicMode('cut');nextShot();$('cutFade').classList.add('on');setTimeout(()=>{if(G.cut&&!G.cut.shot.black)$('cutFade').classList.remove('on');},60);
}
function nextShot(){
  const c=G.cut;c.i++;const s=c.C.shots[c.i];if(!s){endCut();return;}
  c.shot=s;c.t=0;c.fired={};$('cutFade').classList.toggle('on',!!s.black);
  const t=$('cutTitle');
  if(s.black){t.textContent=s.black;t.style.top='42%';t.classList.add('show');}
  else if(c.i===0&&c.C.title){t.textContent=c.C.title;t.style.top='34%';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200);}
  if(s.f)s.f();
}
function cutUpdate(dt){
  const c=G.cut,s=c.shot;if(!s)return;
  c.t+=dt;const u=clamp(c.t/s.d,0,1),e=u*u*(3-2*u),o=s.rel?G.carObj.position:ZERO;
  if(s.cx)G.carObj.position.x=lerp(s.cx[0],s.cx[1],s.eo?1-(1-u)*(1-u):u);
  const mix=(a,b,k)=>[lerp(a[0],b[0],k),lerp(a[1],b[1],k),lerp(a[2],b[2],k)];
  const p=mix(s.c0,s.c1||s.c0,e),l=mix(s.l0,s.l1||s.l0,e);
  camera.position.set(p[0]+o.x,p[1]+o.y,p[2]+o.z);camera.lookAt(l[0]+o.x,l[1]+o.y,l[2]+o.z);
  if(s.ev)s.ev.forEach((q,i)=>{if(c.t>=q[0]&&!c.fired[i]){c.fired[i]=1;q[1]();}});
  let txt='';if(s.subs)for(const q of s.subs)if(c.t>=q[0]&&c.t<q[0]+q[2])txt=q[1];
  const el=$('cutSubtitle');if(el.textContent!==txt)el.textContent=txt;
  if(c.t>=s.d)nextShot();
}
function endCut(){
  const c=G.cut;if(!c)return;G.cut=null;G.cw=null;
  $('cutscene').classList.add('hidden');$('hud').classList.remove('hidden');$('cutFade').classList.remove('on');$('cutTitle').classList.remove('show');$('cutSubtitle').textContent='';
  if(c.id===1){G.carObj.position.x=-3;G.carObj.userData.ppl.visible=false;winGlow.visible=true;}
  markSeen(c.id);emit('cutDone',{id:c.id});musicMode('game');applyState(G.st,true);
  if(!isTouch)toast('Klik layar untuk melanjutkan',2.5);
}

/* ================= NETWORK ================= */
function connect(){
  if(G.sock)return;
  if(!CONFIG.SERVER_URL){setSrv('Server belum diatur (isi CONFIG.SERVER_URL di script.js)','bad');return;}
  if(typeof io==='undefined'){setSrv('Socket.IO gagal dimuat','bad');return;}
  const s=G.sock=io(CONFIG.SERVER_URL,{transports:['websocket','polling'],reconnection:true,reconnectionDelay:800,reconnectionDelayMax:4000});
  s.on('connect',()=>{setSrv('Server: terhubung','ok');$('netBanner').classList.add('hidden');
    if(G.room&&G.token)s.emit('rejoin',{code:G.room,token:G.token,id:G.me},r=>{if(!r||!r.ok){toast('Gagal masuk kembali ke room');leaveToMenu();}});});
  s.on('disconnect',()=>{setSrv('Server: terputus, menyambung ulang...','bad');if(G.room)$('netBanner').classList.remove('hidden');});
  s.on('connect_error',()=>{setSrv('Server: tidak bisa terhubung','bad');if(G.room)$('netBanner').classList.remove('hidden');});
  s.on('room',onRoom);s.on('start',onStart);s.on('pstate',onPState);s.on('state',st=>applyState(st));s.on('evt',onEvt);s.on('end',onEnd);
}
function needName(){if(!S.name){S.name='Player'+(10+(Math.random()*90|0));$('playerName').value=S.name;saveS();}return true;}
function netCreate(){
  connect();if(!G.sock){$('menuError').textContent='Server belum diatur.';return;}
  $('menuError').textContent='Menghubungkan ke server...';
  G.sock.emit('create',{name:S.name,char:S.char},r=>{
    if(!r||!r.ok){$('menuError').textContent=(r&&r.err)||'Gagal membuat room';return;}
    $('menuError').textContent='';G.me=r.id;G.token=r.token;G.room=r.code;showScreen('screen-room');});
}
function netJoin(){
  const code=$('joinCode').value.trim().toUpperCase();
  if(code.length<5){$('joinError').textContent='Kode room harus 5 karakter.';return;}
  connect();if(!G.sock){$('joinError').textContent='Server belum diatur.';return;}
  $('joinError').textContent='Menghubungkan...';
  G.sock.emit('join',{code,name:S.name,char:S.char},r=>{
    if(!r||!r.ok){$('joinError').textContent=(r&&r.err)||'Gagal bergabung';return;}
    $('joinError').textContent='';G.me=r.id;G.token=r.token;G.room=r.code;showScreen('screen-room');});
}
function onRoom(r){
  if(G.mode==='game')return;
  G.roomInfo=r;$('roomCode').textContent=r.code;
  const ul=$('playerList');ul.innerHTML='';
  r.players.forEach(p=>{const li=document.createElement('li');const nm=document.createElement('span');nm.textContent=p.name+' ('+(CHAR[p.char]?CHAR[p.char].name:'?')+')'+(p.id===G.me?' - KAMU':'');
    const tg=document.createElement('span');tg.className='tag '+(p.id===r.host?'host':(p.ready?'ready':''));tg.textContent=p.id===r.host?'HOST':(p.ready?'READY':'BELUM');li.appendChild(nm);li.appendChild(tg);ul.appendChild(li);});
  const me=r.players.find(p=>p.id===G.me);
  if(!me){leaveToMenu();return;}
  if(me.char!==S.char){S.char=me.char;saveS();selChar();}
  const host=r.host===G.me;
  $('btnReady').textContent=me.ready?'BATAL READY':'READY';$('btnReady').style.display=host?'none':'';
  $('btnStart').style.display=host?'':'none';
  const others=r.players.filter(p=>p.id!==r.host),allReady=others.every(p=>p.ready);
  $('btnStart').disabled=!(host&&r.players.length>=r.min&&allReady);
  $('roomStatus').textContent='Pemain '+r.players.length+'/'+r.max+' - minimal '+r.min+(r.players.length<r.min?' (menunggu pemain)':(allReady?' - siap dimulai':' - menunggu semua READY'));
}
function onStart(d){
  clearRemotes();G.mode='game';G.ending=false;G.paused=false;G.invOpen=false;G.noteOpen=false;G.hp=100;G.down=false;G.stam=100;G.exhausted=false;G.cut=null;G.cw=null;G.pfDone=0;
  photoFrame.redraw(false);clock.set(23,40);WD.tx=null;WD.al=0;
  showScreen('');ov('screen-end',false);ov('pause',false);$('hud').classList.remove('hidden');$('touchUI').classList.toggle('hidden',!isTouch);$('downedBox').classList.add('hidden');
  G.pos.set(d.spawn[0],d.spawn[2]||.15,d.spawn[1]);G.yaw=0;G.pitch=0;
  (d.players||[]).forEach(addRemote);applyState(d.st||{},true);G.tvOn=false;tvDraw(false);
  if(PV)PV.g.visible=false;camera.clearViewOffset();musicMode('game');onResize();
  if(d.rejoin){winGlow.visible=!!(d.st&&d.st.cuts&&d.st.cuts[1]);G.carObj.position.x=-3;G.carObj.userData.ppl.visible=false;}
  else{G.carObj.position.set(-40,0,22);playCut(1);}
}
function onPState(d){
  for(const id in d.p){const q=d.p[id];
    if(id===G.me){G.hp=q.hp;const dn=!!q.d;if(dn&&!G.down){G.down=true;G.fl=false;$('downedBox').classList.remove('hidden');toast('Kamu jatuh!',3);}
      else if(!dn&&G.down){G.down=false;$('downedBox').classList.add('hidden');toast('Kamu dihidupkan kembali',3);}continue;}
    const p=G.players[id];if(!p)continue;p.tgt.set(q.x,q.y,q.z);p.ry=q.r;p.anim=q.a;p.fl=q.f;p.hp=q.hp;p.down=!!q.d;}
  if(d.w){if(!WD.tx){WD.pos.set(d.w.x,d.w.y,d.w.z);WD.r=d.w.r;WD.al=d.w.al;}WD.tx=d.w;}
}
function onEvt(e){
  switch(e.t){
    case 'sound':sfx(e.n,{x:e.x,y:e.y,z:e.z});break;
    case 'flicker':G.flicker=e.d||1.2;break;
    case 'toast':toast(e.m,e.d);break;
    case 'sub':sub(e.m,e.d);break;
    case 'hit':if(e.id===G.me){hurt();sfx('hit');G.shake=.4;}break;
    case 'cut':playCut(e.id);break;
    case 'joined':addRemote(e.p);break;
    case 'left':{const q=G.players[e.id];if(q){scene.remove(q.H.g);delete G.players[e.id];}break;}
  }
}
function onEnd(d){
  G.ending=true;releaseInteract();if(G.cut)endCut();if(document.exitPointerLock)document.exitPointerLock();
  $('endTitle').textContent=d.win?'KALIAN SELAMAT':'KALIAN TAK KEMBALI';
  $('endText').textContent=d.text||(d.win?'Kalian berhasil keluar dari rumah itu. Tapi nama Arga masih tertulis di buku itu.':'Semua pemain jatuh. Rumah itu mengingat kalian.');
  ov('inventory',false);ov('noteViewer',false);ov('pause',false);ov('screen-end',true);
}
function leaveToMenu(){
  G.mode='menu';G.room=null;G.token=null;G.me=null;G.roomInfo=null;G.cut=null;G.cw=null;G.paused=false;G.invOpen=false;G.noteOpen=false;G.ending=false;G.st={};G.inv=[];G.invObjs=[];
  clearRemotes();['pause','inventory','noteViewer','screen-end'].forEach(i=>ov(i,false));
  $('hud').classList.add('hidden');$('cutscene').classList.add('hidden');$('netBanner').classList.add('hidden');
  if(document.exitPointerLock)document.exitPointerLock();camera.clearViewOffset();camera.rotation.set(0,0,0);
  if(widow)widow.setAlpha(0);if(G.carObj){G.carObj.position.set(-3,0,22);G.carObj.userData.ppl.visible=false;}
  showScreen('screen-menu');musicMode('menu');
}

/* ================= MENU, CHARACTER, BIND ================= */
let PV=null;
function selChar(){
  document.querySelectorAll('.char-card').forEach(c=>c.classList.toggle('selected',c.dataset.char===S.char));
  if(!scene)return;if(PV)scene.remove(PV.g);
  PV=makeHuman(CHAR[S.char]||CHAR.arga);PV.g.position.set(40,0,60);scene.add(PV.g);PV.g.visible=G.mode==='char';
}
function setPreviewOffset(){camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.2,0,innerWidth,innerHeight);}
function enterChar(){G.mode='char';selChar();PV.g.visible=true;setPreviewOffset();showScreen('screen-character');}
function leaveChar(){G.mode='menu';if(PV)PV.g.visible=false;camera.clearViewOffset();saveS();emit('char',S.char);showScreen(G.room?'screen-room':'screen-menu');}
function bindAll(){
  $('playerName').value=S.name||'';
  $('playerName').addEventListener('input',e=>{S.name=e.target.value.trim().slice(0,14);saveS();});
  $('btnCreate').onclick=()=>{audioInit();needName();netCreate();};
  $('btnJoin').onclick=()=>{audioInit();needName();$('joinError').textContent='';showScreen('screen-join');};
  $('btnJoinConfirm').onclick=netJoin;$('btnJoinBack').onclick=()=>showScreen('screen-menu');
  $('joinCode').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
  $('btnCharacter').onclick=()=>{audioInit();enterChar();};$('btnCharBack').onclick=leaveChar;
  document.querySelectorAll('.char-card').forEach(c=>c.onclick=()=>{S.char=c.dataset.char;saveS();selChar();});
  $('btnSettings').onclick=()=>{G.settingsFrom='menu';showScreen('screen-settings');};
  $('btnSettingsBack').onclick=()=>{if(G.settingsFrom==='pause'){showScreen('');ov('pause',true);}else showScreen('screen-menu');};
  $('btnHow').onclick=()=>showScreen('screen-how');$('btnHowBack').onclick=()=>showScreen('screen-menu');
  $('btnCopyCode').onclick=()=>{try{navigator.clipboard.writeText($('roomCode').textContent);toast('Kode disalin');$('toast').style.position='fixed';}catch(e){}};
  $('btnReady').onclick=()=>{const me=G.roomInfo&&G.roomInfo.players.find(p=>p.id===G.me);emit('ready',!(me&&me.ready));};
  $('btnStart').onclick=()=>emit('start');
  $('btnLeave').onclick=()=>{emit('leave');leaveToMenu();};
  $('btnInvClose').onclick=toggleInv;$('btnNoteClose').onclick=closeNote;
  $('btnResume').onclick=()=>setPause(false);
  $('btnPauseSettings').onclick=()=>{G.settingsFrom='pause';ov('pause',false);showScreen('screen-settings');};
  $('btnQuit').onclick=()=>{emit('leave');leaveToMenu();};
  $('btnEndMenu').onclick=()=>{emit('leave');leaveToMenu();};
  $('btnSkipCut').onclick=()=>endCut();
  ['pointerdown','keydown'].forEach(n=>window.addEventListener(n,audioInit));
  bindSettings();bindTouch();
}

/* ================= GAME LOOP ================= */
function collide(x,z,fl){
  for(let it=0;it<2;it++)for(let i=0;i<COL.length;i++){
    const c=COL[i];if(c.f&&c.f!==fl)continue;if(c.id&&OB[c.id]&&OB[c.id].s.o)continue;
    const nx=clamp(x,c.x1,c.x2),nz=clamp(z,c.z1,c.z2),dx=x-nx,dz=z-nz,d2=dx*dx+dz*dz;
    if(d2<.09){
      if(d2>1e-8){const d=Math.sqrt(d2),k=(.3-d)/d;x+=dx*k;z+=dz*k;}
      else{const l=x-c.x1,r=c.x2-x,t=z-c.z1,bt=c.z2-z,m=Math.min(l,r,t,bt);if(m===l)x=c.x1-.3;else if(m===r)x=c.x2+.3;else if(m===t)z=c.z1-.3;else z=c.z2+.3;}
    }
  }
  return [x,z];
}
function groundY(x,z,y){
  if(x>4.15&&x<5.85&&z>-.5&&z<4.6)return .15+clamp((4.6-z)/.34,0,15)*.19;
  if(y>2.4)return 3;
  if(x>-6&&x<6&&z>-5&&z<5)return .15;
  return 0;
}
let teamT=0;
function updateGame(dt){
  const c=G.cut;
  const can=!c&&!G.paused&&!G.invOpen&&!G.noteOpen&&!G.down&&!G.ending;
  let moving=false,run=false;
  G.crouch=!!(can&&(K.ControlLeft||K.ControlRight||K.KeyC||G.crouchT));
  if(can){
    let fw=(K.KeyW||K.ArrowUp?1:0)-(K.KeyS||K.ArrowDown?1:0)-JOY.y,sd=(K.KeyD||K.ArrowRight?1:0)-(K.KeyA||K.ArrowLeft?1:0)+JOY.x;
    const m=Math.hypot(fw,sd);if(m>1){fw/=m;sd/=m;}
    if(m>.1){
      moving=true;run=!!((K.ShiftLeft||K.ShiftRight||G.runT)&&!G.crouch&&G.stam>0&&!G.exhausted);
      const sp=(G.crouch?1.3:run?4.6:2.5)*Math.min(1,m),sy=Math.sin(G.yaw),cy=Math.cos(G.yaw);
      const r=collide(G.pos.x+(-sy*fw+cy*sd)*sp*dt,G.pos.z+(-cy*fw-sy*sd)*sp*dt,G.pos.y>2.4?2:1);
      G.stepD+=Math.hypot(r[0]-G.pos.x,r[1]-G.pos.z);G.pos.x=r[0];G.pos.z=r[1];
    }
  }
  if(run){G.stam-=22*dt;if(G.stam<=0){G.stam=0;G.exhausted=true;toast('Kehabisan tenaga!',1.5);}}
  else G.stam=Math.min(100,G.stam+(moving?10:16)*dt);
  if(G.exhausted&&G.stam>25)G.exhausted=false;
  if(G.stepD>(run?1.7:G.crouch?2.8:2.1)){G.stepD=0;if(!G.crouch)sfx('step');}
  G.pos.y+=(groundY(G.pos.x,G.pos.z,G.pos.y)-G.pos.y)*Math.min(1,dt*16);
  G.eye=lerp(G.eye,G.down?.35:(G.crouch?1.05:1.62),Math.min(1,dt*8));
  G.bob+=moving?dt*(run?11:7):0;
  if(G.interT>0)G.interT-=dt;
  // flashlight
  flash.intensity+=((G.fl&&!G.down&&!c?2.4:0)-flash.intensity)*Math.min(1,dt*12);
  if(!c){
    const sh=G.shake>0?(G.shake-=dt,(Math.random()-.5)*.03*G.shake*10):0;
    camera.position.set(G.pos.x,G.pos.y+G.eye+(moving?Math.sin(G.bob)*(run?.045:.025):0),G.pos.z);
    camera.rotation.set(G.pitch+sh,G.yaw,lerp(camera.rotation.z,G.down?.5:0,Math.min(1,dt*5)));
  }else cutUpdate(dt);
  // target & revive
  findTarget();
  const t=G.target,ip=$('interactPrompt');
  if(t){ip.classList.remove('hidden');$('interactText').textContent=promptText(t);}else ip.classList.add('hidden');
  if(G.reviving){
    if(!t||!t.revive||t.revive.id!==G.reviving.id)releaseInteract();
    else{G.reviving.t+=dt;$('reviveBox').classList.remove('hidden');$('reviveBar').style.width=Math.min(100,G.reviving.t/2*100)+'%';if(G.reviving.t>=2){emit('revive',{id:G.reviving.id});releaseInteract();}}
  }
  // remote players
  for(const id in G.players){const p=G.players[id],H=p.H;
    const prev=p.pos.x*1e3+p.pos.z,k=1-Math.exp(-dt*10),ox=p.pos.x,oz=p.pos.z;
    p.pos.lerp(p.tgt,k);const spd=Math.hypot(p.pos.x-ox,p.pos.z-oz)/Math.max(dt,.001);
    H.ph+=spd*dt*(p.anim===2?2.2:3.1);p.ryc=(p.ryc||0)+angDiff(p.ryc||0,p.ry||0)*k;
    H.g.position.copy(p.pos);H.g.rotation.y=p.ryc+Math.PI;H.fl=!!p.fl;H.cone.visible=!!p.fl&&!p.down;
    const code=p.down?7:(spd<.15&&(p.anim===1||p.anim===2)?0:(p.anim||0));poseHuman(H,code,dt,spd);
  }
  // widow
  if(WD.tx){const k=1-Math.exp(-dt*8);WD.pos.x+=(WD.tx.x-WD.pos.x)*k;WD.pos.y+=(WD.tx.y-WD.pos.y)*k;WD.pos.z+=(WD.tx.z-WD.pos.z)*k;WD.r+=angDiff(WD.r,WD.tx.r)*k;WD.al+=(WD.tx.al-WD.al)*k;WD.st=WD.tx.st;}
  let wx=WD.pos.x,wy=WD.pos.y,wz=WD.pos.z,wr=WD.r,wa=WD.al;
  if(G.cw){wx=G.cw.x;wy=G.cw.y;wz=G.cw.z;wr=G.cw.r;wa=1;}else if(c)wa=0;
  widow.g.position.set(wx,wy,wz);widow.g.rotation.y=wr;widow.setAlpha(clamp(wa,0,1));widow.setDark(!!(G.cw&&G.cw.dark));widow.anim(G.t,dt,G.cw?0:(WD.st||0));
  // tension
  let tt=0;if(!c&&wa>.25){const d=Math.hypot(G.pos.x-WD.pos.x,G.pos.z-WD.pos.z)+Math.abs(G.pos.y-WD.pos.y)*1.5;tt=clamp(1-d/14,0,1)*(WD.st===3?1.2:1);}
  G.tension=lerp(G.tension,Math.min(1,tt),Math.min(1,dt*3));
  $('fearOverlay').style.opacity=G.tension*.85;
  if(A.ctx&&A.mus)A.mus.tg.gain.setTargetAtTime(G.tension*.07,A.ctx.currentTime,.3);
  G.hbT-=dt;if(G.tension>.35&&G.hbT<=0){sfx('heart');G.hbT=lerp(1.2,.45,G.tension);}
  // HUD
  $('healthBar').style.width=clamp(G.hp,0,100)+'%';$('staminaBar').style.width=G.stam+'%';
  if(toastT>0){toastT-=dt;if(toastT<=0)$('toast').classList.add('hidden');}
  if(subT>0){subT-=dt;if(subT<=0)$('subtitle').classList.add('hidden');}
  teamT-=dt;if(teamT<=0){teamT=.5;let h='';for(const id in G.players){const p=G.players[id];h+='<div class="mate'+(p.down?' down':'')+'">'+p.name.replace(/</g,'')+(p.down?' (JATUH)':' '+Math.max(0,p.hp|0))+'</div>';}$('teamBox').innerHTML=h;updObjective();}
  // kirim posisi
  G.sendT=(G.sendT||0)+dt;
  if(G.sendT>=1/CONFIG.SEND_HZ&&G.sock&&G.sock.connected){G.sendT=0;
    const a=G.down?7:(G.interT>0?5:(G.tension>.7?6:(G.crouch?(moving?4:3):(run?2:(moving?1:0)))));
    G.sock.volatile.emit('move',[+G.pos.x.toFixed(2),+G.pos.y.toFixed(2),+G.pos.z.toFixed(2),+G.yaw.toFixed(2),a,G.fl?1:0]);}
}
function updateMenu(dt){
  if(G.mode==='char'&&PV){camera.position.set(40,1.35,63.2);camera.lookAt(40,1,60);PV.g.rotation.y=Math.sin(G.t*.8)*.7;PV.ph=PV.ph||0;poseHuman(PV,0,dt,0);}
  else{const a=G.t*.05;camera.position.set(Math.sin(a)*30,7+Math.sin(G.t*.1)*1.5,Math.cos(a)*30+4);camera.lookAt(0,3.5,0);}
}
function lights(dt){
  const st=G.st||{},game=G.mode==='game',power=game?!!st.power:true,sw=st.sw||{};
  G.flicker=Math.max(0,G.flicker-dt);const fk=G.flicker>0?(Math.random()<.5?.15:1):1,cp=camera.position;
  const arr=ROOMS.map(r=>{let on;if(!game)on=(r.id==='living'||r.id==='arga'||r.id==='kitchen');else on=power&&(!r.sw||sw[r.sw]!==0);
    const dx=r.p[0]-cp.x,dy=r.p[1]-cp.y,dz=r.p[2]-cp.z;return{r,on,d:dx*dx+dy*dy+dz*dz};});
  arr.sort((a,b)=>a.d-b.d);
  const mn=game?1:(Math.sin(G.t*7)>.93?.2:1);
  for(let i=0;i<pool.length;i++){const P=pool[i],a=arr[i];
    P.l.position.set(a.r.p[0],a.r.p[1],a.r.p[2]);P.l.color.setHex(a.r.c||0xffd2a0);
    const tgt=a.on?a.r.base*1.5*fk*mn:(a.r.c?a.r.base*.5:.12);P.l.intensity+=(tgt-P.l.intensity)*Math.min(1,dt*10);}
}
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000);last=now;G.t+=dt;
  if(G.mode==='game')updateGame(dt);else updateMenu(dt);
  updDyn(dt);lights(dt);audioListener();renderer.render(scene,camera);
}

/* ================= BOOT ================= */
function boot(){
  const tips=['Jangan menjauh dari tim.','Hantu bereaksi terhadap suara dan lari.','Pemain yang jatuh bisa dihidupkan kembali oleh teman.','Cahaya senter bisa membantu, tapi juga menarik perhatian.'];
  $('loadTip').textContent=tips[Math.random()*tips.length|0];
  const steps=[
    ['Menyiapkan mesin 3D...',()=>{initThree();buildMaterials();}],
    ['Membangun lingkungan...',buildWorld],
    ['Membangun rumah...',()=>{buildHouse();reg('gate','gate',-3,1.2,15.6,{r:2.8});}],
    ['Menyiapkan karakter...',()=>{widow=makeWidow();widow.setAlpha(0);scene.add(widow.g);selChar();applyGfx();bindAll();}],
    ['Selesai',()=>{}]
  ];
  let i=0;
  const run=()=>{
    if(i>=steps.length){
      G.carObj.position.set(-3,0,22);G.carObj.userData.ppl.visible=false;
      G.mode='menu';showScreen('screen-menu');musicMode('menu');connect();
      if(!CONFIG.SERVER_URL)setSrv('Server belum diatur (isi CONFIG.SERVER_URL di script.js)','bad');
      requestAnimationFrame(frame);return;}
    $('loadText').textContent=steps[i][0];$('loadBar').style.width=((i+1)/steps.length*100)+'%';
    setTimeout(()=>{try{steps[i][1]();i++;run();}catch(e){$('loadText').textContent='Error: '+e.message;console.error(e);}},40);
  };
  run();
  }
boot();
})();
  
