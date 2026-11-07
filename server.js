'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {Server}=require('socket.io');

const PORT=process.env.PORT||3000;
const MIN_PLAYERS=Math.max(1,Math.min(4,parseInt(process.env.MIN_PLAYERS||'3',10)||3));
const MAX_PLAYERS=4;
const ORIGIN=process.env.ALLOWED_ORIGIN||'*';
const HTML=['index.html','text/html; charset=utf-8'];
const FILES={'/':HTML,'/index.html':HTML,'/style.css':['style.css','text/css; charset=utf-8'],'/script.js':['script.js','application/javascript; charset=utf-8']};

const server=http.createServer((req,res)=>{
  const url=(req.url||'/').split('?')[0];
  if(url==='/health'){res.writeHead(200,{'Content-Type':'text/plain'});res.end('ok');return;}
  const f=Object.prototype.hasOwnProperty.call(FILES,url)?FILES[url]:null;
  if(!f){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
  fs.readFile(path.join(__dirname,f[0]),(err,data)=>{
    if(err){res.writeHead(200,{'Content-Type':'text/plain'});res.end('THE LAST HOUSE server berjalan. File game tidak ada di folder server.');return;}
    res.writeHead(200,{'Content-Type':f[1],'Cache-Control':'no-cache'});res.end(data);
  });
});
const io=new Server(server,{cors:{origin:ORIGIN},pingInterval:10000,pingTimeout:20000,maxHttpBufferSize:1e5});

/* ---------- util ---------- */
const rnd=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const r2=v=>Math.round(v*100)/100;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const CHARS=['arga','raka','dion','naya'];
const ITEM_NAMES={fuse:'Sekering',key_storage:'Kunci Gudang',photo:'Potongan Foto',tape:'Kaset Lama',key_brass:'Kunci Kuningan'};
const CUT_DUR={1:23.5,2:14.9,3:12.5,4:15.5,5:10.5};
const CHASE_CD=[0,0,60,45,25];
const level=o=>[0,1,2,2,3,3,4][o]||0;

/* ---------- peta (sinkron dengan script.js) ---------- */
// node: [x, z, y]
const NODES=[
  [-3,2.8,.15],[0,3,.15],[2,2.8,.15],[4,4.35,.15],[5,4.8,.15],
  [-4,.5,.15],[-4,-2,.15],[1,.5,.15],[0,-2.2,.15],[-2,-2,.15],
  [2,-3.5,.15],[4,-3.5,.15],[2,-.8,.15],[3,-.8,.15],
  [5,-.5,3],[5,-1.5,3],[1.5,-.5,3],[1.5,2.2,3],[-1.5,-1.5,3],
  [-3.5,-.5,3],[-3.5,2.2,3],[-3,5,3],[-3,6.2,3],[-3.5,-2.5,3],[-3.5,-3.7,3]
];
const EDGES=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[2,7],[7,8],[6,9],[9,8],[8,10],[10,11],[8,12],[12,13],[4,14],[14,15],[15,16],[16,17],[15,18],[18,19],[19,20],[20,21],[21,22],[18,23],[23,24]];
const ADJ=NODES.map(()=>[]);EDGES.forEach(e=>{ADJ[e[0]].push(e[1]);ADJ[e[1]].push(e[0]);});
const NODE_DOOR={10:'d_storage',12:'d_bath',16:'d_guest',19:'d_arga',21:'d_balc',23:'d_forbid'};
// region: [id, lantai(0=semua), x1, z1, x2, z2]
const REG=[
  ['stairs',0,4,-.5,6,5],['living',1,-6,.5,0,5],['family',1,0,.5,4,5],['kitchen',1,-6,-5,-2,.5],['dining',1,-2,-5,2,.5],
  ['bath',1,2,-2,4,.5],['storage',1,2,-5,6,-2],['hall',2,-6,-2.5,6,-.5],['arga',2,-6,-.5,-1,5],['guest',2,-1,-.5,4,5],
  ['balcony',2,-6,5,0,7.2],['forbid',2,-6,-5,-1,-2.5]
];
function regionOf(x,y,z){const fl=y>2.4?2:1;for(const r of REG){if((r[1]===0||r[1]===fl)&&x>=r[2]&&x<=r[4]&&z>=r[3]&&z<=r[5])return r[0];}return 'out';}
function sameRegion(a,b){const ra=regionOf(a.x,a.y,a.z);return ra!=='out'&&ra===regionOf(b.x,b.y,b.z)&&Math.abs(a.y-b.y)<2.6;}
function inView(p,x,y,z,maxD){const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d>maxD||Math.abs(y-p.y)>3)return false;if(d<.5)return true;return (dx*-Math.sin(p.yaw)+dz*-Math.cos(p.yaw))/d>.55;}
function nearest(x,y,z){let bi=0,bd=1e9;for(let i=0;i<NODES.length;i++){const n=NODES[i],d=Math.hypot(n[0]-x,n[1]-z)+Math.abs(n[2]-y)*2.2;if(d<bd){bd=d;bi=i;}}return bi;}

