'use strict';
// GRUK: Ascent of Knowledge — a tiny metroidvania demo. All art is procedural.
const TS=16,RW=30,RH=17,VW=480,VH=272;
const G=900,JUMPV=370,SPEED=120,MAXF=420;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const SAVEKEY='gruk_save_v2',OLDKEY='gruk_save_v1';
const BOSSES=['croc','mammoth','golem','ptero'];
const AB_ORDER=['climb','fire','roll','swim','spear','smash','grapple','djump'];
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];}
const [tileC,tctx]=mkC(VW,VH),[darkC,dctx]=mkC(VW,VH);
function hash(x,y,n){let h=(x*374761393+y*668265263+n*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return (h^(h>>>16))>>>0;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a);
const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

// ---------------- audio
let AC=null;
function sfx(type){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
 const P={jump:[260,520,.09,'square'],club:[160,70,.07,'square'],fire:[500,90,.2,'sawtooth'],spear:[800,300,.12,'triangle'],pick:[400,1400,.35,'square'],hurt:[320,70,.25,'square'],boss:[90,40,.5,'sawtooth'],break:[140,40,.3,'sawtooth'],clink:[1200,900,.07,'triangle'],save:[300,900,.35,'triangle'],hit:[220,110,.08,'square'],door:[60,120,.5,'sawtooth'],roll:[200,90,.15,'triangle'],hook:[900,400,.12,'square'],swim:[300,500,.1,'triangle']}[type];if(!P||muted)return;
 const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=P[3];o.frequency.setValueAtTime(P[0],t);o.frequency.exponentialRampToValueAtTime(P[1],t+P[2]);
 g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+P[2]);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+P[2]+.03);}catch(e){}}

// ---------------- music (tiny chiptune sequencer)
const SONGS={
 field:{bpm:132,lead:[64,0,67,69,71,0,69,67,64,0,62,64,67,0,0,0,64,0,67,69,71,0,74,72,71,69,67,0,69,0,0,0],bass:[45,45,52,52,43,43,50,50,41,41,48,48,43,43,50,50]},
 cave:{bpm:96,lead:[57,0,0,60,0,0,59,0,57,0,0,55,0,0,0,0,57,0,0,60,0,62,0,64,62,0,60,0,59,0,0,0],bass:[33,33,33,33,31,31,31,31,29,29,29,29,28,28,28,28]},
 boss:{bpm:168,lead:[69,0,69,72,69,0,67,0,69,0,69,74,72,0,71,0,69,0,69,72,69,0,67,0,64,0,65,0,67,0,68,0],bass:[33,45,33,45,33,45,31,43,29,41,29,41,28,40,28,40]},
 peak:{bpm:110,lead:[72,0,76,0,79,0,76,0,74,0,77,0,81,0,77,0,72,0,76,0,79,0,84,0,83,0,79,0,76,0,0,0],bass:[48,48,55,55,50,50,53,53,48,48,55,55,43,43,47,47]}};
const MUS={song:null,step:0,next:0,gain:null};
function musicFor(){if(S.state==='title')return 'peak';if(S.state==='ending'||S.state==='ascend')return 'peak';if(!cur)return null;if(boss)return 'boss';
 const t=cur.theme;if(t==='peak'||t==='ice')return 'peak';if(t==='cave'||t==='icecave'||t==='lava'||cur.dark)return 'cave';return 'field';}
function note(f,t,d,type,v){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(f-69)/12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.connect(g);g.connect(MUS.gain);o.start(t);o.stop(t+d+.02);}
function musicTick(){if(!AC||AC.state!=='running')return;if(!MUS.gain){MUS.gain=AC.createGain();MUS.gain.connect(AC.destination);}
 MUS.gain.gain.value=muted?0:1;const want=musicFor();if(want!==MUS.song){MUS.song=want;MUS.step=0;MUS.next=AC.currentTime+.05;}if(!want||muted)return;
 const sg=SONGS[want],st=60/sg.bpm/2;if(MUS.next<AC.currentTime-.5)MUS.next=AC.currentTime+.05;
 while(MUS.next<AC.currentTime+.25){const i=MUS.step,l=sg.lead[i%sg.lead.length];if(l)note(l,MUS.next,st*.9,'square',.025);if(i%2===0)note(sg.bass[(i>>1)%sg.bass.length],MUS.next,st*1.8,'triangle',.05);MUS.step++;MUS.next+=st;}}
setInterval(musicTick,80);
try{muted=localStorage.getItem('gruk_mute')==='1';}catch(e){}
function toggleMute(){muted=!muted;try{localStorage.setItem('gruk_mute',muted?'1':'0');}catch(e){}const b=document.getElementById('bMute');if(b)b.textContent=muted?'\u266A\u0338':'\u266A';}

// ---------------- world
function grid(){const g=[];for(let y=0;y<RH;y++)g.push(new Array(RW).fill('.'));return g;}
function F(g,x0,y0,x1,y1,c){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)g[y][x]=c;}
function base(o){const g=grid();F(g,0,0,RW-1,0,'#');F(g,0,RH-2,RW-1,RH-1,'#');F(g,0,0,0,RH-1,'#');F(g,RW-1,0,RW-1,RH-1,'#');
 if(o.L)F(g,0,12,0,14,'.');if(o.R)F(g,RW-1,12,RW-1,14,'.');if(o.U)F(g,13,0,16,0,'.');if(o.D)F(g,13,15,16,16,'.');return g;}
const ROOMS={};
function R(key,name,theme,dark,g,ents){ROOMS[key]={key,name,theme,dark,g0:g,ents};}
const ABIL={
 climb:{n:'CLIMB',c:'#9f6',d:'Gruk learns to GRIP ROCK! Jump at a wall and hold toward it to cling. Hold UP to climb, press JUMP to leap off.'},
 fire:{n:'FIRE',c:'#f84',d:'Gruk discovers FIRE! Press C (FIRE button) to throw flame. Lights dark caves, burns dry vines, melts ice beasts.'},
 spear:{n:'SPEAR THROW',c:'#dde',d:'Gruk learns to THROW! Press V (SPEAR button). Hold UP to throw upward. Hits far-away things and flying beasts.'},
 smash:{n:'STONE SMASH',c:'#fc4',d:'Gruk grows STRONG! Club now smashes cracked stone and hits twice as hard.'},
 djump:{n:'WINGS OF THOUGHT',c:'#8cf',d:'Gruk thinks like a bird! Press JUMP again in mid-air to DOUBLE JUMP.'},
 roll:{n:'WHEEL ROLL',c:'#d96',d:'Gruk curls up like a stone wheel! Press SHIFT or Q (ROLL button) on the ground. Rolls through low gaps, and harm cannot touch a rolling Gruk.'},
 swim:{n:'SWIM',c:'#4cf',d:'Gruk watched the croc and learned to SWIM! In water press JUMP to stroke up, hold UP/DOWN to rise and dive.'},
 grapple:{n:'VINE HOOK',c:'#c8f',d:'Gruk ties a vine to a bone hook! Press E (HOOK button) near a ring anchor to pull up to it. Hook the next ring, JUMP to let go, DOWN to drop.'}};
// A: Foothill Camp (start)
{const g=base({R:1,U:1,L:1});F(g,1,1,12,14,'#');F(g,1,13,11,14,'.');F(g,12,13,12,14,'V');F(g,22,10,26,10,'=');g[14][25]='#';
 R('1,4','Foothill Camp','base',0,g,[{t:'K',x:18,y:14},{t:'sign',x:15,y:14,s:'GRUK MUST CLIMB THE MOUNTAIN TO EVOLVE! The wall is too tall, the west tunnel choked with vines... Gruk must LEARN things. Try east first.'},{t:'walker',x:27,y:14}]);}
// B: Shrine of Grip
{const g=base({L:1});F(g,6,11,9,11,'=');F(g,13,14,15,14,'^');F(g,23,6,24,14,'#');F(g,11,8,14,8,'=');
 R('2,4','Shrine of Grip','base',0,g,[{t:'walker',x:8,y:14},{t:'bat',x:18,y:6},{t:'shrine',x:19,y:14,ab:'climb'},{t:'heart',x:23,y:5}]);}
// C: Windy Cliffs
{const g=base({L:1,D:1,U:1});F(g,13,5,26,5,'#');F(g,12,1,12,5,'#');F(g,17,1,17,4,'V');F(g,3,11,7,11,'=');
 R('1,3','Windy Cliffs','cliff',0,g,[{t:'K',x:8,y:14},{t:'walker',x:22,y:14},{t:'bat',x:20,y:9},{t:'sign',x:21,y:4,s:'Dry vines block the path up. Fire would eat them...'},{t:'sign',x:4,y:14,s:'West: a dark hollow. Gruk scared of dark... but something glows inside.'}]);}
// D: Dark Hollow
{const g=base({R:1});F(g,1,1,28,1,'#');g[2][6]=g[2][15]=g[2][22]=g[2][9]='#';F(g,18,13,20,14,'#');F(g,14,12,17,12,'=');F(g,10,8,14,8,'=');
 R('0,3','Dark Hollow','cave',1,g,[{t:'shrine',x:3,y:14,ab:'fire'},{t:'heart',x:12,y:7},{t:'scroll',x:19,y:12,s:'Fire is a small sun that Gruk can carry. Sun does not mind.'},{t:'bat',x:10,y:5},{t:'bat',x:23,y:6},{t:'walker',x:8,y:14}]);}
// E: Frozen Lair (boss: Ice Mammoth)
{const g=base({D:1,R:1});F(g,29,12,29,14,'B');F(g,3,10,7,10,'=');F(g,22,10,26,10,'=');
 R('1,2','Frozen Lair','ice',0,g,[{t:'mammoth',x:22,y:12},{t:'shrine',x:20,y:14,ab:'spear',cond:'mammoth'}]);}
// F: Stone Eye Pass
{const g=base({L:1,U:1});F(g,12,1,12,12,'#');F(g,17,1,17,12,'#');F(g,13,12,16,12,'D');F(g,18,1,28,10,'#');F(g,22,11,22,14,'G');F(g,28,12,28,14,'S');F(g,3,9,7,9,'=');
 R('2,2','Stone Eye Pass','cliff',0,g,[{t:'K',x:5,y:14},{t:'walker',x:9,y:14},{t:'scroll',x:5,y:8,s:'The mountain spirits watch. They reward the curious who look in every corner.'},{t:'sign',x:20,y:14,s:'A stone eye stares from behind wooden bars. Club cannot reach. Something THROWN might...'}]);}
// G: Deep Caverns
{const g=base({D:1,L:1,R:1});F(g,1,1,6,6,'#');F(g,2,2,4,4,'.');F(g,5,3,6,4,'C');F(g,8,11,11,11,'=');F(g,8,8,11,8,'=');F(g,7,5,10,5,'=');F(g,20,13,21,14,'#');
 R('2,1','Deep Caverns','cave',1,g,[{t:'shrine',x:25,y:14,ab:'smash'},{t:'heart',x:3,y:4},{t:'bat',x:12,y:5},{t:'bat',x:22,y:7},{t:'walker',x:9,y:14},{t:'walker',x:26,y:14}]);}
// H: Frost Ledge
{const g=base({R:1,U:1});F(g,13,5,26,5,'#');F(g,12,1,12,5,'#');F(g,17,1,17,4,'C');F(g,4,10,8,10,'=');
 R('1,1','Frost Ledge','ice',0,g,[{t:'K',x:6,y:14},{t:'scroll',x:6,y:9,s:'The wind on the peak whispers: FOUR great beasts guard the way to the Elders.'},{t:'walker',x:10,y:14},{t:'walker',x:19,y:14},{t:'bat',x:8,y:7},{t:'sign',x:21,y:4,s:'Cracked stone blocks the way. A SMASHING arm could break it.'}]);}
// I: Sky Roost (boss: Pterodactyl)
{const g=base({D:1,L:1});F(g,0,12,0,14,'B');F(g,3,10,7,10,'=');F(g,22,10,26,10,'=');
 R('1,0','Sky Roost','peak',0,g,[{t:'ptero',x:14,y:5},{t:'shrine',x:21,y:14,ab:'djump',cond:'ptero'}]);}
// J: The Summit
{const g=base({R:1});F(g,1,0,RW-2,0,'.');F(g,10,15,18,15,'^');F(g,1,9,4,14,'#');F(g,6,0,6,14,'E');
 R('0,0','The Summit','peak',0,g,[{t:'orb',x:2,y:7},{t:'K',x:26,y:14},{t:'sign',x:22,y:14,s:'THE SUMMIT. Beyond the abyss waits ENLIGHTENMENT. Leap with the Wings of Thought.'},{t:'sign',x:8,y:14,s:'THE ELDER GATE opens only for one who has humbled the FOUR GREAT BEASTS: croc, mammoth, golem and sky terror.'}]);}
