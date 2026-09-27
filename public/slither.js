// slither.js - Slither.io Web Client
(function(){
'use strict';
const COLORS=['#ff1744','#00e676','#00e5ff','#ffea00','#d500f9','#ff9100','#3d5afe','#00bfa5','#ff6d00','#76ff03'];
const state={
  username:localStorage.getItem('portal_username')||'Yılan_'+Math.floor(100+Math.random()*900),
  ws:null,myId:null,color:COLORS[Math.floor(Math.random()*COLORS.length)],
  players:[],foods:[],leaderboard:[],worldW:4000,worldH:4000,
  cam:{x:2000,y:2000},mouse:{x:0,y:0},boosting:false,alive:false,score:0
};
const canvas=document.getElementById('slither-canvas');
const ctx=canvas.getContext('2d');
const mm=document.getElementById('slither-minimap');
const mctx=mm.getContext('2d');

function resize(){canvas.width=innerWidth;canvas.height=innerHeight}
addEventListener('resize',resize);resize();

// Color picker
const co=document.getElementById('color-options');
COLORS.forEach(c=>{
  const d=document.createElement('div');d.className='color-dot'+(c===state.color?' selected':'');
  d.style.background=c;d.style.boxShadow='0 0 8px '+c;
  d.onclick=()=>{state.color=c;document.querySelectorAll('.color-dot').forEach(x=>x.classList.remove('selected'));d.classList.add('selected')};
  co.appendChild(d);
});

// Input
addEventListener('mousemove',e=>{state.mouse.x=e.clientX;state.mouse.y=e.clientY});
addEventListener('mousedown',e=>{if(e.button===0)state.boosting=true});
addEventListener('mouseup',e=>{if(e.button===0)state.boosting=false});
addEventListener('keydown',e=>{if(e.code==='KeyW')state.boosting=true});
addEventListener('keyup',e=>{if(e.code==='KeyW')state.boosting=false});
addEventListener('touchstart',()=>{state.boosting=true});
addEventListener('touchend',()=>{state.boosting=false});
addEventListener('touchmove',e=>{state.mouse.x=e.touches[0].clientX;state.mouse.y=e.touches[0].clientY});

document.getElementById('btn-play-slither').onclick=()=>{
  document.getElementById('slither-modal').classList.add('hidden');joinGame();
};
document.getElementById('btn-respawn').onclick=()=>{
  document.getElementById('slither-death').classList.add('hidden');joinGame();
};

function initWS(){
  const ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host);
  state.ws=ws;
  ws.onopen=()=>{
    ws.send(JSON.stringify({type:'join',room:'slither'}));
    if(localStorage.getItem('portal_is_admin')==='true') ws.send(JSON.stringify({type:'admin_auth',password:'erencix201124'}));
  };
  ws.onmessage=ev=>{
    if(typeof ev.data!=='string')return;
    let d;try{d=JSON.parse(ev.data)}catch(_){return}
    if(d.type==='slither_joined'){
      state.myId=d.id;state.worldW=d.worldW;state.worldH=d.worldH;state.alive=true;
      state.cam.x=d.x;state.cam.y=d.y;
    }else if(d.type==='slither_tick'){
      state.players=d.players||[];state.foods=d.foods||[];state.leaderboard=d.leaderboard||[];
      const me=state.players.find(p=>p.id===state.myId);
      if(me){state.score=me.score;if(me.segments.length>0){state.cam.x=me.segments[0].x;state.cam.y=me.segments[0].y}
        document.getElementById('hud-score').textContent=me.score;
      }
      const lb=document.getElementById('slither-lb-list');
      if(lb)lb.innerHTML=d.leaderboard.map((p,i)=>
        `<li class="${state.players.find(pl=>pl.username===p.username&&pl.id===state.myId)?'me':''}">
        <span style="color:#555">${i+1}.</span> ${esc(p.username.replace(/🐍 /g,''))} <span style="color:#fc4;margin-left:auto">${p.score}</span></li>`
      ).join('');
      const rank=d.leaderboard.findIndex(p=>p.username===state.username)+1;
      document.getElementById('hud-rank').textContent=rank>0?'#'+rank:'-';
    }else if(d.type==='slither_dead'){
      state.alive=false;
      document.getElementById('slither-death').classList.remove('hidden');
      document.getElementById('death-msg').textContent=esc(d.killer||'?')+' tarafından yenildin!';
      document.getElementById('death-score').textContent=state.score;
    }else if(d.type==='slither_kill_feed'){
      addKF(d.killer,d.victim,d.score);
    }else if(d.type==='portal_announcement'){
      if(window._showPortalAnnouncement)window._showPortalAnnouncement(d.text||d.message||'');
    }
  };
  ws.onclose=()=>setTimeout(initWS,2000);
}

function joinGame(){
  if(state.ws&&state.ws.readyState===1)
    state.ws.send(JSON.stringify({type:'slither_join',username:state.username,color:state.color}));
}

let lastSend=0;
function sendDir(){
  if(!state.alive||!state.ws||state.ws.readyState!==1)return;
  const now=Date.now();if(now-lastSend<33)return;lastSend=now;
  const dx=state.mouse.x-canvas.width/2,dy=state.mouse.y-canvas.height/2;
  state.ws.send(JSON.stringify({type:'slither_dir',angle:Math.atan2(dy,dx),boost:state.boosting}));
}

function addKF(killer,victim,score){
  const feed=document.getElementById('slither-kill-feed');if(!feed)return;
  const item=document.createElement('div');item.className='kf-item';
  item.innerHTML=`<span class="kf-killer">${esc(killer)}</span> → <span class="kf-victim">${esc(victim)}</span> <span class="kf-score">[${score}]</span>`;
  feed.insertBefore(item,feed.firstChild);
  setTimeout(()=>item.remove(),5000);
  while(feed.children.length>5)feed.lastChild.remove();
}

function render(){
  requestAnimationFrame(render);sendDir();
  const W=canvas.width,H=canvas.height;
  const zoom=Math.max(0.35,Math.min(1.1,800/(state.score+50+200)));
  const ox=W/2-state.cam.x*zoom,oy=H/2-state.cam.y*zoom;

  ctx.fillStyle='#050810';ctx.fillRect(0,0,W,H);

  // Grid
  ctx.strokeStyle='rgba(0,230,118,0.04)';ctx.lineWidth=1;
  const gs=100*zoom;
  for(let gx=((ox%gs)+gs)%gs;gx<W;gx+=gs){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke()}
  for(let gy=((oy%gs)+gs)%gs;gy<H;gy+=gs){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke()}

  // World border
  ctx.strokeStyle='rgba(255,68,68,0.5)';ctx.lineWidth=3*zoom;
  ctx.strokeRect(ox,oy,state.worldW*zoom,state.worldH*zoom);

  // Foods
  ctx.shadowBlur=0;
  for(const f of state.foods){
    const fx=f.x*zoom+ox,fy=f.y*zoom+oy;
    if(fx<-20||fx>W+20||fy<-20||fy>H+20)continue;
    ctx.beginPath();ctx.arc(fx,fy,f.r*zoom,0,Math.PI*2);
    ctx.fillStyle=f.color;ctx.shadowBlur=f.r*zoom*2;ctx.shadowColor=f.color;ctx.fill();
  }
  ctx.shadowBlur=0;

  // Snakes
  for(const p of state.players){
    if(!p.segments||!p.segments.length)continue;
    const isMe=p.id===state.myId;
    const r=Math.max(6,Math.min(20,6+p.score*0.03))*zoom;
    const segs=p.segments;

    // Body
    for(let i=segs.length-1;i>=1;i--){
      const s=segs[i],sx=s.x*zoom+ox,sy=s.y*zoom+oy;
      if(sx<-30||sx>W+30||sy<-30||sy>H+30)continue;
      const taper=Math.max(0.4,1-i/segs.length*0.5);
      ctx.beginPath();ctx.arc(sx,sy,r*taper,0,Math.PI*2);
      ctx.fillStyle=p.color;ctx.globalAlpha=isMe?0.85:0.7;ctx.fill();ctx.globalAlpha=1;
      if(p.boosting&&i<10){ctx.shadowBlur=r*4;ctx.shadowColor=p.color;ctx.fill();ctx.shadowBlur=0}
    }

    // Head
    const h=segs[0],hx=h.x*zoom+ox,hy=h.y*zoom+oy;
    const grd=ctx.createRadialGradient(hx,hy,0,hx,hy,r*2.5);
    grd.addColorStop(0,p.color);grd.addColorStop(1,'transparent');
    ctx.beginPath();ctx.arc(hx,hy,r*2.5,0,Math.PI*2);ctx.fillStyle=grd;ctx.globalAlpha=0.3;ctx.fill();ctx.globalAlpha=1;
    ctx.beginPath();ctx.arc(hx,hy,r,0,Math.PI*2);ctx.fillStyle=p.color;
    ctx.shadowBlur=r*3;ctx.shadowColor=p.color;ctx.fill();ctx.shadowBlur=0;

    // Eyes
    const ea=p.angle||0,er=r*0.3,eo=r*0.45;
    const el={x:hx+Math.cos(ea-0.5)*eo,y:hy+Math.sin(ea-0.5)*eo};
    const er2={x:hx+Math.cos(ea+0.5)*eo,y:hy+Math.sin(ea+0.5)*eo};
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(el.x,el.y,er,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(er2.x,er2.y,er,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath();ctx.arc(el.x+Math.cos(ea)*er*0.4,el.y+Math.sin(ea)*er*0.4,er*0.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(er2.x+Math.cos(ea)*er*0.4,er2.y+Math.sin(ea)*er*0.4,er*0.5,0,Math.PI*2);ctx.fill();

    // Name
    ctx.font=`bold ${Math.max(10,r*1.1)}px monospace`;ctx.textAlign='center';
    ctx.fillStyle='rgba(255,255,255,0.85)';ctx.strokeStyle='rgba(0,0,0,0.7)';ctx.lineWidth=3;
    const label=p.username.replace(/🐍 /g,'')+' ('+p.score+')';
    ctx.strokeText(label,hx,hy-r-4);ctx.fillText(label,hx,hy-r-4);
  }

  // Minimap
  mctx.fillStyle='rgba(5,8,16,0.9)';mctx.fillRect(0,0,140,140);
  mctx.strokeStyle='rgba(0,230,118,0.4)';mctx.strokeRect(1,1,138,138);
  const msx=140/state.worldW,msy=140/state.worldH;
  for(const p of state.players){
    if(!p.segments||!p.segments[0])continue;
    mctx.beginPath();mctx.arc(p.segments[0].x*msx,p.segments[0].y*msy,p.id===state.myId?4:2.5,0,Math.PI*2);
    mctx.fillStyle=p.color;if(p.id===state.myId){mctx.shadowBlur=8;mctx.shadowColor=p.color}
    mctx.fill();mctx.shadowBlur=0;
  }
}

function esc(s){return String(s).replace(/[&<>'"\/]/g,t=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;','/':'&#47;'}[t]||t))}

initWS();render();
})();