/* ---------- objek interaktif (sinkron dengan script.js) ---------- */
const OBJS={
  d_front:{t:'door',p:[-3,1.25,5],r:2.4},d_bath:{t:'door',p:[2,1.25,-.8],r:2.4},d_storage:{t:'door',p:[2,1.25,-3.5],r:2.4},
  d_arga:{t:'door',p:[-3.5,4.1,-.5],r:2.4},d_guest:{t:'door',p:[1.5,4.1,-.5],r:2.4},d_forbid:{t:'door',p:[-3.5,4.1,-2.5],r:2.4},d_balc:{t:'door',p:[-3,4.1,5],r:2.4},
  dr_k1:{t:'drawer',p:[-5.15,.8,-.8],r:2.1},dr_l1:{t:'drawer',p:[-5.15,.8,1.8],r:2.1},dr_b1:{t:'drawer',p:[3,.73,-.25],r:2.1},
  dr_a1:{t:'drawer',p:[-1.8,3.54,4.18],r:2.1},dr_g1:{t:'drawer',p:[1.3,3.4,4.25],r:2.1},
  sw_living:{t:'switch',p:[-2,1.3,4.88],r:1.9},sw_family:{t:'switch',p:[.12,1.3,1.5],r:1.9},sw_kitchen:{t:'switch',p:[-2.14,1.3,-3.6],r:1.9},
  sw_dining:{t:'switch',p:[1.88,1.3,-2.4],r:1.9},sw_hall2:{t:'switch',p:[3,4.3,-.62],r:1.9},sw_arga:{t:'switch',p:[-2.7,4.3,-.38],r:1.9},sw_guest:{t:'switch',p:[2.5,4.3,-.38],r:1.9},
  breaker:{t:'breaker',p:[-1.2,1.45,-4.7],r:2.1},tv:{t:'tv',p:[2,1,1.2],r:2.6},book:{t:'book',p:[-3.5,3.9,-4.2],r:2.1},
  note_k:{t:'note',p:[-3.6,.96,-2.6],r:2},note_a:{t:'note',p:[-1.8,3.82,4.4],r:2},
  painting:{t:'photo',p:[-4.4,1.6,1],r:2.4},photoFrame:{t:'photo',p:[-1.2,1.6,1],r:2.4},gate:{t:'gate',p:[-3,1.2,15.6],r:2.8}
};
const ITEMS={
  it_fuse:{item:'fuse',p:[-5.18,.87,-.8],dr:'dr_k1'},it_ph1:{item:'photo',p:[-5.18,.87,1.8],dr:'dr_l1'},
  it_keyst:{item:'key_storage',p:[3,.8,-.22],dr:'dr_b1'},it_k1:{item:'key_brass',p:[-1.8,3.61,4.2],dr:'dr_a1'},
  it_k2:{item:'key_brass',p:[1.3,3.47,4.28],dr:'dr_g1'},it_ph2:{item:'photo',p:[1.6,.68,.95]},
  it_ph3:{item:'photo',p:[-4.2,3.72,6.2]},it_tape:{item:'tape',p:[3.6,.93,-4.7]},it_k3:{item:'key_brass',p:[1.3,3.82,-2.25],obj:4}
};