// ---- NEW ZONE: Jungle foothills
{const g=base({L:1,R:1});F(g,15,15,18,15,'~');F(g,22,11,27,14,'#');F(g,22,14,27,14,'.');F(g,5,10,9,10,'=');F(g,10,7,13,7,'=');
 R('0,4','Jungle Edge','jungle',0,g,[{t:'walker',x:8,y:14},{t:'walker',x:20,y:14},{t:'bat',x:12,y:4},{t:'heart',x:16,y:15},{t:'scroll',x:24,y:14,s:'First Gruk walked on four legs. Then on two. What comes next... nobody knows.'},{t:'sign',x:20,y:14,s:'A tiny tunnel runs through the mound. Too low to walk. And the pond is deep...'}]);}
{const g=base({L:1,R:1});F(g,0,12,4,13,'#');F(g,10,6,11,14,'#');F(g,14,6,19,6,'=');F(g,22,10,25,10,'=');
 R('-1,4','Tangled Grove','jungle',0,g,[{t:'shrine',x:6,y:14,ab:'roll'},{t:'scroll',x:16,y:5,s:'The bog croc sees only what is in front of its jaws. Its back is soft.'},{t:'walker',x:20,y:14},{t:'walker',x:25,y:14},{t:'bat',x:22,y:7},{t:'sign',x:8,y:14,s:'West: the BOG. Only a low gap leads there.'},{t:'K',x:17,y:14}]);}
{const g=base({R:1});F(g,1,1,28,11,'#');
 R('-2,4','Bog Lair','jungle',0,g,[{t:'croc',x:6,y:13},{t:'shrine',x:6,y:14,ab:'swim',cond:'croc'}]);}
// ---- NEW ZONE: Frozen grotto + geothermal depths
{const g=base({L:1});F(g,1,1,28,2,'#');F(g,4,3,28,14,'~');F(g,20,15,23,16,'~');F(g,9,3,10,9,'#');F(g,14,9,15,14,'#');F(g,25,3,26,8,'#');
 R('3,1','Frozen Grotto','icecave',0,g,[{t:'sign',x:2,y:14,s:'Icy water fills the grotto. Gruk sinks like a rock... unless Gruk can SWIM.'},{t:'heart',x:27,y:13},{t:'scroll',x:12,y:13,s:'Under the ice the old ones swam. Their bones still dream of the sea.'},{t:'fish',x:12,y:8},{t:'fish',x:19,y:5},{t:'fish',x:23,y:11}]);}
{const g=base({});F(g,20,0,23,0,'.');F(g,1,15,2,16,'.');F(g,1,1,14,9,'#');F(g,5,15,14,15,'L');F(g,19,1,19,11,'#');F(g,24,1,24,11,'#');F(g,25,7,28,7,'=');g[10][13]='o';g[11][5]='o';
 R('3,2','Geyser Hollow','lava',0,g,[{t:'shrine',x:27,y:14,ab:'grapple'},{t:'K',x:16,y:14},{t:'sign',x:17,y:14,s:'A lake of fire. Beyond it, a way down. Something to HOOK those rings would help...'},{t:'scroll',x:26,y:6,s:'The golem heart is hot stone. Fire feeds it, spears melt. Only a brave club reaches it.'},{t:'bat',x:20,y:5}]);}
{const g=base({});F(g,1,0,2,0,'.');F(g,5,15,24,15,'L');F(g,14,11,15,15,'h');g[8][6]='o';g[8][12]='o';g[8][17]='o';g[8][23]='o';
 R('3,3','Magma Depths','lava',0,g,[{t:'golem',x:13,y:8},{t:'heart',x:26,y:14,cond:'golem'},{t:'scroll',x:3,y:14,cond:'golem',s:'Knowledge is the true fire. Once lit, it never goes out.'}]);}

// ---------------- state
const TOTAL={hearts:0,scrolls:0};for(const k in ROOMS)for(const e of ROOMS[k].ents){if(e.t==='heart')TOTAL.hearts++;if(e.t==='scroll')TOTAL.scrolls++;}
const S={state:'title',room:null,ab:{},flags:{removed:{},bosses:{},hearts:{},scrolls:{}},visited:{},time:0,deaths:0};
let hitstop=0,muted=false,entryPos=null,P,cur,ents=[],proj=[],eproj=[],parts=[],texts=[],banner=null,boss=null,tileDirty=true,signTxt=null,roomSplash=0,shake=0,lastSafe=null,stateT=0,saveMem=null,msgCd=0,lastCP='';
function newPlayer(){return{x:0,y:0,w:12,h:22,vx:0,vy:0,onGround:false,facing:1,coy:0,jbuf:0,jumps:0,cling:0,force:0,forceVx:0,lock:0,inv:0,hp:5,maxHp:5,atk:0,acd:0,fcd:0,scd:0,anim:0,hitSet:null,roll:0,rcd:0,hook:null,wasG:false};}
function tileAt(tx,ty){if(tx<0||tx>=RW||ty<0||ty>=RH){const [cx,cy]=S.room.split(',').map(Number);const dx=tx<0?-1:tx>=RW?1:0,dy=ty<0?-1:ty>=RH?1:0;
 return (dx===0||dy===0)&&ROOMS[(cx+dx)+','+(cy+dy)]?'.':'#';}return cur.g[ty][tx];}
const solidP=c=>c==='#'||c==='V'||c==='C'||c==='D'||c==='G'||c==='S'||c==='s'||c==='B'||c==='E'||c==='h';
const HAZ=c=>c==='^'||c==='L';
const solidProj=c=>c!=='G'&&solidP(c);
function setTile(x,y,ch){cur.g[y][x]=ch;(S.flags.removed[S.room]=S.flags.removed[S.room]||[]).push(x+','+y+','+ch);tileDirty=true;}

function enterRoom(key,px,py,keep){
 const r=ROOMS[key];S.room=key;S.visited[key]=1;
 cur={key,name:r.name,theme:r.theme,dark:r.dark,g:r.g0.map(a=>a.slice())};
 (S.flags.removed[key]||[]).forEach(s=>{const a=s.split(',');cur.g[+a[1]][+a[0]]=a[2];});
 tileDirty=true;ents=[];proj=[];eproj=[];boss=null;if(P)P.hook=null;lastSafe=null;entryPos={x:px,y:py};
 for(const e of r.ents){const X=e.x*TS,Y=e.y*TS;
  if(e.t==='walker')ents.push({t:'walker',x:X+1,y:Y+4,w:14,h:12,vx:-30,hp:2,fl:0,an:0});
  else if(e.t==='bat')ents.push({t:'bat',x:X,y:Y,w:12,h:8,hp:1,fl:0,an:Math.random()*6,bx:X,by:Y});
  else if(e.t==='heart'||e.t==='scroll'){const m=spawnItem(key,e);if(m)ents.push(m);}
  else if(e.t==='fish')ents.push({t:'fish',x:X,y:Y,w:12,h:8,hp:1,fl:0,an:Math.random()*6,bx:X,by:Y});
  else if(e.t==='croc'){if(!S.flags.bosses.croc){boss={t:'croc',name:'BOG CROC',x:X,y:15*TS-32,w:72,h:32,hp:10,max:10,st:'intro',t2:1.8,vx:0,face:1,fl:0,an:0,turn:0,tailT:0,minX:2*TS,maxX:28*TS-72};ents.push(boss);}}
  else if(e.t==='golem'){if(!S.flags.bosses.golem){boss={t:'golem',name:'MAGMA GOLEM',x:208,y:132,by:132,w:64,h:44,hp:10,max:10,st:'intro',t2:1.8,face:-1,fl:0,an:0,n:0};ents.push(boss);}}
  else if(e.t==='mammoth'){if(!S.flags.bosses.mammoth){boss={t:'mammoth',name:'ICE MAMMOTH',x:X,y:15*TS-40,w:56,h:40,hp:12,max:12,st:'intro',t2:1.8,vx:0,face:-1,fl:0,an:0,minX:TS,maxX:29*TS-56};ents.push(boss);}}
  else if(e.t==='ptero'){if(!S.flags.bosses.ptero){boss={t:'ptero',name:'SKY TERROR',x:X,y:-40,w:40,h:20,hp:10,max:10,st:'intro',t2:1.8,vx:0,vy:0,face:1,fl:0,an:0,ph:0,rt:2,baseY:80};ents.push(boss);}}
  else ents.push(Object.assign({},e,{x:X,y:Y,w:16,h:16}));
 }
 cur.anchors=[];for(let y=0;y<RH;y++)for(let x=0;x<RW;x++)if(cur.g[y][x]==='o')cur.anchors.push({x:x*TS+8,y:y*TS+8});
 if(boss){roomSplash=0;sfx('boss');}else roomSplash=2.2;
 P.x=px;P.y=py;if(!keep){P.vx=0;P.vy=0;P.cling=0;}
}
function spawnItem(key,e){const id=key+':'+e.x+':'+e.y;if(e.cond&&!S.flags.bosses[e.cond])return null;
 if(e.t==='heart')return S.flags.hearts[id]?null:{t:'heart',id,x:e.x*TS+3,y:e.y*TS+4,w:10,h:10};
 return S.flags.scrolls[id]?null:{t:'scroll',id,s:e.s,x:e.x*TS+2,y:e.y*TS+2,w:12,h:12};}
function snapshot(x,y){return JSON.stringify({room:S.room,x,y,ab:S.ab,flags:S.flags,maxHp:P.maxHp,visited:S.visited,time:S.time,deaths:S.deaths});}
function save(x,y){saveMem=snapshot(x,y);try{localStorage.setItem(SAVEKEY,saveMem);}catch(e){}}
function getSave(){try{return localStorage.getItem(SAVEKEY)||localStorage.getItem(OLDKEY)||saveMem;}catch(e){return saveMem;}}
function loadGame(){const d=JSON.parse(getSave());S.ab=d.ab;S.flags=d.flags;['removed','bosses','hearts','scrolls'].forEach(k=>S.flags[k]=S.flags[k]||{});S.visited=d.visited||{};S.time=d.time||0;S.deaths=d.deaths||0;
 P=newPlayer();P.maxHp=d.maxHp;P.hp=P.maxHp;enterRoom(d.room,d.x,d.y);lastCP=d.room+':'+Math.round(d.x);S.state='play';}
function newGame(){S.ab={};S.flags={removed:{},bosses:{},hearts:{},scrolls:{}};S.visited={};S.time=0;S.deaths=0;P=newPlayer();
 enterRoom('1,4',20*TS,15*TS-22);save(P.x,P.y);S.state='play';
 banner={title:'GRUK: ASCENT OF KNOWLEDGE',text:'Gruk is a simple caveman. At the top of the mountain lies ENLIGHTENMENT. Explore, gain KNOWLEDGE, grow stronger, and ascend!',t:0};}

// ---------------- input
const I={},kb={},latch={};let tc={};
const KEYS=['left','right','up','down','jump','attack','fire','spear','pause','start','tap','roll','hook','mute'];
const KMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'jump',Space:'jump',KeyK:'jump',KeyX:'attack',KeyJ:'attack',KeyC:'fire',KeyL:'fire',KeyV:'spear',KeyI:'spear',KeyP:'pause',Escape:'pause',Enter:'start',ShiftLeft:'roll',ShiftRight:'roll',KeyQ:'roll',KeyE:'hook',KeyG:'hook',KeyM:'mute'};
addEventListener('keydown',e=>{const k=KMAP[e.code];if(k){kb[k]=1;latch[k]=1;e.preventDefault();}if(S.state==='title'&&e.code==='KeyN')startNew();});
addEventListener('keyup',e=>{const k=KMAP[e.code];if(k){kb[k]=0;e.preventDefault();}});
addEventListener('blur',()=>{for(const k in kb)kb[k]=0;});
const touchEl=document.getElementById('touch');
function onTouch(e){if(e.target.closest&&e.target.closest('#menu'))return;e.preventDefault();touchEl.classList.add('on');const n={};
 for(const t of e.touches){const el=document.elementFromPoint(t.clientX,t.clientY);const k=el&&el.dataset&&el.dataset.k;if(k)k.split(',').forEach(x=>n[x]=1);else n.tap=1;}
 for(const k in n)if(!tc[k])latch[k]=1;tc=n;document.querySelectorAll('#touch .b').forEach(b=>{b.classList.toggle('on',b.dataset.k.split(',').every(x=>n[x]))});}
['touchstart','touchmove','touchend','touchcancel'].forEach(ev=>document.addEventListener(ev,onTouch,{passive:false}));
if(matchMedia('(pointer:coarse)').matches||('ontouchstart' in window))touchEl.classList.add('on');
cv.addEventListener('mousedown',()=>{kb.tap=1;setTimeout(()=>kb.tap=0,80);});
function pollInput(){for(const k of KEYS){const v=!!(kb[k]||tc[k]||latch[k]);latch[k]=0;I[k+'P']=v&&!I[k];I[k]=v;}}

// ---------------- menus
const menu=document.getElementById('menu');
function setMenu(items){menu.innerHTML='';for(const [label,fn] of items){const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.preventDefault();fn();};menu.appendChild(b);}menu.style.display=items.length?'flex':'none';}
function goFull(){try{if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch(e){}}).catch(()=>{});}catch(e){}}
function startNew(){goFull();sfx('pick');setMenu([]);newGame();}
function startCont(){goFull();sfx('pick');setMenu([]);loadGame();}
function titleMenu(){S.state='title';const items=[['NEW GAME',startNew]];if(getSave())items.unshift(['CONTINUE',startCont]);setMenu(items);}
function pauseGame(){S.state='pause';setMenu([['RESUME',resume],['LAST CAMPFIRE',()=>{setMenu([]);loadGame();}],['TITLE',titleMenu]]);}
function resume(){setMenu([]);S.state='play';}

// ---------------- effects
function puff(x,y,col,n,sp){for(let i=0;i<n;i++)parts.push({x,y,vx:rnd(-sp,sp),vy:rnd(-sp,sp*.5),t:rnd(.3,.8),c:col,g:200});}
function say(x,y,s,c){texts.push({x,y,s,t:1.4,c:c||'#fff'});}
function sayOnce(x,y,s){if(msgCd<=0){say(x,y,s,'#ffd27a');msgCd=1.2;}}

// ---------------- player
function rowsOf(y,h){return[Math.floor(y/TS),Math.floor((y+h-.001)/TS)];}
function moveX(o,dx,sf){o.x+=dx;const [r0,r1]=rowsOf(o.y,o.h);if(dx>0){const tx=Math.floor((o.x+o.w-.001)/TS);for(let ty=r0;ty<=r1;ty++)if(sf(tileAt(tx,ty))){o.x=tx*TS-o.w;return true;}}
 else if(dx<0){const tx=Math.floor(o.x/TS);for(let ty=r0;ty<=r1;ty++)if(sf(tileAt(tx,ty))){o.x=(tx+1)*TS;return true;}}return false;}
function moveY(o,dy,sf,oneway){const oldB=o.y+o.h;o.y+=dy;const c0=Math.floor(o.x/TS),c1=Math.floor((o.x+o.w-.001)/TS);
 if(dy>0){const ty=Math.floor((o.y+o.h-.001)/TS);for(let tx=c0;tx<=c1;tx++){const c=tileAt(tx,ty);if(sf(c)||(oneway&&c==='='&&oldB<=ty*TS+.5)){o.y=ty*TS-o.h;return true;}}}
 else if(dy<0){const ty=Math.floor(o.y/TS);for(let tx=c0;tx<=c1;tx++)if(sf(tileAt(tx,ty))){o.y=(ty+1)*TS;return true;}}return false;}
function touchWall(d){const tx=d<0?Math.floor((P.x-1)/TS):Math.floor((P.x+P.w)/TS);const r0=Math.floor((P.y+4)/TS),r1=Math.floor((P.y+P.h-4)/TS);
 for(let ty=r0;ty<=r1;ty++)if(solidP(tileAt(tx,ty)))return true;return false;}
function hurt(n,fromX,hz){if((P.inv>0||(P.roll>0&&!hz))||S.state!=='play')return;hitstop=.06;P.hp-=n;P.inv=1.1;sfx('hurt');shake=.2;P.cling=0;
 const d=(P.x+P.w/2)<fromX?-1:1;P.force=.2;P.forceVx=d*140;P.vy=-200;puff(P.x+6,P.y+10,'#f44',8,80);
 if(P.hp<=0){S.state='dead';stateT=0;S.deaths++;}}
function canStand(){const y=P.y-10,c0=Math.floor(P.x/TS),c1=Math.floor((P.x+P.w-.001)/TS),r0=Math.floor(y/TS),r1=Math.floor((y+21.9)/TS);
 for(let ty=r0;ty<=r1;ty++)for(let tx=c0;tx<=c1;tx++)if(solidP(tileAt(tx,ty)))return false;return true;}
function standUp(){if(P.roll>0||P.h<22){P.roll=0;P.y-=10;P.h=22;}}
function inWater(){return tileAt(Math.floor((P.x+6)/TS),Math.floor((P.y+P.h/2)/TS))==='~';}
function respawnSafe(){const s=lastSafe||entryPos;if(P.h<22){P.h=22;P.roll=0;}P.x=s.x;P.y=s.y;P.vx=P.vy=0;P.force=0;P.hook=null;P.cling=0;}
function tryHook(){const pcx=P.x+6,pcy=P.y+8;let best=null,bd=1e9;
 for(const a of cur.anchors){if(P.hook&&P.hook.ax===a.x&&P.hook.ay===a.y)continue;const dx=a.x-pcx,dy=a.y-pcy,d=Math.hypot(dx,dy);
  if(d>135||dy>30)continue;if(d<bd){bd=d;best=a;}}
 if(!best){sayOnce(P.x-10,P.y-10,'Nothing to hook!');return;}
 if(P.h<22){if(!canStand())return;standUp();}
 P.hook={ax:best.x,ay:best.y,st:'pull',t:0};P.cling=0;sfx('hook');}
function updPlayer(dt){
 const dir=(I.right?1:0)-(I.left?1:0);
 if(P.inv>0)P.inv-=dt;if(P.acd>0)P.acd-=dt;if(P.fcd>0)P.fcd-=dt;if(P.scd>0)P.scd-=dt;if(P.atk>0)P.atk-=dt;if(P.rcd>0)P.rcd-=dt;
 // actions
 if(I.attackP&&P.acd<=0&&P.roll<=0){P.atk=.16;P.acd=.3;P.hitSet=new Set();sfx('club');}
 if(I.fireP){if(!S.ab.fire)sayOnce(P.x,P.y-6,'Gruk not know fire yet');else if(P.fcd<=0&&P.roll<=0){P.fcd=.45;sfx('fire');
  proj.push(I.up?{k:'fire',x:P.x+3,y:P.y-4,w:7,h:7,vx:0,vy:-240,life:1.1}:{k:'fire',x:P.x+(P.facing>0?P.w:-7),y:P.y+7,w:7,h:7,vx:P.facing*240,vy:0,life:1.1});}}
 if(I.spearP){if(!S.ab.spear)sayOnce(P.x,P.y-6,'Gruk has no spear');else if(P.scd<=0&&P.roll<=0){P.scd=.5;sfx('spear');
  proj.push(I.up?{k:'spear',x:P.x+4,y:P.y-14,w:3,h:14,vx:0,vy:-330,life:1.2}:{k:'spear',x:P.x+(P.facing>0?P.w:-14),y:P.y+8,w:14,h:3,vx:P.facing*330,vy:0,life:1.2});}}
 if(I.hookP){if(!S.ab.grapple)sayOnce(P.x,P.y-6,'Gruk has no hook');else tryHook();}
 if(I.rollP){if(!S.ab.roll)sayOnce(P.x,P.y-6,'Gruk not know how to roll');
  else if(P.roll<=0&&P.rcd<=0&&P.onGround&&!P.hook){P.roll=.34;P.rcd=.55;P.y+=10;P.h=12;P.cling=0;sfx('roll');puff(P.x+6,P.y+12,'#c9a878',8,50);}}
 const water=inWater();
 if(!S.ab.swim&&(water||tileAt(Math.floor((P.x+6)/TS),Math.floor((P.y+P.h-2)/TS))==='~')){hurt(1,P.x+6,true);if(S.state==='play'){say(P.x-20,P.y-14,"Gruk can't swim! Glub!",'#9cf');respawnSafe();}return;}
 const prevVy=P.vy;
 if(P.hook){const h=P.hook;P.cling=0;P.onGround=false;
  if(h.st==='pull'){const tx=h.ax-P.w/2,ty=h.ay+2,dx=tx-P.x,dy=ty-P.y,d=Math.hypot(dx,dy);h.t+=dt;
   if(d<5){P.x=tx;P.y=ty;h.st='hang';sfx('clink');}
   else if(h.t>1.2)P.hook=null;
   else{const sp=Math.min(d,380*dt);const bx=moveX(P,dx/d*sp,solidP),by=moveY(P,dy/d*sp,solidP,false);if(bx&&by)P.hook=null;}
   P.vx=P.vy=0;}
  else{P.vx=P.vy=0;if(dir)P.facing=dir;P.jumps=S.ab.djump?1:0;
   if(I.jumpP){P.hook=null;P.vy=-JUMPV*.9;sfx('jump');}else if(I.downP)P.hook=null;}
 }else{
  if(water){if(P.h<22&&canStand())standUp();P.cling=0;P.force=0;P.vx=dir*95;if(dir)P.facing=dir;P.jumps=S.ab.djump?1:0;
   const surf=tileAt(Math.floor((P.x+6)/TS),Math.floor((P.y+2)/TS))!=='~';
   if(I.jumpP){P.vy=surf?-JUMPV*.85:-170;sfx('swim');puff(P.x+6,P.y+4,'#bfe8ff',4,30);}
   if(I.up)P.vy-=420*dt;if(I.down)P.vy+=420*dt;P.vy=clamp(P.vy+260*dt,-JUMPV,120);
   if(Math.random()<.04)parts.push({x:P.x+8,y:P.y+2,vx:0,vy:-30,t:.8,c:'#bfe8ff',g:0});}
  else{
   if(P.roll>0){P.roll-=dt;if(dir)P.facing=dir;P.vx=P.facing*250;if(P.roll<=0){if(canStand())standUp();else P.roll=.05;}}
   else if(P.force>0){P.force-=dt;P.vx=P.forceVx;}else{P.vx=dir*SPEED;if(dir&&!P.cling)P.facing=dir;}
   if(S.ab.climb&&!P.onGround&&P.force<=0&&P.roll<=0){
    if(P.cling){if(!touchWall(P.cling)){if(P.vy<0){P.vy=-240;P.force=.2;P.forceVx=P.cling*90;}P.cling=0;}else if(dir===-P.cling||I.downP)P.cling=0;}
    else if(dir&&touchWall(dir)&&P.vy>-80){P.cling=dir;P.jumps=S.ab.djump?1:0;}
   }else if(P.onGround)P.cling=0;
   if(I.jumpP)P.jbuf=.13;else P.jbuf-=dt;
   if(P.onGround){P.coy=.1;P.jumps=S.ab.djump?1:0;}else P.coy-=dt;
   if(P.jbuf>0&&P.roll<=0){
    if(P.cling){P.vy=-JUMPV*.95;P.force=.14;P.forceVx=-P.cling*140;P.facing=-P.cling;P.cling=0;P.jbuf=0;sfx('jump');puff(P.x+6,P.y+20,'#ddd',4,40);}
    else if(P.coy>0){P.vy=-JUMPV;P.coy=0;P.jbuf=0;sfx('jump');puff(P.x+6,P.y+22,'#d8c8a8',4,30);}
    else if(P.jumps>0){P.vy=-JUMPV*.95;P.jumps--;P.jbuf=0;sfx('jump');puff(P.x+6,P.y+22,'#8cf',10,60);}
   }
   if(!I.jump&&P.vy<-130&&!P.cling&&P.force<=0)P.vy=-130;
   if(P.cling){P.vx=0;P.facing=P.cling;if(I.up)P.vy=-80;else if(I.down)P.vy=160;else P.vy=Math.min(P.vy+G*dt,0);}
   else P.vy=Math.min(P.vy+G*dt,MAXF);
  }
  moveX(P,P.vx*dt,solidP);
  const landed=moveY(P,P.vy*dt,solidP,!I.down);
  if(landed){if(P.vy>0)P.onGround=true;P.vy=0;}else P.onGround=false;
 }
 if(P.onGround&&!P.wasG&&prevVy>260){puff(P.x+6,P.y+P.h,'#d8c8a8',6,50);if(prevVy>400)shake=Math.max(shake,.08);}
 P.wasG=P.onGround;
 if(P.onGround&&!water&&P.roll<=0){P.cling=0;const fx=Math.floor((P.x+6)/TS),fy=Math.floor((P.y+P.h+1)/TS);
  if(solidP(tileAt(fx,fy))&&!HAZ(tileAt(fx-1,fy-1))&&!HAZ(tileAt(fx+1,fy-1))&&!HAZ(tileAt(fx-1,fy))&&!HAZ(tileAt(fx+1,fy))&&tileAt(fx-1,fy)!=='~'&&tileAt(fx+1,fy)!=='~')lastSafe={x:P.x,y:P.y};}
 P.anim+=dt*(P.vx?10:2);
 // club hits
 if(P.atk>0){const hb={x:P.facing>0?P.x+P.w:P.x-18,y:P.y+2,w:18,h:16};
  for(const e of ents)if(e.hp>0&&!P.hitSet.has(e)&&ov(hb,e)){P.hitSet.add(e);clubHit(e);}
  const c0=Math.floor(hb.x/TS),c1=Math.floor((hb.x+hb.w-1)/TS),r0=Math.floor(hb.y/TS),r1=Math.floor((hb.y+hb.h-1)/TS);
  for(let ty=r0;ty<=r1;ty++)for(let tx=c0;tx<=c1;tx++){const c=tileAt(tx,ty);
   if(c==='C'){if(S.ab.smash){flood(tx,ty,'C',(x,y)=>puff(x*TS+8,y*TS+8,'#9a8a74',6,90));sfx('break');shake=.25;hitstop=.05;}else if(!P.hitSet.has('C')){P.hitSet.add('C');sfx('clink');sayOnce(P.x,P.y-6,'Too hard! Need STONE SMASH');}}
   else if(c==='V'&&!P.hitSet.has('V')){P.hitSet.add('V');sayOnce(P.x,P.y-6,'Vines too tough. Burn them?');}}}
 // hazards
 {const c0=Math.floor((P.x+2)/TS),c1=Math.floor((P.x+P.w-3)/TS),ty=Math.floor((P.y+P.h-3)/TS);let sp=false;for(let tx=c0;tx<=c1;tx++)if(HAZ(tileAt(tx,ty)))sp=true;
  if(sp){if(tileAt(c0,ty)==='L'||tileAt(c1,ty)==='L')puff(P.x+6,P.y+P.h,'#f80',12,90);hurt(1,P.x+6,true);if(S.state==='play')respawnSafe();}}
 // room transitions
 const cx=P.x+P.w/2,cy=P.y+P.h/2;let [rx,ry]=S.room.split(',').map(Number),nk=null;
 if(cx<0){nk=(rx-1)+','+ry;if(ROOMS[nk])enterRoom(nk,P.x+VW,P.y,true);}
 else if(cx>VW){nk=(rx+1)+','+ry;if(ROOMS[nk])enterRoom(nk,P.x-VW,P.y,true);}
 else if(cy<0){nk=rx+','+(ry-1);if(ROOMS[nk]){const cl=P.cling;enterRoom(nk,P.x,P.y+VH,true);
  if(!(cl&&touchWall(cl))&&!P.hook){P.cling=0;P.vy=Math.min(P.vy,-300);const pr=RH-2,c=Math.floor((P.x+6)/TS);let best=0,bd=99;
   for(const d of[-1,1])for(let k=1;k<8;k++){const t=tileAt(c+d*k,pr);if(solidP(t)){if(!solidP(tileAt(c+d*k,pr-1))&&k<bd){bd=k;best=d;}break;}}
   if(best){P.force=.32;P.forceVx=best*100;P.facing=best;}}}}
 else if(cy>VH){nk=rx+','+(ry+1);if(ROOMS[nk])enterRoom(nk,P.x,P.y-VH,true);else{hurt(1,P.x,true);respawnSafe();}}
}
function flood(x,y,ch,cb){const q=[[x,y]];const seen={};while(q.length){const [a,b]=q.pop();if(a<0||b<0||a>=RW||b>=RH||seen[a+','+b]||cur.g[b][a]!==ch)continue;seen[a+','+b]=1;setTile(a,b,'.');cb(a,b);q.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]);}}
function dmgEnemy(e,n,src){e.hp-=n;e.fl=.12;sfx('hit');hitstop=.045;shake=Math.max(shake,.08);puff(e.x+e.w/2,e.y+e.h/2,'#fff',5,70);
 if(e.t==='walker'||e.t==='bat'||e.t==='fish'){e.x+= (e.x+e.w/2<src?-6:6);if(e.hp<=0){puff(e.x+e.w/2,e.y+e.h/2,'#c84',10,90);if(Math.random()<.35)ents.push({t:'meat',x:e.x+2,y:e.y,w:10,h:8,vy:-120});}}
 if(BOSSES.includes(e.t)&&e.hp<=0){e.st='dying';e.t2=1.6;sfx('boss');shake=.6;}}