/* ---------- room ---------- */
const rooms=new Map();
const CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genCode(){let s='';for(let i=0;i<5;i++)s+=CODE_CH[(Math.random()*CODE_CH.length)|0];return s;}
function newRoom(code){return{code,host:null,players:new Map(),phase:'lobby',st:null,W:null,cut:null,cutQ:[],flags:{},ai:false,loseT:0,lastTick:Date.now(),result:null};}
function cleanName(n){return String(n||'').replace(/[<>&"'`]/g,'').trim().slice(0,14)||'Player';}
function freeChar(room,want){const used=new Set([...room.players.values()].map(p=>p.char));if(CHARS.includes(want)&&!used.has(want))return want;return CHARS.find(c=>!used.has(c))||'arga';}
function addPlayer(room,socket,d){
  const id=crypto.randomBytes(4).toString('hex'),token=crypto.randomBytes(12).toString('hex');
  const p={id,token,name:cleanName(d.name),char:freeChar(room,d.char),ready:false,sid:socket.id,connected:true,discAt:0,x:-3,y:.15,z:14.3,yaw:0,anim:0,fl:0,hp:100,down:false,lastMove:Date.now(),viol:0,noiseT:0};
  room.players.set(id,p);socket.join(room.code);socket.data.code=room.code;socket.data.pid=id;return p;
}
function roomInfo(room){return{code:room.code,host:room.host,min:MIN_PLAYERS,max:MAX_PLAYERS,players:[...room.players.values()].filter(p=>p.connected).map(p=>({id:p.id,name:p.name,char:p.char,ready:p.ready}))};}
function sendRoom(room){io.to(room.code).emit('room',roomInfo(room));}
function ctx(s){const room=rooms.get(s.data.code);if(!room)return null;const p=room.players.get(s.data.pid);return p?{room,p}:null;}
function removePlayer(room,id){
  const p=room.players.get(id);if(!p)return;room.players.delete(id);
  const s=p.sid&&io.sockets.sockets.get(p.sid);if(s){s.leave(room.code);if(s.data.pid===id){s.data.code=null;s.data.pid=null;}}
  if(room.players.size===0){rooms.delete(room.code);return;}
  if(room.host===id){const n=[...room.players.values()].find(q=>q.connected)||[...room.players.values()][0];room.host=n.id;}
  if(room.phase==='lobby')sendRoom(room);
  else{io.to(room.code).emit('evt',{t:'left',id});if(room.cut)cutDone(room,id,room.cut.id);}
}
function leave(socket){const c=ctx(socket);if(c)removePlayer(c.room,c.p.id);socket.data.code=null;socket.data.pid=null;}

/* ---------- state ---------- */
const emitState=room=>io.to(room.code).emit('state',room.st);
const snd=(room,n,x,y,z)=>io.to(room.code).emit('evt',{t:'sound',n,x,y,z});
const all=(room,m,d)=>io.to(room.code).emit('evt',{t:'toast',m,d:d||3});
const toastTo=(sock,m,d)=>sock.emit('evt',{t:'toast',m,d:d||2.5});
const flicker=(room,d)=>io.to(room.code).emit('evt',{t:'flicker',d:d||1.2});
const dstate=(room,id)=>room.st.doors[id]||(room.st.doors[id]={});
const invCount=(room,item)=>room.st.inv.filter(i=>i.item===item).length;
function invTake(room,item,n){for(let k=0;k<n;k++){const i=room.st.inv.findIndex(x=>x.item===item);if(i>=0){room.st.items[room.st.inv[i].id]=1;room.st.inv.splice(i,1);}}}
function initState(room){
  room.st={doors:{d_storage:{l:1},d_forbid:{l:1}},dr:{},items:{},inv:[],sw:{},tv:0,power:0,obj:0,cuts:{}};
  room.flags={photos:new Set(),keyst:false,tape:false,forbid:false,book:false,cq:{}};
  room.cut=null;room.cutQ=[];room.ai=false;room.loseT=0;room.result=null;
}
function advance(room){
  const st=room.st,f=room.flags;let ch=true;
  while(ch){ch=false;
    if(st.obj===0&&st.power){st.obj=1;ch=true;}
    else if(st.obj===1&&f.photos.size>=3){st.obj=2;ch=true;}
    else if(st.obj===2&&f.keyst){st.obj=3;ch=true;}
    else if(st.obj===3&&f.tape){st.obj=4;ch=true;}
    else if(st.obj===4&&f.forbid){st.obj=5;ch=true;}
    else if(st.obj===5&&f.book){st.obj=6;st.doors.d_front={o:0,l:0};ch=true;}
  }
}

/* ---------- cutscene ---------- */
function startCut(room,id,opts){
  opts=opts||{};if(room.flags.cq[id])return;room.flags.cq[id]=1;
  if(room.cut){room.cutQ.push([id,opts]);return;}
  beginCut(room,id,opts);
}
function beginCut(room,id,opts){
  const wait=new Set();room.players.forEach(p=>{if(p.connected)wait.add(p.id);});
  room.cut={id,wait,until:Date.now()+(CUT_DUR[id]+12)*1000,after:opts.after};
  io.to(room.code).emit('evt',{t:'cut',id});   // kirim evt dulu, baru state (agar foto tidak berubah sebelum cutscene)
  if(opts.mut)opts.mut();
  room.st.cuts[id]=true;room.W.al=0;emitState(room);
}
function cutDone(room,pid,id){const c=room.cut;if(!c||c.id!==id)return;c.wait.delete(pid);if(c.wait.size===0)finishCut(room);}
function finishCut(room){
  const c=room.cut;if(!c)return;room.cut=null;
  if(c.id===1)room.st.cuts[1]=true;
  const W=room.W;
  if(c.id===2){room.ai=true;toHidden(W,rnd(6,10));W.ambT=rnd(18,28);W.phoneT=16;}
  else if(c.id>=3&&room.ai)toHidden(W,rnd(8,14));
  if(c.after)c.after();
  advance(room);emitState(room);
  const q=room.cutQ.shift();if(q)beginCut(room,q[0],q[1]);
}

/* ---------- aksi pemain ---------- */
function act(room,p,sock,id){
  if(room.phase!=='playing'||p.down)return;
  if(room.cut&&room.cut.wait.has(p.id))return;
  const st=room.st;let t,pos,r=2.1;
  if(own(ITEMS,id)){t='pick';const cur=st.items[id];pos=Array.isArray(cur)?cur:ITEMS[id].p;}
  else if(own(OBJS,id)){t=OBJS[id].t;pos=OBJS[id].p;r=OBJS[id].r;}
  else return;
  if(Math.hypot(p.x-pos[0],p.y+1.3-pos[1],p.z-pos[2])>r+.9)return;
  let dirty=false;
  switch(t){
    case 'door':{
      const d=dstate(room,id);
      if(d.l){
        if(id==='d_storage'&&invCount(room,'key_storage')>0){invTake(room,'key_storage',1);d.l=0;d.o=1;all(room,p.name+' membuka pintu gudang.');snd(room,'door',pos[0],pos[1],pos[2]);dirty=true;}
        else if(id==='d_forbid'){
          const n=invCount(room,'key_brass');
          if(n>=3){startCut(room,4,{mut:()=>{invTake(room,'key_brass',3);const q=dstate(room,'d_forbid');q.l=0;q.o=1;room.flags.forbid=true;advance(room);}});}
          else toastTo(sock,'Terkunci. Butuh 3 Kunci Kuningan ('+n+'/3).',3);
        }
        else if(id==='d_front')toastTo(sock,'Pintu depan tidak mau terbuka... seolah ditahan dari luar.',3);
        else toastTo(sock,'Pintu terkunci.');
        break;
      }
      d.o=d.o?0:1;snd(room,'door',pos[0],pos[1],pos[2]);hear(room,pos[0],pos[1],pos[2],16);dirty=true;break;
    }
    case 'drawer':st.dr[id]=st.dr[id]?0:1;snd(room,'creak',pos[0],pos[1],pos[2]);hear(room,pos[0],pos[1],pos[2],8);dirty=true;break;
    case 'pick':{
      const it=ITEMS[id],cur=st.items[id];if(cur===1)return;
      if(!Array.isArray(cur)){if(it.dr&&!st.dr[it.dr])return;if(it.obj&&st.obj<it.obj)return;}
      st.items[id]=1;st.inv.push({id,item:it.item});snd(room,'pick',pos[0],pos[1],pos[2]);
      if(it.item==='photo'){room.flags.photos.add(id);all(room,p.name+' mengambil Potongan Foto ('+Math.min(3,room.flags.photos.size)+'/3).');if(!st.cuts[3])startCut(room,3);}
      else{if(it.item==='key_storage')room.flags.keyst=true;all(room,p.name+' mengambil '+ITEM_NAMES[it.item]+'.');}
      dirty=true;break;
    }
    case 'switch':
      if(!st.power){toastTo(sock,'Listrik padam. Cari sekering dan nyalakan panel listrik.',3);break;}
      st.sw[id]=st.sw[id]===0?1:0;snd(room,'click',pos[0],pos[1],pos[2]);dirty=true;break;
    case 'breaker':
      if(st.power){toastTo(sock,'Listrik sudah menyala.');break;}
      if(invCount(room,'fuse')<1){toastTo(sock,'Panel listrik butuh sekering. Coba periksa laci dapur.',3.5);break;}
      invTake(room,'fuse',1);st.power=1;all(room,p.name+' menyalakan listrik rumah.');snd(room,'power',pos[0],pos[1],pos[2]);flicker(room,1.5);dirty=true;break;
    case 'tv':
      if(invCount(room,'tape')>0&&!st.tv){
        invTake(room,'tape',1);st.tv=1;room.flags.tape=true;dirty=true;
        const say=(ms,m)=>setTimeout(()=>{if(rooms.get(room.code)===room)io.to(room.code).emit('evt',{t:'sub',m,d:4.5});},ms);
        say(300,'REKAMAN: "Kalau kamu mendengar ini, Arga... jangan buka kamar belakang."');
        say(5200,'REKAMAN: "Tiga kunci kuningan menjaganya: kamar Arga, kamar tamu, dan meja lorong atas."');
      }else{st.tv=st.tv?0:1;dirty=true;}
      snd(room,'tv',pos[0],pos[1],pos[2]);hear(room,pos[0],pos[1],pos[2],14);break;
    case 'photo':if(id==='photoFrame'&&!st.cuts[3])startCut(room,3);break;
    case 'book':
      if(st.obj<5){toastTo(sock,'Buku tua ini tertutup rapat. Belum waktunya.',3);break;}
      if(st.cuts[5]){toastTo(sock,'Namamu tertulis di halaman terakhir...',3);break;}
      startCut(room,5,{after:()=>{room.flags.book=true;}});break;
    case 'gate':{
      if(st.obj<6){toastTo(sock,'Gerbang terkunci rantai berkarat. Selesaikan misteri rumah dulu.',3.5);break;}
      const far=[...room.players.values()].find(q=>q.connected&&(q.down||Math.hypot(q.x+3,q.z-15.6)>12));
      if(far){all(room,'Tunggu timmu! '+far.name+' belum sampai gerbang.',3);break;}
      endGame(room,true,'Kalian berhasil keluar dari rumah itu. Tapi nama Arga masih tertulis di buku itu.');break;
    }
  }
  if(dirty){advance(room);emitState(room);}
}
function endGame(room,win,text){if(room.phase!=='playing')return;room.phase='ended';room.result={win,text};io.to(room.code).emit('end',room.result);}

/* ---------- AI THE WIDOW ---------- */
// st: 0 idle, 1 patrol, 2 investigate, 3 chase, 4 search, 5 disappear(hidden), 6 scare/watch
function newWidow(){return{x:5,y:3,z:-1.5,r:0,al:0,st:5,node:15,path:[],seg:null,pause:0,timer:10,tgt:null,huntT:0,speed:1.2,lastChase:-1e9,hitCd:0,lost:0,chaseT:0,replanT:0,seeT:0,look:0,moveT:5,relocT:0,relocTo:0,ambT:25,phoneT:0,invCd:0,lastSeen:15};}
function place(W,n){const q=NODES[n];W.x=q[0];W.z=q[1];W.y=q[2];W.node=n;W.path=[];W.seg=null;W.pause=0;}
function toHidden(W,s){W.st=5;W.al=0;W.timer=s;W.path=[];W.seg=null;W.relocT=0;W.huntT=0;}
const alive=room=>[...room.players.values()].filter(p=>p.connected&&!p.down);
function nearestP(W,T){let b=null,bd=1e9;for(const p of T){const d=Math.hypot(p.x-W.x,p.z-W.z)+Math.abs(p.y-W.y)*3;if(d<bd){bd=d;b=p;}}return b;}
const canSee=(W,p)=>sameRegion(W,p)&&Math.hypot(W.x-p.x,W.z-p.z)<13;
function route(room,a,b){
  if(a===b)return [];
  const n=NODES.length,dist=new Array(n).fill(Infinity),prev=new Array(n).fill(-1),done=new Array(n).fill(false);dist[a]=0;
  for(;;){
    let u=-1,best=Infinity;for(let i=0;i<n;i++)if(!done[i]&&dist[i]<best){best=dist[i];u=i;}
    if(u<0||u===b)break;done[u]=true;
    for(const v of ADJ[u]){
      const dn=NODE_DOOR[v];if(dn&&v!==b){const d=room.st.doors[dn];if(d&&d.l)continue;}
      const w=Math.hypot(NODES[u][0]-NODES[v][0],NODES[u][1]-NODES[v][1])+Math.abs(NODES[u][2]-NODES[v][2])*2;
      if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u;}
    }
  }
  if(prev[b]<0)return [];
  const p=[];for(let c=b;c!==a;c=prev[c])p.unshift(c);return p;
}
function lockedNode(room,i){const d=room.st.doors;return (i===24&&d.d_forbid&&d.d_forbid.l)||(i===11&&d.d_storage&&d.d_storage.l);}
function pickNode(room,T,o){
  const c=[];
  for(let i=0;i<NODES.length;i++){
    if(lockedNode(room,i))continue;
    const q=NODES[i];let dm=1e9,seen=false;
    for(const p of T){dm=Math.min(dm,Math.hypot(q[0]-p.x,q[1]-p.z)+Math.abs(q[2]-p.y)*3);if(o.hidden&&inView(p,q[0],q[2],q[1],22)&&regionOf(q[0],q[2],q[1])===regionOf(p.x,p.y,p.z))seen=true;}
    if(dm<o.min||dm>o.max||seen)continue;
    if(o.reach!==undefined&&i!==o.reach&&!route(room,i,o.reach).length)continue;
    c.push(i);
  }
  if(!c.length)return -1;
  if(o.pref){const pc=c.filter(i=>o.pref.includes(i));if(pc.length&&Math.random()<.6)return pc[(Math.random()*pc.length)|0];}
  return c[(Math.random()*c.length)|0];
}
function stepWidow(room,W,dt){
  if(W.pause>0){W.pause-=dt;return false;}
  let rem=W.speed*dt;
  while(rem>0){
    if(!W.seg){
      if(!W.path.length)return true;
      const n=W.path[0],dn=NODE_DOOR[n];
      if(dn){const d=dstate(room,dn);if(d.l){W.path=[];return true;}
        if(!d.o){d.o=1;const q=NODES[n];snd(room,'door',q[0],q[2]+1.1,q[1]);emitState(room);W.pause=.8;return false;}}
      W.path.shift();const t=NODES[n];
      W.seg={ax:W.x,az:W.z,ay:W.y,bx:t[0],bz:t[1],by:t[2],len:Math.hypot(t[0]-W.x,t[1]-W.z)||.0001,d:0,n};
      W.r=Math.atan2(t[0]-W.x,t[1]-W.z);
    }
    const s=W.seg,left=s.len-s.d;
    if(rem>=left){rem-=left;W.x=s.bx;W.z=s.bz;W.y=s.by;W.node=s.n;W.seg=null;}
    else{s.d+=rem;rem=0;const f=s.d/s.len;W.x=s.ax+(s.bx-s.ax)*f;W.z=s.az+(s.bz-s.az)*f;W.y=s.ay+(s.by-s.ay)*f;}
  }
  return false;
}
function hear(room,x,y,z,rad){
  const W=room.W;if(!W||!room.ai||room.cut||room.phase!=='playing')return;
  const lv=level(room.st.obj);if(lv<2||W.invCd>0||W.st===3||W.st===6)return;
  const tn=nearest(x,y,z);
  if(W.st===5){
    if(Math.random()>.35)return;
    const n=pickNode(room,alive(room),{min:8,max:30,hidden:true,reach:tn});if(n<0)return;
    place(W,n);W.al=1;
  }else if(Math.hypot(W.x-x,W.z-z)+Math.abs(W.y-y)*3>rad)return;
  const path=route(room,W.node,tn);
  if(!path.length){if(W.st===5)toHidden(W,6);return;}
  W.invCd=18;W.st=2;W.speed=1.8;W.path=path;W.seg=null;W.al=1;
}
function ambient(room,T){
  const n=pickNode(room,T,{min:8,max:80});if(n<0)return;
  const q=NODES[n],list=['creak','knock','whisper','door'];
  snd(room,list[(Math.random()*list.length)|0],q[0],q[2]+1.2,q[1]);
}
function startChase(room,p,now,lv){
  const W=room.W;W.st=3;W.tgt=p.id;W.al=1;W.lastChase=now;W.chaseT=0;W.lost=0;W.path=[];W.seg=null;W.replanT=0;W.speed=3+.25*lv;
  snd(room,'sting',W.x,W.y+1.5,W.z);flicker(room,1.5);
}
function hitPlayer(room,p,now){
  const W=room.W;p.hp-=34;W.hitCd=2;
  io.to(room.code).emit('evt',{t:'hit',id:p.id});snd(room,'scream',W.x,W.y+1.6,W.z);flicker(room,1);
  if(p.hp<=0){p.hp=0;p.down=true;all(room,p.name+' jatuh! Hidupkan dia kembali.',4);}
  W.lastChase=now;toHidden(W,rnd(10,16));
}
function emerge(room,now,lv,T){
  const W=room.W;if(!T.length){W.timer=4;return;}
  const canHunt=lv>=2&&now-W.lastChase>CHASE_CD[lv]*1000,r=Math.random();
  if(canHunt&&r<.35+.12*lv){
    const tg=T[(Math.random()*T.length)|0],n=pickNode(room,T,{min:9,max:40,hidden:true,reach:nearest(tg.x,tg.y,tg.z)});
    if(n<0){W.timer=5;return;}
    place(W,n);W.al=1;W.st=0;W.timer=1.5;W.huntT=38;W.tgt=tg.id;W.speed=1.3;
  }else if(r<.9){
    const n=pickNode(room,T,{min:6,max:16,hidden:true,pref:[15,18]});
    if(n<0){W.timer=5;return;}
    place(W,n);W.al=1;W.st=6;W.timer=14;W.look=0;W.moveT=rnd(4,6);flicker(room,.8);
  }else{ambient(room,T);W.timer=rnd(12,24);}
}
function aiTick(room,now,dt){
  const W=room.W,st=room.st,lv=level(st.obj),T=alive(room);
  W.hitCd-=dt;W.ambT-=dt;W.invCd-=dt;
  if(W.phoneT>0){W.phoneT-=dt;if(W.phoneT<=0){const q=NODES[0];snd(room,'phone',q[0],q[2]+1,q[1]);}}
  if(W.ambT<=0){W.ambT=rnd(22,45)/(1+.15*lv);ambient(room,T);}
  if(W.st===0||W.st===1||W.st===2||W.st===4){
    let seen=null;
    if(lv>=2&&W.al>.5&&now-W.lastChase>CHASE_CD[lv]*1000)for(const p of T){if(canSee(W,p)){seen=p;break;}}
    W.seeT=seen?W.seeT+dt:0;
    if(seen&&W.seeT>.9){startChase(room,seen,now,lv);return;}
  }
  switch(W.st){
    case 5:W.al=0;W.timer-=dt;if(W.timer<=0)emerge(room,now,lv,T);break;
    case 0:{
      W.timer-=dt;const n=nearestP(W,T);if(n)W.r=Math.atan2(n.x-W.x,n.z-W.z);
      if(W.timer<=0){
        if(W.huntT>0){
          const tg=room.players.get(W.tgt),t2=(tg&&tg.connected&&!tg.down)?tg:T[0];
          if(!t2){toHidden(W,10);break;}
          W.path=route(room,W.node,nearest(t2.x,t2.y,t2.z));W.seg=null;W.speed=1.3;
          if(W.path.length)W.st=1;else{W.huntT-=4;W.timer=1.5;}
        }else toHidden(W,rnd(15,30));
      }
      break;
    }
    case 1:{
      W.huntT-=dt;const arr=stepWidow(room,W,dt);
      if(W.huntT<=0){toHidden(W,rnd(15,30));break;}
      if(arr){W.st=0;W.timer=rnd(1.5,3);}
      break;
    }
    case 2:{const arr=stepWidow(room,W,dt);if(arr){W.st=4;W.timer=rnd(6,9);W.path=[];W.seg=null;}break;}
    case 4:{
      W.timer-=dt;
      if(W.path.length||W.seg)stepWidow(room,W,dt);
      else if(W.timer>3&&Math.random()<dt*.5){const nb=ADJ[W.node];W.path=[nb[(Math.random()*nb.length)|0]];W.speed=1.4;}
      if(W.timer<=0)toHidden(W,rnd(12,25));
      break;
    }
    case 3:{
      W.chaseT+=dt;
      let tg=room.players.get(W.tgt);
      if(!tg||!tg.connected||tg.down){tg=null;for(const p of T){if(canSee(W,p)){tg=p;W.tgt=p.id;break;}}}
      if(tg){
        if(canSee(W,tg)){
          W.lost=0;W.lastSeen=nearest(tg.x,tg.y,tg.z);
          const dx=tg.x-W.x,dz=tg.z-W.z,d=Math.hypot(dx,dz);
          if(d>.1){const s=Math.min(d,W.speed*dt);W.x+=dx/d*s;W.z+=dz/d*s;W.r=Math.atan2(dx,dz);}
          W.y+=(tg.y-W.y)*Math.min(1,dt*6);W.path=[];W.seg=null;W.node=nearest(W.x,W.y,W.z);
        }else{
          W.lost+=dt;W.replanT-=dt;
          if(W.replanT<=0||(!W.path.length&&!W.seg)){W.replanT=.6;W.path=route(room,nearest(W.x,W.y,W.z),nearest(tg.x,tg.y,tg.z));W.seg=null;}
          stepWidow(room,W,dt);
        }
        if(W.hitCd<=0&&Math.hypot(W.x-tg.x,W.z-tg.z)<1.25&&Math.abs(W.y-tg.y)<1.6){hitPlayer(room,tg,now);break;}
      }else W.lost=99;
      if(W.lost>5||W.chaseT>28){W.lastChase=now;W.st=4;W.timer=7;W.path=route(room,nearest(W.x,W.y,W.z),W.lastSeen);W.seg=null;W.speed=1.6;}
      break;
    }
    case 6:{
      W.timer-=dt;
      if(W.relocT>0){
        W.relocT-=dt;
        if(W.relocT<=0){place(W,W.relocTo);W.al=1;}
        break;
      }
      const nr=nearestP(W,T);if(nr)W.r=Math.atan2(nr.x-W.x,nr.z-W.z);
      let looked=false;for(const p of T){if(sameRegion(W,p)&&inView(p,W.x,W.y,W.z,22)){looked=true;break;}}
      W.look=looked?W.look+dt:Math.max(0,W.look-dt*.5);
      if(W.look>1.4||W.timer<=0){snd(room,'whisper',W.x,W.y+1.5,W.z);flicker(room,.8);toHidden(W,rnd(14,30)/(1+.1*lv));break;}
      if(lv>=3&&nr&&sameRegion(W,nr)&&Math.hypot(W.x-nr.x,W.z-nr.z)<6&&now-W.lastChase>CHASE_CD[lv]*1000){startChase(room,nr,now,lv);break;}
      W.moveT-=dt;
      if(!looked&&W.moveT<=0&&nr){
        W.moveT=rnd(4,7);const p=route(room,W.node,nearest(nr.x,nr.y,nr.z));
        if(p.length&&!lockedNode(room,p[0])){W.relocTo=p[0];W.relocT=.6;W.al=0;}
      }
      break;
    }
  }
}

/* ---------- tick ---------- */
function tick(room,now,dt){
  const st=room.st,W=room.W;
  if(room.cut&&now>room.cut.until)finishCut(room);
  if(!room.cut&&st.cuts[1]&&!st.cuts[2]){
    for(const p of room.players.values()){
      if(p.connected&&p.y<2.4&&p.x>-5.8&&p.x<5.8&&p.z<4.3&&p.z>-4.8){startCut(room,2,{mut:()=>{st.doors.d_front={o:0,l:1};}});break;}
    }
  }
  if(room.cut||!room.ai)W.al=0;else aiTick(room,now,dt);
  const conn=[...room.players.values()].filter(p=>p.connected);
  if(conn.length&&conn.every(p=>p.down)){room.loseT+=dt;if(room.loseT>3)endGame(room,false,'Semua pemain jatuh. Rumah itu mengingat kalian.');}
  else room.loseT=0;
  if(room.phase!=='playing')return;
  const P={};
  room.players.forEach(p=>{if(p.connected)P[p.id]={x:r2(p.x),y:r2(p.y),z:r2(p.z),r:r2(p.yaw),a:p.anim,f:p.fl,hp:p.hp,d:p.down?1:0};});
  io.to(room.code).volatile.emit('pstate',{p:P,w:{x:r2(W.x),y:r2(W.y),z:r2(W.z),r:r2(W.r),al:W.al,st:W.st}});
}
setInterval(()=>{
  const now=Date.now();
  for(const room of rooms.values()){
    if(room.phase!=='playing')continue;
    const dt=Math.min(.25,(now-room.lastTick)/1000);room.lastTick=now;
    try{tick(room,now,dt);}catch(e){console.error('tick error',e);}
  }
},80);
setInterval(()=>{
  const now=Date.now();
  for(const room of [...rooms.values()]){
    for(const p of [...room.players.values()]){
      if(!p.connected&&now-p.discAt>(room.phase==='lobby'?15000:90000))removePlayer(room,p.id);
    }
  }
},5000);

/* ---------- start game ---------- */
function startGame(room){
  initState(room);room.phase='playing';room.W=newWidow();place(room.W,15);toHidden(room.W,10);room.lastTick=Date.now();
  const list=[...room.players.values()];
  list.forEach((p,i)=>{p.x=-4.5+i;p.y=.15;p.z=14.3;p.yaw=0;p.anim=0;p.fl=0;p.hp=100;p.down=false;p.ready=false;p.lastMove=Date.now();p.viol=0;});
  const wait=new Set();list.forEach(p=>{if(p.connected)wait.add(p.id);});
  room.flags.cq[1]=1;room.cut={id:1,wait,until:Date.now()+(CUT_DUR[1]+12)*1000,after:null};
  const pl=list.map(p=>({id:p.id,name:p.name,char:p.char,x:p.x,y:p.y,z:p.z}));
  list.forEach(p=>{if(p.connected)io.to(p.sid).emit('start',{spawn:[p.x,p.z,p.y],players:pl,st:room.st,rejoin:false});});
}

/* ---------- socket ---------- */
io.on('connection',socket=>{
  socket.data.lim={t:Date.now(),n:0};
  const lim=()=>{const L=socket.data.lim,n=Date.now();if(n-L.t>1000){L.t=n;L.n=0;}return ++L.n>90;};
  const cbf=cb=>typeof cb==='function'?cb:()=>{};

  socket.on('create',(d,cb)=>{
    cb=cbf(cb);if(lim())return cb({ok:false,err:'Terlalu cepat.'});
    if(rooms.size>=300)return cb({ok:false,err:'Server penuh, coba lagi nanti.'});
    d=d||{};leave(socket);
    let code;do{code=genCode();}while(rooms.has(code));
    const room=newRoom(code);rooms.set(code,room);
    const p=addPlayer(room,socket,d);room.host=p.id;
    cb({ok:true,id:p.id,token:p.token,code});sendRoom(room);
  });
  socket.on('join',(d,cb)=>{
    cb=cbf(cb);if(lim())return cb({ok:false,err:'Terlalu cepat.'});
    d=d||{};const code=String(d.code||'').toUpperCase().trim(),room=rooms.get(code);
    if(!room)return cb({ok:false,err:'Room tidak ditemukan.'});
    if(room.phase!=='lobby')return cb({ok:false,err:'Permainan sudah berjalan.'});
    if(room.players.size>=MAX_PLAYERS)return cb({ok:false,err:'Room penuh.'});
    leave(socket);
    const p=addPlayer(room,socket,d);
    cb({ok:true,id:p.id,token:p.token,code});sendRoom(room);
  });
  socket.on('rejoin',(d,cb)=>{
    cb=cbf(cb);d=d||{};
    const room=rooms.get(String(d.code||'').toUpperCase());if(!room)return cb({ok:false});
    const p=room.players.get(String(d.id||''));if(!p||p.token!==d.token)return cb({ok:false});
    if(p.sid&&p.sid!==socket.id){const old=io.sockets.sockets.get(p.sid);if(old){old.data.code=null;old.data.pid=null;old.leave(room.code);}}
    p.sid=socket.id;p.connected=true;p.discAt=0;socket.join(room.code);socket.data.code=room.code;socket.data.pid=p.id;
    cb({ok:true});
    if(room.phase==='lobby')sendRoom(room);
    else if(room.phase==='ended'&&room.result)socket.emit('end',room.result);
    else{
      const pl=[...room.players.values()].map(q=>({id:q.id,name:q.name,char:q.char,x:q.x,y:q.y,z:q.z}));
      socket.emit('start',{spawn:[p.x,p.z,p.y],players:pl,st:room.st,rejoin:true});
      socket.to(room.code).emit('evt',{t:'joined',p:{id:p.id,name:p.name,char:p.char,x:p.x,y:p.y,z:p.z}});
    }
  });
  socket.on('ready',v=>{if(lim())return;const c=ctx(socket);if(!c||c.room.phase!=='lobby')return;c.p.ready=!!v;sendRoom(c.room);});
  socket.on('char',v=>{
    if(lim())return;const c=ctx(socket);if(!c||c.room.phase!=='lobby')return;
    if(!CHARS.includes(v))return;
    if([...c.room.players.values()].some(q=>q.id!==c.p.id&&q.char===v))return;
    c.p.char=v;sendRoom(c.room);
  });
  socket.on('start',()=>{
    if(lim())return;const c=ctx(socket);if(!c)return;const room=c.room;
    if(room.phase!=='lobby'||room.host!==c.p.id)return;
    const conn=[...room.players.values()].filter(p=>p.connected);
    if(conn.length<MIN_PLAYERS)return;
    if(!conn.every(p=>p.id===room.host||p.ready))return;
    startGame(room);
  });
  socket.on('leave',()=>{leave(socket);});
  socket.on('move',a=>{
    if(lim())return;const c=ctx(socket);if(!c||c.room.phase!=='playing')return;const p=c.p;
    if(!Array.isArray(a)||a.length<6)return;
    let x=+a[0],y=+a[1],z=+a[2];const yaw=+a[3],an=a[4]|0,fl=a[5]?1:0;
    if(!isFinite(x)||!isFinite(y)||!isFinite(z)||!isFinite(yaw))return;
    x=clamp(x,-90,90);y=clamp(y,-1,4);z=clamp(z,-70,90);
    const now=Date.now(),dt=Math.min(3,Math.max(.02,(now-p.lastMove)/1000));p.lastMove=now;
    if(Math.hypot(x-p.x,z-p.z)>8*dt+1.2&&p.viol<6){p.viol++;return;}
    p.viol=0;p.x=x;p.y=y;p.z=z;p.yaw=yaw;p.anim=clamp(an,0,7);p.fl=fl;
    if(p.anim===2&&now-p.noiseT>1200){p.noiseT=now;hear(c.room,x,y,z,13);}
  });
  socket.on('act',d=>{if(lim())return;const c=ctx(socket);if(!c||!d||typeof d.id!=='string')return;act(c.room,c.p,socket,d.id);});
  socket.on('drop',d=>{
    if(lim())return;const c=ctx(socket);if(!c||!d||c.room.phase!=='playing'||c.p.down)return;
    const room=c.room,p=c.p,i=room.st.inv.findIndex(q=>q.id===d.id);if(i<0)return;
    const x=+d.x,z=+d.z;if(!isFinite(x)||!isFinite(z))return;
    room.st.inv.splice(i,1);room.st.items[d.id]=[r2(clamp(x,p.x-2.5,p.x+2.5)),r2(p.y+.03),r2(clamp(z,p.z-2.5,p.z+2.5))];
    snd(room,'pick',p.x,p.y+.5,p.z);emitState(room);
  });
  socket.on('revive',d=>{
    if(lim())return;const c=ctx(socket);if(!c||!d||c.room.phase!=='playing'||c.p.down)return;
    const t=c.room.players.get(String(d.id));if(!t||!t.down)return;
    if(Math.hypot(t.x-c.p.x,t.z-c.p.z)>3.2||Math.abs(t.y-c.p.y)>2)return;
    t.down=false;t.hp=40;all(c.room,t.name+' dihidupkan kembali oleh '+c.p.name+'.',3);
  });
  socket.on('cutDone',d=>{if(lim())return;const c=ctx(socket);if(!c||!d)return;cutDone(c.room,c.p.id,d.id|0);});
  socket.on('disconnect',()=>{
    const c=ctx(socket);if(!c)return;
    c.p.connected=false;c.p.discAt=Date.now();
    if(c.room.phase==='lobby')sendRoom(c.room);
    else{io.to(c.room.code).emit('evt',{t:'left',id:c.p.id});if(c.room.cut)cutDone(c.room,c.p.id,c.room.cut.id);}
  });
});

server.listen(PORT,()=>console.log('THE LAST HOUSE server berjalan di port '+PORT+' (min pemain: '+MIN_PLAYERS+')'));
   