function clubHit(e){const px=P.x+P.w/2;
 if(e.t==='walker'||e.t==='bat'||e.t==='fish')dmgEnemy(e,S.ab.smash?2:1,px);
 else if(e.t==='croc'&&e.st!=='dying'){if((px-(e.x+e.w/2))*e.face<0)dmgEnemy(e,S.ab.smash?2:1,px);else{sfx('clink');sayOnce(P.x-10,P.y-8,'Jaws too strong! Get BEHIND it!');}}
 else if(e.t==='golem'&&e.st!=='dying'&&e.st!=='intro')dmgEnemy(e,S.ab.smash?2:1,px);
 else if(e.t==='mammoth'&&e.st!=='dying'){sfx('clink');puff(e.x+e.w/2,P.y+8,'#cef',5,60);sayOnce(P.x-10,P.y-8,'Club bounces off ice! Need FIRE!');}
 else if(e.t==='ptero'&&e.st!=='dying'){sfx('clink');sayOnce(P.x-10,P.y-8,'It flaps away! Need SPEAR!');}}

// ---------------- enemies / bosses
function updEnts(dt){
 for(const e of ents){if(e.fl>0)e.fl-=dt;
  if(e.t==='walker'&&e.hp>0){e.an+=dt*8;const nx=e.x+e.vx*dt;const front=e.vx>0?nx+e.w:nx;const tx=Math.floor(front/TS),ty=Math.floor((e.y+e.h-1)/TS);
   const below=tileAt(tx,ty+1);if(solidP(tileAt(tx,ty))||!(solidP(below)||below==='=')||tileAt(tx,ty)==='^')e.vx=-e.vx;else e.x=nx;
   if(ov(e,P))hurt(1,e.x+e.w/2);}
  else if(e.t==='bat'&&e.hp>0){e.an+=dt;const dx=P.x+6-(e.x+6),dy=P.y+8-(e.y+4),d=Math.hypot(dx,dy);
   if(d<140&&d>1){e.x+=dx/d*48*dt;e.y+=dy/d*48*dt+Math.sin(e.an*7)*.6;}else{e.y=e.by+Math.sin(e.an*2)*10;e.x+= Math.cos(e.an*1.3)*.4;}
   if(ov(e,P))hurt(1,e.x+e.w/2);}
  else if(e.t==='meat'){e.vy=Math.min(e.vy+G*dt,300);if(moveY(e,e.vy*dt,solidP,true))e.vy=0;if(ov(e,P)){e.hp=0;e.dead=1;P.hp=Math.min(P.maxHp,P.hp+1);sfx('pick');say(P.x,P.y-6,'+1','#f66');}}
  else if(e.t==='fish'&&e.hp>0){e.an+=dt;const dx=P.x+6-(e.x+6),dy=P.y+8-(e.y+4),d=Math.hypot(dx,dy);let nx=e.x,ny=e.y;
   if(d<120&&d>1&&inWater()){nx+=dx/d*55*dt;ny+=dy/d*55*dt;}else{nx+=Math.cos(e.an)*25*dt;ny=e.by+Math.sin(e.an*1.7)*8;}
   if(tileAt(Math.floor((nx+6)/TS),Math.floor((ny+4)/TS))==='~'){e.x=nx;e.y=ny;}e.face=dx>0?1:-1;
   if(ov(e,P))hurt(1,e.x+6);}
  else if(e.t==='croc')updCroc(e,dt);
  else if(e.t==='golem')updGolem(e,dt);
  else if(e.t==='scroll'&&ov(e,P)){e.dead=1;S.flags.scrolls[e.id]=1;sfx('pick');puff(e.x+6,e.y+6,'#ffe060',16,80);
   banner={title:'KNOWLEDGE SCROLL '+Object.keys(S.flags.scrolls).length+'/'+TOTAL.scrolls,text:e.s,t:0,c:'#ffe060'};}
  else if(e.t==='mammoth')updMammoth(e,dt);
  else if(e.t==='ptero')updPtero(e,dt);
  else if(e.t==='heart'&&ov(e,P)){e.dead=1;S.flags.hearts[e.id]=1;P.maxHp++;P.hp=P.maxHp;sfx('pick');banner={title:'HEART OF THE MOUNTAIN',text:'Gruk feels tougher! Max health +1.',t:0};}
  else if(e.t==='K'&&ov(e,P)){const id=S.room+':'+e.x;if(lastCP!==id||P.hp<P.maxHp){lastCP=id;P.hp=P.maxHp;save(e.x,e.y+16-P.h);sfx('save');say(e.x-14,e.y-12,'SAVED','#ffd27a');}}
  else if(e.t==='shrine'&&shrineOn(e)&&ov(e,P)){S.ab[e.ab]=1;sfx('pick');puff(e.x+8,e.y,ABIL[e.ab].c,30,120);save(e.x,e.y+16-P.h);
   banner={title:'KNOWLEDGE GAINED: '+ABIL[e.ab].n,text:ABIL[e.ab].d,t:0,c:ABIL[e.ab].c};}
  else if(e.t==='orb'&&ov(e,P)){S.state='ascend';stateT=0;sfx('pick');}
 }
 ents=ents.filter(e=>!(e.dead||((e.t==='walker'||e.t==='bat'||e.t==='fish')&&e.hp<=0)));
 if(S.room==='0,0'&&BOSSES.every(b=>S.flags.bosses[b])&&cur.g[5][6]==='E'&&P.x<22*TS){for(let y=0;y<RH;y++)if(cur.g[y][6]==='E'){setTile(6,y,'.');puff(104,y*TS+8,'#c8f',8,90);}
  sfx('door');shake=.5;banner={title:'THE ELDER GATE OPENS',text:'The four great beasts have been humbled. The path to ENLIGHTENMENT is open.',t:0,c:'#c8f'};}
}
function shrineOn(e){return !S.ab[e.ab]&&(!e.cond||S.flags.bosses[e.cond]);}
function bossDown(m){S.flags.bosses[m.t]=1;m.dead=1;boss=null;shake=.6;for(let i=0;i<40;i++)puff(m.x+rnd(0,m.w),m.y+rnd(0,m.h),['#fff','#fc4','#f84'][i%3],1,160);
 for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){if(cur.g[y][x]==='B'){setTile(x,y,'.');puff(x*TS+8,y*TS+8,'#eee',6,80);}if(m.t==='golem'&&(cur.g[y][x]==='L'||cur.g[y][x]==='h'))setTile(x,y,cur.g[y][x]==='h'?'.':'#');}
 for(const e of ROOMS[S.room].ents)if(e.cond===m.t&&(e.t==='heart'||e.t==='scroll')){const it=spawnItem(S.room,e);if(it)ents.push(it);}
 sfx('door');const sh=ents.find(e=>e.t==='shrine');banner={title:m.name+' DEFEATED!',text:'A stone of KNOWLEDGE appears. The path onward is open.',t:0};
 save(sh?sh.x:P.x,sh?sh.y+16-P.h:P.y);eproj=[];}
function updCroc(m,dt){m.t2-=dt;m.an+=dt*(m.vx?Math.abs(m.vx)/12:1.5);const pc=P.x+6,mc=m.x+m.w/2,side=pc<mc?-1:1;
 switch(m.st){
  case 'intro':m.face=side;if(m.t2<=0){m.st='walk';m.t2=2.5;}break;
  case 'walk':if(side!==m.face){m.turn+=dt;m.vx=0;if(m.turn>.9){m.face=side;m.turn=0;}if(Math.abs(pc-mc)<80){m.tailT+=dt;if(m.tailT>1.0){m.st='tail';m.t2=.45;m.tailT=0;sfx('club');}}}
   else{m.turn=0;m.tailT=0;m.vx=m.face*32;if(m.t2<=0){m.st='prep';m.t2=.5;m.vx=0;}}break;
  case 'prep':m.vx=0;if(m.t2<=0){m.st='lunge';m.t2=.55;m.vx=m.face*(m.hp<5?240:190);sfx('boss');}break;
  case 'lunge':if(m.t2<=0){m.st='walk';m.t2=1.8+Math.random();m.vx=0;}break;
  case 'tail':m.vx=0;{const tb={x:m.face>0?m.x-30:m.x+m.w,y:m.y+6,w:30,h:26};if(m.t2<.3&&ov(tb,P))hurt(1,mc);}if(m.t2<=0){m.st='walk';m.t2=1.5;}break;
  case 'dying':m.vx=0;if(Math.random()<.4)puff(m.x+rnd(0,72),m.y+rnd(0,30),'#7c4',3,100);if(m.t2<=0)bossDown(m);return;}
 m.x=clamp(m.x+m.vx*dt,m.minX,m.maxX);
 if(P.roll<=0&&ov(P,{x:m.x,y:m.y+2,w:m.w,h:m.h})){if(pc<mc)P.x=m.x-P.w;else P.x=m.x+m.w;
  if((pc-mc)*m.face>0&&m.st!=='intro')hurt(1,pc-m.face);}}
function updGolem(m,dt){m.t2-=dt;m.an+=dt;const pc=P.x+6;m.face=pc<m.x+m.w/2?-1:1;
 switch(m.st){
  case 'intro':if(m.t2<=0){m.st='idle';m.t2=1.5;}break;
  case 'idle':m.y=m.by+Math.sin(m.an*2)*2;if(m.t2<=0){m.n++;if(m.n%3===0){m.st='erupt';m.t2=1;sfx('boss');}else{m.st='throw';m.t2=.5;}}break;
  case 'throw':if(m.t2<=0){for(let k=0;k<(m.hp<5?3:2);k++){const sx=m.x+m.w/2,sy=m.y+6,tx=pc+rnd(-30,30),T=1.0+k*.15;
    eproj.push({k:'lava',x:sx-4,y:sy,w:8,h:8,vx:(tx-sx)/T,vy:((P.y+10)-sy-.5*G*.7*T*T)/T});}sfx('fire');m.st='idle';m.t2=1.6;}break;
  case 'erupt':shake=Math.max(shake,.05);if(m.t2<=0){for(let i=0;i<(m.hp<5?7:5);i++)eproj.push({k:'drop',x:rnd(1,28)*TS,y:16,w:6,h:8,vy:0,delay:i*.15});m.st='idle';m.t2=1.8;}break;
  case 'dying':if(Math.random()<.5)puff(m.x+rnd(0,64),m.y+rnd(0,44),'#f84',3,100);if(m.t2<=0)bossDown(m);return;}
 if(m.st!=='intro'&&ov({x:m.x+6,y:m.y+4,w:m.w-12,h:m.h-4},P))hurt(1,m.x+m.w/2);}
function updMammoth(m,dt){m.t2-=dt;m.an+=dt*(m.vx?Math.abs(m.vx)/20:1);const px=P.x+P.w/2,mx=m.x+m.w/2;
 switch(m.st){
  case 'intro':if(m.t2<=0){m.st='walk';m.t2=2;}break;
  case 'walk':m.face=px<mx?-1:1;m.vx=m.face*45;if(m.t2<=0){m.st='prep';m.t2=.7;m.vx=0;}break;
  case 'prep':m.vx=0;if(m.t2<=0){m.st='charge';m.vx=m.face*(m.hp<6?260:210);sfx('boss');}break;
  case 'charge':if((m.vx<0&&m.x<=m.minX)||(m.vx>0&&m.x>=m.maxX)){m.st='stun';m.t2=1.4;m.vx=0;shake=.4;sfx('break');
   for(let i=0;i<(m.hp<6?6:4);i++)eproj.push({k:'ice',x:rnd(2,27)*TS,y:16,w:6,h:12,vy:0,delay:.3+i*.18});}break;
  case 'stun':m.vx=0;if(m.t2<=0){m.st='walk';m.t2=1.5+Math.random()*1.2;}break;
  case 'dying':m.vx=0;if(Math.random()<.4)puff(m.x+rnd(0,56),m.y+rnd(0,40),'#cef',3,100);if(m.t2<=0)bossDown(m);return;}
 m.x=clamp(m.x+m.vx*dt,m.minX,m.maxX);
 if(m.st!=='intro'&&ov({x:m.x+4,y:m.y+6,w:m.w-8,h:m.h-6},P))hurt(1,mx);}
function updPtero(m,dt){m.t2-=dt;m.an+=dt*10;const px=P.x+P.w/2,py=P.y+P.h/2;
 switch(m.st){
  case 'intro':m.y+= (m.baseY-m.y)*Math.min(1,dt*2);m.x+=(220-m.x)*Math.min(1,dt*2);if(m.t2<=0){m.st='hover';m.t2=2.5;}break;
  case 'hover':m.ph+=dt;{const tx=240+180*Math.sin(m.ph*.9)-m.w/2;m.x+=(tx-m.x)*Math.min(1,dt*2);m.y+=(m.baseY+14*Math.sin(m.ph*2.6)-m.y)*Math.min(1,dt*3);}
   m.face=px>m.x+m.w/2?1:-1;m.rt-=dt;if(m.rt<=0){m.rt=m.hp<5?1.0:1.7;eproj.push({k:'rock',x:m.x+m.w/2-3,y:m.y+m.h,w:6,h:6,vy:30});}
   if(m.t2<=0){m.st='prep';m.t2=.6;sfx('boss');}break;
  case 'prep':m.y-=20*dt;if(m.t2<=0){m.st='swoop';m.t2=1.3;const dx=px-(m.x+m.w/2),dy=py-(m.y+m.h/2),d=Math.hypot(dx,dy)||1;m.vx=dx/d*(m.hp<5?290:240);m.vy=dy/d*(m.hp<5?290:240);m.ty=py;m.face=dx>0?1:-1;}break;
  case 'swoop':m.x+=m.vx*dt;m.y+=m.vy*dt;if(m.y+m.h/2>=m.ty||m.t2<=0||m.y+m.h>=15*TS){m.st='rise';m.t2=1.5;}break;
  case 'rise':m.y-=110*dt;m.x+=m.vx*.3*dt;if(m.y<=m.baseY||m.t2<=0){m.st='hover';m.t2=2+Math.random()*1.5;}break;
  case 'dying':m.y+=60*dt;if(Math.random()<.4)puff(m.x+rnd(0,40),m.y+rnd(0,20),'#c8a',3,100);if(m.t2<=0)bossDown(m);return;}
 m.x=clamp(m.x,8,VW-8-m.w);m.y=clamp(m.y,-50,15*TS-m.h);
 if(m.st!=='intro'&&ov({x:m.x+6,y:m.y+4,w:m.w-12,h:m.h-6},P))hurt(1,m.x+m.w/2);}
function updProj(dt){
 for(const p of proj){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
  if(p.k==='fire'&&Math.random()<.6)parts.push({x:p.x+3,y:p.y+3,vx:rnd(-20,20),vy:rnd(-30,0),t:.3,c:Math.random()<.5?'#fc4':'#f62',g:0});
  const tx=Math.floor((p.x+p.w/2)/TS),ty=Math.floor((p.y+p.h/2)/TS),c=tileAt(tx,ty);
  if(p.k==='fire'&&c==='~'){puff(p.x,p.y,'#ddd',4,30);p.life=0;continue;}
  if(p.k==='fire'&&c==='V'){flood(tx,ty,'V',(x,y)=>{for(let i=0;i<5;i++)parts.push({x:x*TS+rnd(0,16),y:y*TS+rnd(0,16),vx:rnd(-20,20),vy:rnd(-60,-10),t:rnd(.4,1),c:i%2?'#fc4':'#f62',g:-50});});sfx('fire');p.life=0;continue;}
  if(p.k==='spear'&&(c==='S')){for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){if(cur.g[y][x]==='S')setTile(x,y,'s');if(cur.g[y][x]==='D'){setTile(x,y,'.');puff(x*TS+8,y*TS+8,'#999',8,90);}}
   sfx('door');shake=.4;say(P.x-30,P.y-10,'The stone door rumbles open!','#ffd27a');p.life=0;continue;}
  if(solidProj(c)||p.x<-20||p.x>VW+20||p.y<-20||p.y>VH+20){if(p.k==='spear'&&c!=='.')sfx('clink');puff(p.x,p.y,p.k==='fire'?'#f84':'#ccc',4,50);p.life=0;continue;}
  for(const e of ents){if(e.hp>0&&e.st!=='dying'&&ov(p,e)&&(e.t==='walker'||e.t==='bat'||e.t==='fish'||BOSSES.includes(e.t))){
   if(e.t==='mammoth'&&p.k!=='fire'){sfx('clink');sayOnce(p.x-20,p.y-10,'Spear bounces off the ice!');}
   else if(e.t==='ptero'&&p.k!=='spear'){puff(p.x,p.y,'#f84',6,60);sayOnce(p.x-20,p.y+20,'Fire fizzles on its scales!');}
   else if(e.st==='intro'){}
   else if(e.t==='golem'){puff(p.x,p.y,'#f84',8,60);sayOnce(p.x-30,p.y-12,p.k==='fire'?'The golem drinks the fire!':'The spear melts!');}
   else if(e.t==='croc'&&(p.x-(e.x+e.w/2))*e.face>0){sfx('clink');sayOnce(p.x-30,p.y-12,'Bounces off its jaws!');}
   else dmgEnemy(e,p.k==='fire'?(e.t==='mammoth'?1:2):1,p.x);
   p.life=0;break;}}
 }
 proj=proj.filter(p=>p.life>0);
 for(const p of eproj){if(p.delay>0){p.delay-=dt;continue;}p.vy=Math.min(p.vy+G*.7*dt,400);p.y+=p.vy*dt;if(p.vx)p.x+=p.vx*dt;if(p.k==='lava'&&Math.random()<.5)parts.push({x:p.x+4,y:p.y+4,vx:0,vy:0,t:.3,c:'#f80',g:0});
  if(ov(p,P)){hurt(1,p.x);p.dead=1;}
  const c=tileAt(Math.floor((p.x+3)/TS),Math.floor((p.y+p.h)/TS));if(solidP(c)||p.y>VH){p.dead=1;puff(p.x+3,p.y+p.h,p.k==='ice'?'#cef':(p.k==='lava'||p.k==='drop')?'#f80':'#887',5,60);}}
 eproj=eproj.filter(p=>!p.dead);
 for(const p of parts){p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;}parts=parts.filter(p=>p.t>0);
 for(const t of texts){t.t-=dt;t.y-=12*dt;}texts=texts.filter(t=>t.t>0);
}

// ---------------- palettes & art
const PAL={
 base:{rock:'#7a5a3c',r2:'#5e4430',r3:'#94704c',top:'#58a83c',top2:'#3c7a2a',sky:['#4a90d8','#9ccff0','#f4d8a0'],m1:'#8a96c4',m2:'#5e6aa0'},
 cliff:{rock:'#7a6a5a',r2:'#5a4c40',r3:'#9a8a74',top:'#7aa84c',top2:'#55803a',sky:['#3a68b8','#88b0e0','#e8c8b0'],m1:'#7a88b8',m2:'#4e5a8a'},
 cave:{rock:'#4c4058',r2:'#342a40',r3:'#665a74',top:'#3a6a5a',top2:'#2a4a44',bg:'#16121e'},
 ice:{rock:'#6a80a8',r2:'#4a5a80',r3:'#9ab4d8',top:'#f0f8ff',top2:'#c0d8f0',sky:['#6aa0d8','#c0e0f4','#eef8ff'],m1:'#c8dcf0',m2:'#94b0d4'},
 jungle:{rock:'#5a4a2c',r2:'#3e3220',r3:'#7a6a3c',top:'#3cb83c',top2:'#2a8a2a',sky:['#2a7a6a','#7ac8a0','#e8e0a0'],m1:'#3a7a5a',m2:'#245a3a'},
 icecave:{rock:'#4a6a9a',r2:'#34507a',r3:'#8ab0e0',top:'#e0f4ff',top2:'#a0c8f0',bg:'#0e1a2e',bg2:'#16284a',st:'#0a1222'},
 lava:{rock:'#4a3030',r2:'#301c1c',r3:'#6a4038',top:'#8a4a2a',top2:'#5a2a1a',bg:'#1e0e0a',bg2:'#2e1410',st:'#140806'},
 peak:{rock:'#6a6080',r2:'#4a4260',r3:'#8a80a0',top:'#ffffff',top2:'#d0d8f0',sky:['#16143e','#5a3c80','#f09a6a'],m1:'#5a4c7a',m2:'#3a3460'}};
function hx(c){return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];}
function mix(a,b,t){const A=hx(a),B=hx(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';}
const bgCache={};
function getBg(theme){if(bgCache[theme])return bgCache[theme];const p=PAL[theme],W=VW*2;const [sk,g]=mkC(VW,VH),[far,f]=mkC(W,VH),[near,n]=mkC(W,VH);
 if(p.bg||theme==='cave'){const bg=p.bg,b2=p.bg2||'#1d1827',st=p.st||'#120e18';g.fillStyle=bg;g.fillRect(0,0,VW,VH);
  for(let i=0;i<260;i++){f.fillStyle=i%3?b2:'rgba(255,255,255,.04)';f.fillRect(hash(i,1,3)%W,hash(i,2,3)%VH,2+hash(i,3,3)%8,2+hash(i,4,3)%5);}
  for(let x=0;x<W;x+=2){const h=8+(hash(x>>3,9,1)%30);n.fillStyle=st;n.fillRect(x,0,2,h*(x%16<8?1:.6));const h2=6+(hash(x>>3,7,2)%16);n.fillRect(x,VH-h2,2,h2);}
  if(theme==='lava')for(let i=0;i<50;i++){f.fillStyle='rgba(255,120,40,.25)';f.fillRect(hash(i,5,5)%W,hash(i,6,5)%VH,1,4);}
  if(theme==='icecave')for(let i=0;i<40;i++){f.fillStyle='rgba(180,220,255,.25)';const x=hash(i,5,6)%W,h=10+hash(i,6,6)%30;for(let k=0;k<h;k++)f.fillRect(x+(k>>3),k,Math.max(1,4-(k>>3)),1);}}
 else{for(let y=0;y<VH;y+=4){const t=y/VH;g.fillStyle=t<.5?mix(p.sky[0],p.sky[1],t*2):mix(p.sky[1],p.sky[2],(t-.5)*2);g.fillRect(0,y,VW,4);}
  if(theme==='peak')for(let i=0;i<90;i++){g.fillStyle=i%7?'#fff':'#ffd';g.fillRect(hash(i,5,1)%VW,hash(i,6,1)%140,1,1);}
  for(let i=0;i<6;i++){const cx=hash(i,7,theme.length)%VW,cy=20+hash(i,8,2)%70;g.fillStyle='rgba(255,255,255,.55)';g.fillRect(cx,cy,40,6);g.fillRect(cx+8,cy-4,22,4);g.fillRect(cx-6,cy+2,12,4);}
  const per=x=>x*2*Math.PI/W;
  for(let x=0;x<W;x++){const h=120+40*Math.sin(per(x)*3+theme.length)+18*Math.sin(per(x)*13)+6*Math.sin(per(x)*37);f.fillStyle=p.m1;f.fillRect(x,VH-h,1,h);if(h>165){f.fillStyle='#f4f8ff';f.fillRect(x,VH-h,1,Math.min(10,(h-165)));}}
  for(let x=0;x<W;x++){const h=70+26*Math.sin(per(x)*6+2)+10*Math.sin(per(x)*22)+(hash(x>>2,3,3)%3);n.fillStyle=p.m2;n.fillRect(x,VH-h,1,h);}
  if(theme==='base'||theme==='cliff'||theme==='jungle')for(let i=0;i<50;i++){const x=hash(i,11,1)%W,h=10+hash(i,12,1)%12;n.fillStyle=theme==='jungle'?'#1a4a2a':'#2e4a3a';for(let k=0;k<h;k++)n.fillRect(x-(k>>2),VH-50-h+k+(hash(i,13,1)%30),1+((k>>2)<<1),1);}
  if(theme==='jungle')for(let i=0;i<24;i++){const x=hash(i,14,2)%W;n.fillStyle='#1a3a20';n.fillRect(x,0,2,30+hash(i,15,2)%60);n.fillRect(x-3,20+hash(i,16,2)%40,8,3);}}
 return bgCache[theme]={sk,far,near};}
function drawBg(theme,still){const b=getBg(theme),ox=(P&&!still)?P.x:stateT*8;ctx.drawImage(b.sk,0,0);
 for(const [c,k] of [[b.far,.15],[b.near,.35]]){const o=-((ox*k+(k>.2?120:60))%VW);ctx.drawImage(c,o,0);}}
const isRock=c=>c==='#'||c==='C'||c==='h';
function renderTiles(){const g=tctx,p=PAL[cur.theme];g.clearRect(0,0,VW,VH);
 for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const c=cur.g[y][x],X=x*TS,Y=y*TS;
  if(c==='#'||c==='C'){g.fillStyle=c==='C'?p.r3:p.rock;g.fillRect(X,Y,16,16);
   for(let i=0;i<7;i++){const h=hash(x,y,i);g.fillStyle=(h&1)?p.r2:p.r3;if(c==='C'&&(h&1)===0)g.fillStyle=p.rock;g.fillRect(X+(h>>3)%14,Y+(h>>9)%14,2+((h>>4)&1),2);}
   if(c==='C'){g.fillStyle='#2a2018';let cx=X+4+hash(x,y,9)%6;for(let k=0;k<16;k++){g.fillRect(cx,Y+k,1,1);if(k%3===0)cx+=(hash(x,y,k)%3)-1;}g.fillRect(X+2,Y+8,6,1);g.fillRect(X+9,Y+5,5,1);}
   g.fillStyle=p.r2;if(!isRock(tileAt(x-1,y)))g.fillRect(X,Y,1,16);if(!isRock(tileAt(x+1,y)))g.fillRect(X+15,Y,1,16);if(!isRock(tileAt(x,y+1)))g.fillRect(X,Y+15,16,1);
   if(!isRock(tileAt(x,y-1))&&!solidP(tileAt(x,y-1))){g.fillStyle=p.top;g.fillRect(X,Y,16,3);g.fillStyle=p.top2;for(let i=0;i<4;i++)g.fillRect(X+i*4+(hash(x,y,i)%2),Y+3,2,1+hash(x,y,i+5)%3);g.fillStyle=p.top;if(hash(x,y,3)%3===0)g.fillRect(X+hash(x,y,4)%14,Y-2,1,2);}}
  else if(c==='V'){g.fillStyle='rgba(20,40,10,.5)';g.fillRect(X,Y,16,16);for(let s=0;s<4;s++){let vx=X+2+s*4;for(let k=0;k<16;k++){g.fillStyle=(k+s)%5?'#4a8a2a':'#2a5a1a';g.fillRect(vx,Y+k,2,1);if((k+s)%4===0)vx+=((s+k)&2)?1:-1;if((k*3+s)%7===0){g.fillStyle='#7ac04a';g.fillRect(vx-2,Y+k,2,2);}}}g.fillStyle='#a08040';g.fillRect(X+5,Y+3,2,2);g.fillRect(X+11,Y+11,2,2);}
  else if(c==='D'){g.fillStyle='#8a8a96';g.fillRect(X,Y,16,16);g.fillStyle='#5a5a66';g.fillRect(X,Y+7,16,1);g.fillRect(X+(y%2?4:10),Y,1,7);g.fillRect(X+(y%2?10:4),Y+8,1,8);g.fillStyle='#b0b0bc';g.fillRect(X,Y,16,1);g.fillStyle='#d06030';g.fillRect(X+7,Y+11,2,2);}
  else if(c==='G'){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(X,Y,16,16);g.fillStyle='#8a5a2a';for(const b of[1,7,12])g.fillRect(X+b,Y,3,16);g.fillStyle='#5a3a1a';g.fillRect(X,Y+6,16,2);g.fillStyle='#b07a40';for(const b of[1,7,12])g.fillRect(X+b,Y,1,16);}
  else if(c==='S'||c==='s'){g.fillStyle=p.rock;g.fillRect(X,Y,16,16);g.fillStyle='#3a3040';g.fillRect(X+3,Y+3,10,10);g.fillStyle=c==='S'?'#d03030':'#40d060';g.fillRect(X+4,Y+5,8,6);g.fillRect(X+5,Y+4,6,8);g.fillStyle='#fff';g.fillRect(X+6,Y+6,2,2);}
  else if(c==='B'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(X,Y,16,16);g.fillStyle='#e8e0c8';for(const b of[2,7,12])g.fillRect(X+b,Y,3,16);g.fillStyle='#a89c80';for(const b of[2,7,12])g.fillRect(X+b+2,Y,1,16);}
  else if(c==='='){g.fillStyle='#8a5a30';g.fillRect(X,Y,16,5);g.fillStyle='#c08a50';g.fillRect(X,Y,16,1);g.fillStyle='#5a3418';g.fillRect(X,Y+4,16,1);g.fillRect(X+3,Y+5,2,3);g.fillRect(X+11,Y+5,2,3);}
  else if(c==='E'){g.fillStyle='#3a2a5a';g.fillRect(X,Y,16,16);g.fillStyle='#6a4aa0';g.fillRect(X+2,Y,12,16);g.fillStyle='#c8f';if(y%3===0)g.fillRect(X+6,Y+5,4,6);g.fillStyle='#8a6ac8';g.fillRect(X+2,Y,1,16);}
  else if(c==='h'){g.fillStyle='#3a2020';g.fillRect(X,Y,16,16);for(let i=0;i<5;i++){const h=hash(x,y,i);g.fillStyle=(h&1)?'#f60':'#a30';g.fillRect(X+(h>>3)%13,Y+(h>>9)%13,3,1);}}
  else if(c==='o'){g.fillStyle='#5a4a3a';g.fillRect(X+7,Y,2,4);g.fillStyle='#c8a8ff';g.fillRect(X+4,Y+4,8,2);g.fillRect(X+4,Y+10,8,2);g.fillRect(X+3,Y+5,2,6);g.fillRect(X+11,Y+5,2,6);}
  else if(c==='^'){for(let i=0;i<4;i++)for(let r=0;r<8;r++){const w=1+(r>>1);g.fillStyle=r<2?'#fff':'#c8c0b0';g.fillRect(X+i*4+2-(w>>1),Y+8+r,w,1);}g.fillStyle='#6a5a4a';g.fillRect(X,Y+15,16,1);}
 }tileDirty=false;}
function spr(rows,pal){const [c,g]=mkC(16,rows.length);rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){g.fillStyle=pal[r[x]];g.fillRect(x,y,1,1);}});return c;}
const BODY=["....hhhhhhh.....","..hhhhhhhhhhh...",".hhhhhhhhhhhhh..",".hhhhhhsssssh...",".hhhhhsssskss...",".hhhhhssssssss..",".hhhhhhsssSss...","..hhhhhhwwwhh...","..hhhhhhhhhhh...","...hhhhhhhhh....","...ssffffffss...","..sssfFffFfsss..","..ss.ffffff.ss..","..ss.fFffff.ss..","..ss.ffffFf.ss..","..S..FfffffF.S..",".....fFfffFf....",".....FffffffF..."];
const LEGS={idle:[".....ss..ss.....",".....ss..ss.....",".....ss..ss.....",".....ss..ss.....","....FFF..FFF....","....FFF..FFF...."],
 walk:[".....ss...ss....","....ss.....ss...","....ss.....ss...","...ss.......ss..","...ss.......ss..","..FFF.......FFF."],
 jump:[".....ss..ss.....","....ss....ss....","....ss....ss....","...FFF....FFF...","................","................"]};
const GP={h:'#3a2212',s:'#e2a26a',S:'#b0703c',k:'#140808',w:'#f4ecd8',f:'#b06a2a',F:'#6e3a16'};
const EP={h:'#8a6a4a',s:'#f0c090',S:'#c89060',k:'#2040a0',w:'#ffffff',f:'#f4f0ff',F:'#c8c0f0'};
const SPR={};for(const k in LEGS){SPR[k]=spr(BODY.concat(LEGS[k]),GP);SPR['e'+k]=spr(BODY.concat(LEGS[k]),EP);}
function drawGruk(g,x,y,face,frame,evolved,sc){sc=sc||1;const c=SPR[(evolved?'e':'')+frame];g.save();g.translate(Math.round(x),Math.round(y));if(face<0){g.translate(16*sc,0);g.scale(-1,1);}g.drawImage(c,0,0,16*sc,24*sc);g.restore();}
function R2(g,X,W,face){return(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(face>0?X+x:X+W-x-w),Math.round(y),w,h);};}
function drawMammoth(m){const fl=m.fl>0,f=fl?'#fff':'#7c8cae',d=fl?'#fff':'#56627e',ic='#cfe8ff',W=56;const sh=m.st==='prep'?(Math.random()*2-1):0;const r=R2(ctx,m.x+sh,W,m.face),Y=m.y;const a=Math.sin(m.an)*2;
 r(8,Y+28+a,7,12,d);r(30,Y+28-a,7,12,d);r(18,Y+28-a,7,12,f);r(40,Y+28+a,7,12,f);
 r(6,Y+6,38,24,d);r(4,Y+10,42,18,f);r(8,Y+4,30,4,f);r(10,Y+6,20,2,ic);for(let i=0;i<5;i++)r(10+i*6,Y+1+(i%2),2,4,ic);
 r(38,Y+8,14,16,f);r(40,Y+6,10,4,f);r(46,Y+12,3,2,fl?'#fff':'#ff3030');r(50,Y+18,5,6,f);r(52,Y+24,4,8,f);r(50,Y+31,4,3,d);
 r(42,Y+24,10,2,'#fffbe8');r(50,Y+21,3,3,'#fffbe8');r(6,Y+18,8,2,d);r(14,Y+24,26,2,d);
 if(m.st==='stun'){for(let i=0;i<3;i++){ctx.fillStyle='#ff8';ctx.fillRect(m.x+20+Math.cos(stateT*6+i*2)*14,m.y-4+Math.sin(stateT*6+i*2)*3,2,2);}}}
function drawCroc(m){const fl=m.fl>0,b=fl?'#fff':'#4a7a3a',d=fl?'#fff':'#2e5a28',W=72,r=R2(ctx,m.x+(m.st==='prep'?rnd(-1,1):0),W,m.face),Y=m.y,a=Math.sin(m.an)*2;
 const open=m.st==='lunge'||m.st==='prep';const tw=m.st==='tail'?-10:0;
 r(-10+tw,Y+16,22,6,d);r(-16+tw*1.5,Y+18,10,4,d);r(10,Y+8,40,18,b);r(12,Y+6,34,4,d);for(let i=0;i<6;i++)r(14+i*6,Y+4,3,3,d);
 r(14,Y+26+a,6,6,d);r(40,Y+26-a,6,6,d);r(48,Y+(open?4:10),24,7,b);r(48,Y+18,24,6,b);r(52,Y+(open?2:8),5,3,'#ff3');r(53,Y+(open?3:9),2,2,'#000');
 for(let i=0;i<5;i++){r(56+i*3,Y+(open?11:17),2,2,'#fffbe8');}r(16,Y+20,30,3,'#a8c070');}
function drawGolem(m){const fl=m.fl>0,X=m.x,Y=m.y,c=fl?'#fff':'#4a3a36',c2=fl?'#fff':'#2e2422',gl=m.st==='erupt'||m.st==='throw'?'#ffe040':'#f80';
 ctx.fillStyle=c2;ctx.fillRect(X+8,Y+30,14,14);ctx.fillRect(X+42,Y+30,14,14);ctx.fillStyle=c;ctx.fillRect(X+6,Y+6,52,28);ctx.fillRect(X+18,Y-4,28,14);ctx.fillRect(X-4,Y+8,12,20);ctx.fillRect(X+56,Y+8,12,20);
 ctx.fillStyle=gl;ctx.fillRect(X+24,Y+1,5,3);ctx.fillRect(X+36,Y+1,5,3);for(let i=0;i<6;i++){const h=hash(i,3,9);ctx.fillRect(X+8+h%46,Y+8+(h>>4)%22,(h>>8)%6+2,1);}
 ctx.fillStyle='#ffb030';ctx.fillRect(X+28,Y+16,8,8);if(Math.random()<.2)parts.push({x:X+rnd(10,54),y:Y,vx:0,vy:-40,t:.5,c:'#f80',g:0});}
function drawPtero(m){const fl=m.fl>0,b=fl?'#fff':'#8a4a5a',w=fl?'#fff':'#6a3048',W=48,X=m.x-4;const r=R2(ctx,X,W,m.face),Y=m.y-2;const up=Math.sin(m.an)>0;
 if(m.st==='swoop'){r(2,Y+6,16,3,w);r(30,Y+6,16,3,w);}else if(up){r(4,Y-6,14,3,w);r(8,Y-3,12,3,w);r(12,Y,10,3,w);}else{r(4,Y+16,14,3,w);r(8,Y+12,12,4,w);r(12,Y+9,10,3,w);}
 r(16,Y+7,16,8,b);r(10,Y+9,8,4,b);r(4,Y+10,8,2,b);r(30,Y+5,10,7,b);r(40,Y+8,8,2,'#e8c070');r(40,Y+10,5,1,'#e8c070');r(28,Y+1,8,4,'#e0a040');r(24,Y,6,2,'#e0a040');r(35,Y+6,2,2,'#ff0');
 r(20,Y+15,2,4,'#e8c070');r(26,Y+15,2,4,'#e8c070');}
function drawEnt(e){const t=stateT;
 if(e.t==='walker'){const r=R2(ctx,e.x,14,e.vx>0?1:-1),Y=e.y,c=e.fl>0?'#fff':'#7a4a32',k=Math.sin(e.an)>0;r(1,Y+3,11,7,c);r(10,Y+4,4,5,c);r(3,Y+1,8,2,'#3a2214');r(13,Y+7,2,1,'#fff');r(11,Y+5,1,1,'#f22');r(2,Y+10+(k?0:-1),2,2,'#3a2214');r(9,Y+10+(k?-1:0),2,2,'#3a2214');}
 else if(e.t==='bat'){const c=e.fl>0?'#fff':'#4a3a5a',up=Math.sin(e.an*14)>0,X=e.x,Y=e.y;ctx.fillStyle=c;ctx.fillRect(X+4,Y+2,4,5);if(up){ctx.fillRect(X,Y,4,3);ctx.fillRect(X+8,Y,4,3);}else{ctx.fillRect(X,Y+4,4,3);ctx.fillRect(X+8,Y+4,4,3);}ctx.fillStyle='#f33';ctx.fillRect(X+4,Y+3,1,1);ctx.fillRect(X+7,Y+3,1,1);}
 else if(e.t==='heart'){const b=Math.round(Math.sin(t*3)*2);drawHeart(e.x,e.y+b,true,'#ff4060');ctx.fillStyle='rgba(255,100,120,.25)';ctx.fillRect(e.x-2,e.y+b-2,13,12);}
 else if(e.t==='meat'){ctx.fillStyle='#c04030';ctx.fillRect(e.x+2,e.y+1,6,5);ctx.fillStyle='#f0e0c0';ctx.fillRect(e.x,e.y+3,3,2);ctx.fillRect(e.x+8,e.y+2,2,3);}
 else if(e.t==='K'){const on=lastCP===S.room+':'+e.x,X=e.x,Y=e.y;ctx.fillStyle='#5a3418';ctx.fillRect(X+1,Y+13,14,3);ctx.fillStyle='#8a5a30';ctx.fillRect(X+3,Y+12,10,2);ctx.fillStyle='#888';ctx.fillRect(X,Y+14,2,2);ctx.fillRect(X+14,Y+14,2,2);
  const fh=on?9:5;for(let i=0;i<5;i++){const h=fh-Math.abs(i-2)*2+((t*12+i*3|0)%3);ctx.fillStyle=i%2?'#ffb030':'#ff6020';ctx.fillRect(X+4+i*2,Y+12-h,2,h);}ctx.fillStyle='#fff6a0';ctx.fillRect(X+7,Y+10-(fh>>2),2,2);}
 else if(e.t==='sign'){ctx.fillStyle='#5a3418';ctx.fillRect(e.x+7,e.y+6,2,10);ctx.fillStyle='#9a6a3a';ctx.fillRect(e.x+1,e.y+1,14,8);ctx.fillStyle='#5a3418';ctx.fillRect(e.x+3,e.y+3,10,1);ctx.fillRect(e.x+3,e.y+6,7,1);}
 else if(e.t==='shrine'&&shrineOn(e)){const c=ABIL[e.ab].c,X=e.x,Y=e.y,b=Math.round(Math.sin(t*2.5)*2);ctx.fillStyle='rgba(255,255,220,.12)';ctx.fillRect(X-6,Y-18,28,34);
  ctx.fillStyle='#6a6a7a';ctx.fillRect(X+1,Y-8,14,24);ctx.fillStyle='#8a8a9a';ctx.fillRect(X+2,Y-9,12,1);ctx.fillRect(X+1,Y-8,1,24);ctx.fillStyle='#4a4a58';ctx.fillRect(X+14,Y-8,1,24);
  ctx.fillStyle=c;ctx.fillRect(X+5,Y-4,6,2);ctx.fillRect(X+7,Y-2,2,8);ctx.fillRect(X+4,Y+4,8,2);ctx.fillRect(X+6,Y-16+b,4,4);ctx.fillStyle='#fff';ctx.fillRect(X+7,Y-15+b,2,2);
  if(Math.random()<.2)parts.push({x:X+rnd(2,14),y:Y+10,vx:0,vy:-30,t:.8,c,g:0});}
 else if(e.t==='orb'){const X=e.x+8,Y=e.y+8+Math.sin(t*2)*3;for(let r=18;r>0;r-=3){ctx.fillStyle=`rgba(255,${200+r*2},120,${.08+(18-r)*.03})`;ctx.fillRect(X-r,Y-r,r*2,r*2);}ctx.fillStyle='#fff';ctx.fillRect(X-4,Y-4,8,8);ctx.fillStyle='#fffbd0';ctx.fillRect(X-6,Y-2,12,4);ctx.fillRect(X-2,Y-6,4,12);}
 else if(e.t==='scroll'){const b=Math.round(Math.sin(t*3+e.x)*2),X=e.x,Y=e.y+b;ctx.fillStyle='rgba(255,224,96,.25)';ctx.fillRect(X-2,Y-2,16,16);ctx.fillStyle='#f0e0b0';ctx.fillRect(X+2,Y+2,8,9);ctx.fillStyle='#8a5a2a';ctx.fillRect(X+1,Y+1,10,2);ctx.fillRect(X+1,Y+10,10,2);ctx.fillStyle='#6a4a2a';ctx.fillRect(X+4,Y+5,4,1);ctx.fillRect(X+4,Y+7,3,1);}
 else if(e.t==='fish'){const r=R2(ctx,e.x,12,e.face||1),c=e.fl>0?'#fff':'#5a8ab0';r(2,e.y+1,8,6,c);r(0,e.y+2+(Math.sin(e.an*10)>0?0:1),3,4,c);r(9,e.y+3,3,3,'#e0f0ff');r(8,e.y+2,1,1,'#f22');}
 else if(e.t==='croc')drawCroc(e);else if(e.t==='golem')drawGolem(e);
 else if(e.t==='mammoth')drawMammoth(e);else if(e.t==='ptero')drawPtero(e);}
function drawHeart(x,y,full,col){ctx.fillStyle=full?(col||'#e8304a'):'#3a2028';ctx.fillRect(x+1,y,3,2);ctx.fillRect(x+5,y,3,2);ctx.fillRect(x,y+1,9,3);ctx.fillRect(x+1,y+4,7,1);ctx.fillRect(x+2,y+5,5,1);ctx.fillRect(x+3,y+6,3,1);ctx.fillRect(x+4,y+7,1,1);if(full){ctx.fillStyle='#ffb0b8';ctx.fillRect(x+1,y+1,2,1);}}
function drawPlayer(){if(P.inv>0&&((P.inv*20)|0)%2)return;
 if(P.h<22){const X=P.x+6,Y=P.y+6,a=stateT*20*P.facing;ctx.fillStyle='#3a2212';ctx.fillRect(X-7,Y-6,14,12);ctx.fillStyle='#b06a2a';ctx.fillRect(X-6,Y-5,12,10);ctx.fillStyle='#e2a26a';ctx.fillRect(X+Math.cos(a)*4-2|0,Y+Math.sin(a)*3-2|0,4,4);ctx.fillStyle='#6e3a16';ctx.fillRect(X-Math.cos(a)*4-1|0,Y-Math.sin(a)*3-1|0,3,3);return;}
 const fr=P.cling?'jump':!P.onGround?'jump':P.vx&&((P.anim|0)%2)?'walk':'idle';const X=P.x-2,Y=P.y-2;
 // club
 const f=P.facing,cx=X+8;ctx.fillStyle='#7a4a1a';
 if(P.atk>0){const ph=P.atk/.16;if(ph>.5){ctx.fillRect(cx+f*2-2,Y-6,4,12);ctx.fillStyle='#5a3010';ctx.fillRect(cx+f*2-3,Y-8,6,5);}else{for(let i=0;i<14;i++)ctx.fillRect(Math.round(cx+f*(6+i)),Y+10,2,3);ctx.fillStyle='#5a3010';ctx.fillRect(Math.round(cx+f*20)-3,Y+8,6,6);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(Math.round(cx+f*12)-6,Y+2,12,1);}}
 else if(!P.cling){for(let i=0;i<9;i++)ctx.fillRect(Math.round(cx-f*(2+i*.6)),Y+14-i,2,2);ctx.fillStyle='#5a3010';ctx.fillRect(Math.round(cx-f*7)-2,Y+4,4,4);}
 drawGruk(ctx,X,Y,P.facing,fr,false);
 if(S.ab.fire&&cur.dark){ctx.fillStyle=((stateT*10|0)%2)?'#ffb030':'#ff6020';ctx.fillRect(X+8+f*7,Y+9,2,3);}}
function wrap(s,maxW){const words=s.split(' '),lines=[];let l='';for(const w of words){const t=l?l+' '+w:w;if(ctx.measureText(t).width>maxW&&l){lines.push(l);l=w;}else l=t;}if(l)lines.push(l);return lines;}
function box(x,y,w,h){ctx.fillStyle='rgba(20,12,6,.88)';ctx.fillRect(x,y,w,h);ctx.fillStyle='#ffcf6a';ctx.fillRect(x,y,w,1);ctx.fillRect(x,y+h-1,w,1);ctx.fillRect(x,y,1,h);ctx.fillRect(x+w-1,y,1,h);}
function txt(s,x,y,c,al,font){ctx.font=font||'bold 9px monospace';ctx.textAlign=al||'left';ctx.textBaseline='top';ctx.fillStyle='#000';ctx.fillText(s,x+1,y+1);ctx.fillStyle=c||'#fff';ctx.fillText(s,x,y);}
function roomMarks(k){const m=[];const r=ROOMS[k];for(const e of r.ents){const id=k+':'+e.x+':'+e.y;
 if(e.t==='heart'&&!S.flags.hearts[id])m.push('#f46');else if(e.t==='scroll'&&!S.flags.scrolls[id])m.push('#fe6');else if(e.t==='shrine'&&!S.ab[e.ab])m.push(ABIL[e.ab].c);
 else if(BOSSES.includes(e.t)||e.t==='mammoth'||e.t==='ptero'){if(!S.flags.bosses[e.t])m.push('#f22');}else if(e.t==='K')m.push('#f90');else if(e.t==='orb')m.push('#fff');}return m;}
function drawMinimap(x,y,cw,ch,big){const adj=k=>{const [a,b]=k.split(',').map(Number);return[[a-1,b],[a+1,b],[a,b-1],[a,b+1]].some(([p,q])=>S.visited[p+','+q]);};
 for(const k in ROOMS){const [rx,ry]=k.split(',').map(Number);const X=x+(rx+2)*(cw+1),Y=y+ry*(ch+1);
 if(!S.visited[k]){if(adj(k)){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(X,Y,cw,1);ctx.fillRect(X,Y+ch-1,cw,1);ctx.fillRect(X,Y,1,ch);ctx.fillRect(X+cw-1,Y,1,ch);if(big)txt('?',X+cw/2,Y+ch/2-5,'#aaa','center','bold 9px monospace');}continue;}
 const th=ROOMS[k].theme;ctx.fillStyle=k===S.room?(((stateT*3)|0)%2?'#ffcf6a':'#c08a40'):({jungle:'#3a7a4a',lava:'#8a3a2a',icecave:'#4a6a9a',cave:'#4a3a5a'}[th]||(ROOMS[k].dark?'#4a3a5a':'#5a7a9a'));ctx.fillRect(X,Y,cw,ch);
 if(big){txt(ROOMS[k].name,X+cw/2,Y+2,'#fff','center','bold 7px monospace');roomMarks(k).forEach((c,i)=>{ctx.fillStyle='#000';ctx.fillRect(X+3+i*7,Y+ch-8,6,6);ctx.fillStyle=c;ctx.fillRect(X+4+i*7,Y+ch-7,4,4);});}}}
function drawHUD(){for(let i=0;i<P.maxHp;i++)drawHeart(6+i*11,6,i<P.hp);
 let ix=6;for(const k of AB_ORDER){ctx.fillStyle=S.ab[k]?ABIL[k].c:'rgba(255,255,255,.12)';ctx.fillRect(ix,18,8,8);ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(ix+2,20,4,4);ix+=11;}
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(VW-46,4,44,32);drawMinimap(VW-44,6,6,5,false);
 if(roomSplash>0){txt(cur.name.toUpperCase(),VW/2,40,`rgba(255,230,170,${Math.min(1,roomSplash)})`,'center','bold 14px monospace');}
 if(boss&&boss.st!=='intro'||boss&&boss.st==='intro'){const b=boss;if(b.st==='intro')txt(b.name,VW/2,60,'#ff8060','center','bold 18px monospace');
  ctx.fillStyle='#200';ctx.fillRect(140,VH-12,200,6);ctx.fillStyle='#e33';ctx.fillRect(140,VH-12,200*Math.max(0,b.hp)/b.max,6);txt(b.name,VW/2,VH-24,'#fcc','center','bold 8px monospace');}
 if(signTxt){ctx.font='bold 9px monospace';const ls=wrap(signTxt,300);box(80,48,320,12+ls.length*11);ls.forEach((l,i)=>txt(l,90,54+i*11,'#ffe9b0'));}
 for(const t of texts)txt(t.s,t.x,t.y,t.c,'left','bold 8px monospace');}
function drawBanner(){const b=banner;ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,VW,VH);ctx.font='bold 10px monospace';const ls=wrap(b.text,330);const h=50+ls.length*12;const y=(VH-h)/2;box(60,y,360,h);
 txt(b.title,VW/2,y+10,b.c||'#ffcf6a','center','bold 12px monospace');ls.forEach((l,i)=>txt(l,VW/2,y+30+i*12,'#fff','center','bold 10px monospace'));
 if(b.t>.6&&((stateT*2)|0)%2)txt('[JUMP / tap]',VW/2,y+h-12,'#aaa','center','bold 8px monospace');}
function drawDark(){const g=dctx;g.globalCompositeOperation='source-over';g.clearRect(0,0,VW,VH);g.fillStyle='rgba(4,2,8,.96)';g.fillRect(0,0,VW,VH);g.globalCompositeOperation='destination-out';
 const L=(x,y,r)=>{const gr=g.createRadialGradient(x,y,r*.2,x,y,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.7,'rgba(0,0,0,.8)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);};
 const fl=Math.sin(stateT*13)*3;L(P.x+6,P.y+10,(S.ab.fire?120:34)+fl);for(const p of proj)if(p.k==='fire')L(p.x+3,p.y+3,50);
 for(const e of ents){if(e.t==='K')L(e.x+8,e.y+8,70+fl);if(e.t==='shrine'&&shrineOn(e))L(e.x+8,e.y,46);if(e.t==='heart')L(e.x+5,e.y+5,22);}
 g.globalCompositeOperation='source-over';
 // pixelate the light edge
 ctx.drawImage(darkC,0,0);}
function drawWorld(){const sx=shake>0?Math.round(rnd(-2,2)):0,sy=shake>0?Math.round(rnd(-2,2)):0;ctx.save();ctx.translate(sx,sy);
 drawBg(cur.theme);if(tileDirty)renderTiles();ctx.drawImage(tileC,0,0);
 for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const c=cur.g[y][x];if(c!=='~'&&c!=='L')continue;const X=x*TS,Y=y*TS,top=cur.g[y-1]&&cur.g[y-1][x]!==c;
  if(c==='~'){ctx.fillStyle=cur.theme==='icecave'?'rgba(80,160,230,.5)':'rgba(40,120,90,.55)';ctx.fillRect(X,Y,16,16);if(top){ctx.fillStyle='rgba(220,250,255,.8)';ctx.fillRect(X,Y+(Math.sin(stateT*3+x)>0?0:1),16,1);}}
  else{ctx.fillStyle='#c83010';ctx.fillRect(X,Y,16,16);ctx.fillStyle='#f80';for(let i=0;i<3;i++){const h=hash(x,i,7);ctx.fillRect(X+(h+stateT*20|0)%14,Y+4+i*4,3,1);}
   if(top){ctx.fillStyle='#ffd040';ctx.fillRect(X,Y+(Math.sin(stateT*4+x*1.3)*1.5|0),16,2);if(Math.random()<.01)parts.push({x:X+8,y:Y,vx:rnd(-10,10),vy:-60,t:.6,c:'#fa0',g:150});}}}
 if(P&&P.hook){ctx.strokeStyle='#6a8a3a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(P.x+6,P.y+6);ctx.lineTo(P.hook.ax,P.hook.ay);ctx.stroke();}
 for(const e of ents)drawEnt(e);
 for(const p of eproj){if(p.k==='lava'||p.k==='drop'){ctx.fillStyle=p.delay>0?'rgba(255,120,40,.4)':'#f60';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#ffd040';ctx.fillRect(p.x+1,p.y+1,p.w-3,p.h-4);}else if(p.k==='ice'){ctx.fillStyle=p.delay>0?'rgba(207,232,255,.6)':'#cfe8ff';ctx.fillRect(p.x,p.y,6,8);ctx.fillRect(p.x+1,p.y+8,4,2);ctx.fillRect(p.x+2,p.y+10,2,2);}else{ctx.fillStyle='#6a5a4a';ctx.fillRect(p.x,p.y,6,6);ctx.fillStyle='#8a7a6a';ctx.fillRect(p.x,p.y,4,2);}}
 drawPlayer();
 for(const p of proj){if(p.k==='fire'){ctx.fillStyle='#f62';ctx.fillRect(p.x,p.y,7,7);ctx.fillStyle='#fc4';ctx.fillRect(p.x+1,p.y+1,5,5);ctx.fillStyle='#fff8c0';ctx.fillRect(p.x+2,p.y+2,3,3);}
  else{ctx.fillStyle='#8a5a2a';if(p.vy){ctx.fillRect(p.x+1,p.y+3,1,11);ctx.fillStyle='#ccd';ctx.fillRect(p.x,p.y,3,4);}else{ctx.fillRect(p.x,p.y+1,14,1);ctx.fillStyle='#ccd';ctx.fillRect(p.vx>0?p.x+11:p.x,p.y,3,3);}}}
 for(const p of parts){ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),2,2);}
 if(cur.dark)drawDark();
 if(cur.theme==='ice'||cur.theme==='peak'){ctx.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<30;i++){const x=(hash(i,1,1)%VW+stateT*(10+i%5*6))%VW,y=(hash(i,2,1)%VH+stateT*(20+i%7*5))%VH;ctx.fillRect(x|0,y|0,1,1);}}
 ctx.restore();}

// ---------------- main loop
function update(dt){stateT+=dt;if(msgCd>0)msgCd-=dt;if(shake>0)shake-=dt;if(I.muteP)toggleMute();
 for(const [id,a] of [['bRoll','roll'],['bHook','grapple']]){const b=document.getElementById(id);if(b)b.classList.toggle('dim',!S.ab[a]);}
 const pb=document.getElementById('bFire'),ps=document.getElementById('bSpear');if(pb){pb.classList.toggle('dim',!S.ab.fire);ps.classList.toggle('dim',!S.ab.spear);}
 if(S.state==='title'){if(I.startP||I.jumpP){getSave()?startCont():startNew();}return;}
 if(S.state==='pause'){if(I.pauseP)resume();return;}
 if(S.state==='dead'){updProj(dt);if(stateT>2){loadGame();}return;}
 if(S.state==='ending'){if(stateT>3&&(I.jumpP||I.startP||I.tapP))titleMenu();return;}
 if(S.state==='ascend'){P.y-=30*dt;if(Math.random()<.8)parts.push({x:P.x+rnd(-20,30),y:P.y+rnd(-10,30),vx:0,vy:-60,t:1,c:'#fff8c0',g:0});updProj(dt);if(stateT>4){S.state='ending';stateT=0;try{localStorage.setItem('gruk_cleared','1');}catch(e){}}return;}
 if(S.state!=='play')return;
 if(banner){banner.t+=dt;if(banner.t>.6&&(I.jumpP||I.attackP||I.tapP||I.startP))banner=null;return;}
 if(I.pauseP){pauseGame();return;}
 S.time+=dt;if(roomSplash>0)roomSplash-=dt;if(hitstop>0){hitstop-=dt;return;}
 updPlayer(dt);if(S.state!=='play')return;updEnts(dt);updProj(dt);
 signTxt=null;for(const e of ents)if(e.t==='sign'&&ov(e,P))signTxt=e.s;}
function fmtTime(t){const m=t/60|0,s=t%60|0;return m+':'+(s<10?'0':'')+s;}
function draw(){ctx.imageSmoothingEnabled=false;
 if(S.state==='title'){drawBg('peak',1);ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(0,0,VW,VH);
  txt('GRUK',VW/2,34,'#ffcf6a','center','bold 44px monospace');txt('ASCENT OF KNOWLEDGE',VW/2,84,'#ffe9b0','center','bold 14px monospace');
  drawGruk(ctx,VW/2-24,104,1,((stateT*4|0)%2)?'walk':'idle',false,3);
  txt('Arrows move  Z jump  X club  C fire  V spear  Q roll  E hook  P map  M mute',VW/2,VH-14,'#ddd','center','bold 8px monospace');return;}
 if(S.state==='ending'){const a=Math.min(1,stateT/1.5);ctx.fillStyle='#fffdf0';ctx.fillRect(0,0,VW,VH);ctx.globalAlpha=a;drawBg('peak',1);ctx.fillStyle='rgba(255,250,230,.55)';ctx.fillRect(0,0,VW,VH);
  for(let i=0;i<12;i++){ctx.fillStyle='rgba(255,230,140,.25)';const an=i/12*Math.PI*2+stateT*.2;for(let r=30;r<200;r+=4)ctx.fillRect(VW/2+Math.cos(an)*r|0,120+Math.sin(an)*r|0,3,3);}
  drawGruk(ctx,VW/2-24,84,1,'idle',true,3);ctx.fillStyle='#ffe066';ctx.fillRect(VW/2-14,76,28,3);
  txt('ENLIGHTENMENT',VW/2,18,'#7a4a10','center','bold 22px monospace');txt('Gruk has EVOLVED into GRUK SAPIENS!',VW/2,48,'#5a3010','center','bold 11px monospace');
  txt('Time '+fmtTime(S.time)+'  Falls '+S.deaths+'  Hearts '+Object.keys(S.flags.hearts).length+'/'+TOTAL.hearts+'  Scrolls '+Object.keys(S.flags.scrolls).length+'/'+TOTAL.scrolls,VW/2,166+20,'#5a3010','center','bold 10px monospace');
  txt('Thanks for playing the GRUK demo!',VW/2,206,'#5a3010','center','bold 10px monospace');if(stateT>3)txt('[ JUMP / tap to return to title ]',VW/2,226,'#7a5a30','center','bold 9px monospace');ctx.globalAlpha=1;return;}
 drawWorld();drawHUD();
 if(S.state==='ascend'){ctx.fillStyle=`rgba(255,253,235,${Math.min(1,stateT/3.5)})`;ctx.fillRect(0,0,VW,VH);txt('Gruk understands...',VW/2,VH/2-6,`rgba(120,80,20,${Math.min(1,stateT/2)})`,'center','bold 14px monospace');}
 if(banner)drawBanner();
 if(S.state==='dead'){ctx.fillStyle=`rgba(60,0,0,${Math.min(.7,stateT/1.5)})`;ctx.fillRect(0,0,VW,VH);txt('GRUK FALL DOWN...',VW/2,VH/2-10,'#fcc','center','bold 18px monospace');txt('Back to last campfire',VW/2,VH/2+14,'#fcc','center','bold 9px monospace');}
 if(S.state==='pause'){ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(0,0,VW,VH);txt('PAUSED — MOUNTAIN MAP',VW/2,10,'#ffcf6a','center','bold 12px monospace');drawMinimap(150,28,50,20,true);
  let y=28;txt('KNOWLEDGE',14,y,'#ffcf6a');for(const k in ABIL){y+=12;txt((S.ab[k]?'* ':'- ')+(S.ab[k]?ABIL[k].n:'???'),14,y,S.ab[k]?ABIL[k].c:'#666','left','bold 8px monospace');}
  txt('Time '+fmtTime(S.time),14,y+16,'#ccc','left','bold 8px monospace');txt('Scrolls '+Object.keys(S.flags.scrolls).length+'/'+TOTAL.scrolls+'  Hearts '+Object.keys(S.flags.hearts).length+'/'+TOTAL.hearts,14,y+28,'#fe6','left','bold 8px monospace');
  txt('Map: \u25A0heart \u25A0scroll \u25A0shrine \u25A0boss',150,136,'#999','left','bold 7px monospace');}}
let last=performance.now(),acc=0;
function frame(now){const el=Math.min(.1,(now-last)/1000);last=now;acc+=el;while(acc>=1/60){pollInput();update(1/60);acc-=1/60;}draw();requestAnimationFrame(frame);}
function resize(){const w=innerWidth,h=innerHeight;let s=Math.min(w/VW,h/VH);const si=Math.floor(s);if(si>=2&&si/s>.88)s=si;cv.style.width=Math.floor(VW*s)+'px';cv.style.height=Math.floor(VH*s)+'px';}
addEventListener('resize',resize);resize();titleMenu();requestAnimationFrame(frame);
window.GRUK={S,get boss(){return boss},get banner(){return banner},set banner(v){banner=v},get P(){return P},get cur(){return cur},get ents(){return ents},kb,enterRoom,newGame,give:a=>{S.ab[a]=1},ROOMS};
