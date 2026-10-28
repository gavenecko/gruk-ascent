'use strict';
// GRUK: Ascent of Knowledge — a tiny metroidvania demo. All art is procedural.
const TS=16,RW=30,RH=17,VW=480,VH=272;
const G=900,JUMPV=370,SPEED=120,MAXF=420;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const SAVEKEY='gruk_save_v3',OLDKEYS=['gruk_save_v2','gruk_save_v1'];
const BOSSES=['croc','mammoth','golem','ptero','tbird'];
const AB_ORDER=['climb','fire','roll','swim','spear','smash','grapple','djump','thunder'];
function mkC(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return [c,g];}
const [tileC,tctx]=mkC(VW,VH),[darkC,dctx]=mkC(VW,VH);
function hash(x,y,n){let h=(x*374761393+y*668265263+n*2147483647)|0;h=(h^(h>>>13))*1274126177|0;return (h^(h>>>16))>>>0;}
const clamp=(v,a,b)=>v<a?a:v>b?b:v, rnd=(a,b)=>a+Math.random()*(b-a);
const ov=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;

// ---------------- audio
let AC=null;
const CFG={music:.7,sfx:.8,shake:1,fx:'auto',timer:0};try{Object.assign(CFG,JSON.parse(localStorage.getItem('gruk_cfg')||'{}'));}catch(e){}
function saveCfg(){try{localStorage.setItem('gruk_cfg',JSON.stringify(CFG));}catch(e){}}
let lowFx=CFG.fx==='low',lastInput='key';
let NOISE=null;function noiseBuf(){if(!NOISE){NOISE=AC.createBuffer(1,AC.sampleRate*.6|0,AC.sampleRate);const d=NOISE.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}return NOISE;}
function nz(dest,t,dur,ft,fq,v){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=noiseBuf();f.type=ft;f.frequency.value=fq;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(f);f.connect(g);g.connect(dest);s.start(t);s.stop(t+dur+.02);}
const SFXT={jump:[[260,520,.09,'square'],[280,600,.09,'square']],club:[[160,70,.07,'square'],[190,80,.07,'square']],fire:[[500,90,.2,'sawtooth']],spear:[[800,300,.12,'triangle'],[900,320,.12,'triangle']],pick:[[400,1400,.35,'square']],hurt:[[320,70,.25,'square']],
 boss:[[90,40,.5,'sawtooth']],break:[[140,40,.3,'sawtooth']],clink:[[1200,900,.07,'triangle'],[1500,1100,.06,'triangle']],save:[[300,900,.35,'triangle']],hit:[[220,110,.08,'square'],[260,120,.08,'square'],[200,90,.09,'square']],door:[[60,120,.5,'sawtooth']],
 roll:[[200,90,.15,'triangle']],hook:[[900,400,.12,'square']],swim:[[300,500,.1,'triangle']],death:[[420,50,.7,'square']],bossdie:[[160,25,1.2,'sawtooth']],land:[[110,60,.06,'triangle']],splash:[[600,200,.15,'sine']],blip:[[880,880,.03,'square'],[990,990,.03,'square']],crystal:[[1600,2600,.25,'triangle']],whoosh:[[200,500,.15,'sine']],zap:[[1800,200,.25,'sawtooth']],thunder:[[80,30,.9,'sawtooth']],charge:[[300,900,.3,'square']],coin:[[1300,1900,.08,'square'],[1500,2100,.08,'square']],crumble:[[180,60,.25,'triangle']],combo:[[240,90,.1,'square']]};
const SFXN={club:[.05,'highpass',2500,.05],hit:[.07,'bandpass',1800,.12],break:[.3,'lowpass',900,.25],boss:[.45,'lowpass',380,.3],death:[.5,'lowpass',700,.18],bossdie:[1.2,'lowpass',500,.35],land:[.06,'lowpass',500,.18],splash:[.3,'bandpass',1400,.2],door:[.5,'lowpass',300,.25],fire:[.2,'bandpass',900,.1],whoosh:[.2,'bandpass',700,.08],roll:[.12,'lowpass',800,.08],thunder:[1,'lowpass',260,.4],zap:[.2,'highpass',3000,.1],crumble:[.3,'lowpass',600,.2],combo:[.08,'highpass',2000,.08]};
function sfx(type){try{if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
 const L=SFXT[type];if(!L||muted||CFG.sfx<=0)return;const P=L[Math.random()*L.length|0],dt=1+(Math.random()-.5)*.1,vol=.09*CFG.sfx*(type==='blip'?.35:1);
 const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=P[3];o.frequency.setValueAtTime(P[0]*dt,t);o.frequency.exponentialRampToValueAtTime(P[1]*dt,t+P[2]);
 g.gain.setValueAtTime(Math.max(.0011,vol),t);g.gain.exponentialRampToValueAtTime(.001,t+P[2]);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+P[2]+.03);
 const N=SFXN[type];if(N)nz(AC.destination,t,N[0],N[1],N[2]*dt,N[3]*CFG.sfx);}catch(e){}}

// ---------------- music (tiny chiptune sequencer)
const SONGS={
 field:{bpm:132,lead:[64,0,67,69,71,0,69,67,64,0,62,64,67,0,0,0,64,0,67,69,71,0,74,72,71,69,67,0,69,0,0,0],bass:[45,45,52,52,43,43,50,50,41,41,48,48,43,43,50,50],dr:'k.h.s.h.k.hks.h.',lw:'square'},
 jungle:{bpm:138,lead:[72,0,69,72,0,67,69,0,64,0,67,69,72,0,69,67,72,0,74,72,69,0,67,0,64,67,69,0,67,64,62,0],bass:[48,0,55,48,45,0,52,45,41,0,48,41,43,0,50,43],dr:'k..hs.hkk.hs.hhs',lw:'triangle',dec:.45,lv:.05,arp:[84,79,76,79],av:.008},
 ice:{bpm:80,lead:[76,0,0,79,0,0,83,0,81,0,79,0,76,0,0,0,74,0,0,76,0,0,79,0,78,0,74,0,71,0,0,0],bass:[40,40,47,47,43,43,50,50,38,38,45,45,42,42,47,47],arp:[76,83,88,91],av:.012,dr:'h.......h.......',lw:'triangle',lv:.045,echo:1},
 lava:{bpm:124,lead:[64,0,65,0,64,0,0,62,64,0,67,65,64,0,0,0,64,0,65,0,68,0,67,65,64,0,62,0,60,0,62,0],bass:[40,40,40,41,40,40,43,41,40,40,40,41,38,38,36,38],bw:'sawtooth',bv:.03,dr:'k.k.s..kk.k.s.hs',lw:'square'},
 cave:{bpm:96,lead:[57,0,0,60,0,0,59,0,57,0,0,55,0,0,0,0,57,0,0,60,0,62,0,64,62,0,60,0,59,0,0,0],bass:[33,33,33,33,31,31,31,31,29,29,29,29,28,28,28,28],dr:'h.......h...h...',echo:1,lw:'square'},
 boss:{bpm:168,lead:[69,0,69,72,69,0,67,0,69,0,69,74,72,0,71,0,69,0,69,72,69,0,67,0,64,0,65,0,67,0,68,0],bass:[33,45,33,45,33,45,31,43,29,41,29,41,28,40,28,40],dr:'k.hsk.hsk.hskkss',bw:'sawtooth',bv:.035,lw:'square'},
 peak:{bpm:110,lead:[72,0,76,0,79,0,76,0,74,0,77,0,81,0,77,0,72,0,76,0,79,0,84,0,83,0,79,0,76,0,0,0],bass:[48,48,55,55,50,50,53,53,48,48,55,55,43,43,47,47],arp:[84,88,91,96],av:.008,echo:1,dr:'k...s...k.k.s...',lw:'square'},
 storm:{bpm:150,lead:[62,0,65,0,69,0,68,0,62,0,65,69,72,0,70,0,62,0,65,0,69,0,72,74,75,0,74,0,72,0,69,0],bass:[38,38,38,50,36,36,36,48,34,34,34,46,33,33,45,45],arp:[74,77,81,86],av:.008,dr:'k.hsk.hskkhs.khs',bw:'sawtooth',bv:.03,lw:'square',echo:1},
 ending:{bpm:88,lead:[72,0,0,74,76,0,79,0,77,0,76,0,74,0,0,0,72,0,0,74,76,0,79,0,84,0,83,0,79,0,0,0],bass:[48,48,55,55,53,53,48,48,45,45,52,52,43,43,47,47],arp:[72,76,79,84],av:.01,echo:1,lw:'triangle',lv:.05,dr:'k.......s.......'}};
const MUS={song:null,step:0,next:0,gain:null};
function musicFor(){if(S.state==='title')return 'peak';if(S.state==='intro'||S.state==='ending'||S.state==='ascend')return 'ending';if(!cur)return null;if(boss)return 'boss';
 const t=cur.theme;if(t==='jungle')return 'jungle';if(t==='ice'||t==='icecave')return 'ice';if(t==='lava')return 'lava';if(t==='peak')return 'peak';if(t==='storm')return 'storm';if(t==='cave'||cur.dark)return 'cave';return 'field';}
function note(f,t,d,type,v,send){const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(f-69)/12);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.connect(g);g.connect(MUS.gain);if(send)g.connect(MUS.send);o.start(t);o.stop(t+d+.02);}
function drum(k,t){if(k==='k'){const o=AC.createOscillator(),g=AC.createGain();o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.12);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.14);o.connect(g);g.connect(MUS.gain);o.start(t);o.stop(t+.16);}
 else if(k==='s')nz(MUS.gain,t,.12,'bandpass',1800,.07);else if(k==='h')nz(MUS.gain,t,.03,'highpass',7000,.03);}
function musicTick(){if(!AC||AC.state!=='running')return;if(!MUS.gain){MUS.gain=AC.createGain();MUS.gain.connect(AC.destination);MUS.del=AC.createDelay(1);MUS.fb=AC.createGain();MUS.fb.gain.value=.33;MUS.send=AC.createGain();MUS.send.gain.value=.45;MUS.send.connect(MUS.del);MUS.del.connect(MUS.fb);MUS.fb.connect(MUS.del);MUS.del.connect(MUS.gain);}
 MUS.gain.gain.value=muted?0:CFG.music*1.4;const want=musicFor();if(want!==MUS.song){MUS.song=want;MUS.step=0;MUS.next=AC.currentTime+.05;if(want)MUS.del.delayTime.value=60/SONGS[want].bpm*.75;}if(!want||muted||CFG.music<=0)return;
 const sg=SONGS[want],st=60/sg.bpm/2;if(MUS.next<AC.currentTime-.5)MUS.next=AC.currentTime+.05;
 while(MUS.next<AC.currentTime+.25){const i=MUS.step,l=sg.lead[i%sg.lead.length];if(l)note(l,MUS.next,st*(sg.dec?sg.dec*2:.9),sg.lw||'square',sg.lv||.025,sg.echo);
  if(i%2===0){const b=sg.bass[(i>>1)%sg.bass.length];if(b)note(b,MUS.next,st*1.8,sg.bw||'triangle',sg.bv||.05);}
  if(sg.arp)note(sg.arp[i%sg.arp.length],MUS.next,st*.5,'square',sg.av,sg.echo);
  if(sg.dr){const d=sg.dr[i%sg.dr.length];if(d!=='.')drum(d,MUS.next);}
  MUS.step++;MUS.next+=st;}}
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
const ELDER={climb:'Little one... the mountain does not carry the lazy. Touch the stone and take my GRIP.',fire:'Darkness swallows the timid. Take the FIRE of the first hearth, and see.',
 roll:'Be small like the pebble, and the world opens wide. Learn to ROLL.',swim:'Water is no wall to a brave heart. Take the stone, and SWIM.',spear:'Reach farther than your arm. The SPEAR is a thought made sharp.',
 smash:'Stone yields to those who strike true. Learn to SMASH.',grapple:'Vines bind the world together. Let them carry you. Take the HOOK.',djump:'Even the sky can be a step, child. Take the WINGS OF THOUGHT.',thunder:'The storm lives in patient hands. Hold your club, gather the THUNDER, and let it fall.'};
const INTRO_T=16,INTRO=[[0,'Long ago, when the world had no words...'],[3.6,'...a curious caveman named GRUK sat by his fire and stared at the mountain.'],[7.4,'At its summit glowed the LIGHT OF KNOWLEDGE. The Elders said whoever reached it would be changed forever.'],[12,'Gruk grunt.  Gruk go.']];
const ELDERS=["................","......wwww......",".....wWWWWw.....",".....wkWWkw.....",".....wWWWWw.....","....wwWWWWww....","....wWwwwwWw....","....wWWwwWWw..s.","...wwWWwwWWww.s.","...wWWWwwWWWw.s.","..wWWWWWWWWWWws.","..wWWWWWWWWWWWs.","..wWWWWWWWWWWws.","..wWWWWWWWWWWw..","...wWWWWWWWWw...","...wWWWWWWWWw...","....wWWWWWWw....","....wwWWWWww....",".....wwWWww.....","......wwww......",".......ww.......","................"];
const HINT={climb:['Hold toward a wall in the air, UP to climb, Z to leap off','Push the stick into a wall, UP to climb, JUMP to leap off'],
 fire:['C throws fire (hold UP to aim up)','FIRE button throws fire (stick UP to aim up)'],spear:['V throws a spear (hold UP to aim up)','SPEAR button throws (stick UP to aim up)'],
 smash:['X with the club breaks cracked stone','CLUB breaks cracked stone'],djump:['Press Z again in mid-air','Press JUMP again in mid-air'],
 roll:['SHIFT or Q on the ground','ROLL button on the ground'],swim:['Z to stroke up, UP / DOWN to swim','JUMP to stroke up, stick UP / DOWN to swim'],
 grapple:['E near a ring: Z lets go, DOWN drops','HOOK near a ring: JUMP lets go, stick DOWN drops'],thunder:['HOLD X, then release: a charged THUNDER smash breaks totems','HOLD CLUB, then release: a charged THUNDER smash breaks totems']};
const ABIL={
 climb:{n:'CLIMB',c:'#9f6',d:'Gruk learns to GRIP ROCK! Jump at a wall and hold toward it to cling. Hold UP to climb, press JUMP to leap off.'},
 fire:{n:'FIRE',c:'#f84',d:'Gruk discovers FIRE! Press C (FIRE button) to throw flame. Lights dark caves, burns dry vines, melts ice beasts.'},
 spear:{n:'SPEAR THROW',c:'#dde',d:'Gruk learns to THROW! Press V (SPEAR button). Hold UP to throw upward. Hits far-away things and flying beasts.'},
 smash:{n:'STONE SMASH',c:'#fc4',d:'Gruk grows STRONG! Club now smashes cracked stone and hits twice as hard.'},
 djump:{n:'WINGS OF THOUGHT',c:'#8cf',d:'Gruk thinks like a bird! Press JUMP again in mid-air to DOUBLE JUMP.'},
 roll:{n:'WHEEL ROLL',c:'#d96',d:'Gruk curls up like a stone wheel! Press SHIFT or Q (ROLL button) on the ground. Rolls through low gaps, and harm cannot touch a rolling Gruk.'},
 swim:{n:'SWIM',c:'#4cf',d:'Gruk watched the croc and learned to SWIM! In water press JUMP to stroke up, hold UP/DOWN to rise and dive.'},
 thunder:{n:'THUNDER CLUB',c:'#7df',d:'Gruk catches the storm in his club! HOLD attack until it crackles, then RELEASE for a THUNDER SMASH. It shatters storm totems and pierces storm shields.'},
 grapple:{n:'VINE HOOK',c:'#c8f',d:'Gruk ties a vine to a bone hook! Press E (HOOK button) near a ring anchor to pull up to it. Hook the next ring, JUMP to let go, DOWN to drop.'}};
// ---- NEW ZONE: Storm Peaks (above the Sky Roost)
{const g=base({D:1,R:1,L:1});F(g,1,12,1,14,'M');F(g,18,15,26,15,'^');F(g,18,12,19,12,'Q');F(g,21,12,22,12,'Q');F(g,24,12,25,12,'Q');F(g,3,9,7,9,'=');F(g,9,6,11,6,'Q');F(g,0,15,1,16,'#');
 R('1,-1','Storm Peaks','storm',0,g,[{t:'K',x:9,y:14},{t:'sign',x:11,y:14,s:'STORM PEAKS. The wind shoves, the sky strikes where Gruk stands, and old stone crumbles underfoot. Keep moving!'},{t:'sign',x:3,y:14,s:'A storm totem seals the west. Only THUNDER can break it.'},{t:'diver',x:20,y:5},{t:'boar',x:6,y:14},{t:'heart',x:10,y:5},{t:'scroll',x:4,y:8,s:'Lightning seeks the one who stands still. A moving Gruk is a living Gruk.'}]);ROOMS['1,-1'].storm=1;}
{const g=base({L:1});F(g,25,1,25,14,'M');F(g,14,11,17,11,'Q');F(g,7,8,10,8,'=');
 R('2,-1','Thunder Nest','storm',0,g,[{t:'shrine',x:20,y:14,ab:'thunder'},{t:'diver',x:12,y:4},{t:'boar',x:16,y:14},{t:'heart',x:27,y:14},{t:'gemcache',x:27,y:13},{t:'scroll',x:8,y:7,s:'The Thunder Bird wears the storm like a coat. Strike it while it rests, with thunder in your arm.'}]);ROOMS['2,-1'].storm=1;}
{const g=base({R:1});F(g,4,10,8,10,'=');F(g,21,10,25,10,'=');
 R('0,-1','Storm Crown','storm',0,g,[{t:'tbird',x:14,y:4},{t:'heart',x:3,y:14,cond:'tbird'},{t:'scroll',x:26,y:14,cond:'tbird',s:'Even the storm bows to a patient mind. Five beasts humbled: the Elder Gate awaits.'}]);ROOMS['0,-1'].storm=1;}
// A: Foothill Camp (start)
{const g=base({R:1,U:1,L:1});F(g,1,1,12,14,'#');F(g,1,13,11,14,'.');F(g,12,13,12,14,'V');F(g,22,10,26,10,'=');g[14][25]='#';
 R('1,4','Foothill Camp','base',0,g,[{t:'K',x:18,y:14},{t:'painter',x:23,y:14},{t:'sign',x:15,y:14,s:'GRUK MUST CLIMB THE MOUNTAIN TO EVOLVE! The wall is too tall, the west tunnel choked with vines... Gruk must LEARN things. Try east first.'},{t:'walker',x:27,y:14}]);}
// B: Shrine of Grip
{const g=base({L:1});F(g,6,11,9,11,'=');F(g,13,14,15,14,'^');F(g,23,6,24,14,'#');F(g,11,8,14,8,'=');
 R('2,4','Shrine of Grip','base',0,g,[{t:'walker',x:8,y:14},{t:'bat',x:18,y:6},{t:'shrine',x:19,y:14,ab:'climb'},{t:'heart',x:23,y:5}]);}
// C: Windy Cliffs
{const g=base({L:1,D:1,U:1});F(g,13,5,26,5,'#');F(g,12,1,12,5,'#');F(g,17,1,17,4,'V');F(g,3,11,7,11,'=');
 R('1,3','Windy Cliffs','cliff',0,g,[{t:'K',x:8,y:14},{t:'icicle',x:5},{t:'icicle',x:21},{t:'boar',x:22,y:14},{t:'bat',x:20,y:9},{t:'sign',x:21,y:4,s:'Dry vines block the path up. Fire would eat them...'},{t:'sign',x:4,y:14,s:'West: a dark hollow. Gruk scared of dark... but something glows inside.'}]);}
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
 R('1,1','Frost Ledge','ice',0,g,[{t:'K',x:6,y:14},{t:'scroll',x:6,y:9,s:'The wind on the peak whispers: FOUR great beasts guard the way to the Elders.'},{t:'walker',x:10,y:14},{t:'walker',x:19,y:14},{t:'icicle',x:13},{t:'icicle',x:24},{t:'bat',x:8,y:7},{t:'sign',x:21,y:4,s:'Cracked stone blocks the way. A SMASHING arm could break it.'}]);}
// I: Sky Roost (boss: Pterodactyl)
{const g=base({D:1,L:1,U:1});F(g,0,12,0,14,'B');F(g,13,0,16,0,'B');F(g,3,10,7,10,'=');F(g,22,10,26,10,'=');F(g,9,6,12,6,'=');F(g,13,3,16,3,'=');
 R('1,0','Sky Roost','peak',0,g,[{t:'ptero',x:14,y:5},{t:'shrine',x:21,y:14,ab:'djump',cond:'ptero'}]);}
// J: The Summit
{const g=base({R:1});F(g,1,0,RW-2,0,'.');F(g,10,15,18,15,'^');F(g,1,9,4,14,'#');F(g,6,0,6,14,'E');
 R('0,0','The Summit','peak',0,g,[{t:'orb',x:2,y:7},{t:'K',x:26,y:14},{t:'sign',x:22,y:14,s:'THE SUMMIT. Beyond the abyss waits ENLIGHTENMENT. Leap with the Wings of Thought.'},{t:'sign',x:8,y:14,s:'THE ELDER GATE opens only for one who has humbled the FIVE GREAT BEASTS: croc, mammoth, golem, sky terror and the storm above.'}]);}
// ---- NEW ZONE: Jungle foothills
{const g=base({L:1,R:1});F(g,15,15,18,15,'~');F(g,22,11,27,14,'#');F(g,22,14,27,14,'.');F(g,5,10,9,10,'=');F(g,10,7,13,7,'=');
 R('0,4','Jungle Edge','jungle',0,g,[{t:'spitter',x:11,y:6},{t:'walker',x:8,y:14},{t:'walker',x:20,y:14},{t:'bat',x:12,y:4},{t:'heart',x:16,y:15},{t:'scroll',x:24,y:14,s:'First Gruk walked on four legs. Then on two. What comes next... nobody knows.'},{t:'sign',x:20,y:14,s:'A tiny tunnel runs through the mound. Too low to walk. And the pond is deep...'}]);}
{const g=base({L:1,R:1});F(g,0,12,4,13,'#');F(g,10,6,11,14,'#');F(g,14,6,19,6,'=');F(g,22,10,25,10,'=');
 R('-1,4','Tangled Grove','jungle',0,g,[{t:'spitter',x:23,y:9},{t:'shrine',x:6,y:14,ab:'roll'},{t:'scroll',x:16,y:5,s:'The bog croc sees only what is in front of its jaws. Its back is soft.'},{t:'walker',x:20,y:14},{t:'walker',x:25,y:14},{t:'bat',x:22,y:7},{t:'sign',x:8,y:14,s:'West: the BOG. Only a low gap leads there.'},{t:'K',x:17,y:14}]);}
{const g=base({R:1});F(g,1,1,28,11,'#');
 R('-2,4','Bog Lair','jungle',0,g,[{t:'croc',x:6,y:13},{t:'shrine',x:6,y:14,ab:'swim',cond:'croc'}]);}
// ---- SECRET: Ember Gauntlet (behind cracked stone in Geyser Hollow)
{const g=base({L:1});F(g,3,15,26,15,'L');F(g,1,1,28,3,'#');F(g,8,4,9,4,'^');F(g,18,4,19,4,'^');g[10][6]='o';g[8][11]='o';g[10][16]='o';g[8][21]='o';F(g,26,11,28,11,'=');
 R('4,2','Ember Gauntlet','lava',0,g,[{t:'sign',x:1,y:14,s:'A hidden forge of the first Elders. Hook across the fire... if Gruk dares.'},{t:'hopper',x:9,y:15},{t:'hopper',x:14,y:15},{t:'hopper',x:20,y:15},{t:'hopper',x:24,y:15},{t:'bat',x:14,y:7},{t:'relic',x:27,y:14},{t:'heart',x:27,y:10}]);ROOMS['4,2'].secret=1;}
// ---- NEW ZONE: Frozen grotto + geothermal depths
{const g=base({L:1});F(g,1,1,28,2,'#');F(g,4,3,28,14,'~');F(g,20,15,23,16,'~');F(g,9,3,10,9,'#');F(g,14,9,15,14,'#');F(g,25,3,26,8,'#');
 R('3,1','Frozen Grotto','icecave',0,g,[{t:'sign',x:2,y:14,s:'Icy water fills the grotto. Gruk sinks like a rock... unless Gruk can SWIM.'},{t:'heart',x:27,y:13},{t:'scroll',x:12,y:13,s:'Under the ice the old ones swam. Their bones still dream of the sea.'},{t:'fish',x:12,y:8},{t:'fish',x:19,y:5},{t:'fish',x:23,y:11}]);}
{const g=base({});F(g,20,0,23,0,'.');F(g,1,15,2,16,'.');F(g,1,1,14,9,'#');F(g,5,15,14,15,'L');F(g,19,1,19,11,'#');F(g,24,1,24,11,'#');F(g,25,7,28,7,'=');g[10][13]='o';g[11][5]='o';F(g,29,12,29,14,'C');
 R('3,2','Geyser Hollow','lava',0,g,[{t:'shrine',x:27,y:14,ab:'grapple'},{t:'K',x:16,y:14},{t:'hopper',x:8,y:15},{t:'hopper',x:12,y:15},{t:'sign',x:17,y:14,s:'A lake of fire. Beyond it, a way down. Something to HOOK those rings would help...'},{t:'scroll',x:26,y:6,s:'The golem heart is hot stone. Fire feeds it, spears melt. Only a brave club reaches it.'},{t:'bat',x:20,y:5}]);}
{const g=base({});F(g,1,0,2,0,'.');F(g,5,15,24,15,'L');F(g,14,11,15,15,'h');g[8][6]='o';g[8][12]='o';g[8][17]='o';g[8][23]='o';
 R('3,3','Magma Depths','lava',0,g,[{t:'golem',x:13,y:8},{t:'heart',x:26,y:14,cond:'golem'},{t:'scroll',x:3,y:14,cond:'golem',s:'Knowledge is the true fire. Once lit, it never goes out.'}]);}

// ---------------- state
const TOTAL={hearts:0,scrolls:0};for(const k in ROOMS)for(const e of ROOMS[k].ents){if(e.t==='heart')TOTAL.hearts++;if(e.t==='scroll')TOTAL.scrolls++;}
const S={state:'title',room:null,ab:{},flags:{removed:{},bosses:{},hearts:{},scrolls:{},shop:{}},visited:{},time:0,deaths:0,stones:0,ng:0};
let fadeIn=0,bolts=[],wind={t:3,st:0,dir:1},crum={},flash=0,nearTrader=null,elderTxt=null,cut=null,fpsLowT=0,fpsEma=60,hitstop=0,muted=false,entryPos=null,P,cur,ents=[],proj=[],eproj=[],parts=[],texts=[],banner=null,boss=null,tileDirty=true,signTxt=null,roomSplash=0,shake=0,lastSafe=null,stateT=0,saveMem=null,msgCd=0,lastCP='';
function newPlayer(){return{x:0,y:0,w:12,h:22,vx:0,vy:0,onGround:false,facing:1,coy:0,jbuf:0,jumps:0,cling:0,force:0,forceVx:0,lock:0,inv:0,hp:5,maxHp:5,atk:0,acd:0,fcd:0,scd:0,anim:0,animT:0,anim2:'idle',thr:0,hitSet:null,roll:0,rcd:0,hook:null,wasG:false,combo:0,comboT:0,chg:0,charged:0};}
function tileAt(tx,ty){if(tx<0||tx>=RW||ty<0||ty>=RH){const [cx,cy]=S.room.split(',').map(Number);const dx=tx<0?-1:tx>=RW?1:0,dy=ty<0?-1:ty>=RH?1:0;
 return (dx===0||dy===0)&&ROOMS[(cx+dx)+','+(cy+dy)]?'.':'#';}return cur.g[ty][tx];}
const solidP=c=>c==='M'||c==='Q'||c==='#'||c==='V'||c==='C'||c==='D'||c==='G'||c==='S'||c==='s'||c==='B'||c==='E'||c==='h';
const HAZ=c=>c==='^'||c==='L';
const solidProj=c=>c!=='G'&&solidP(c);
function setTile(x,y,ch){cur.g[y][x]=ch;(S.flags.removed[S.room]=S.flags.removed[S.room]||[]).push(x+','+y+','+ch);tileDirty=true;}

function enterRoom(key,px,py,keep){
 const r=ROOMS[key];S.room=key;S.visited[key]=1;
 cur={key,name:r.name,theme:r.theme,dark:r.dark,g:r.g0.map(a=>a.slice())};
 (S.flags.removed[key]||[]).forEach(s=>{const a=s.split(',');cur.g[+a[1]][+a[0]]=a[2];});
 if(r.ents.some(e=>BOSSES.includes(e.t)&&S.flags.bosses[e.t]))for(const row of cur.g)for(let i=0;i<RW;i++)if(row[i]==='B')row[i]='.';
 tileDirty=true;ents=[];proj=[];eproj=[];boss=null;if(P)P.hook=null;lastSafe=null;entryPos={x:px,y:py};
 for(const e of r.ents){const X=e.x*TS,Y=e.y*TS;
  if(e.t==='walker')ents.push({t:'walker',x:X+1,y:Y+4,w:14,h:12,vx:-30,hp:2,fl:0,an:0});
  else if(e.t==='bat')ents.push({t:'bat',x:X,y:Y,w:12,h:8,hp:1,fl:0,an:Math.random()*6,bx:X,by:Y});
  else if(e.t==='heart'||e.t==='scroll'){const m=spawnItem(key,e);if(m)ents.push(m);}
  else if(e.t==='spitter')ents.push({t:'spitter',x:X,y:Y,w:14,h:16,hp:2,fl:0,cd:1+Math.random(),face:-1,an:0});
  else if(e.t==='hopper')ents.push({t:'hopper',x:X,y:Y,by:Y,w:14,h:12,hp:1,fl:0,vy:0,cd:.5+Math.random()*1.5,up:0});
  else if(e.t==='icicle'){let ry=1;while(ry<10&&solidP(cur.g[ry][e.x]))ry++;ents.push({t:'icicle',x:X+4,y:ry*TS,w:8,h:14,hp:1,fl:0,vy:0,st:0});}
  else if(e.t==='relic'){if(!S.flags.relic)ents.push({t:'relic',x:X,y:Y,w:16,h:16});}
  else if(e.t==='fish')ents.push({t:'fish',x:X,y:Y,w:12,h:8,hp:1,fl:0,an:Math.random()*6,bx:X,by:Y});
  else if(e.t==='croc'){if(!S.flags.bosses.croc){boss={t:'croc',name:'BOG CROC',x:X,y:15*TS-32,w:72,h:32,hp:10,max:10,st:'intro',t2:1.8,vx:0,face:1,fl:0,an:0,turn:0,tailT:0,minX:2*TS,maxX:28*TS-72};ents.push(boss);}}
  else if(e.t==='golem'){if(!S.flags.bosses.golem){boss={t:'golem',name:'MAGMA GOLEM',x:208,y:132,by:132,w:64,h:44,hp:10,max:10,st:'intro',t2:1.8,face:-1,fl:0,an:0,n:0};ents.push(boss);}}
  else if(e.t==='mammoth'){if(!S.flags.bosses.mammoth){boss={t:'mammoth',name:'ICE MAMMOTH',x:X,y:15*TS-40,w:56,h:40,hp:12,max:12,st:'intro',t2:1.8,vx:0,face:-1,fl:0,an:0,minX:TS,maxX:29*TS-56};ents.push(boss);}}
  else if(e.t==='boar')ents.push({t:'boar',x:X,y:Y,w:18,h:14,vx:0,hp:3,fl:0,an:0,st:'idle',t2:1,face:-1});
  else if(e.t==='diver')ents.push({t:'diver',x:X,y:Y,w:14,h:10,hp:2,fl:0,an:Math.random()*6,bx:X,by:Y,st:'hover',t2:2+Math.random()});
  else if(e.t==='gemcache'){const id=key+':gc'+e.x;if(!S.flags.removed[id])ents.push({t:'gemcache',id,x:X,y:Y,w:16,h:16,hp:1});}
  else if(e.t==='painter')ents.push({t:'painter',x:X,y:Y-6,w:16,h:22,an:0});
  else if(e.t==='tbird'){if(!S.flags.bosses.tbird){boss={t:'tbird',name:'THUNDER BIRD',x:X,y:-60,w:60,h:28,hp:16,max:16,st:'intro',t2:2,vx:0,vy:0,face:1,fl:0,an:0,ph:0,rt:2,baseY:64,phase:1,n:0};ents.push(boss);}}
  else if(e.t==='ptero'){if(!S.flags.bosses.ptero){boss={t:'ptero',name:'SKY TERROR',x:X,y:-40,w:40,h:20,hp:10,max:10,st:'intro',t2:1.8,vx:0,vy:0,face:1,fl:0,an:0,ph:0,rt:2,baseY:80};ents.push(boss);}}
  else ents.push(Object.assign({},e,{x:X,y:Y,w:16,h:16}));
 }
 if(S.ng)for(const e of ents)if(e.hp>0&&!['heart','scroll','gemcache'].includes(e.t)){e.hp=Math.ceil(e.hp*(e===boss?1.5:2));if(e===boss)e.max=e.hp;}
 bolts=[];crum={};wind={t:2.5,st:0,dir:Math.random()<.5?-1:1};
 cur.anchors=[];for(let y=0;y<RH;y++)for(let x=0;x<RW;x++)if(cur.g[y][x]==='o')cur.anchors.push({x:x*TS+8,y:y*TS+8});
 if(boss){roomSplash=0;sfx('boss');}else roomSplash=2.2;fadeIn=.32;
 P.x=px;P.y=py;if(!keep){P.vx=0;P.vy=0;P.cling=0;}
}
function spawnItem(key,e){const id=key+':'+e.x+':'+e.y;if(e.cond&&!S.flags.bosses[e.cond])return null;
 if(e.t==='heart')return S.flags.hearts[id]?null:{t:'heart',id,x:e.x*TS+3,y:e.y*TS+4,w:10,h:10};
 return S.flags.scrolls[id]?null:{t:'scroll',id,s:e.s,x:e.x*TS+2,y:e.y*TS+2,w:12,h:12};}
function snapshot(x,y){return JSON.stringify({v:3,room:S.room,x,y,ab:S.ab,flags:S.flags,maxHp:P.maxHp,visited:S.visited,time:S.time,deaths:S.deaths,stones:S.stones,ng:S.ng});}
function save(x,y){saveMem=snapshot(x,y);try{localStorage.setItem(SAVEKEY,saveMem);}catch(e){}}
function getSave(){try{let v=localStorage.getItem(SAVEKEY);if(!v)for(const k of OLDKEYS){v=localStorage.getItem(k);if(v){v=migrate(v);try{localStorage.setItem(SAVEKEY,v);}catch(e){}break;}}return v||saveMem;}catch(e){return saveMem;}}
function migrate(v){try{const d=JSON.parse(v);d.v=3;d.stones=d.stones||0;d.ng=d.ng||0;d.flags=d.flags||{};d.flags.shop=d.flags.shop||{};if(!ROOMS[d.room])d.room='1,4';return JSON.stringify(d);}catch(e){return null;}}
function loadGame(){const d=JSON.parse(getSave());S.ab=d.ab;S.flags=d.flags;['removed','bosses','hearts','scrolls','fires','shop'].forEach(k=>S.flags[k]=S.flags[k]||{});S.visited=d.visited||{};S.time=d.time||0;S.deaths=d.deaths||0;S.stones=d.stones||0;S.ng=d.ng||0;
 P=newPlayer();P.maxHp=d.maxHp;P.hp=P.maxHp;enterRoom(d.room,d.x,d.y);lastCP=d.room+':'+Math.round(d.x);S.state='play';}
function newGame(ng){const keep=ng?{hearts:S.flags.hearts||{},scrolls:S.flags.scrolls||{},shop:S.flags.shop||{},relic:S.flags.relic,maxHp:P?P.maxHp:5,stones:S.stones||0}:null;
 S.ab={};S.flags={removed:{},bosses:{},hearts:{},scrolls:{},fires:{},shop:{}};S.visited={};S.time=0;S.deaths=0;S.stones=0;S.ng=ng?(S.ng||0)+1:0;P=newPlayer();
 if(keep){Object.assign(S.flags,{hearts:keep.hearts,scrolls:keep.scrolls,shop:keep.shop,relic:keep.relic});S.stones=keep.stones;P.maxHp=P.hp=keep.maxHp;}
 enterRoom('1,4',20*TS,15*TS-22);save(P.x,P.y);S.state='intro';stateT=0;
 banner={title:'GRUK: ASCENT OF KNOWLEDGE',text:S.ng?'NEW GAME+ '+S.ng+': the beasts are angrier and twice as tough. Your hearts, scrolls, stones and trades remain. Ascend again!':'Gruk is a simple caveman. At the top of the mountain lies ENLIGHTENMENT. Explore, gain KNOWLEDGE, grow stronger, and ascend!',t:0,c:S.ng?'#ff9070':undefined};}

// ---------------- input
const I={},kb={},latch={};let tc={};
const KEYS=['left','right','up','down','jump','attack','fire','spear','pause','start','tap','roll','hook','mute','talk'];
const KMAP={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyZ:'jump',Space:'jump',KeyK:'jump',KeyX:'attack',KeyJ:'attack',KeyC:'fire',KeyL:'fire',KeyV:'spear',KeyI:'spear',KeyP:'pause',Escape:'pause',Enter:'start',ShiftLeft:'roll',ShiftRight:'roll',KeyQ:'roll',KeyE:'hook',KeyG:'hook',KeyM:'mute',KeyT:'talk'};
addEventListener('keydown',e=>{lastInput='key';const k=KMAP[e.code];if(k){kb[k]=1;latch[k]=1;e.preventDefault();}if(S.state==='title'&&e.code==='KeyN')startNew();});
addEventListener('keyup',e=>{const k=KMAP[e.code];if(k){kb[k]=0;e.preventDefault();}});
addEventListener('blur',()=>{for(const k in kb)kb[k]=0;});
const touchEl=document.getElementById('touch');
let ctrlMode='joy';try{ctrlMode=localStorage.getItem('gruk_ctrl')||'joy';}catch(e){}
const joy={id:null,bx:0,by:0},jB=document.getElementById('joyBase'),jK=document.getElementById('joyKnob');
function applyCtrl(){touchEl.classList.toggle('joy',ctrlMode==='joy');}applyCtrl();
function joyDirs(t,n){const R=Math.min(innerWidth,innerHeight)*.13;let dx=t.clientX-joy.bx,dy=t.clientY-joy.by;const d=Math.hypot(dx,dy);
 if(d>R){dx*=R/d;dy*=R/d;}jK.style.transform=`translate(${dx}px,${dy}px)`;if(d<R*.25)return;
 const a=Math.atan2(-dy,dx)*180/Math.PI;
 if(Math.abs(a)<=32)n.right=1;else if(Math.abs(a)>=148)n.left=1;
 else if(a>0){n.up=1;if(a<62)n.right=1;else if(a>118)n.left=1;}
 else{n.down=1;if(a>-62)n.right=1;else if(a<-118)n.left=1;}}
function onTouch(e){if(e.target.closest&&e.target.closest('#menu'))return;e.preventDefault();touchEl.classList.add('on');lastInput='touch';const n={};
 if(joy.id!==null&&![...e.touches].some(t=>t.identifier===joy.id)){joy.id=null;jB.style.display='none';jK.style.transform='';}
 for(const t of e.touches){
  if(t.identifier===joy.id){joyDirs(t,n);continue;}
  const el0=document.elementFromPoint(t.clientX,t.clientY),onBtn=el0&&el0.dataset&&el0.dataset.k;
  if(ctrlMode==='joy'&&joy.id===null&&!onBtn&&S.state==='play'&&t.clientX<innerWidth*.5){joy.id=t.identifier;joy.bx=t.clientX;joy.by=t.clientY;jB.style.display='block';jB.style.left=t.clientX+'px';jB.style.top=t.clientY+'px';jK.style.transform='';continue;}
  const el=el0;const k=el&&el.dataset&&el.dataset.k;if(k)k.split(',').forEach(x=>n[x]=1);else n.tap=1;}
 for(const k in n)if(!tc[k])latch[k]=1;tc=n;document.querySelectorAll('#touch .b').forEach(b=>{b.classList.toggle('on',b.dataset.k.split(',').every(x=>n[x]))});}
['touchstart','touchmove','touchend','touchcancel'].forEach(ev=>document.addEventListener(ev,onTouch,{passive:false}));
if(matchMedia('(pointer:coarse)').matches||('ontouchstart' in window))touchEl.classList.add('on');
cv.addEventListener('mousedown',()=>{kb.tap=1;setTimeout(()=>kb.tap=0,80);});
function pollInput(){for(const k of KEYS){const v=!!(kb[k]||tc[k]||latch[k]);latch[k]=0;I[k+'P']=v&&!I[k];I[k]=v;}}

// ---------------- menus
const menu=document.getElementById('menu');
function setMenu(items){menu.innerHTML='';menu.classList.remove('grid');for(const [label,fn] of items){const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.preventDefault();fn();};menu.appendChild(b);}menu.style.display=items.length?'flex':'none';}
function goFull(){try{if(matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().then(()=>{try{screen.orientation.lock('landscape').catch(()=>{})}catch(e){}}).catch(()=>{});}catch(e){}}
function startNew(){goFull();sfx('pick');setMenu([]);newGame();}
function startNGP(){goFull();sfx('pick');setMenu([]);try{const d=JSON.parse(getSave()||'null');if(d&&!P){S.flags=d.flags;S.stones=d.stones||0;S.ng=d.ng||0;P=newPlayer();P.maxHp=d.maxHp;}}catch(e){}newGame(true);}
function cleared(){try{return localStorage.getItem('gruk_cleared')==='1';}catch(e){return false;}}
function startCont(){goFull();sfx('pick');setMenu([]);loadGame();}
function titleMenu(){S.state='title';const items=[['NEW GAME',startNew],['SETTINGS',()=>settingsMenu(titleMenu)]];if(cleared())items.splice(1,0,['NEW GAME+',startNGP]);if(getSave())items.unshift(['CONTINUE',startCont]);setMenu(items);}
function pauseGame(){S.state='pause';setMenu([['RESUME',resume],['FAST TRAVEL',travelMenu],['SETTINGS',()=>settingsMenu(pauseGame)],['LAST CAMPFIRE',()=>{setMenu([]);loadGame();}],['TITLE',titleMenu]]);}
const pct=v=>Math.round(v*100)+'%',stepV=v=>v>=1?0:Math.min(1,Math.round((v+.25)*4)/4);
function settingsMenu(back){const m=()=>settingsMenu(back);setMenu([
 ['MUSIC '+pct(CFG.music),()=>{CFG.music=stepV(CFG.music);saveCfg();m();}],['SFX '+pct(CFG.sfx),()=>{CFG.sfx=stepV(CFG.sfx);saveCfg();sfx('pick');m();}],
 ['CONTROLS: '+(ctrlMode==='joy'?'JOYSTICK':'D-PAD'),()=>{ctrlMode=ctrlMode==='joy'?'pad':'joy';try{localStorage.setItem('gruk_ctrl',ctrlMode);}catch(e){}applyCtrl();m();}],
 ['SHAKE '+(CFG.shake?'ON':'OFF'),()=>{CFG.shake=CFG.shake?0:1;saveCfg();m();}],['SPEEDRUN TIMER '+(CFG.timer?'ON':'OFF'),()=>{CFG.timer=CFG.timer?0:1;saveCfg();m();}],
 ['EFFECTS '+CFG.fx.toUpperCase(),()=>{CFG.fx={auto:'high',high:'low',low:'auto'}[CFG.fx];lowFx=CFG.fx==='low';fpsLowT=0;saveCfg();m();}],['BACK',back]]);menu.classList.add('grid');}
function travelMenu(){const f=S.flags.fires||{},items=[];
 if(boss){setMenu([['Cannot travel during a boss fight!',pauseGame]]);return;}
 for(const k in f)items.push([(k===S.room?'* ':'')+ROOMS[k].name,()=>{const [x,y]=f[k];setMenu([]);P.hook=null;P.roll=0;P.h=22;enterRoom(k,x,y);lastCP=k+':'+(x-2);P.hp=P.maxHp;save(x,y);S.state='play';sfx('save');}]);
 items.push(['BACK',pauseGame]);setMenu(items);menu.classList.add('grid');}
let trading=0;
function resume(){setMenu([]);S.state='play';trading=0;}
const SHOP=[['heart1','HEART PIECE',20,'Max health +1'],['heart2','HEART PIECE II',35,'Max health +1'],['qspear','QUICK SPEAR',15,'Spear reloads much faster'],['lhook','LONG HOOK',15,'Hook reaches farther'],['bigfire','BIG FIRE',25,'Fire flies farther, burns hotter']];
function tradeMenu(){S.state='pause';trading=1;const items=[];for(const [id,n,c,d] of SHOP){if(S.flags.shop[id])items.push(['SOLD: '+n,tradeMenu]);else items.push([n+'  '+c+' stones  -  '+d,()=>{if(S.stones<c){sfx('clink');setMenu([['Not enough shiny stones! ('+S.stones+'/'+c+')',tradeMenu]]);return;}S.stones-=c;S.flags.shop[id]=1;if(id.startsWith('heart')){P.maxHp++;P.hp=P.maxHp;}sfx('coin');save(P.x,P.y);tradeMenu();}]);}
 items.push(['LEAVE',resume]);setMenu(items);menu.classList.add('grid');}

// ---------------- effects
function puff(x,y,col,n,sp){if(lowFx)n=Math.ceil(n/2);for(let i=0;i<n;i++)parts.push({x,y,vx:rnd(-sp,sp),vy:rnd(-sp,sp*.5),t:rnd(.3,.8),c:col,g:200});}
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
function hurt(n,fromX,hz){if((P.inv>0||(P.roll>0&&!hz))||S.state!=='play'||cut)return;hitstop=.06;if(S.ng&&!hz)n*=2;P.hp-=n;P.inv=1.1;sfx('hurt');shake=.2;P.cling=0;
 const d=(P.x+P.w/2)<fromX?-1:1;if(P.hook&&!hz&&P.hp>0){P.inv=1.4;}else{P.force=.16;P.forceVx=d*165;P.vy=hz?-150:-210;P.hook=null;}puff(P.x+6,P.y+10,'#f44',8,80);
 if(P.hp<=0){S.state='dead';stateT=0;S.deaths++;P.dx=P.x;P.dy=P.y;P.burst=0;sfx('death');hitstop=0;}}
function canStand(){const y=P.y-10,c0=Math.floor(P.x/TS),c1=Math.floor((P.x+P.w-.001)/TS),r0=Math.floor(y/TS),r1=Math.floor((y+21.9)/TS);
 for(let ty=r0;ty<=r1;ty++)for(let tx=c0;tx<=c1;tx++)if(solidP(tileAt(tx,ty)))return false;return true;}
function standUp(){if(P.roll>0||P.h<22){P.roll=0;P.y-=10;P.h=22;}}
function inWater(){return tileAt(Math.floor((P.x+6)/TS),Math.floor((P.y+P.h/2)/TS))==='~';}
function respawnSafe(){const s=lastSafe||entryPos;if(P.h<22){P.h=22;P.roll=0;}P.x=s.x;P.y=s.y;P.vx=P.vy=0;P.force=0;P.hook=null;P.cling=0;}
function tryHook(){const pcx=P.x+6,pcy=P.y+8;let best=null,bd=1e9;
 for(const a of cur.anchors){if(P.hook&&P.hook.ax===a.x&&P.hook.ay===a.y)continue;const dx=a.x-pcx,dy=a.y-pcy,d=Math.hypot(dx,dy);
  if(d>(S.flags.shop.lhook?195:135)||dy>30)continue;const sc=d+(dx*P.facing<-4?60:0);if(sc<bd){bd=sc;best=a;}}
 if(!best){sayOnce(P.x-10,P.y-10,'Nothing to hook!');return;}
 if(P.h<22){if(!canStand())return;standUp();}
 P.hook={ax:best.x,ay:best.y,st:'pull',t:0};P.cling=0;sfx('hook');}
function updPlayer(dt){
 const dir=(I.right?1:0)-(I.left?1:0);
 if(P.inv>0)P.inv-=dt;if(P.acd>0)P.acd-=dt;if(P.fcd>0)P.fcd-=dt;if(P.scd>0)P.scd-=dt;if(P.atk>0)P.atk-=dt;if(P.rcd>0)P.rcd-=dt;
 // actions
 if(P.comboT>0)P.comboT-=dt;
 if(I.attackP&&P.acd<=0&&P.roll<=0){P.combo=P.comboT>0?(P.combo+1)%3:0;P.atk=P.combo===2?.2:.16;P.animT=0;P.acd=P.combo===2?.38:.2;P.comboT=.5;P.charged=0;P.hitSet=new Set();sfx(P.combo===2?'combo':'club');if(P.combo===2&&P.onGround&&!P.cling){P.force=.08;P.forceVx=P.facing*120;}}
 if(S.ab.thunder&&P.roll<=0&&!P.hook){if(I.attack&&P.atk<=0){const was=P.chg;P.chg+=dt;if(was<.55&&P.chg>=.55){sfx('charge');puff(P.x+6,P.y+8,'#7df',10,60);}}
  else if(!I.attack){if(P.chg>=.55){P.atk=.24;P.animT=0;P.acd=.35;P.charged=1;P.combo=0;P.comboT=0;P.hitSet=new Set();sfx('thunder');shake=Math.max(shake,.25);flash=.12;puff(P.x+6+P.facing*16,P.y+10,'#bff',18,140);}P.chg=0;}}else P.chg=0;
 if(I.fireP){if(!S.ab.fire)sayOnce(P.x,P.y-6,'Gruk not know fire yet');else if(P.fcd<=0&&P.roll<=0){P.fcd=.45;P.thr=.18;P.animT=0;sfx('fire');
  proj.push(I.up?{k:'fire',x:P.x+3,y:P.y-4,w:7,h:7,vx:0,vy:-240,life:S.flags.shop.bigfire?1.7:1.1}:{k:'fire',x:P.x+(P.facing>0?P.w:-7),y:P.y+7,w:7,h:7,vx:P.facing*240,vy:0,life:S.flags.shop.bigfire?1.7:1.1});}}
 if(I.spearP){if(!S.ab.spear)sayOnce(P.x,P.y-6,'Gruk has no spear');else if(P.scd<=0&&P.roll<=0){P.scd=S.flags.shop.qspear?.26:.5;P.thr=.18;P.animT=0;sfx('spear');
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
   if(I.jumpP)P.jbuf=.15;else P.jbuf-=dt;
   if(P.onGround){P.coy=.11;P.jumps=S.ab.djump?1:0;}else P.coy-=dt;
   if(P.jbuf>0&&P.roll<=0){
    if(P.cling){P.vy=-JUMPV*.95;P.force=.14;P.forceVx=-P.cling*140;P.facing=-P.cling;P.cling=0;P.jbuf=0;sfx('jump');puff(P.x+6,P.y+20,'#ddd',4,40);}
    else if(P.coy>0){P.vy=-JUMPV;P.coy=0;P.jbuf=0;sfx('jump');puff(P.x+6,P.y+22,'#d8c8a8',4,30);}
    else if(P.jumps>0){P.vy=-JUMPV*.95;P.jumps--;P.jbuf=0;sfx('jump');puff(P.x+6,P.y+22,'#8cf',10,60);}
   }
   if(!I.jump&&P.vy<-120&&!P.cling&&P.force<=0)P.vy+=(-120-P.vy)*Math.min(1,dt*30);
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
  if(solidP(tileAt(fx,fy))&&!HAZ(tileAt(fx-1,fy-1))&&!HAZ(tileAt(fx+1,fy-1))&&!HAZ(tileAt(fx-1,fy))&&!HAZ(tileAt(fx+1,fy))&&tileAt(fx-1,fy)!=='~'&&tileAt(fx+1,fy)!=='~'&&tileAt(fx,fy)!=='Q'&&tileAt(fx-1,fy)!=='Q'&&tileAt(fx+1,fy)!=='Q')lastSafe={x:P.x,y:P.y};}
 P.anim+=dt*(P.vx?10:2);
 // club hits
 if(P.atk>0){const hw=P.charged?28:P.combo===2?22:18,hb={x:P.facing>0?P.x+P.w:P.x-hw,y:P.y+(P.charged?-4:2),w:hw,h:P.charged?26:16};
  for(const e of ents)if(e.hp>0&&!P.hitSet.has(e)&&ov(hb,e)){P.hitSet.add(e);clubHit(e);}
  const c0=Math.floor(hb.x/TS),c1=Math.floor((hb.x+hb.w-1)/TS),r0=Math.floor(hb.y/TS),r1=Math.floor((hb.y+hb.h-1)/TS);
  for(let ty=r0;ty<=r1;ty++)for(let tx=c0;tx<=c1;tx++){const c=tileAt(tx,ty);
   if(c==='M'){if(P.charged){flood(tx,ty,'M',(x,y)=>puff(x*TS+8,y*TS+8,'#9cf',8,110));sfx('break');shake=.35;hitstop=.06;}else if(!P.hitSet.has('M')){P.hitSet.add('M');sfx('clink');sayOnce(P.x-20,P.y-8,S.ab.thunder?'HOLD the club to charge THUNDER!':'A storm totem. Needs THUNDER!');}}
   else if(c==='C'){if(S.ab.smash){flood(tx,ty,'C',(x,y)=>puff(x*TS+8,y*TS+8,'#9a8a74',6,90));sfx('break');shake=.25;hitstop=.05;}else if(!P.hitSet.has('C')){P.hitSet.add('C');sfx('clink');sayOnce(P.x,P.y-6,'Too hard! Need STONE SMASH');}}
   else if(c==='V'&&!P.hitSet.has('V')){P.hitSet.add('V');sayOnce(P.x,P.y-6,'Vines too tough. Burn them?');}}}
 // hazards
 {const c0=Math.floor((P.x+2)/TS),c1=Math.floor((P.x+P.w-3)/TS),ty=Math.floor((P.y+P.h-3)/TS);let sp=false;for(let tx=c0;tx<=c1;tx++)if(HAZ(tileAt(tx,ty)))sp=true;
  if(sp){if(tileAt(c0,ty)==='L'||tileAt(c1,ty)==='L')puff(P.x+6,P.y+P.h,'#f80',12,90);hurt(1,P.x+6,true);if(S.state==='play')respawnSafe();}}
 // room transitions
 const cx=P.x+P.w/2,cy=P.y+P.h/2;let [rx,ry]=S.room.split(',').map(Number),nk=null;
 if(cx<0){nk=(rx-1)+','+ry;if(ROOMS[nk])enterRoom(nk,P.x+VW,P.y,true);}
 else if(cx>VW){nk=(rx+1)+','+ry;if(ROOMS[nk])enterRoom(nk,P.x-VW,P.y,true);}
 else if(cy<0){nk=rx+','+(ry-1);if(ROOMS[nk]&&!solidP(ROOMS[nk].g0[RH-1][Math.max(0,Math.min(RW-1,((P.x+6)/TS)|0))])){const cl=P.cling;enterRoom(nk,P.x,P.y+VH,true);
  if(!(cl&&touchWall(cl))&&!P.hook){P.cling=0;P.vy=Math.min(P.vy,-300);const pr=RH-2,c=Math.floor((P.x+6)/TS);let best=0,bd=99;
   for(const d of[-1,1])for(let k=1;k<8;k++){const t=tileAt(c+d*k,pr);if(solidP(t)){if(!solidP(tileAt(c+d*k,pr-1))&&k<bd){bd=k;best=d;}break;}}
   if(best){P.force=.32;P.forceVx=best*100;P.facing=best;}}}}
 else if(cy>VH){nk=rx+','+(ry+1);if(ROOMS[nk])enterRoom(nk,P.x,P.y-VH,true);else{hurt(1,P.x,true);respawnSafe();}}
}
function flood(x,y,ch,cb){const q=[[x,y]];const seen={};while(q.length){const [a,b]=q.pop();if(a<0||b<0||a>=RW||b>=RH||seen[a+','+b]||cur.g[b][a]!==ch)continue;seen[a+','+b]=1;setTile(a,b,'.');cb(a,b);q.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]);}}
function dropGems(x,y,n){for(let i=0;i<n;i++)ents.push({t:'gem',x:x-3,y:y,w:6,h:6,vx:rnd(-70,70),vy:-140-rnd(0,90),life:12});}
function bolt(x,warn){bolts.push({x:clamp(x,8,VW-8),t:warn||.85,st:0});}
function dmgEnemy(e,n,src){e.hp-=n;e.fl=.12;sfx('hit');hitstop=.045;shake=Math.max(shake,.08);puff(e.x+e.w/2,e.y+e.h/2,'#fff',5,70);
 if(e.t==='walker'||e.t==='bat'||e.t==='fish'||e.t==='spitter'||e.t==='boar'||e.t==='diver'){if(e.t!=='spitter')e.x+= (e.x+e.w/2<src?-6:6)*(P.combo===2||P.charged?2.2:1);if(e.hp<=0){puff(e.x+e.w/2,e.y+e.h/2,'#c84',10,90);dropGems(e.x+e.w/2,e.y,1+(Math.random()<.45?1:0)+(e.t==='boar'?1:0));if(Math.random()<.35)ents.push({t:'meat',x:e.x+2,y:e.y,w:10,h:8,vy:-120});}}
 if(BOSSES.includes(e.t)&&e.hp<=0){e.st='dying';e.t2=1.6;sfx('boss');shake=.6;}}
function clubHit(e){const px=P.x+P.w/2;
 const cd=(S.ab.smash?2:1)+(S.flags.relic?1:0)+(P.combo===2?1:0)+(P.charged?2:0);
 if(P.combo===2||P.charged){shake=Math.max(shake,.12);puff(e.x+e.w/2,e.y+e.h/2,P.charged?'#bff':'#fff',8,110);}
 if(e.t==='gemcache'){e.dead=1;S.flags.removed[e.id]=1;dropGems(e.x+8,e.y+4,8);sfx('break');puff(e.x+8,e.y+8,'#9a8a74',10,90);return;}
 if(e.t==='walker'||e.t==='bat'||e.t==='fish'||e.t==='spitter'||e.t==='hopper'||e.t==='icicle'||e.t==='boar'||e.t==='diver')dmgEnemy(e,cd,px);
 else if(e.t==='tbird'&&e.st!=='dying'&&e.st!=='intro'){if(e.phase===2&&!P.charged){sfx('clink');puff(e.x+e.w/2,P.y+8,'#bff',6,70);sayOnce(P.x-30,P.y-10,'Storm shield! THUNDER smash it!');}else dmgEnemy(e,P.charged?3:1,px);}
 else if(e.t==='croc'&&e.st!=='dying'){if((px-(e.x+e.w/2))*e.face<0)dmgEnemy(e,cd,px);else{sfx('clink');sayOnce(P.x-10,P.y-8,'Jaws too strong! Get BEHIND it!');}}
 else if(e.t==='golem'&&e.st!=='dying'&&e.st!=='intro')dmgEnemy(e,cd,px);
 else if(e.t==='mammoth'&&e.st!=='dying'){sfx('clink');puff(e.x+e.w/2,P.y+8,'#cef',5,60);sayOnce(P.x-10,P.y-8,'Club bounces off ice! Need FIRE!');}
 else if(e.t==='ptero'&&e.st!=='dying'){sfx('clink');sayOnce(P.x-10,P.y-8,'It flaps away! Need SPEAR!');}}

// ---------------- enemies / bosses
function updEnts(dt){
 nearTrader=null;
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
  else if(e.t==='spitter'&&e.hp>0){e.an+=dt;e.face=P.x>e.x?1:-1;e.cd-=dt;const d=Math.abs(P.x-e.x);
   if(e.cd<=0&&d<220){e.cd=2.2;e.open=.3;const T=.9,sx=e.x+7,sy=e.y+2;eproj.push({k:'seed',x:sx,y:sy,w:5,h:5,vx:(P.x+6-sx)/T,vy:((P.y+8)-sy-.5*G*.7*T*T)/T});sfx('spear');}
   if(e.open>0)e.open-=dt;if(ov(e,P))hurt(1,e.x+7);}
  else if(e.t==='hopper'&&e.hp>0){e.h=e.up?12:0;if(e.up){e.vy+=G*.8*dt;e.y+=e.vy*dt;if(e.y>=e.by&&e.vy>0){e.y=e.by;e.up=0;e.cd=1+Math.random()*1.5;puff(e.x+7,e.y,'#f80',6,60);}if(ov(e,P))hurt(1,e.x+7);}
   else{e.cd-=dt;if(e.cd<=0){e.up=1;e.vy=-330-Math.random()*60;puff(e.x+7,e.y,'#fa0',8,70);}}}
  else if(e.t==='icicle'&&e.hp>0){if(e.st===0){if(Math.abs(P.x+6-(e.x+4))<22&&P.y>e.y){e.st=1;e.sh=.35;}}
   else if(e.st===1){e.sh-=dt;if(e.sh<=0)e.st=2;}
   else{e.vy=Math.min(e.vy+G*dt,500);e.y+=e.vy*dt;if(solidP(tileAt(Math.floor((e.x+4)/TS),Math.floor((e.y+e.h)/TS)))){e.hp=0;puff(e.x+4,e.y+e.h,'#cef',10,80);sfx('clink');}}
   if(e.st===2&&ov(e,P)){hurt(1,e.x+4);e.hp=0;}}
  else if(e.t==='boar'&&e.hp>0){e.an+=dt*(e.st==='charge'?14:4);e.t2-=dt;const dx=P.x+6-(e.x+9),row=Math.abs((P.y+P.h)-(e.y+e.h))<20;
   if(e.st==='idle'){e.vx=e.face*25;if(row&&Math.abs(dx)<170&&Math.sign(dx)===e.face&&e.t2<=0){e.st='prep';e.t2=.55;e.vx=0;sfx('roll');}else if(Math.random()<.004)e.face=-e.face;}
   else if(e.st==='prep'){e.vx=0;if(Math.random()<.3)puff(e.x+(e.face>0?0:18),e.y+13,'#c9a878',1,30);if(e.t2<=0){e.st='charge';e.t2=1.2;}}
   else if(e.st==='charge'){e.vx=e.face*210;if(e.t2<=0){e.st='idle';e.t2=1.2;}}
   else{e.vx=0;if(e.t2<=0){e.st='idle';e.t2=1;}}
   if(e.vx){const nx=e.x+e.vx*dt,front=e.vx>0?nx+e.w:nx,tx=Math.floor(front/TS),ty=Math.floor((e.y+e.h-1)/TS),below=tileAt(tx,ty+1);
    if(solidP(tileAt(tx,ty))||!(solidP(below)||below==='=')||HAZ(tileAt(tx,ty))||HAZ(below)){if(e.st==='charge'){e.st='stun';e.t2=.9;shake=Math.max(shake,.1);sfx('land');}e.face=-e.face;e.vx=0;}else e.x=nx;}
   if(ov(e,P))hurt(1,e.x+9);}
  else if(e.t==='diver'&&e.hp>0){e.an+=dt;e.t2-=dt;const dx=P.x+6-(e.x+7),dy=P.y+8-(e.y+5);
   if(e.st==='hover'){e.x+=(e.bx+Math.cos(e.an*1.2)*40-e.x)*Math.min(1,dt*2);e.y=e.by+Math.sin(e.an*3)*6;e.face=dx>0?1:-1;if(e.t2<=0&&Math.abs(dx)<170&&dy>0){e.st='aim';e.t2=.55;sfx('whoosh');}}
   else if(e.st==='aim'){e.y-=14*dt;if(e.t2<=0){const d=Math.hypot(dx,dy)||1;e.vx=dx/d*230;e.vy=dy/d*230;e.st='dive';e.t2=1.1;}}
   else if(e.st==='dive'){e.x+=e.vx*dt;e.y+=e.vy*dt;if(e.t2<=0||solidP(tileAt(Math.floor((e.x+7)/TS),Math.floor((e.y+10)/TS)))){e.st='back';e.t2=1.6;}}
   else{e.x+=(e.bx-e.x)*Math.min(1,dt*1.5);e.y+=(e.by-e.y)*Math.min(1,dt*1.5);if(e.t2<=0){e.st='hover';e.t2=1.8+Math.random();}}
   e.x=clamp(e.x,4,VW-18);e.y=clamp(e.y,4,VH-40);if(ov(e,P))hurt(1,e.x+7);}
  else if(e.t==='gem'){e.life-=dt;e.vy=Math.min(e.vy+G*dt,300);moveX(e,e.vx*dt,solidP);if(moveY(e,e.vy*dt,solidP,true)){e.vy=0;e.vx*=.8;}const nd=Math.hypot(P.x+6-e.x,P.y+11-e.y);if(nd<44&&e.life<11.5){e.x+=(P.x+6-e.x)*dt*7;e.y+=(P.y+11-e.y)*dt*7;}if(ov(e,P)||nd<8){e.dead=1;S.stones++;sfx('coin');}if(e.life<=0)e.dead=1;}
  else if(e.t==='painter'){e.an+=dt;if(ov({x:e.x-14,y:e.y-4,w:44,h:30},P))nearTrader=e;}
  else if(e.t==='tbird')updTbird(e,dt);
  else if(e.t==='croc')updCroc(e,dt);
  else if(e.t==='golem')updGolem(e,dt);
  else if(e.t==='scroll'&&ov(e,P)){e.dead=1;S.flags.scrolls[e.id]=1;sfx('pick');puff(e.x+6,e.y+6,'#ffe060',16,80);
   banner={title:'KNOWLEDGE SCROLL '+Object.keys(S.flags.scrolls).length+'/'+TOTAL.scrolls,text:e.s,t:0,c:'#ffe060'};}
  else if(e.t==='mammoth')updMammoth(e,dt);
  else if(e.t==='ptero')updPtero(e,dt);
  else if(e.t==='heart'&&ov(e,P)){e.dead=1;S.flags.hearts[e.id]=1;P.maxHp++;P.hp=P.maxHp;sfx('pick');banner={title:'HEART OF THE MOUNTAIN',text:'Gruk feels tougher! Max health +1.',t:0};}
  else if(e.t==='K'&&ov(e,P)){const id=S.room+':'+e.x;if(lastCP!==id||P.hp<P.maxHp){lastCP=id;P.hp=P.maxHp;(S.flags.fires=S.flags.fires||{})[S.room]=[e.x+2,e.y+16-P.h];save(e.x,e.y+16-P.h);sfx('save');say(e.x-14,e.y-12,'SAVED','#ffd27a');}}
  else if(e.t==='shrine'&&shrineOn(e)&&ov(e,P)){S.ab[e.ab]=1;sfx('pick');save(e.x,e.y+16-P.h);P.vx=0;P.atk=0;cut={ab:e.ab,t:0,x:e.x+8,y:e.y};}
  else if(e.t==='relic'&&ov(e,P)){e.dead=1;S.flags.relic=1;sfx('pick');puff(e.x+8,e.y+8,'#ffd040',30,120);save(e.x,e.y+16-P.h);
   banner={title:'SECRET: GOLDEN CLUB',text:'Gruk found the Golden Club of the first Elder! Club hits deal +1 damage.',t:0,c:'#ffd040'};}
  else if(e.t==='orb'&&ov(e,P)){S.state='ascend';stateT=0;sfx('pick');}
 }
 ents=ents.filter(e=>!(e.dead||(['walker','bat','fish','spitter','hopper','icicle','boar','diver'].includes(e.t)&&e.hp<=0)));
 if(S.room==='0,0'&&BOSSES.every(b=>S.flags.bosses[b])&&cur.g[5][6]==='E'&&P.x<22*TS){for(let y=0;y<RH;y++)if(cur.g[y][6]==='E'){setTile(6,y,'.');puff(104,y*TS+8,'#c8f',8,90);}
  sfx('door');shake=.5;banner={title:'THE ELDER GATE OPENS',text:'The five great beasts have been humbled. The path to ENLIGHTENMENT is open.',t:0,c:'#c8f'};}
}
function shrineOn(e){return !S.ab[e.ab]&&(!e.cond||S.flags.bosses[e.cond]);}
function bossDown(m){S.flags.bosses[m.t]=1;m.dead=1;boss=null;shake=.6;for(let i=0;i<40;i++)puff(m.x+rnd(0,m.w),m.y+rnd(0,m.h),['#fff','#fc4','#f84'][i%3],1,160);
 for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){if(cur.g[y][x]==='B'){setTile(x,y,'.');puff(x*TS+8,y*TS+8,'#eee',6,80);}if(m.t==='golem'&&(cur.g[y][x]==='L'||cur.g[y][x]==='h'))setTile(x,y,cur.g[y][x]==='h'?'.':'#');}
 for(const e of ROOMS[S.room].ents)if(e.cond===m.t&&(e.t==='heart'||e.t==='scroll')){const it=spawnItem(S.room,e);if(it)ents.push(it);}
 sfx('bossdie');const sh=ents.find(e=>e.t==='shrine');banner={title:m.name+' DEFEATED!',text:'A stone of KNOWLEDGE appears. The path onward is open.',t:0};
 save(sh?sh.x:P.x,sh?sh.y+16-P.h:P.y);eproj=[];bolts=[];wind.st=0;wind.t=3;dropGems(m.x+m.w/2,m.y+m.h/2,8);}
function updTbird(m,dt){m.t2-=dt;m.an+=dt*10;const px=P.x+P.w/2,py=P.y+P.h/2,ph2=m.phase===2;
 if(m.phase===1&&m.hp<=m.max/2&&m.st!=='dying'){m.phase=2;m.st='roar';m.t2=1.4;sfx('thunder');shake=.6;flash=.3;say(m.x-10,m.y+30,'THE STORM ANSWERS!','#9df');eproj=[];bolts=[];}
 switch(m.st){
  case 'intro':m.y+=(m.baseY-m.y)*Math.min(1,dt*2);m.x+=(210-m.x)*Math.min(1,dt*2);if(m.t2<=0){m.st='hover';m.t2=2.5;}break;
  case 'roar':m.y+=(m.baseY-20-m.y)*Math.min(1,dt*3);if(Math.random()<.5)puff(m.x+rnd(0,60),m.y+rnd(0,28),'#9df',1,120);if(m.t2<=0){m.st='hover';m.t2=1.5;}break;
  case 'hover':m.ph+=dt;{const tx=240+170*Math.sin(m.ph*(ph2?1.2:.8))-m.w/2;m.x+=(tx-m.x)*Math.min(1,dt*2);m.y+=(m.baseY+12*Math.sin(m.ph*2.4)-m.y)*Math.min(1,dt*3);}
   m.face=px>m.x+m.w/2?1:-1;m.rt-=dt;if(m.rt<=0){m.rt=ph2?1.2:2;bolt(px+rnd(-10,10));if(ph2&&Math.random()<.5)bolt(px+rnd(-90,90),1.1);}
   if(m.t2<=0){m.n++;if(ph2&&m.n%2===0){m.st='dive';m.t2=1.2;}else{m.st='prep';m.t2=.6;}sfx('boss');}break;
  case 'prep':m.y-=20*dt;if(m.t2<=0){m.st='swoop';m.t2=1.3;const dx=px-(m.x+m.w/2),dy=py-(m.y+m.h/2),d=Math.hypot(dx,dy)||1,sp=ph2?300:250;m.vx=dx/d*sp;m.vy=dy/d*sp;m.ty=py;m.face=dx>0?1:-1;}break;
  case 'swoop':m.x+=m.vx*dt;m.y+=m.vy*dt;if(m.y+m.h/2>=m.ty||m.t2<=0||m.y+m.h>=15*TS){m.st='rise';m.t2=1.5;}break;
  case 'rise':m.y-=110*dt;m.x+=m.vx*.3*dt;if(m.y<=m.baseY||m.t2<=0){m.st='hover';m.t2=2+Math.random()*1.2;}break;
  case 'dive':{const gy=15*TS-m.h;m.y+=(gy-m.y)*Math.min(1,dt*4);if(m.t2<=0||m.y>=gy-2){m.y=gy;m.st='perch';m.t2=2.8;shake=.3;sfx('land');for(const i of[-1,1])eproj.push({k:'spark',x:m.x+m.w/2-5,y:gy+m.h-8,w:10,h:8,vx:i*150,vy:0,flat:1,life:1.8});}}break;
  case 'perch':if(Math.random()<.3)parts.push({x:m.x+rnd(0,60),y:m.y+rnd(0,28),vx:0,vy:-40,t:.4,c:'#bff',g:0});if(m.t2<=0){m.st='rise';m.t2=1.6;m.vx=0;}break;
  case 'dying':m.y+=50*dt;if(Math.random()<.5)puff(m.x+rnd(0,60),m.y+rnd(0,28),'#9df',3,100);if(m.t2<=0)bossDown(m);return;}
 m.x=clamp(m.x,8,VW-8-m.w);m.y=clamp(m.y,-60,15*TS-m.h);
 if(m.st!=='intro'&&m.st!=='roar'&&m.st!=='perch'&&ov({x:m.x+8,y:m.y+4,w:m.w-16,h:m.h-6},P))hurt(1,m.x+m.w/2);}
function updStorm(dt){if(flash>0)flash-=dt;const st=ROOMS[S.room].storm,tb=boss&&boss.t==='tbird';
 if(st&&!boss){wind.t-=dt;if(wind.st===0&&wind.t<=0){wind.st=1;wind.t=.9;wind.dir=Math.random()<.5?-1:1;sfx('whoosh');}else if(wind.st===1&&wind.t<=0){wind.st=2;wind.t=1.6;}else if(wind.st===2&&wind.t<=0){wind.st=0;wind.t=2.5+Math.random()*2;}
  if(Math.random()<dt*.35)bolt(P.x+6+rnd(-20,20));}
 else if(tb&&boss.phase===2){wind.t-=dt;if(wind.t<=0){wind.st=(wind.st+1)%3;wind.t=wind.st===2?1.4:wind.st===1?.8:2.2;if(wind.st===1){wind.dir=Math.random()<.5?-1:1;sfx('whoosh');}}}
 else if(!st)wind.st=0;
 if(wind.st===2&&!P.hook&&!P.cling&&!inWater()&&!cut&&!banner)moveX(P,wind.dir*(P.onGround?55:85)*dt,solidP);
 for(const b of bolts){b.t-=dt;if(b.st===0&&b.t<=0){b.st=1;b.t=.25;flash=Math.max(flash,.12);sfx('zap');shake=Math.max(shake,.15);if(Math.abs(P.x+6-b.x)<12)hurt(1,b.x);puff(b.x,15*TS,'#bff',10,100);}else if(b.st===1&&b.t<=0)b.dead=1;}
 bolts=bolts.filter(b=>!b.dead);
 if(P.onGround){const fy=Math.floor((P.y+P.h+1)/TS);for(let tx=Math.floor(P.x/TS);tx<=Math.floor((P.x+P.w-1)/TS);tx++)if(cur.g[fy]&&cur.g[fy][tx]==='Q'){const k=tx+','+fy;if(!crum[k]){crum[k]={t:.5,x:tx,y:fy,st:0};sfx('crumble');}}}
 for(const k in crum){const c=crum[k];c.t-=dt;if(c.st===0){if(Math.random()<.3)parts.push({x:c.x*TS+rnd(0,16),y:c.y*TS+14,vx:0,vy:40,t:.4,c:'#887',g:300});if(c.t<=0){c.st=1;c.t=3;cur.g[c.y][c.x]='.';puff(c.x*TS+8,c.y*TS+8,'#887',8,70);}}
  else if(c.t<=0){if(!ov({x:c.x*TS,y:c.y*TS,w:16,h:16},P)){cur.g[c.y][c.x]='Q';delete crum[k];}}}}
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
  for(const e of ents){if(e.hp>0&&e.st!=='dying'&&ov(p,e)&&(e.t==='walker'||e.t==='bat'||e.t==='fish'||e.t==='spitter'||e.t==='hopper'||e.t==='icicle'||e.t==='boar'||e.t==='diver'||BOSSES.includes(e.t))){
   if(e.t==='mammoth'&&p.k!=='fire'){sfx('clink');sayOnce(p.x-20,p.y-10,'Spear bounces off the ice!');}
   else if(e.t==='ptero'&&p.k!=='spear'){puff(p.x,p.y,'#f84',6,60);sayOnce(p.x-20,p.y+20,'Fire fizzles on its scales!');}
   else if(e.st==='intro'||e.st==='roar'){}
   else if(e.t==='tbird'&&e.phase===2){sfx('clink');puff(p.x,p.y,'#bff',6,60);sayOnce(p.x-30,p.y+16,'Storm shield! Only THUNDER pierces it!');}
   else if(e.t==='golem'){puff(p.x,p.y,'#f84',8,60);sayOnce(p.x-30,p.y-12,p.k==='fire'?'The golem drinks the fire!':'The spear melts!');}
   else if(e.t==='croc'&&(p.x-(e.x+e.w/2))*e.face>0){sfx('clink');sayOnce(p.x-30,p.y-12,'Bounces off its jaws!');}
   else dmgEnemy(e,p.k==='fire'?(e.t==='mammoth'?1:2):1,p.x);
   p.life=0;break;}}
 }
 proj=proj.filter(p=>p.life>0);
 for(const p of eproj){if(p.delay>0){p.delay-=dt;continue;}if(p.flat){p.x+=p.vx*dt;p.life-=dt;if(Math.random()<.5)parts.push({x:p.x+5,y:p.y+4,vx:0,vy:-40,t:.25,c:'#bff',g:0});if(p.life<=0||p.x<0||p.x>VW)p.dead=1;if(ov(p,P)){hurt(1,p.x);p.dead=1;}continue;}p.vy=Math.min(p.vy+G*.7*dt,400);p.y+=p.vy*dt;if(p.vx)p.x+=p.vx*dt;if(p.k==='lava'&&Math.random()<.5)parts.push({x:p.x+4,y:p.y+4,vx:0,vy:0,t:.3,c:'#f80',g:0});
  if(ov(p,P)){hurt(1,p.x);p.dead=1;}
  const c=tileAt(Math.floor((p.x+3)/TS),Math.floor((p.y+p.h)/TS));if(solidP(c)||p.y>VH){p.dead=1;puff(p.x+3,p.y+p.h,p.k==='ice'?'#cef':(p.k==='lava'||p.k==='drop')?'#f80':p.k==='seed'?'#6a3':'#887',5,60);}}
 eproj=eproj.filter(p=>!p.dead);
 {const MX=lowFx?120:350;if(parts.length>MX)parts.splice(0,parts.length-MX);}
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
 storm:{rock:'#464c62',r2:'#2a2e3e',r3:'#6a7290',top:'#8a9a8a',top2:'#5a6a5a',sky:['#141a28','#2e3a52','#5a6680'],m1:'#323a50',m2:'#20283a'},
 peak:{rock:'#6a6080',r2:'#4a4260',r3:'#8a80a0',top:'#ffffff',top2:'#d0d8f0',sky:['#16143e','#5a3c80','#f09a6a'],m1:'#5a4c7a',m2:'#3a3460'}};
const ZP={
 base:{rk:['#24160e','#4a2e1e','#76502e','#a47a4a','#d4ac74'],cap:['#163a16','#2e6a22','#5aa632','#9ad850'],amb:'rgba(255,190,110,.06)',dk:0,sky:['#3a78c8','#86c0ec','#f6d49a'],m1:'#7480b4',m2:'#4e5a8e',m3:'#2c4a34'},
 cliff:{rk:['#1c1a18','#3e3934','#665e52','#948872','#c4b89a'],cap:['#22401c','#3e6c2a','#70a046','#aad072'],amb:'rgba(150,180,255,.05)',dk:0,sky:['#2a5aa8','#78a6dc','#eac8ae'],m1:'#6a78aa',m2:'#46527e',m3:'#2a3a46'},
 cave:{rk:['#100c18','#261e34','#42365a','#64587e','#9488ac'],cap:['#163028','#28544a','#468a6c','#7cc4a0'],amb:'rgba(110,70,190,.08)',dk:.38,bg:'#0c0812',bg2:'#1a1426',bg3:'#2a2238'},
 ice:{rk:['#18223e','#2c426a','#4a6a9a','#7a9ccc','#b8d6f4'],cap:['#7c9cc8','#bcd4f0','#e8f4ff','#ffffff'],amb:'rgba(170,215,255,.08)',dk:0,sky:['#4a86c8','#a8d4f2','#eef8ff'],m1:'#b4cce8',m2:'#7e9ccc',m3:'#4a6a96'},
 jungle:{rk:['#1a120a','#36280f','#5a4620','#84703a','#b09a5a'],cap:['#0c3418','#1a6426','#36b23a','#8ae650'],amb:'rgba(90,255,150,.06)',dk:0,sky:['#1c6a62','#6ac2a0','#eae4a0'],m1:'#3a7a5c',m2:'#235638',m3:'#123a20'},
 icecave:{rk:['#08122a','#16284e','#2a4880','#4c7cb8','#98c6f0'],cap:['#4c7cb4','#9cc8ee','#dcf2ff','#ffffff'],amb:'rgba(70,150,255,.1)',dk:.32,bg:'#08101e',bg2:'#122244',bg3:'#1e3866'},
 lava:{rk:['#120606','#2a1210','#48201c','#70362a','#9e5a3e'],cap:['#301410','#5e2412','#a2441c','#e48030'],amb:'rgba(255,90,30,.09)',dk:.4,bg:'#1a0a08',bg2:'#2e120e',bg3:'#481c12'},
 storm:{rk:['#10121a','#262a3a','#424a62','#68708e','#9aa2c0'],cap:['#2a3a34','#46584c','#71867a','#b4c4bc'],amb:'rgba(110,150,255,.09)',dk:.18,sky:['#10141f','#283247','#56627c'],m1:'#2c3448',m2:'#1c2232',m3:'#10141e'},
 peak:{rk:['#18142e','#322a52','#544c7c','#8480aa','#bab4d8'],cap:['#a0a8d4','#d4dcf4','#f4f8ff','#ffffff'],amb:'rgba(255,170,120,.07)',dk:0,sky:['#120f36','#56387c','#f29c68'],m1:'#584a7c',m2:'#383060',m3:'#221c40'}};
for(const k in ZP){const z=ZP[k];Object.assign(PAL[k],{rock:z.rk[2],r2:z.rk[1],r3:z.rk[3],top:z.cap[2],top2:z.cap[1]},z);}
function hx(c){return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];}
function mix(a,b,t){const A=hx(a),B=hx(b);return'rgb('+A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')+')';}
const bgCache={};
function getBg(theme){return bgCache[theme]||(bgCache[theme]=genBg(theme));}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function ditherGrad(g,x0,y0,w,h,stops){const cols=stops.map(hx),id=g.createImageData(w,h),d=id.data;for(let y=0;y<h;y++){const t=y/Math.max(1,h-1)*(cols.length-1),i=Math.min(cols.length-2,Math.floor(t)),q=(t-i)*4,b=Math.floor(q);
  for(let x=0;x<w;x++){const lv=Math.min(4,b+((q-b)>BAYER[(y%4)*4+(x%4)]/16?1:0))/4,o=(y*w+x)*4;for(let k=0;k<3;k++)d[o+k]=Math.round(cols[i][k]+(cols[i+1][k]-cols[i][k])*lv);d[o+3]=255;}}g.putImageData(id,x0,y0);}
function ridge(g,W,base,amp,seed,col,hi,snow){const per=x=>x*2*Math.PI/W;let prev=0;for(let x=0;x<W;x++){const h=base+amp*(Math.sin(per(x)*3+seed)*.6+Math.sin(per(x)*7+seed*2)*.25+Math.sin(per(x)*19+seed)*.1)+(hash(x>>1,seed,4)%2);
  g.fillStyle=col;g.fillRect(x,VH-h,1,h);if(hi&&h>prev){g.fillStyle=hi;g.fillRect(x,VH-h,1,2);}if(snow&&h>base+amp*.45){g.fillStyle=snow;g.fillRect(x,VH-h,1,Math.min(14,(h-base-amp*.45)*.8));if(x%3===0){g.fillRect(x,VH-h+Math.min(14,(h-base-amp*.45)*.8),1,hash(x,seed,8)%4);}}prev=h;}}
function shade(c,f){const a=hx(c);return'rgb('+a.map(v=>Math.max(0,Math.min(255,Math.round(v*f))))+')';}
function pine(g,x,y,h,c,c2,snow){for(let k=0;k<h;k++){const w=1+Math.floor(k*.45)+((k%5)<2?0:1);g.fillStyle=c;g.fillRect(x-w,y+k,w*2+1,1);if(c2){g.fillStyle=c2;g.fillRect(x-w,y+k,1,1);}if(snow&&k%5===0){g.fillStyle=snow;g.fillRect(x-w,y+k,w*2,1);}}g.fillStyle=c;g.fillRect(x,y+h,2,4);}
function genBg(theme){const p=PAL[theme],W=VW*2;const [sk,g]=mkC(VW,VH),[far,f]=mkC(W,VH),[mid,m]=mkC(W,VH),[near,n]=mkC(W,VH);
 if(p.bg){ditherGrad(g,0,0,VW,VH,[p.bg,p.bg2,p.bg]);
  // far: rock columns with rim light
  for(let i=0;i<14;i++){const x=hash(i,1,theme.length)%W,w=18+hash(i,2,1)%40;f.fillStyle=p.bg2;f.fillRect(x,0,w,VH);f.fillStyle=p.bg3;f.fillRect(x,0,2,VH);f.fillStyle=p.bg;for(let y=0;y<VH;y+=6+hash(i,y,3)%10)f.fillRect(x+2+hash(i,y,5)%(w-4),y,3+hash(i,y,6)%6,2);}
  // mid: stalactites + stalagmites
  for(let x=0;x<W;x+=3){const h=10+(hash(x>>2,9,1)%26)*(hash(x>>4,4,2)%3?1:2.2),h2=8+(hash(x>>3,7,2)%22);m.fillStyle=p.bg3;for(let k=0;k<h;k++){const w=Math.max(1,3-Math.floor(k/h*3));m.fillRect(x+1-(w>>1),k,w,1);}for(let k=0;k<h2;k++){const w=Math.max(1,3-Math.floor(k/h2*3));m.fillRect(x+1-(w>>1),VH-k,w,1);}}
  if(theme==='lava'){ditherGrad(n,0,VH-70,W,70,['#1a0a08','#5a1a0c','#c8400c']);n.clearRect(0,0,W,VH-70);for(let i=0;i<60;i++){n.fillStyle=i%3?'rgba(255,140,40,.5)':'rgba(255,220,120,.6)';n.fillRect(hash(i,5,5)%W,VH-80+hash(i,6,5)%60,1,2);}
   for(let x=0;x<W;x+=2){const h=20+hash(x>>3,3,3)%40;n.fillStyle='#120606';n.fillRect(x,VH-h,2,h);}}
  if(theme==='icecave')for(let i=0;i<34;i++){const x=hash(i,5,6)%W,y=VH-30-hash(i,7,6)%50,h=10+hash(i,6,6)%26;for(let k=0;k<h;k++){const w=Math.max(1,Math.floor((h-k)/4));n.fillStyle=k%4?'rgba(140,200,255,.35)':'rgba(220,245,255,.5)';n.fillRect(x-(w>>1),y+h-k,w,1);}}
  if(theme==='cave')for(let i=0;i<40;i++){n.fillStyle=i%2?'rgba(160,120,255,.35)':'rgba(120,220,255,.3)';n.fillRect(hash(i,5,9)%W,hash(i,6,9)%VH,1,1);}}
 else{ditherGrad(g,0,0,VW,VH,p.sky);
  if(theme==='peak'){for(let i=0;i<120;i++){g.fillStyle=i%9?'#fff':'#ffd8a0';g.fillRect(hash(i,5,1)%VW,hash(i,6,1)%150,1,1);}g.fillStyle='#fff6d8';for(let y=-12;y<=12;y++){const w=Math.round(Math.sqrt(144-y*y));g.fillRect(380-w,50+y,w*2,1);}g.fillStyle='#e8dcc0';g.fillRect(372,44,5,4);g.fillRect(384,56,6,3);}
  else{g.fillStyle='rgba(255,250,220,.5)';for(let y=-14;y<=14;y++){const w=Math.round(Math.sqrt(196-y*y));g.fillRect(400-w,40+y,w*2,1);}g.fillStyle='#fffbe8';for(let y=-9;y<=9;y++){const w=Math.round(Math.sqrt(81-y*y));g.fillRect(400-w,40+y,w*2,1);}}
  for(let i=0;i<7;i++){const cx=hash(i,7,theme.length)%VW,cy=24+hash(i,8,2)%70,w=30+hash(i,9,2)%40;g.fillStyle='rgba(255,255,255,.7)';g.fillRect(cx,cy,w,5);g.fillRect(cx+6,cy-3,w*.5,3);g.fillStyle='rgba(200,210,240,.6)';g.fillRect(cx+2,cy+5,w-4,2);}
  const snow=theme==='ice'||theme==='peak'||theme==='cliff'||theme==='base'?'#eef4ff':null;
  ridge(f,W,120,52,theme.length,p.m1,shade(p.m1,1.25),snow);
  f.fillStyle='rgba(255,255,255,.08)';f.fillRect(0,VH-70,W,70);
  ridge(m,W,74,30,theme.length+3,p.m2,shade(p.m2,1.3),theme==='ice'||theme==='peak'?'#d8e8ff':null);
  if(theme==='jungle'){for(let i=0;i<40;i++){const x=hash(i,11,4)%W,h=40+hash(i,12,4)%50;m.fillStyle=p.m3;m.fillRect(x,VH-h-40,3,h+40);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;for(let r=0;r<16;r++)m.fillRect(x+Math.round(Math.cos(a)*r),VH-h-40+Math.round(Math.sin(a)*r*.5+r*r*.03),2,2);}}
   for(let i=0;i<30;i++){const x=hash(i,14,2)%W;n.fillStyle='#0a2a14';const L=30+hash(i,15,2)%70;for(let k=0;k<L;k++)n.fillRect(x+Math.round(Math.sin(k*.15+i)*2),k,2,1);n.fillStyle='#145a24';n.fillRect(x-3,L-4,8,4);}}
  else if(theme!=='peak'){for(let i=0;i<70;i++){const x=hash(i,11,1)%W,h=14+hash(i,12,1)%18;pine(n,x,VH-36-h-(hash(i,13,1)%24),h,p.m3,shade(p.m3,1.4),theme==='ice'||theme==='cliff'?'#dfe9f8':null);}n.fillStyle=p.m3;n.fillRect(0,VH-40,W,40);}
  else{for(let i=0;i<24;i++){const x=hash(i,4,4)%W,y=VH-40-hash(i,5,4)%40;n.fillStyle='rgba(220,200,240,.35)';n.fillRect(x,y,60,8);n.fillRect(x+10,y-4,30,4);}}}
 return {sk,far,mid,near};}
const BGK=[['far',.12,60],['mid',.25,90],['near',.42,120]];
function drawBg(theme,still){const b=getBg(theme),ox=(P&&!still)?P.x:stateT*8;ctx.drawImage(b.sk,0,0);
 for(const [key,k,off] of BGK){if(lowFx&&key!=='near')continue;const c=b[key];if(!c)continue;const o=-((ox*k+off)%VW);ctx.drawImage(c,o,0);}}
const isRock=c=>c==='#'||c==='C'||c==='h';
function tileArt(g,c,X,Y,p,x,y){
  if(c==='#'||c==='C'){g.fillStyle=c==='C'?p.r3:p.rock;g.fillRect(X,Y,16,16);
   for(let i=0;i<7;i++){const h=hash(x,y,i);g.fillStyle=(h&1)?p.r2:p.r3;if(c==='C'&&(h&1)===0)g.fillStyle=p.rock;g.fillRect(X+(h>>3)%14,Y+(h>>9)%14,2+((h>>4)&1),2);}
   if(c==='C'){g.fillStyle='#2a2018';let cx=X+4+hash(x,y,9)%6;for(let k=0;k<16;k++){g.fillRect(cx,Y+k,1,1);if(k%3===0)cx+=(hash(x,y,k)%3)-1;}g.fillRect(X+2,Y+8,6,1);g.fillRect(X+9,Y+5,5,1);}
  }
  else if(c==='V'){g.fillStyle='rgba(20,40,10,.5)';g.fillRect(X,Y,16,16);for(let s=0;s<4;s++){let vx=X+2+s*4;for(let k=0;k<16;k++){g.fillStyle=(k+s)%5?'#4a8a2a':'#2a5a1a';g.fillRect(vx,Y+k,2,1);if((k+s)%4===0)vx+=((s+k)&2)?1:-1;if((k*3+s)%7===0){g.fillStyle='#7ac04a';g.fillRect(vx-2,Y+k,2,2);}}}g.fillStyle='#a08040';g.fillRect(X+5,Y+3,2,2);g.fillRect(X+11,Y+11,2,2);}
  else if(c==='D'){g.fillStyle='#8a8a96';g.fillRect(X,Y,16,16);g.fillStyle='#5a5a66';g.fillRect(X,Y+7,16,1);g.fillRect(X+(x%2?4:10),Y,1,7);g.fillRect(X+(x%2?10:4),Y+8,1,8);g.fillStyle='#b0b0bc';g.fillRect(X,Y,16,1);g.fillStyle='#d06030';g.fillRect(X+7,Y+11,2,2);}
  else if(c==='G'){g.fillStyle='rgba(0,0,0,.25)';g.fillRect(X,Y,16,16);g.fillStyle='#8a5a2a';for(const b of[1,7,12])g.fillRect(X+b,Y,3,16);g.fillStyle='#5a3a1a';g.fillRect(X,Y+6,16,2);g.fillStyle='#b07a40';for(const b of[1,7,12])g.fillRect(X+b,Y,1,16);}
  else if(c==='S'||c==='s'){g.fillStyle=p.rock;g.fillRect(X,Y,16,16);g.fillStyle='#3a3040';g.fillRect(X+3,Y+3,10,10);g.fillStyle=c==='S'?'#d03030':'#40d060';g.fillRect(X+4,Y+5,8,6);g.fillRect(X+5,Y+4,6,8);g.fillStyle='#fff';g.fillRect(X+6,Y+6,2,2);}
  else if(c==='B'){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(X,Y,16,16);g.fillStyle='#e8e0c8';for(const b of[2,7,12])g.fillRect(X+b,Y,3,16);g.fillStyle='#a89c80';for(const b of[2,7,12])g.fillRect(X+b+2,Y,1,16);}
  else if(c==='='){g.fillStyle='#8a5a30';g.fillRect(X,Y,16,5);g.fillStyle='#c08a50';g.fillRect(X,Y,16,1);g.fillStyle='#5a3418';g.fillRect(X,Y+4,16,1);g.fillRect(X+3,Y+5,2,3);g.fillRect(X+11,Y+5,2,3);}
  else if(c==='E'){g.fillStyle='#3a2a5a';g.fillRect(X,Y,16,16);g.fillStyle='#6a4aa0';g.fillRect(X+2,Y,12,16);g.fillStyle='#c8f';if(x%3===0)g.fillRect(X+6,Y+5,4,6);g.fillStyle='#8a6ac8';g.fillRect(X+2,Y,1,16);}
  else if(c==='h'){g.fillStyle='#3a2020';g.fillRect(X,Y,16,16);for(let i=0;i<5;i++){const h=hash(x,y,i);g.fillStyle=(h&1)?'#f60':'#a30';g.fillRect(X+(h>>3)%13,Y+(h>>9)%13,3,1);}}
  else if(c==='o'){g.fillStyle='#5a4a3a';g.fillRect(X+7,Y,2,4);g.fillStyle='#c8a8ff';g.fillRect(X+4,Y+4,8,2);g.fillRect(X+4,Y+10,8,2);g.fillRect(X+3,Y+5,2,6);g.fillRect(X+11,Y+5,2,6);}
  else if(c==='^'){for(let i=0;i<4;i++)for(let r=0;r<8;r++){const w=1+(r>>1);g.fillStyle=r<2?'#fff':'#c8c0b0';g.fillRect(X+i*4+2-(w>>1),Y+8+r,w,1);}g.fillStyle='#6a5a4a';g.fillRect(X,Y+15,16,1);}
}
const STONES=[[[0,0,9,6],[9,0,7,7],[0,6,6,10],[6,6,10,5],[6,11,10,5]],[[0,0,6,8],[6,0,10,5],[6,5,5,6],[11,5,5,11],[0,8,6,8],[6,11,5,5]],[[0,0,16,5],[0,5,8,6],[8,5,8,6],[0,11,11,5],[11,11,5,5]],[[0,0,7,7],[7,0,9,9],[0,7,7,9],[7,9,9,7]]];
function rockArt(g,X,Y,p,m,v){const k=p.rk;g.fillStyle=k[1];g.fillRect(X,Y,16,16);
 for(const [x,y,w,h] of STONES[v%4]){g.fillStyle=k[2];g.fillRect(X+x+1,Y+y+1,w-1,h-1);g.fillStyle=k[3];g.fillRect(X+x+1,Y+y+1,w-2,1);g.fillRect(X+x+1,Y+y+1,1,h-2);g.fillStyle=k[1];g.fillRect(X+x+2,Y+y+h-1,w-2,1);
  const hh=hash(x+v*7,y,v);g.fillStyle=k[(hh&1)?3:1];g.fillRect(X+x+2+hh%Math.max(1,w-3),Y+y+2+(hh>>5)%Math.max(1,h-3),1,1);}
 g.fillStyle=k[0];for(let i=0;i<3;i++){const hh=hash(v,i,77);g.fillRect(X+hh%15,Y+(hh>>6)%15,1,1);}
 const N=m&1,E=m&2,S_=m&4,W=m&8;
 if(N){g.fillStyle=k[0];g.fillRect(X,Y,16,1);g.fillStyle=k[4];g.fillRect(X,Y+1,16,1);g.fillStyle=k[3];g.fillRect(X,Y+2,16,1);}
 if(S_){g.fillStyle=k[1];g.fillRect(X,Y+13,16,2);g.fillStyle=k[0];g.fillRect(X,Y+15,16,1);}
 if(W){g.fillStyle=k[0];g.fillRect(X,Y,1,16);g.fillStyle=k[3];g.fillRect(X+1,Y+(N?1:0),1,16-(N?1:0)-(S_?1:0));}
 if(E){g.fillStyle=k[1];g.fillRect(X+14,Y,1,16);g.fillStyle=k[0];g.fillRect(X+15,Y,1,16);}
 const cut=(x,y)=>g.clearRect(X+x,Y+y,1,1),px=(x,y,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,1,1);};
 if(N&&W){cut(0,0);cut(1,0);cut(0,1);px(1,1,k[0]);px(2,1,k[0]);px(1,2,k[0]);}
 if(N&&E){cut(15,0);cut(14,0);cut(15,1);px(14,1,k[0]);px(13,1,k[0]);px(14,2,k[0]);}
 if(S_&&W){cut(0,15);cut(1,15);cut(0,14);px(1,14,k[0]);px(1,13,k[0]);px(2,14,k[0]);}
 if(S_&&E){cut(15,15);cut(14,15);cut(15,14);px(14,14,k[0]);px(14,13,k[0]);px(13,14,k[0]);}}
function capArt(g,X,Y,p,v,th){const c=p.cap,snow=th==='ice'||th==='peak'||th==='icecave';
 g.fillStyle=c[0];g.fillRect(X,Y,16,5);g.fillStyle=c[1];g.fillRect(X,Y,16,4);g.fillStyle=c[2];g.fillRect(X,Y,16,2);g.fillStyle=c[3];
 for(let i=0;i<16;i+=3+(hash(i,v,5)%3))g.fillRect(X+i,Y,2,1);
 for(let i=0;i<16;i++){const d=hash(i,v,9)%(snow?5:4);if(d>1){g.fillStyle=c[1];g.fillRect(X+i,Y+4,1,d);g.fillStyle=c[0];g.fillRect(X+i,Y+4+d,1,1);}}
 if(th==='lava'){g.fillStyle='#ff7a20';for(let i=0;i<3;i++)g.fillRect(X+hash(i,v,3)%15,Y+2,1,1);}}
function tuftArt(g,X,Y,p,v,th){const c=p.cap;if(th==='lava')return;for(let i=0;i<16;i++){const h=hash(i,v,13)%5;if(h<2)continue;const hh=th==='ice'||th==='peak'||th==='icecave'?Math.min(2,h-2):h-1;
 g.fillStyle=(i+v)%3?c[2]:c[3];g.fillRect(X+i,Y+16-hh,1,hh);}}
const PROPS={};
function propArt(){const D={
 bone:["................","................","................","................","................","................","................","................","................","................","................","..ww........ww..","..wWwwwwwwwwWw..","...wWWWWWWWWw...","..ww........ww..","................"],
 skull:["................","................","................","................","................","................","................","................","................",".....wwwwww.....","....wwwwwwww....","....wkkwwkkw....","....wkkwwkkW....","....WwwkkwwW....",".....wWwwWw.....",".....w.ww.w....."],
 mush:["................","................","................","................","................","................","................",".....rrrrrr.....","....rrwrrrrr....","...rrrrrrwrrr...","...RRRRRRRRRR...","......ssss......","......sSss......","......sSss......",".....ssSsss.....","................"],
 glow:["................","................","................","................","................","................","................","................","..........bb....","....bbb..bBBb...","...bBBBb.bBBb...","...bbbbb..ll....","....l.l...l.....","....l.l...l.....","....l..l..l.....","................"],
 crys:["................","................","................","................",".......c........","......cC........","......cCc...c...","..c...cCc..cC...","..Cc..cCc..cCc..","..CcccCCc..cCc..","..CCcCCCcccCCc..","...CCCCCCCCCCc..","...dCCCCCCCCdd..","....dddddddd....","................","................"],
 fern:["................","................","................","................","................","................","........f.......","..f....fF...f...","...ff..fF..ff...","....fF.fF.fF....","..f..fFfFfF..f..","...ffffFfFfff...","......fFfF......","....ffffFfff....",".......FF.......","................"],
 flower:["................","................","................","................","................","................","................","................","..........y.....",".....y...yoy....","....yoy...y.....",".....y....f.....",".....f...ff.....","....ff...f......",".....f..f.......","................"],
 pebble:["................","................","................","................","................","................","................","................","................","................","................","................",".......aa.......","..aa..aAAa......",".aAAa.aAAAa..aa.","................"],
 stal:["ssssssssssssssss",".sSSSSsss.sSSs..",".sSSSs.....sSs..","..sSs......sSs..","..sSs.......s...","...s........s...","...s............","................","................","................","................","................","................","................","................","................"],
 vine:["..ffff.....fff..","...fF.......f...","...fF.......fF..","..fF........f...","..fF.........f..","...fF.......ff..","...f........f...","..fF............","..f.............","...f............","................","................","................","................","................","................"],
 icicle:["cccccccccccccccc",".cCCc..cCCCc.cc.",".cCc....cCc..c..","..c.....cCc.....","..c......c......","..........c.....","................","................","................","................","................","................","................","................","................","................"],
 paint0:["................","..o.............",".ooo.......o....","..o.......ooo...",".o.o.......o....","...........o....","..........o.o...","................","....ooooooo.....","...ooooooooo....","..oooooooooo.o..","..o.o...o.o.....","..o.o...o.o.....","................","................","................"],
 paint1:["................","................","..r....r........",".rrr..rrr...r...",".rrr..rrr..rrr..","..r....r...rrr..","............r...","................","................","................","................","................","................","................","................","................"],
 ember:["................","................","................","................","................","................","................","................","................","........o.......",".......oy.......","......oyyo......",".....aoyya......","....aaayaaa.....","...aaaaaaaaa....","................"]};
 const pal={w:'#e8e0c8',W:'#a89c80',k:'#2a2018',r:'#d03a30',R:'#8a1a20',s:'#e8dcc0',S:'#b0a080',b:'#7ad8ff',B:'#e0fbff',l:'#3a6a8a',c:'#a8e0ff',C:'#5aa0e8',d:'#2a4a7a',f:'#3a9a3a',F:'#1e5a24',y:'#ffe060',o:'#c8783a',a:'#6a5a4a',A:'#4a3e34'};
 const names=Object.keys(D),[c,g]=mkC(names.length*16,16);
 names.forEach((n,i)=>{const pl=Object.assign({},pal);if(n==='paint0'||n==='paint1')pl.o=pl.r='rgba(200,100,50,.55)';if(n==='ember'){pl.a='#3a2420';pl.o='#ff6a20';}
  D[n].forEach((r,y)=>{for(let x=0;x<16;x++)if(r[x]!=='.'){g.fillStyle=pl[r[x]];g.fillRect(i*16+x,y,1,1);}});PROPS[n]=i*16;});
 return {img:c,frames:Object.fromEntries(names.map((n,i)=>[n,[i*16,0,16,16]]))};}
const PROPSET={base:['bone','fern','flower','pebble','mush'],cliff:['pebble','bone','fern','flower'],jungle:['fern','fern','flower','mush','bone'],cave:['mush','glow','bone','skull','crys','pebble'],
 ice:['pebble','bone','crys'],icecave:['crys','crys','skull','pebble'],lava:['skull','bone','ember','pebble'],peak:['pebble','bone','crys']};
const HANG={jungle:'vine',cave:'stal',icecave:'icicle',lava:'stal',base:'vine'};
const TCHARS=['#','C','V','D','G','S','s','B','=','^','E','h','o','T','X','U'].concat(Array.from({length:16},(_,i)=>'R'+i)),TVAR=4;
function crackArt(g,X,Y,v){g.fillStyle='rgba(10,6,4,.85)';let cx=X+4+hash(v,1,9)%6;for(let k=0;k<16;k++){g.fillRect(cx,Y+k,1,1);if(k%3===0)cx+=(hash(v,k,9)%3)-1;}g.fillRect(X+2,Y+8,6,1);g.fillRect(X+9,Y+5,5,1);g.fillStyle='rgba(255,230,180,.35)';g.fillRect(X+3,Y+9,5,1);g.fillRect(X+10,Y+6,4,1);}
function topArt(g,X,Y,p,x,y){g.fillStyle=p.top;g.fillRect(X,Y,16,3);g.fillStyle=p.top2;for(let i=0;i<4;i++)g.fillRect(X+i*4+(hash(x,y,i)%2),Y+3,2,1+hash(x,y,i+5)%3);}
function bakeTiles(){const th=Object.keys(PAL),[c,g]=mkC(TCHARS.length*TVAR*TS,th.length*TS);
 th.forEach((t,r)=>TCHARS.forEach((ch,ci)=>{for(let v=0;v<TVAR;v++){const X=(ci*TVAR+v)*TS,Y=r*TS;if(ch==='T')capArt(g,X,Y,PAL[t],v,t);else if(ch==='U')tuftArt(g,X,Y,PAL[t],v,t);else if(ch==='X')crackArt(g,X,Y,v);else if(ch[0]==='R')rockArt(g,X,Y,PAL[t],+ch.slice(1),v);else tileArt(g,ch,X,Y,PAL[t],v*13+3,r+7);}}));
 return {img:c,themes:th,chars:TCHARS,variants:TVAR,size:TS};}
function tileCell(g,ch,th,v,X,Y){const T=ART.tiles,r=T.themes.indexOf(th),ci=T.chars.indexOf(ch);if(r<0||ci<0)return;g.drawImage(T.img,(ci*T.variants+v)*T.size,r*T.size,T.size,T.size,X,Y,TS,TS);}
function renderTiles(){const g=tctx,p=PAL[cur.theme],th=cur.theme;g.clearRect(0,0,VW,VH);cur.lights=[];
 const rk=c=>c==='#'||c==='C'||c==='h'||c==='S'||c==='s',occ={};for(const e of ents)occ[Math.floor(e.x/TS)+','+Math.floor((e.y+8)/TS)]=1;
 const P_=ART.props;let paints=0;
 for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const c=cur.g[y][x],X=x*TS,Y=y*TS;const v=hash(x,y,0)%TVAR;
  if(c==='.'){const below=cur.g[y+1]&&cur.g[y+1][x],above=y>0&&cur.g[y-1][x],h=hash(x,y,21);
   if(P_&&below==='#'&&!occ[x+','+y]&&h%100<26){const list=PROPSET[th]||PROPSET.base,n=list[(h>>>8)%list.length],f=P_.frames[n];g.drawImage(P_.img,f[0],0,16,16,X,Y,16,16);if(n==='glow'||n==='crys')cur.lights.push({x:X+8,y:Y+12,r:26,c:n==='glow'?'#60c8ff':(th==='cave'?'#b080ff':'#80c8ff')});if(n==='ember')cur.lights.push({x:X+8,y:Y+12,r:22,c:'#ff7020'});}
   else if(P_&&above==='#'&&HANG[th]&&h%100<30){const f=P_.frames[HANG[th]];g.drawImage(P_.img,f[0],0,16,16,X+((h>>4)%5)-2,Y,16,16);}
   else if(P_&&(cur.dark||th==='cave')&&paints<2&&y>3&&y<12&&h%100<4&&cur.g[y][x+1]==='.'&&cur.g[y+1][x]==='.'){const f=P_.frames[paints?'paint1':'paint0'];g.drawImage(P_.img,f[0],0,16,16,X,Y,16,16);paints++;}
   continue;}
  if(c==='~'||c==='L')continue;
  if(c==='#'||c==='C'||c==='h'){const o=(a,b)=>!rk(tileAt(a,b))&&tileAt(a,b)!=='.'?0:!rk(tileAt(a,b));
   const m=(o(x,y-1)?1:0)|(o(x+1,y)?2:0)|(o(x,y+1)?4:0)|(o(x-1,y)?8:0);
   if(c==='h')tileCell(g,'h',th,v,X,Y);else tileCell(g,'R'+m,th,v,X,Y);
   if(c==='C')tileCell(g,'X',th,v,X,Y);
   const k=p.rk;if(!(m&1)&&!(m&8)&&!rk(tileAt(x-1,y-1))){g.fillStyle=k[0];g.fillRect(X,Y,1,1);}if(!(m&1)&&!(m&2)&&!rk(tileAt(x+1,y-1))){g.fillStyle=k[0];g.fillRect(X+15,Y,1,1);}
   if((m&1)&&c!=='h'){const up=tileAt(x,y-1);if(up!=='='&&!solidP(up)){tileCell(g,'T',th,v,X,Y);if(y>0)tileCell(g,'U',th,v,X,Y-TS);}}}
  else tileCell(g,c,th,v,X,Y);
  if(c==='h')cur.lights.push({x:X+8,y:Y+8,r:20,c:'#ff5010'});}
 cur.lava=[];for(let y=0;y<RH;y++)for(let x=0;x<RW;x+=2)if(cur.g[y][x]==='L'&&cur.g[y-1]&&cur.g[y-1][x]!=='L')cur.lava.push({x:x*TS+16,y:y*TS+4,r:44,c:'#ff6018'});
 tileDirty=false;}
function spr(rows,pal){const [c,g]=mkC(16,rows.length);rows.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]!=='.'){g.fillStyle=pal[r[x]];g.fillRect(x,y,1,1);}});return c;}
const BODY=["....hhhhhhh.....","..hhhhhhhhhhh...",".hhhhhhhhhhhhh..",".hhhhhhsssssh...",".hhhhhsssskss...",".hhhhhssssssss..",".hhhhhhsssSss...","..hhhhhhwwwhh...","..hhhhhhhhhhh...","...hhhhhhhhh....","...ssffffffss...","..sssfFffFfsss..","..ss.ffffff.ss..","..ss.fFffff.ss..","..ss.ffffFf.ss..","..S..FfffffF.S..",".....fFfffFf....",".....FffffffF..."];
const LEGS={idle:[".....ss..ss.....",".....ss..ss.....",".....ss..ss.....",".....ss..ss.....","....FFF..FFF....","....FFF..FFF...."],
 walk:[".....ss...ss....","....ss.....ss...","....ss.....ss...","...ss.......ss..","...ss.......ss..","..FFF.......FFF."],
 jump:[".....ss..ss.....","....ss....ss....","....ss....ss....","...FFF....FFF...","................","................"]};
const GP={h:'#3a2212',s:'#e2a26a',S:'#b0703c',k:'#140808',w:'#f4ecd8',f:'#b06a2a',F:'#6e3a16'};
const EP={h:'#8a6a4a',s:'#f0c090',S:'#c89060',k:'#2040a0',w:'#ffffff',f:'#f4f0ff',F:'#c8c0f0'};
const HP_={h:'#3a2212',s:'#ff8a7a',S:'#d05a4a',k:'#ffffff',w:'#f4ecd8',f:'#d07a4a',F:'#8e4a26'};
const BODY_NA=BODY.map((r,y)=>y>=11&&y<=15?r.split('').map((c,x)=>(x<4||x>11)&&(c==='s'||c==='S')?'.':c).join(''):r);
function bakeGruk(){const F={},list=[];
 const add=(name,pal,o)=>list.push([name,pal,o]);
 const run6=i=>{const ph=i/6*Math.PI*2,a=Math.round(2.5*Math.sin(ph));return{legs:[[5+a,Math.cos(ph)>.3?1:0],[9-a,Math.cos(ph)<-.3?1:0]],bob:(i%3===1)?1:0,arms:'swingA'+(Math.sin(ph)>0?1:0)};};
 add('idle0',GP,{legs:[[5,0],[9,0]],arms:'down'});add('idle1',GP,{legs:[[5,0],[9,0]],arms:'down',bob:1});
 for(let i=0;i<6;i++)add('run'+i,GP,run6(i));
 add('jump0',GP,{legs:'tuck',arms:'up2'});add('fall0',GP,{legs:'spread',arms:'out'});
 add('climb0',GP,{legs:[[5,2],[9,0]],arms:'climbA'});add('climb1',GP,{legs:[[5,0],[9,2]],arms:'climbB'});
 add('club0',GP,{legs:[[4,0],[10,0]],arms:'back'});add('club1',GP,{legs:[[4,0],[10,0]],arms:'fwd'});add('club2',GP,{legs:[[4,0],[10,0]],arms:'swing'});
 add('throw0',GP,{legs:[[5,0],[9,0]],arms:'back'});add('throw1',GP,{legs:[[4,0],[10,0]],arms:'fwd'});
 add('hang0',GP,{legs:'dangle',arms:'up'});add('hang1',GP,{legs:'dangle2',arms:'up'});
 add('hurt0',HP_,{legs:'spread',arms:'out'});
 for(let i=0;i<4;i++)add('roll'+i,GP,{roll:i});
 add('eidle0',EP,{legs:[[5,0],[9,0]],arms:'down'});add('eidle1',EP,{legs:[[5,0],[9,0]],arms:'down',bob:1});
 for(let i=0;i<6;i++)add('erun'+i,EP,run6(i));
 const [c,g]=mkC(list.length*16,24);
 list.forEach(([name,pal,o],i)=>{const ox=i*16;F[name]=[ox,0,16,24];const R=(x,y,w,h,k)=>{g.fillStyle=pal[k];g.fillRect(ox+x,y,w,h);};
  if(o.roll!==undefined){const a0=o.roll*Math.PI/2;for(let y=0;y<15;y++)for(let x=0;x<15;x++){const dx=x-7,dy=y-7,d=Math.hypot(dx,dy);if(d>7.2)continue;let an=Math.atan2(dy,dx)-a0;an=Math.atan2(Math.sin(an),Math.cos(an));
    g.fillStyle=pal[d>6?'F':Math.abs(an)<.8?'h':Math.abs(Math.abs(an)-Math.PI)<.6&&d<5?'s':'f'];g.fillRect(ox+x+1,y+9,1,1);}return;}
  const by=o.bob||0;
  // legs
  if(o.legs==='tuck'){R(5,18,2,2,'s');R(9,17,2,2,'s');R(5,20,3,2,'F');R(9,19,3,2,'F');}
  else if(o.legs==='spread'){R(4,18,2,4,'s');R(10,18,2,4,'s');R(3,22,3,2,'F');R(10,22,3,2,'F');}
  else if(o.legs==='dangle'){R(6,18,2,4,'s');R(9,18,2,4,'s');R(6,22,2,2,'F');R(9,22,2,2,'F');}
  else if(o.legs==='dangle2'){R(5,18,2,4,'s');R(9,18,2,3,'s');R(5,22,2,2,'F');R(9,21,3,2,'F');}
  else for(const [x,l] of o.legs){R(x,18,2,4-l,'s');R(x,22-l,3,2,'F');}
  // body without arms
  BODY_NA.forEach((r,y)=>{for(let x=0;x<16;x++)if(r[x]!=='.'){g.fillStyle=pal[r[x]];g.fillRect(ox+x,y+by,1,1);}});
  const A={down:()=>{R(2,11+by,2,4,'s');R(12,11+by,2,4,'s');R(2,15+by,1,1,'S');R(13,15+by,1,1,'S');},
   swingA0:()=>{R(2,11+by,2,3,'s');R(1,14+by,2,1,'S');R(12,11+by,2,4,'s');R(13,15+by,1,1,'S');},
   swingA1:()=>{R(2,11+by,2,4,'s');R(2,15+by,1,1,'S');R(12,11+by,2,3,'s');R(13,14+by,2,1,'S');},
   up:()=>{R(2,3,2,8,'s');R(12,3,2,8,'s');R(2,2,2,1,'S');R(12,2,2,1,'S');},
   up2:()=>{R(1,7,2,5,'s');R(13,7,2,5,'s');R(1,6,2,1,'S');R(13,6,2,1,'S');},
   out:()=>{R(0,11,3,2,'s');R(13,11,3,2,'s');},
   climbA:()=>{R(12,3,2,8,'s');R(12,2,2,1,'S');R(2,11,2,4,'s');},climbB:()=>{R(12,7,2,5,'s');R(12,6,2,1,'S');R(2,6,2,6,'s');R(2,5,2,1,'S');},
   back:()=>{R(2,11,2,4,'s');R(11,4,2,7,'s');R(11,3,2,1,'S');},fwd:()=>{R(2,11,2,4,'s');R(12,11,4,2,'s');R(15,11,1,2,'S');},swing:()=>{R(2,11,2,4,'s');R(12,12,3,2,'s');R(14,14,2,2,'S');}};
  A[o.arms]();});
 const anims={idle:{frames:['idle0','idle1'],fps:2,loop:true},run:{frames:['run0','run1','run2','run3','run4','run5'],fps:12,loop:true},jump:{frames:['jump0'],fps:1,loop:true},fall:{frames:['fall0'],fps:1,loop:true},
  climb:{frames:['climb0','climb1'],fps:6,loop:true},club:{frames:['club0','club1','club2'],fps:18,loop:false},throw:{frames:['throw0','throw1'],fps:11,loop:false},
  roll:{frames:['roll0','roll1','roll2','roll3'],fps:16,loop:true},hang:{frames:['hang0','hang1'],fps:3,loop:true},hurt:{frames:['hurt0'],fps:1,loop:true},
  eidle:{frames:['eidle0','eidle1'],fps:2,loop:true},erun:{frames:['erun0','erun1','erun2','erun3','erun4','erun5'],fps:12,loop:true}};
 return {img:c,frames:F,anims};}
function bakeEnts(){const F={},defs=[];const add=(n,fn)=>defs.push([n,fn]);
 const walker=k=>(r)=>{const c='#7a4a32';r(1,3,11,7,c);r(10,4,4,5,c);r(3,1,8,2,'#3a2214');r(13,7,2,1,'#fff');r(11,5,1,1,'#f22');r(2,10+(k?0:-1),2,2,'#3a2214');r(9,10+(k?-1:0),2,2,'#3a2214');r(4,4,5,1,'#9a6a4a');};
 add('walker0',walker(1));add('walker1',walker(0));
 const bat=up=>r=>{const c='#4a3a5a';r(4,2,4,5,c);if(up){r(0,0,4,3,c);r(8,0,4,3,c);}else{r(0,4,4,3,c);r(8,4,4,3,c);}r(4,3,1,1,'#f33');r(7,3,1,1,'#f33');};
 add('bat0',bat(1));add('bat1',bat(0));
 const fish=k=>r=>{const c='#5a8ab0';r(2,1,8,6,c);r(0,2+k,3,4,c);r(9,3,3,3,'#e0f0ff');r(8,2,1,1,'#f22');r(3,2,5,1,'#8ab8e0');};add('fish0',fish(0));add('fish1',fish(1));
 add('heart',r=>{const c='#ff4060';r(1,0,3,2,c);r(5,0,3,2,c);r(0,1,9,3,c);r(1,4,7,1,c);r(2,5,5,1,c);r(3,6,3,1,c);r(4,7,1,1,c);r(1,1,2,1,'#ffb0b8');});
 add('scroll',r=>{r(2,2,8,9,'#f0e0b0');r(1,1,10,2,'#8a5a2a');r(1,10,10,2,'#8a5a2a');r(4,5,4,1,'#6a4a2a');r(4,7,3,1,'#6a4a2a');});
 add('meat',r=>{r(2,1,6,5,'#c04030');r(0,3,3,2,'#f0e0c0');r(8,2,2,3,'#f0e0c0');});
 add('sign',r=>{r(7,6,2,10,'#5a3418');r(1,1,14,8,'#9a6a3a');r(3,3,10,1,'#5a3418');r(3,6,7,1,'#5a3418');});
 const spit=o=>r=>{r(7,8,2,8,'#2a6a2a');r(4,12,3,2,'#3a8a3a');r(9,10,3,2,'#3a8a3a');r(3,1,10,8,'#a03a6a');r(4,0,8,1,'#c05a8a');r(11,3,3,o?4:2,o?'#200':'#a03a6a');r(5,2,2,2,'#ff0');r(5,6,6,1,'#f0e0a0');};add('spitter0',spit(0));add('spitter1',spit(1));
 const hop=k=>r=>{r(2,4-k,12,10+k,'#e05010');r(4,2-k,8,2,'#ff8020');r(4,6,2,2,'#fff');r(10,6,2,2,'#fff');r(5,7,1,1,'#000');r(11,7,1,1,'#000');r(3,12,10,2,'#a02000');};add('hopper0',hop(0));add('hopper1',hop(1));
 add('icicle',r=>{r(4,0,8,3,'#e0f4ff');r(5,3,6,4,'#c0e0ff');r(6,7,4,4,'#a8d0f8');r(7,11,2,4,'#90c0f0');r(5,1,2,8,'#fff');});
 add('relic',r=>{r(7,6,3,10,'#c08a20');r(5,0,7,7,'#ffd040');r(6,1,3,3,'#fff6b0');r(4,3,1,3,'#a87010');r(12,2,1,4,'#a87010');});
 const [c,g]=mkC(defs.length*16,16);defs.forEach(([n,fn],i)=>{F[n]=[i*16,0,16,16];fn((x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(i*16+x,y,w,h);});});
 return {img:c,frames:F};}
function postShadeCells(c){postShade(c,false);}
function postShade(c,ol){const g=c.getContext('2d'),W=c.width,H=c.height,id=g.getImageData(0,0,W,H),d=id.data,src=new Uint8ClampedArray(d),A=(x,y)=>x<0||y<0||x>=W||y>=H?0:src[(y*W+x)*4+3];
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const o=(y*W+x)*4;if(src[o+3]){let f=1;if(!A(x,y-1))f=1.28;else if(!A(x,y+1))f=.72;else if(!A(x+1,y))f=.85;for(let k=0;k<3;k++)d[o+k]=Math.min(255,src[o+k]*f+(f>1?10:0));}
  else if(ol&&(A(x-1,y)||A(x+1,y)||A(x,y-1)||A(x,y+1))){d[o]=18;d[o+1]=10;d[o+2]=14;d[o+3]=255;}}g.putImageData(id,0,0);return c;}
function tint(img,col){const [c,g]=mkC(img.width,img.height);g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);return c;}
const BPAD=48;
function crocArt(g,f){const W=72,X=BPAD,Y=6,r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,w,h);},b='#4a7a3a',d='#2e5a28',hl='#7aaa52',bel='#c0d08a',dk='#1c3a1a';
 const a=f.a||0,open=f.open,tw=f.tail||0,eye=f.glow?'#ff4020':'#ffe040';
 r(-10+tw,10,22,7,d);r(-18+tw*1.5,12,12,5,d);r(-24+tw*2,14,8,3,dk);for(let i=0;i<4;i++)r(-14+tw*1.4+i*6,8,3,2,dk);
 r(10,2,40,18,b);r(12,0,34,4,d);for(let i=0;i<6;i++){r(14+i*6,-2,3,3,dk);r(15+i*6,-2,1,1,hl);}r(12,4,36,2,hl);
 r(14,20+a,7,6,d);r(13,25+a,9,2,dk);r(40,20-a,7,6,d);r(39,25-a,9,2,dk);
 r(48,open?-3:4,24,7,b);r(48,open?-3:4,24,2,hl);r(66,open?-4:3,4,2,d);r(48,12,24,6,b);r(48,17,24,1,bel);
 if(open){r(50,4,22,8,'#5a1418');r(54,6,16,4,'#8a2028');}
 r(52,open?-6:1,6,4,'#d0e0a0');r(54,open?-5:2,3,3,eye);r(55,open?-4:3,1,1,'#000');
 for(let i=0;i<6;i++){r(53+i*3,open?4:10,2,2,'#fffbe8');if(open)r(54+i*3,10,2,2,'#fffbe8');}
 r(16,14,30,4,bel);for(let i=0;i<5;i++)r(18+i*6,15,1,3,'#90a060');}
function mammArt(g,f){const X=BPAD,Y=6,r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,w,h);},fu='#7c8cae',d='#56627e',dk='#3a4460',hl='#a8b8d8',ic='#d8f0ff',tu='#fffbe8';
 const a=f.a||0,up=f.rear?-4:0,low=f.charge?3:0,eye=f.glow?'#ff3020':'#ff8060';
 r(8,28+a,7,12,d);r(30,28-a,7,12,d);r(18,28-a+(f.rear?-3:0),7,12+(f.rear?3:0),fu);r(40,28+a+up,7,12-up,fu);r(7,38+a,9,2,dk);r(39,38+a,9,2,dk);
 r(6,6,38,24,d);r(4,10,42,18,fu);r(8,4,30,4,fu);r(10,6,20,2,ic);for(let i=0;i<6;i++)r(9+i*6,1+(i%2),2,5,ic);for(let i=0;i<7;i++)r(8+i*5,12+(i%3)*4,1,6,hl);for(let i=0;i<8;i++)r(6+i*5,26,2,4,dk);
 r(38,8+up+low,14,16,fu);r(40,6+up+low,10,4,fu);r(41,6+up+low,8,1,hl);r(46,12+up+low,3,2,eye);
 if(f.rear){r(50,4,5,6,fu);r(52,-2,4,7,fu);r(53,-4,3,3,d);}else{r(50,18+low,5,6,fu);r(52,24+low,4,8,fu);r(50,31+low,4,3,d);}
 r(42,24+up+low,10,2,tu);r(50,21+up+low,3,3,tu);r(51,22+up+low,2,1,'#c8c0a0');r(6,18,8,2,d);r(14,24,26,2,d);}
function golemArt(g,f){const X=BPAD,Y=8,r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,w,h);},c='#4a3a36',c2='#2e2422',c3='#6a544c',gl=f.hot?'#ffe060':'#ff8a20',core=f.hot?'#fff6c0':'#ffb030';
 r(8,30,14,14,c2);r(42,30,14,14,c2);r(6,42,18,2,'#1a1210');r(40,42,18,2,'#1a1210');
 r(6,6,52,28,c);r(6,6,52,2,c3);r(18,-4,28,14,c);r(18,-4,28,2,c3);
 const la=f.armL||0,ra=f.armR||0;r(-4,8-la,12,20,c);r(-4,8-la,12,2,c3);r(-6,24-la,14,8,c2);r(56,8-ra,12,20,c);r(56,8-ra,12,2,c3);r(56,24-ra,14,8,c2);
 if(f.ball){r(56,-8-ra+8,12,10,'#ff6010');r(58,-6-ra+8,8,6,'#ffd040');}
 r(24,1,5,3,gl);r(36,1,5,3,gl);if(f.hot){r(22,0,9,1,gl);r(34,0,9,1,gl);}
 for(let i=0;i<8;i++){const h=hash(i,3,9);r(8+h%46,8+(h>>4)%22,(h>>8)%6+2,1,gl);}
 r(26,14,12,12,'#3a1a10');r(28,16,8,8,gl);r(30,18,4,4,core);}
function pteroArt(g,f){const X=BPAD-4,Y=14,r=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(X+x,Y+y,w,h);},b='#8a4a5a',w='#6a3048',wl='#a86a7a',bk='#e8c070',cr='#e0a040';
 const wp=f.wing;if(wp===0){r(0,-12,10,3,w);r(4,-9,12,3,w);r(8,-6,12,3,w);r(12,-3,10,3,w);r(2,-12,8,1,wl);}else if(wp===1){r(2,4,16,3,w);r(30,4,16,3,w);r(4,4,12,1,wl);}else if(wp===2){r(4,14,14,3,w);r(8,12,12,4,w);r(12,9,10,3,w);}else{r(-2,-16,8,3,w);r(2,-13,10,3,w);r(6,-10,12,3,w);r(10,-6,12,4,w);r(12,-2,10,4,w);r(-1,-16,6,1,wl);}
 r(16,7,16,8,b);r(16,7,16,2,wl);r(10,9,8,4,b);r(4,10,8,2,b);r(30,5,10,7,b);
 if(f.open){r(40,4,8,2,bk);r(40,10,6,2,bk);r(40,6,6,4,'#6a1018');}else{r(40,8,8,2,bk);r(40,10,5,1,bk);}
 r(28,1,8,4,cr);r(24,0,6,2,cr);r(35,6,2,2,f.glow?'#ff3020':'#ff0');r(20,15,2,4,bk);r(26,15,2,4,bk);}
const BOSSDEF={croc:{w:72+BPAD+8,h:44,fn:crocArt,fr:{walk0:{a:0},walk1:{a:2},walk2:{a:0},walk3:{a:-2},prep0:{open:1,glow:1},prep1:{open:1,a:1},lunge0:{open:1},tail0:{tail:-5},tail1:{tail:-12}}},
 mammoth:{w:56+BPAD+8,h:52,fn:mammArt,fr:{walk0:{a:0},walk1:{a:2},walk2:{a:0},walk3:{a:-2},prep0:{rear:1,glow:1},prep1:{rear:1},charge0:{charge:1,a:2},charge1:{charge:1,a:-2},stun0:{a:0}}},
 golem:{w:64+BPAD+16,h:60,fn:golemArt,fr:{idle0:{},idle1:{armL:1,armR:1},throw0:{armR:8,ball:1,hot:1},throw1:{armR:12,ball:1},erupt0:{armL:10,armR:10,hot:1},erupt1:{armL:12,armR:12}}},
 ptero:{w:48+BPAD+8,h:44,fn:pteroArt,fr:{fly0:{wing:0},fly1:{wing:1},fly2:{wing:2},fly3:{wing:1},prep0:{wing:3,open:1,glow:1},prep1:{wing:3,open:1},swoop0:{wing:1,open:1}}}};
function bakeBosses(){const list=[];for(const t in BOSSDEF){const D=BOSSDEF[t];for(const n in D.fr)list.push([t,n,D]);}
 const W=Math.max(...list.map(l=>l[2].w)),H=list.reduce((a,l)=>a+l[2].h,0),[c,g]=mkC(W,H);const frames={};let y=0;
 for(const [t,n,D] of list){const [fc,fg]=mkC(D.w,D.h);D.fn(fg,D.fr[n]);postShade(fc,true);g.drawImage(fc,0,y);frames[t+'_'+n]=[0,y,D.w,D.h];y+=D.h;}
 return {img:c,frames};}
function stormify(img){const [c,g]=mkC(img.width,img.height);try{g.filter='hue-rotate(180deg) saturate(1.5) brightness(1.15)';}catch(e){}g.drawImage(img,0,0);try{g.filter='none';}catch(e){}g.globalCompositeOperation='source-atop';g.fillStyle='rgba(60,120,255,.18)';g.fillRect(0,0,c.width,c.height);return c;}
function setBosses(img,frames){ART.boss={img,frames,white:whiten(img),red:tint(img,'#ff3010'),storm:stormify(img)};}
function drawBoss(m,fr,dx,dy){const B=ART.boss,f=B.frames[m.t+'_'+fr];if(!f)return;const ox=m.t==='ptero'?BPAD-4:BPAD,oy=m.t==='golem'?8:m.t==='ptero'?16:m.t==='croc'?0:6;
 ctx.save();ctx.translate(Math.round(m.x+(dx||0)),Math.round(m.y+(dy||0)));const W=m.t==='ptero'?48:m.w;if(m.face<0){ctx.translate(W,0);ctx.scale(-1,1);}
 const sx=f[0],sy=f[1];ctx.drawImage(m.fl>0?B.white:B.img,sx,sy,f[2],f[3],-ox,-oy,f[2],f[3]);
 const tele=m.st==='prep'||(m.t==='croc'&&m.st==='walk'&&m.tailT>.5)||(m.t==='golem'&&(m.st==='erupt'||(m.st==='throw')));
 if(tele&&m.fl<=0){ctx.globalAlpha=.25+.35*Math.abs(Math.sin(stateT*18));ctx.drawImage(B.red,sx,sy,f[2],f[3],-ox,-oy,f[2],f[3]);}
 ctx.restore();
 if(tele&&((stateT*8)|0)%2){const X=m.x+m.w/2,Y=m.y-14;ctx.fillStyle='#ffe040';ctx.fillRect(X-1,Y,3,7);ctx.fillRect(X-1,Y+9,3,3);ctx.fillStyle='#a02010';ctx.fillRect(X-2,Y-1,5,1);}}
function whiten(img){const [c,g]=mkC(img.width,img.height);g.drawImage(img,0,0);g.globalCompositeOperation='source-in';g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);return c;}
const ART={};
function bakeArt(){ART.gruk=bakeGruk();postShadeCells(ART.gruk.img);ART.ents=bakeEnts();postShade(ART.ents.img,false);ART.entsW=whiten(ART.ents.img);ART.tiles=bakeTiles();ART.props=propArt();ART.src='procedural';}
bakeArt();ART.elder=spr(ELDERS,{w:'#bfe8ff',W:'#e8f8ff',k:'#3a7ab0',s:'#ffe8a0'});{const b=bakeBosses();setBosses(b.img,b.frames);}
function animFrame(name,t){const a=ART.gruk.anims[name]||ART.gruk.anims.idle;let i=Math.floor(t*a.fps);i=a.loop?i%a.frames.length:Math.min(i,a.frames.length-1);return a.frames[i];}
function drawFrame(g,fname,x,y,face,sc,alpha){sc=sc||1;const f=ART.gruk.frames[fname]||ART.gruk.frames.idle0;g.save();if(alpha!==undefined)g.globalAlpha=alpha;g.translate(Math.round(x),Math.round(y));if(face<0){g.translate(16*sc,0);g.scale(-1,1);}g.drawImage(ART.gruk.img,f[0],f[1],f[2],f[3],0,0,f[2]*sc,f[3]*sc);g.restore();}
function drawGruk(g,x,y,face,frame,evolved,sc){const an=(evolved?'e':'')+(frame==='walk'?'run':frame==='jump'?'jump':'idle');drawFrame(g,animFrame(an,stateT),x,y,face,sc);}
function drawSpr(n,x,y,face,flash){const f=ART.ents.frames[n];if(!f)return;const im=flash?ART.entsW:ART.ents.img;ctx.save();ctx.translate(Math.round(x),Math.round(y));if(face<0){ctx.translate(16,0);ctx.scale(-1,1);}ctx.drawImage(im,f[0],f[1],16,16,0,0,16,16);ctx.restore();}
function exportArt(){const g=bakeGruk(),e=bakeEnts(),t=bakeTiles();postShadeCells(g.img);postShade(e.img,false);const pr=propArt(),bs=bakeBosses();const files={'gruk.png':g.img.toDataURL(),'entities.png':e.img.toDataURL(),'tiles.png':t.img.toDataURL(),'props.png':pr.img.toDataURL(),'bosses.png':bs.img.toDataURL()},bg={};
 for(const th in PAL){const b=genBg(th);bg[th]={};for(const k of['sk','far','mid','near']){files['bg_'+th+'_'+k+'.png']=b[k].toDataURL();bg[th][k]='bg_'+th+'_'+k+'.png';}}
 const json={note:'GRUK art atlases. Replace any PNG (same layout) to reskin. Frames are [x,y,w,h]; anims are named frame lists with fps.',gruk:{img:'gruk.png',frames:g.frames,anims:g.anims},ents:{img:'entities.png',frames:e.frames},
  tiles:{img:'tiles.png',themes:t.themes,chars:t.chars,variants:t.variants,size:t.size},props:{img:'props.png',frames:pr.frames},bosses:{img:'bosses.png',frames:bs.frames},bg};
 return {json:JSON.stringify(json,null,1),files};}
async function loadArt(){try{const r=await fetch('assets/atlas.json',{cache:'no-cache'});if(!r.ok)return;const j=await r.json();
 const ld=src=>new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src='assets/'+src;});
 const [gi,ei,ti,pi,bi]=await Promise.all([ld(j.gruk.img),ld(j.ents.img),ld(j.tiles.img),ld(j.props.img),ld(j.bosses.img)]);
 const bgs={};for(const th in (j.bg||{})){const b=j.bg[th],ks=Object.keys(b),ims=await Promise.all(ks.map(k=>ld(b[k])));bgs[th]={};ks.forEach((k,i)=>bgs[th][k]=ims[i]);}
 ART.gruk={img:gi,frames:j.gruk.frames,anims:j.gruk.anims};ART.ents={img:ei,frames:j.ents.frames};ART.entsW=whiten(ei);ART.props={img:pi,frames:j.props.frames};setBosses(bi,j.bosses.frames);ART.tiles={img:ti,themes:j.tiles.themes,chars:j.tiles.chars,variants:j.tiles.variants,size:j.tiles.size};
 Object.assign(bgCache,bgs);ART.src='assets';tileDirty=true;}catch(err){console.warn('art fallback',err);}}
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
function drawTbird(m,fr){const B=ART.boss,f=B.frames['ptero_'+fr];if(!f)return;const sc=1.3,sh=m.st==='dive'||m.st==='dying'?Math.round(rnd(-1,1)):0;ctx.save();ctx.translate(Math.round(m.x+sh),Math.round(m.y));if(m.face<0){ctx.translate(m.w,0);ctx.scale(-1,1);}ctx.scale(sc,sc);
 ctx.drawImage(m.fl>0?B.white:(B.storm||B.img),f[0],f[1],f[2],f[3],-(BPAD-4),-16,f[2],f[3]);
 if((m.st==='prep'||m.st==='dive')&&m.fl<=0){ctx.globalAlpha=.25+.35*Math.abs(Math.sin(stateT*18));ctx.drawImage(B.red,f[0],f[1],f[2],f[3],-(BPAD-4),-16,f[2],f[3]);}
 ctx.restore();
 if(m.phase===2&&m.st!=='dying'){ctx.strokeStyle=((stateT*20)|0)%2?'#bff':'#5af';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<=10;i++){const a=i/10*6.283+stateT*3,r=36+((hash(i,(stateT*12)|0,5)%7)-3);const X=m.x+m.w/2+Math.cos(a)*r,Y=m.y+m.h/2+Math.sin(a)*r*.6;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}ctx.stroke();}
 if((m.st==='prep'||m.st==='dive')&&((stateT*8)|0)%2){const X=m.x+m.w/2,Y=m.y-14;ctx.fillStyle='#ffe040';ctx.fillRect(X-1,Y,3,7);ctx.fillRect(X-1,Y+9,3,3);}
 if(m.st==='perch'&&((stateT*4)|0)%2)txt('IT RESTS - THUNDER SMASH!',m.x+m.w/2,m.y-14,'#bff','center','bold 8px monospace');}
function drawEnt(e){const t=stateT;
 if(e.t==='boar'){const f=e.fl>0,X=Math.round(e.x+(e.st==='prep'?rnd(-1,1):0)),Y=Math.round(e.y),r=R2(ctx,X,18,e.face),q=(x,y,w,h,c)=>r(x,Y+y,w,h,c),b=f?'#fff':'#7a4a2a',d=f?'#fff':'#4a2a16',lg=((e.an|0)%2);
  q(3,2,14,9,b);q(4,0,10,3,d);q(0,4,5,6,b);q(0,7,2,2,'#3a2010');q(1,9,3,2,'#f4ecd8');q(3,4,2,2,e.st==='prep'||e.st==='charge'?'#ff3020':'#111');q(4+lg*2,11,3,3,d);q(13-lg*2,11,3,3,d);q(16,3,2,3,d);q(5,10,10,1,'rgba(0,0,0,.3)');
  if(e.st==='stun')for(let i=0;i<3;i++){ctx.fillStyle='#ff8';ctx.fillRect(e.x+9+Math.cos(stateT*7+i*2)*8,e.y-4+Math.sin(stateT*7+i*2)*2,2,2);}}
 else if(e.t==='diver'){const f=e.fl>0,X=Math.round(e.x),Y=Math.round(e.y),r=R2(ctx,X,14,e.face),q=(x,y,w,h,c)=>r(x,Y+y,w,h,c),b=f?'#fff':(e.st==='aim'&&((stateT*16)|0)%2?'#d04040':'#2c3a6a'),w=Math.sin(e.an*16)>0;
  q(3,3,8,5,b);q(10,4,4,2,'#ffc040');q(9,3,2,2,'#fff');q(0,w?0:5,5,3,b);q(6,w?0:6,4,2,f?'#fff':'#1c264a');q(1,7,3,2,f?'#fff':'#1c264a');}
 else if(e.t==='gem'){const X=Math.round(e.x),Y=Math.round(e.y),tw=((stateT*6+e.x)|0)%4;ctx.fillStyle='#0c1a24';ctx.fillRect(X,Y+1,6,5);ctx.fillStyle='#4ce8f0';ctx.fillRect(X+1,Y,4,6);ctx.fillStyle='#bff';ctx.fillRect(X+2,Y+1,1,2);if(!tw){ctx.fillStyle='#fff';ctx.fillRect(X+3,Y-2,1,1);ctx.fillRect(X+6,Y+2,1,1);}}
 else if(e.t==='gemcache'){const X=e.x,Y=e.y;ctx.fillStyle='#3a3440';ctx.fillRect(X+1,Y+6,14,10);ctx.fillStyle='#5a5466';ctx.fillRect(X+3,Y+4,10,3);ctx.fillStyle='#4ce8f0';for(let i=0;i<4;i++)ctx.fillRect(X+3+i*3,Y+8+(i%2)*3,2,2);if(((t*3)|0)%3===0){ctx.fillStyle='#fff';ctx.fillRect(X+8,Y+3,1,1);}}
 else if(e.t==='painter'){const X=e.x,Y=e.y,b=Math.sin(e.an*4)>0?1:0;
  ctx.fillStyle='#b84a2a';ctx.fillRect(X-10,Y-6,8,6);ctx.fillStyle='#e0b040';ctx.fillRect(X-8,Y-12,6,4);ctx.fillStyle='#3a6aa0';ctx.fillRect(X-12,Y-14,3,3);
  drawFrame(ctx,animFrame('idle',e.an),X,Y,-1,1);ctx.fillStyle='#8a5a2a';ctx.fillRect(X-1,Y+8-b*2,6,1);ctx.fillStyle='#e04a2a';ctx.fillRect(X-3,Y+7-b*2,2,2);
  ctx.fillStyle='#6a4a2a';ctx.fillRect(X+14,Y+16,6,6);ctx.fillStyle='#4ce8f0';ctx.fillRect(X+15,Y+15,4,2);
  if(nearTrader===e&&((t*2)|0)%2)txt(lastInput==='touch'?'TRADE':'UP: TRADE',X+8,Y-12,'#ffe9b0','center','bold 8px monospace');}
 else if(e.t==='tbird'){const m=e;const fr=m.st==='prep'||m.st==='dive'||m.st==='roar'?'prep'+(((stateT*8)|0)%2):m.st==='swoop'?'swoop0':m.st==='perch'?'prep1':'fly'+(((m.an/1.6)|0)%4);drawTbird(m,fr);if(m.st==='dying'&&((stateT*16)|0)%2){ctx.globalAlpha=.5;drawTbird(Object.assign({},m,{fl:1}),fr);ctx.globalAlpha=1;}}
 else 
 if(e.t==='walker')drawSpr(Math.sin(e.an)>0?'walker0':'walker1',e.x,e.y,e.vx>0?1:-1,e.fl>0);
 else if(e.t==='bat')drawSpr(Math.sin(e.an*14)>0?'bat0':'bat1',e.x,e.y,1,e.fl>0);
 else if(e.t==='spitter')drawSpr(e.open>0?'spitter1':'spitter0',e.x,e.y,e.face,e.fl>0);
 else if(e.t==='hopper'){if(e.up)drawSpr(e.vy<0?'hopper1':'hopper0',e.x,e.y-4,1,e.fl>0);else if(e.cd<.5){ctx.fillStyle='#ffd040';ctx.fillRect(e.x+3,e.by+10+((stateT*20|0)%2),10,2);}}
 else if(e.t==='icicle')drawSpr('icicle',e.x-4+(e.st===1?Math.round(rnd(-1,1)):0),e.y,1,e.fl>0);
 else if(e.t==='relic'){const b=Math.round(Math.sin(t*3)*2);ctx.fillStyle='rgba(255,210,64,.25)';ctx.fillRect(e.x-4,e.y-4+b,24,24);drawSpr('relic',e.x,e.y+b,1);}
 else if(e.t==='heart'){const b=Math.round(Math.sin(t*3)*2);drawSpr('heart',e.x,e.y+b,1);ctx.fillStyle='rgba(255,100,120,.25)';ctx.fillRect(e.x-2,e.y+b-2,13,12);}
 else if(e.t==='meat')drawSpr('meat',e.x,e.y,1);
 else if(e.t==='K'){const on=lastCP===S.room+':'+e.x,X=e.x,Y=e.y;ctx.fillStyle='#5a3418';ctx.fillRect(X+1,Y+13,14,3);ctx.fillStyle='#8a5a30';ctx.fillRect(X+3,Y+12,10,2);ctx.fillStyle='#888';ctx.fillRect(X,Y+14,2,2);ctx.fillRect(X+14,Y+14,2,2);
  const fh=on?9:5;for(let i=0;i<5;i++){const h=fh-Math.abs(i-2)*2+((t*12+i*3|0)%3);ctx.fillStyle=i%2?'#ffb030':'#ff6020';ctx.fillRect(X+4+i*2,Y+12-h,2,h);}ctx.fillStyle='#fff6a0';ctx.fillRect(X+7,Y+10-(fh>>2),2,2);}
 else if(e.t==='sign')drawSpr('sign',e.x,e.y,1);
 else if(e.t==='shrine'&&shrineOn(e)){const c=ABIL[e.ab].c,X=e.x,Y=e.y,b=Math.round(Math.sin(t*2.5)*2);ctx.fillStyle='rgba(255,255,220,.12)';ctx.fillRect(X-6,Y-18,28,34);
  ctx.fillStyle='#6a6a7a';ctx.fillRect(X+1,Y-8,14,24);ctx.fillStyle='#8a8a9a';ctx.fillRect(X+2,Y-9,12,1);ctx.fillRect(X+1,Y-8,1,24);ctx.fillStyle='#4a4a58';ctx.fillRect(X+14,Y-8,1,24);
  ctx.fillStyle=c;ctx.fillRect(X+5,Y-4,6,2);ctx.fillRect(X+7,Y-2,2,8);ctx.fillRect(X+4,Y+4,8,2);ctx.fillRect(X+6,Y-16+b,4,4);ctx.fillStyle='#fff';ctx.fillRect(X+7,Y-15+b,2,2);
  if(Math.random()<.2)parts.push({x:X+rnd(2,14),y:Y+10,vx:0,vy:-30,t:.8,c,g:0});
  if(ART.elder){const d=Math.hypot(P.x+6-(X+8),P.y+11-Y),a=Math.min(.85,Math.max(.25,1.2-d/110));ctx.globalAlpha=a*(.85+.15*Math.sin(t*5));ctx.drawImage(ART.elder,X+18,Y-30+Math.round(Math.sin(t*1.7)*3));ctx.globalAlpha=1;}}
 else if(e.t==='orb'){const X=e.x+8,Y=e.y+8+Math.sin(t*2)*3;for(let r=18;r>0;r-=3){ctx.fillStyle=`rgba(255,${200+r*2},120,${.08+(18-r)*.03})`;ctx.fillRect(X-r,Y-r,r*2,r*2);}ctx.fillStyle='#fff';ctx.fillRect(X-4,Y-4,8,8);ctx.fillStyle='#fffbd0';ctx.fillRect(X-6,Y-2,12,4);ctx.fillRect(X-2,Y-6,4,12);}
 else if(e.t==='scroll'){const b=Math.round(Math.sin(t*3+e.x)*2),X=e.x,Y=e.y+b;ctx.fillStyle='rgba(255,224,96,.25)';ctx.fillRect(X-2,Y-2,16,16);drawSpr('scroll',X,Y,1);}
 else if(e.t==='fish')drawSpr(Math.sin(e.an*10)>0?'fish0':'fish1',e.x,e.y-1,e.face||1,e.fl>0);
 else if(BOSSES.includes(e.t)){const m=e,q=(n,sp)=>((m.an*sp)|0)%n;let fr;
  if(m.t==='croc')fr=m.st==='prep'?'prep'+q(2,6):m.st==='lunge'?'lunge0':m.st==='tail'?(m.t2>.3?'tail0':'tail1'):'walk'+q(4,1);
  else if(m.t==='mammoth')fr=m.st==='prep'?'prep'+(((stateT*6)|0)%2):m.st==='charge'?'charge'+(((stateT*10)|0)%2):m.st==='stun'?'stun0':'walk'+q(4,1);
  else if(m.t==='golem')fr=m.st==='throw'?(m.t2>.25?'throw0':'throw1'):m.st==='erupt'?'erupt'+(((stateT*8)|0)%2):'idle'+(((stateT*2)|0)%2);
  else fr=m.st==='prep'?'prep'+(((stateT*8)|0)%2):m.st==='swoop'?'swoop0':'fly'+(((m.an/1.6)|0)%4);
  const sh=m.st==='prep'||m.st==='dying'?Math.round(rnd(-1,1)):0;drawBoss(m,fr,sh,0);
  if(m.t==='golem'&&Math.random()<.2)parts.push({x:m.x+rnd(10,54),y:m.y,vx:0,vy:-40,t:.5,c:'#f80',g:0});
  if(m.t==='mammoth'&&m.st==='stun')for(let i=0;i<3;i++){ctx.fillStyle='#ff8';ctx.fillRect(m.x+20+Math.cos(stateT*6+i*2)*14,m.y-4+Math.sin(stateT*6+i*2)*3,2,2);}
  if(m.st==='dying'&&((stateT*16)|0)%2){ctx.globalAlpha=.5;drawBoss(Object.assign({},m,{fl:1}),fr,sh,0);ctx.globalAlpha=1;}}}
const HEARTM=[".kk.kk..","krrkrrk.","krwrrrrk","krrrrrrk",".krrrrk.","..krrk..","...kk..."];
function drawHeart(x,y,full,col){for(let r=0;r<7;r++)for(let c=0;c<8;c++){const q=HEARTM[r][c];if(q==='.')continue;ctx.fillStyle=q==='k'?'#140808':!full?'#3a2430':q==='w'?'#ffd0d8':(r>3?'#a01830':(col||'#e8304a'));ctx.fillRect(x+c,y+r,1,1);}}
function u4(t){return (t-.45)*10;}
function playerAnim(){if(cut)return 'hang';if(P.h<22)return 'roll';if(P.hook)return 'hang';if(P.inv>.85)return 'hurt';if(P.cling)return 'climb';if(P.atk>0)return 'club';if(P.thr>0)return 'throw';
 if(inWater())return 'run';if(!P.onGround)return P.vy<0?'jump':'fall';return P.vx?'run':'idle';}
function drawPlayer(){if(S.state==='dead'){const t=stateT;if(t>1.1)return;let x=P.x-2,y=P.y-2;if(t>.45){const u=t-.45;y+=-160*u+420*u*u;}
  ctx.save();ctx.translate(Math.round(x+8),Math.round(y+12));if(t>.45)ctx.rotate(Math.floor(u4(t)*1)*Math.PI/2);drawFrame(ctx,'hurt0',-8,-12,P.facing,1,t<.45&&((t*20|0)%2)?.4:1);ctx.restore();return;}
 const an=playerAnim();if(an!==P.anim2){P.anim2=an;P.animT=0;}
 let al=1;if(P.inv>0&&!cut){const ph=((P.inv*14)|0)%2;al=ph?.25:1;}
 if(an==='roll'){drawFrame(ctx,animFrame('roll',P.animT),P.x-2,P.y-12,P.facing,1,al);return;}
 const X=P.x-2,Y=P.y-2,f=P.facing,cx=X+8;let fr=animFrame(an,an==='climb'&&!P.vy?0:P.animT);
 if(cut){ctx.fillStyle='rgba(255,255,220,.22)';ctx.fillRect(X-4,0,24,Y+24);ctx.fillStyle='rgba(255,255,220,.15)';ctx.fillRect(X-10,0,36,Y+24);}
 ctx.save();ctx.globalAlpha=al;const gold=S.flags.relic;ctx.fillStyle=gold?'#d0a020':'#7a4a1a';const head=gold?'#ffd040':'#5a3010';
 if(P.atk>0){const ph=P.atk/.16;if(ph>.5){ctx.fillRect(cx+f*2-2,Y-6,4,12);ctx.fillStyle=head;ctx.fillRect(cx+f*2-3,Y-8,6,5);}else{for(let i=0;i<14;i++)ctx.fillRect(Math.round(cx+f*(6+i)),Y+10,2,3);ctx.fillStyle=head;ctx.fillRect(Math.round(cx+f*20)-3,Y+8,6,6);ctx.fillStyle='rgba(255,255,255,.5)';ctx.fillRect(Math.round(cx+f*12)-6,Y+2,12,1);}}
 else if(!P.cling&&!P.hook&&!cut){for(let i=0;i<9;i++)ctx.fillRect(Math.round(cx-f*(2+i*.6)),Y+14-i,2,2);ctx.fillStyle=head;ctx.fillRect(Math.round(cx-f*7)-2,Y+4,4,4);}
 ctx.restore();
 drawFrame(ctx,fr,X,Y,P.facing,1,al);
 if(P.inv>.95&&!cut){ctx.save();ctx.globalCompositeOperation='lighter';drawFrame(ctx,fr,X,Y,P.facing,1,.6);ctx.restore();}
 if(S.ab.fire&&cur.dark){ctx.fillStyle=((stateT*10|0)%2)?'#ffb030':'#ff6020';ctx.fillRect(X+8+f*7,Y+9,2,3);}}
function wrap(s,maxW){const words=s.split(' '),lines=[];let l='';for(const w of words){const t=l?l+' '+w:w;if(ctx.measureText(t).width>maxW&&l){lines.push(l);l=w;}else l=t;}if(l)lines.push(l);return lines;}
function box(x,y,w,h){panel(x,y,w,h,.9);}
const TXC=new Map(),[txC,txG]=mkC(8,8);
function txtImg(s,font,col){const k=font+'|'+col+'|'+s;let c=TXC.get(k);if(c)return c;if(TXC.size>700)TXC.clear();
 txG.font=font;const w=Math.ceil(txG.measureText(s).width)+3,sz=parseInt(font.match(/(\d+)px/)[1]),h=sz+5;const [m,mg]=mkC(w,h);mg.font=font;mg.textBaseline='top';mg.fillStyle='#fff';mg.fillText(s,1,1);
 const id=mg.getImageData(0,0,w,h),d=id.data;for(let i=3;i<d.length;i+=4)d[i]=d[i]>(sz>=14?120:96)?255:0;mg.putImageData(id,0,0);
 const [o,og]=mkC(w+1,h+1);og.drawImage(tint(m,'#120a06'),1,1);og.drawImage(tint(m,col),0,0);TXC.set(k,o);return o;}
function txt(s,x,y,c,al,font){font=font||'bold 9px monospace';c=c||'#fff';let a=1;const mm=/^rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/.exec(c);if(mm){a=+mm[4];c=`rgb(${mm[1]},${mm[2]},${mm[3]})`;}if(a<=0||!s)return;
 const im=txtImg(String(s),font,c);let X=x;if(al==='center')X=x-(im.width-2)/2;else if(al==='right')X=x-im.width+2;ctx.globalAlpha*=a;ctx.drawImage(im,Math.round(X)-1,Math.round(y)-1);ctx.globalAlpha/=a;}
function panel(x,y,w,h,a){x|=0;y|=0;w|=0;h|=0;ctx.fillStyle=`rgba(22,14,10,${a===undefined?.86:a})`;ctx.fillRect(x+2,y+2,w-4,h-4);ctx.fillStyle='#0c0604';ctx.fillRect(x+1,y,w-2,1);ctx.fillRect(x+1,y+h-1,w-2,1);ctx.fillRect(x,y+1,1,h-2);ctx.fillRect(x+w-1,y+1,1,h-2);
 ctx.fillStyle='#8a6232';ctx.fillRect(x+1,y+1,w-2,1);ctx.fillRect(x+1,y+1,1,h-2);ctx.fillStyle='#4a3018';ctx.fillRect(x+1,y+h-2,w-2,1);ctx.fillRect(x+w-2,y+1,1,h-2);ctx.fillStyle='#e8c070';for(const [cx,cy] of [[x+2,y+2],[x+w-4,y+2],[x+2,y+h-4],[x+w-4,y+h-4]])ctx.fillRect(cx,cy,2,2);}
function roomMarks(k){const m=[];const r=ROOMS[k];for(const e of r.ents){const id=k+':'+e.x+':'+e.y;
 if(e.t==='heart'&&!S.flags.hearts[id])m.push('#f46');else if(e.t==='scroll'&&!S.flags.scrolls[id])m.push('#fe6');else if(e.t==='shrine'&&!S.ab[e.ab])m.push(ABIL[e.ab].c);
 else if(BOSSES.includes(e.t)||e.t==='mammoth'||e.t==='ptero'){if(!S.flags.bosses[e.t])m.push('#f22');}else if(e.t==='K')m.push('#f90');else if(e.t==='orb')m.push('#fff');}return m;}
function drawMinimap(x,y,cw,ch,big){const adj=k=>{const [a,b]=k.split(',').map(Number);return[[a-1,b],[a+1,b],[a,b-1],[a,b+1]].some(([p,q])=>S.visited[p+','+q]);};
 for(const k in ROOMS){const [rx,ry]=k.split(',').map(Number);const X=x+(rx+2)*(cw+1),Y=y+(ry+1)*(ch+1);
 if(!S.visited[k]){if(ROOMS[k].secret)continue;if(adj(k)){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(X,Y,cw,1);ctx.fillRect(X,Y+ch-1,cw,1);ctx.fillRect(X,Y,1,ch);ctx.fillRect(X+cw-1,Y,1,ch);if(big)txt('?',X+cw/2,Y+ch/2-5,'#aaa','center','bold 9px monospace');}continue;}
 const th=ROOMS[k].theme;ctx.fillStyle=k===S.room?(((stateT*3)|0)%2?'#ffcf6a':'#c08a40'):({jungle:'#3a7a4a',lava:'#8a3a2a',icecave:'#4a6a9a',cave:'#4a3a5a'}[th]||(ROOMS[k].dark?'#4a3a5a':'#5a7a9a'));ctx.fillRect(X,Y,cw,ch);
 if(big){txt(ROOMS[k].name,X+cw/2,Y+2,'#fff','center','bold 7px monospace');roomMarks(k).forEach((c,i)=>{ctx.fillStyle='#000';ctx.fillRect(X+3+i*7,Y+ch-8,6,6);ctx.fillStyle=c;ctx.fillRect(X+4+i*7,Y+ch-7,4,4);});}}}
const EPI={croc:'Terror of the Black Bog',mammoth:'Tyrant of the Frozen Lair',golem:'Molten Heart of the Mountain',ptero:'Shadow of the Summit Winds',tbird:'Lord of the Howling Sky'};
const OBJ=[[()=>!S.ab.climb,'2,4','Learn to climb: east of camp'],[()=>!S.ab.fire,'0,3','Find fire in the dark hollow'],[()=>!S.ab.roll,'-1,4','Burn the west vines at camp; seek the grove'],
 [()=>!S.flags.bosses.croc,'-2,4','Roll into the bog. Hit the croc from behind'],[()=>!S.ab.swim,'-2,4','Claim the Swim shrine in the bog'],[()=>!S.flags.bosses.mammoth,'1,2','Melt the Ice Mammoth with fire'],
 [()=>!S.ab.spear,'1,2','Claim the spear in the mammoth lair'],[()=>!S.ab.smash,'2,1','Spear the stone eye; go up to the deep caverns'],[()=>!S.ab.grapple,'3,2','Swim the frozen grotto, east of the caverns'],
 [()=>!S.flags.bosses.golem,'3,3','Hook over the lava. Club the Magma Golem'],[()=>!S.flags.bosses.ptero,'1,0','Smash the cracks; spear the Sky Terror'],[()=>!S.ab.djump,'1,0','Claim the Wings of Thought'],[()=>!S.ab.thunder,'2,-1','Climb above the Sky Roost; cross the Storm Peaks east'],[()=>!S.flags.bosses.tbird,'0,-1','Charge your club to break the west totem; fell the Thunder Bird'],[()=>true,'0,0','Climb to the summit and pass the Elder Gate']];
function objective(){for(const o of OBJ)if(o[0]())return o;}
function drawHUD(){const pw=Math.max(146,10+P.maxHp*10);panel(2,2,pw,30,.7);for(let i=0;i<P.maxHp;i++)drawHeart(7+i*10,7,i<P.hp);
 let ix=7;for(const k of AB_ORDER){ctx.fillStyle='#0c0604';ctx.fillRect(ix-1,18,10,10);ctx.fillStyle=S.ab[k]?ABIL[k].c:'#2a1e18';ctx.fillRect(ix,19,8,8);if(S.ab[k]){ctx.fillStyle='rgba(255,255,255,.55)';ctx.fillRect(ix+1,20,3,2);ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(ix+1,25,7,2);}ix+=11;}
 {const gx=ix+3,gy=20;ctx.fillStyle='#0c0604';ctx.fillRect(gx,gy+1,6,6);ctx.fillStyle='#6ff';ctx.fillRect(gx+1,gy,4,6);ctx.fillStyle='#fff';ctx.fillRect(gx+2,gy+1,1,2);txt(String(S.stones),gx+9,gy-1,'#bff','left','bold 8px monospace');}
 if(S.ng)txt('NG+'+(S.ng>1?S.ng:''),pw-4,4,'#ff9070','right','bold 7px monospace');
 panel(VW-50,2,48,42,.7);drawMinimap(VW-46,5,6,5,false);
 if(CFG.timer){const t=S.time,cs=((t*100)|0)%100;txt(fmtTime(t)+'.'+(cs<10?'0':'')+cs,VW-4,47,'#fff','right','bold 9px monospace');}
 if(roomSplash>0&&elderTxt===null&&!signTxt&&!trading){const a=Math.min(1,roomSplash,(2.2-roomSplash)*4);ctx.globalAlpha=a;const w=Math.min(300,cur.name.length*10+40);ctx.fillStyle='rgba(10,6,4,.55)';ctx.fillRect(VW/2-w/2,36,w,22);ctx.fillStyle='#e8c070';ctx.fillRect(VW/2-w/2,36,w,1);ctx.fillRect(VW/2-w/2,57,w,1);ctx.globalAlpha=1;txt(cur.name.toUpperCase(),VW/2,40,`rgba(255,230,170,${a})`,'center','bold 14px monospace');}
 if(boss){const b=boss;if(b.st==='intro'){const t=1.8-b.t2,k=Math.min(1,t*3,b.t2*4),bh=Math.round(26*k);ctx.fillStyle='#000';ctx.fillRect(0,0,VW,bh);ctx.fillRect(0,VH-bh,VW,bh);
   const sx=Math.round(-260+Math.min(1,t*2.2)*260+Math.max(0,.3-b.t2)*900);ctx.globalAlpha=k;panel(VW/2-130+sx,VH/2+22,260,40,.92);txt(b.name,VW/2+sx,VH/2+27,'#ff9070','center','bold 18px monospace');txt('~ '+(EPI[b.t]||'')+' ~',VW/2+sx,VH/2+48,'#ffe0b0','center','bold 8px monospace');ctx.globalAlpha=1;}
  else{panel(130,VH-22,220,18,.8);ctx.fillStyle='#200';ctx.fillRect(136,VH-12,208,5);const f=Math.max(0,b.hp)/b.max;ctx.fillStyle=f<.35?'#ff5020':'#e02838';ctx.fillRect(136,VH-12,208*f,5);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(136,VH-12,208*f,1);txt(b.name+(b.phase===2?'  -  STORM FURY':''),VW/2,VH-21,b.phase===2?'#bff':'#fcc','center','bold 8px monospace');}}
 if(elderTxt!==null&&!signTxt){ctx.font='bold 9px monospace';const ls=wrap(elderTxt||' ',300);panel(80,40,320,26+Math.max(1,ls.length)*11);txt('ELDER SPIRIT',92,46,'#bfe8ff','left','bold 8px monospace');ls.forEach((l,i)=>txt(l,92,57+i*11,'#eef8ff'));}
 if(signTxt){ctx.font='bold 9px monospace';const ls=wrap(signTxt,300);box(80,48,320,12+ls.length*11);ls.forEach((l,i)=>txt(l,90,54+i*11,'#ffe9b0'));}
 for(const t of texts)txt(t.s,t.x,t.y,t.c,'left','bold 8px monospace');}
function drawBanner(){const b=banner;ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,VW,VH);ctx.font='bold 10px monospace';const ls=wrap(b.text,330);if(b.hint){ctx.font='bold 9px monospace';}const hl=b.hint?wrap(b.hint,330):[];const h=50+ls.length*12+hl.length*11+(hl.length?8:0);const y=(VH-h)/2;box(60,y,360,h);
 txt(b.title,VW/2,y+10,b.c||'#ffcf6a','center','bold 12px monospace');ls.forEach((l,i)=>txt(l,VW/2,y+30+i*12,'#fff','center','bold 10px monospace'));hl.forEach((l,i)=>txt(l,VW/2,y+36+ls.length*12+i*11,b.c||'#ffcf6a','center','bold 9px monospace'));
 if(b.t>.6&&((stateT*2)|0)%2)txt('[JUMP / tap]',VW/2,y+h-12,'#aaa','center','bold 8px monospace');}
const [GLOW]=(()=>{const [c,g]=mkC(64,64);for(let r=32;r>0;r--){const a=Math.min(1,Math.round((1-r/32)*6)/5);g.fillStyle=`rgba(255,255,255,${a})`;g.beginPath();g.arc(32,32,r,0,7);g.fill();}return [c];})();
const glowC={};function glowSpr(col){return glowC[col]||(glowC[col]=tint(GLOW,col));}
const [VIG]=(()=>{const [c,g]=mkC(VW,VH),gr=g.createRadialGradient(VW/2,VH/2,VH*.45,VW/2,VH/2,VW*.62);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.45)');g.fillStyle=gr;g.fillRect(0,0,VW,VH);return [c];})();
function gatherLights(){const L=[],fl=Math.sin(stateT*13)*3,z=PAL[cur.theme];
 L.push({x:P.x+6,y:P.y+10,r:cur.dark?(S.ab.fire?120:34)+fl:(S.ab.fire?70:50),c:S.ab.fire?'#ffb050':null});
 for(const p of proj)if(p.k==='fire')L.push({x:p.x+3,y:p.y+3,r:50,c:'#ff8020'});
 for(const p of eproj)if(p.k==='lava'||p.k==='drop')L.push({x:p.x+4,y:p.y+4,r:26,c:'#ff6010'});
 for(const e of ents){if(e.t==='K')L.push({x:e.x+8,y:e.y+8,r:(lastCP===S.room+':'+e.x?80:60)+fl,c:'#ff9030'});else if(e.t==='shrine'&&shrineOn(e))L.push({x:e.x+8,y:e.y,r:50,c:ABIL[e.ab].c});else if(e.t==='heart')L.push({x:e.x+5,y:e.y+5,r:22,c:'#ff4060'});
  else if(e.t==='relic'||e.t==='orb')L.push({x:e.x+8,y:e.y+8,r:50,c:'#ffd040'});else if(e.t==='golem'&&e.hp>0)L.push({x:e.x+32,y:e.y+20,r:70+fl,c:'#ff7020'});else if(e.t==='hopper'&&e.up)L.push({x:e.x+7,y:e.y+6,r:22,c:'#ff6010'});}
 for(const l of cur.lights||[])L.push(l);for(const l of cur.lava||[])L.push({x:l.x,y:l.y,r:l.r+Math.sin(stateT*2+l.x)*4,c:l.c});return L;}
function drawLighting(){const z=PAL[cur.theme],L=gatherLights(),dk=cur.dark?.95:(lowFx?0:(z.dk||0));
 if(dk>0){const g=dctx;g.globalCompositeOperation='source-over';g.clearRect(0,0,VW,VH);const c=hx(z.rk[0]);g.fillStyle=`rgba(${c[0]>>1},${c[1]>>1},${c[2]>>1},${dk})`;g.fillRect(0,0,VW,VH);g.globalCompositeOperation='destination-out';
  for(const l of L){const r=l.r*(cur.dark?1:1.3);g.drawImage(GLOW,l.x-r,l.y-r,r*2,r*2);}g.globalCompositeOperation='source-over';ctx.drawImage(darkC,0,0);}
 if(lowFx)return;ctx.save();ctx.globalCompositeOperation='lighter';for(const l of L){if(!l.c)continue;ctx.globalAlpha=cur.dark||dk?.28:.16;const r=l.r*.9;ctx.drawImage(glowSpr(l.c),l.x-r,l.y-r,r*2,r*2);}ctx.restore();
 ctx.fillStyle=z.amb;ctx.fillRect(0,0,VW,VH);ctx.drawImage(VIG,0,0);}
function drawDark(){const g=dctx;g.globalCompositeOperation='source-over';g.clearRect(0,0,VW,VH);g.fillStyle='rgba(4,2,8,.96)';g.fillRect(0,0,VW,VH);g.globalCompositeOperation='destination-out';
 const L=(x,y,r)=>{const gr=g.createRadialGradient(x,y,r*.2,x,y,r);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.7,'rgba(0,0,0,.8)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);};
 const fl=Math.sin(stateT*13)*3;L(P.x+6,P.y+10,(S.ab.fire?120:34)+fl);for(const p of proj)if(p.k==='fire')L(p.x+3,p.y+3,50);
 for(const e of ents){if(e.t==='K')L(e.x+8,e.y+8,70+fl);if(e.t==='shrine'&&shrineOn(e))L(e.x+8,e.y,46);if(e.t==='heart')L(e.x+5,e.y+5,22);}
 g.globalCompositeOperation='source-over';
 // pixelate the light edge
 ctx.drawImage(darkC,0,0);}
function drawWorld(){const sx=shake>0&&CFG.shake?Math.round(rnd(-2,2)):0,sy=shake>0&&CFG.shake?Math.round(rnd(-2,2)):0;ctx.save();ctx.translate(sx,sy);
 drawBg(cur.theme);if(tileDirty)renderTiles();ctx.drawImage(tileC,0,0);
 for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const c=cur.g[y][x];if(c==='M'){const X=x*TS,Y=y*TS,k=y%3;ctx.fillStyle='#2a2e40';ctx.fillRect(X+1,Y,14,16);ctx.fillStyle='#4a5270';ctx.fillRect(X+2,Y,3,16);ctx.fillStyle='#14161e';ctx.fillRect(X+13,Y,2,16);
   if(k===0){ctx.fillStyle='#14161e';ctx.fillRect(X+3,Y+4,4,3);ctx.fillRect(X+9,Y+4,4,3);ctx.fillStyle=((stateT*3+y)|0)%2?'#7df':'#4ae';ctx.fillRect(X+4,Y+5,2,1);ctx.fillRect(X+10,Y+5,2,1);ctx.fillStyle='#14161e';ctx.fillRect(X+5,Y+10,6,3);ctx.fillStyle='#e8e0c8';ctx.fillRect(X+5,Y+10,1,2);ctx.fillRect(X+10,Y+10,1,2);}
   else if(k===1){ctx.fillStyle='#7df';ctx.fillRect(X+7,Y+2,2,5);ctx.fillRect(X+5,Y+6,2,2);ctx.fillRect(X+9,Y+8,2,5);}else{ctx.fillStyle='#3a405a';ctx.fillRect(X+1,Y+6,14,3);ctx.fillStyle='#8a5a2a';ctx.fillRect(X+1,Y+7,14,1);}continue;}
  if(c==='Q'){const cr=crum[x+','+y],sh=cr&&cr.st===0?Math.round(rnd(-1,1)):0,X=x*TS+sh,Y=y*TS;ctx.fillStyle='#14161e';ctx.fillRect(X,Y+1,16,9);ctx.fillStyle='#6a6478';ctx.fillRect(X,Y,16,8);ctx.fillStyle='#8a84a0';ctx.fillRect(X,Y,16,2);ctx.fillStyle='#3a3648';ctx.fillRect(X+5,Y+2,1,5);ctx.fillRect(X+6,Y+4,3,1);ctx.fillRect(X+11,Y+3,1,4);ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(X+2,Y+8,12,3);continue;}
  if(c!=='~'&&c!=='L')continue;const X=x*TS,Y=y*TS,top=cur.g[y-1]&&cur.g[y-1][x]!==c;
  if(c==='~'){ctx.fillStyle=cur.theme==='icecave'?'rgba(80,160,230,.5)':'rgba(40,120,90,.55)';ctx.fillRect(X,Y,16,16);if(top){ctx.fillStyle='rgba(220,250,255,.8)';ctx.fillRect(X,Y+(Math.sin(stateT*3+x)>0?0:1),16,1);}}
  else{ctx.fillStyle='#c83010';ctx.fillRect(X,Y,16,16);ctx.fillStyle='#f80';for(let i=0;i<3;i++){const h=hash(x,i,7);ctx.fillRect(X+(h+stateT*20|0)%14,Y+4+i*4,3,1);}
   if(top){ctx.fillStyle='#ffd040';ctx.fillRect(X,Y+(Math.sin(stateT*4+x*1.3)*1.5|0),16,2);if(Math.random()<.01)parts.push({x:X+8,y:Y,vx:rnd(-10,10),vy:-60,t:.6,c:'#fa0',g:150});}}}
 if(P&&P.hook){ctx.strokeStyle='#6a8a3a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(P.x+6,P.y+6);ctx.lineTo(P.hook.ax,P.hook.ay);ctx.stroke();}
 for(const e of ents)drawEnt(e);
 for(const p of eproj){if(p.k==='spark'){ctx.fillStyle=((stateT*20)|0)%2?'#fff':'#7df';ctx.fillRect(p.x,p.y+2,p.w,p.h-2);ctx.fillStyle='#bff';ctx.fillRect(p.x+2,p.y,p.w-4,2);continue;}if(p.k==='seed'){ctx.fillStyle='#6a3';ctx.fillRect(p.x,p.y,5,5);ctx.fillStyle='#ae6';ctx.fillRect(p.x+1,p.y+1,2,2);}else if(p.k==='lava'||p.k==='drop'){ctx.fillStyle=p.delay>0?'rgba(255,120,40,.4)':'#f60';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#ffd040';ctx.fillRect(p.x+1,p.y+1,p.w-3,p.h-4);}else if(p.k==='ice'){ctx.fillStyle=p.delay>0?'rgba(207,232,255,.6)':'#cfe8ff';ctx.fillRect(p.x,p.y,6,8);ctx.fillRect(p.x+1,p.y+8,4,2);ctx.fillRect(p.x+2,p.y+10,2,2);}else{ctx.fillStyle='#6a5a4a';ctx.fillRect(p.x,p.y,6,6);ctx.fillStyle='#8a7a6a';ctx.fillRect(p.x,p.y,4,2);}}
 drawPlayer();
 if(P.chg>0){const k=Math.min(1,P.chg/.55),full=k>=1;ctx.fillStyle='#0c0604';ctx.fillRect(P.x-2,P.y-9,16,4);ctx.fillStyle=full?(((stateT*16)|0)%2?'#fff':'#7df'):'#3a8ab0';ctx.fillRect(P.x-1,P.y-8,14*k,2);if(full&&Math.random()<.5)parts.push({x:P.x+rnd(-4,16),y:P.y+rnd(0,20),vx:0,vy:-30,t:.25,c:'#bff',g:0});}
 if(P.charged&&P.atk>0){ctx.strokeStyle='#bff';ctx.lineWidth=2;ctx.beginPath();const bx=P.x+6+P.facing*8;ctx.moveTo(bx,P.y-6);for(let i=1;i<6;i++)ctx.lineTo(bx+P.facing*i*5,P.y-6+i*5+rnd(-3,3));ctx.stroke();ctx.lineWidth=1;}
 for(const p of proj){if(p.k==='fire'){ctx.fillStyle='#f62';ctx.fillRect(p.x,p.y,7,7);ctx.fillStyle='#fc4';ctx.fillRect(p.x+1,p.y+1,5,5);ctx.fillStyle='#fff8c0';ctx.fillRect(p.x+2,p.y+2,3,3);}
  else{ctx.fillStyle='#8a5a2a';if(p.vy){ctx.fillRect(p.x+1,p.y+3,1,11);ctx.fillStyle='#ccd';ctx.fillRect(p.x,p.y,3,4);}else{ctx.fillRect(p.x,p.y+1,14,1);ctx.fillStyle='#ccd';ctx.fillRect(p.vx>0?p.x+11:p.x,p.y,3,3);}}}
 for(const p of parts){ctx.fillStyle=p.c;ctx.fillRect(Math.round(p.x),Math.round(p.y),2,2);}
 drawLighting();
 if(cur.theme==='storm'){if(!lowFx){ctx.fillStyle='rgba(170,190,235,.4)';const wx=wind.st===2?wind.dir*260:30;for(let i=0;i<70;i++){const x=((hash(i,3,3)%VW+stateT*wx)%VW+VW)%VW,y=(hash(i,4,3)%VH+stateT*(280+i%5*30))%VH;ctx.fillRect(x|0,y|0,1,5);}}
  if(wind.st>=1){ctx.fillStyle=wind.st===2?'rgba(230,240,255,.55)':'rgba(230,240,255,.25)';for(let i=0;i<(lowFx?6:16);i++){const x=((hash(i,8,8)%VW+stateT*wind.dir*(wind.st===2?520:200))%VW+VW)%VW,y=20+hash(i,9,8)%220;ctx.fillRect(x|0,y,18+i%3*8,1);}if(wind.st===1&&((stateT*6)|0)%2)txt(wind.dir>0?'>> WIND >>':'<< WIND <<',VW/2,64,'#dfe8ff','center','bold 9px monospace');}}
 for(const b of bolts){if(b.st===0){const a=((stateT*12)|0)%2;ctx.fillStyle=`rgba(255,240,120,${a?.9:.5})`;ctx.fillRect(b.x-7,15*TS-2,14,2);ctx.fillStyle='rgba(190,230,255,.12)';ctx.fillRect(b.x-6,0,12,15*TS);}
  else{for(const [c,wd] of [['rgba(190,240,255,.5)',5],['#fff',2]]){ctx.fillStyle=c;let x=b.x;for(let y=0;y<15*TS;y+=12){const nx=b.x+((hash(y,(stateT*30)|0,2)%13)-6);ctx.fillRect(Math.min(x,nx)-(wd>2?2:0),y,Math.abs(nx-x)+wd,12);x=nx;}}}}
 if(flash>0&&!lowFx){ctx.fillStyle=`rgba(220,235,255,${Math.min(.6,flash*3)})`;ctx.fillRect(-4,-4,VW+8,VH+8);}
 if(!lowFx&&(cur.theme==='ice'||cur.theme==='peak')){ctx.fillStyle='rgba(255,255,255,.7)';for(let i=0;i<30;i++){const x=(hash(i,1,1)%VW+stateT*(10+i%5*6))%VW,y=(hash(i,2,1)%VH+stateT*(20+i%7*5))%VH;ctx.fillRect(x|0,y|0,1,1);}}
 ctx.restore();}

// ---------------- main loop
function update(dt){stateT+=dt;if(fadeIn>0)fadeIn-=dt;if(msgCd>0)msgCd-=dt;if(shake>0)shake-=dt;if(I.muteP)toggleMute();
 for(const [id,a] of [['bRoll','roll'],['bHook','grapple']]){const b=document.getElementById(id);if(b)b.classList.toggle('dim',!S.ab[a]);}
 {const bt=document.getElementById('bTalk');if(bt){const v=nearTrader&&S.state==='play'?'flex':'none';if(bt.style.display!==v)bt.style.display=v;}}
 const pb=document.getElementById('bFire'),ps=document.getElementById('bSpear');if(pb){pb.classList.toggle('dim',!S.ab.fire);ps.classList.toggle('dim',!S.ab.spear);}
 if(S.state==='title'){if(I.startP||I.jumpP){getSave()?startCont():startNew();}return;}
 if(S.state==='pause'){if(I.pauseP)resume();return;}
 if(S.state==='dead'){updProj(dt);if(stateT>1.1&&!P.burst){P.burst=1;puff(P.x+6,P.y+10,'#ffe0a0',24,140);puff(P.x+6,P.y+10,'#e2a26a',16,100);}if(stateT>2.2){loadGame();fadeIn=.5;}return;}
 if(S.state==='intro'){if((stateT>.4&&(I.jumpP||I.startP||I.tapP||I.attackP))||stateT>INTRO_T){S.state='play';stateT=0;fadeIn=.8;}return;}
 if(S.state==='ending'){if(stateT>9&&(I.jumpP||I.startP||I.tapP))titleMenu();return;}
 if(S.state==='ascend'){P.y-=30*dt;if(Math.random()<.8)parts.push({x:P.x+rnd(-20,30),y:P.y+rnd(-10,30),vx:0,vy:-60,t:1,c:'#fff8c0',g:0});updProj(dt);if(stateT>4){S.state='ending';stateT=0;try{localStorage.setItem('gruk_cleared','1');}catch(e){}}return;}
 if(S.state!=='play')return;
 if(cut){cut.t+=dt;if(Math.random()<.7)parts.push({x:cut.x+rnd(-30,30),y:P.y+rnd(-40,20),vx:0,vy:-50,t:.7,c:ABIL[cut.ab].c,g:0});
  if(cut.t>1.4){const a=cut.ab;banner={title:'KNOWLEDGE GAINED: '+ABIL[a].n,text:ABIL[a].d,hint:(lastInput==='touch'?'TOUCH: ':'KEYS: ')+HINT[a][lastInput==='touch'?1:0],t:0,c:ABIL[a].c};puff(P.x+6,P.y+8,ABIL[a].c,30,120);cut=null;}return;}
 if(banner){banner.t+=dt;if(banner.t>.6&&(I.jumpP||I.attackP||I.tapP||I.startP))banner=null;return;}
 if(I.pauseP){pauseGame();return;}
 S.time+=dt;if(roomSplash>0&&elderTxt===null&&!signTxt)roomSplash-=dt;if(hitstop>0){hitstop-=dt;return;}
 P.animT+=dt;if(P.thr>0)P.thr-=dt;const wasG=P.onGround,vy0=P.vy;updPlayer(dt);if(!wasG&&P.onGround&&vy0>260){sfx('land');puff(P.x+6,P.y+P.h,PAL[cur.theme].rk[3],4,40);}{const w=inWater();if(w!==!!P.wW){if(stateT>.3){sfx('splash');puff(P.x+6,P.y+P.h/2,'#cef',10,70);}P.wW=w;}}if(S.state!=='play')return;updEnts(dt);updProj(dt);updStorm(dt);if(S.state!=='play')return;
 if(nearTrader&&(I.upP||I.talkP)&&P.onGround&&!banner){tradeMenu();return;}
 signTxt=null;for(const e of ents)if(e.t==='sign'&&ov(e,P))signTxt=e.s;
 elderTxt=null;for(const e of ents)if(e.t==='shrine'&&shrineOn(e)){const d=Math.hypot(P.x+6-(e.x+8),P.y+11-e.y);if(d<90){e.talk=(e.talk||0)+dt;const full=ELDER[e.ab]||'',n=Math.min(full.length,Math.floor(e.talk*40));if(n<full.length&&n%4===0&&n!==e.ln){sfx('blip');e.ln=n;}elderTxt=full.slice(0,n);}else e.talk=0;}}
function fmtTime(t){const m=t/60|0,s=t%60|0;return m+':'+(s<10?'0':'')+s;}
function draw(){ctx.imageSmoothingEnabled=false;
 if(S.state==='title'){drawBg('peak',1);drawSummit(380,1);ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(0,0,VW,VH);
  txt('GRUK',VW/2,34,'#ffcf6a','center','bold 44px monospace');txt('ASCENT OF KNOWLEDGE',VW/2,84,'#ffe9b0','center','bold 14px monospace');
  drawGruk(ctx,VW/2-24,104,1,((stateT*4|0)%2)?'walk':'idle',false,3);
  txt('A game by Gavenecko',VW/2,VH-26,'#ffcf6a','center','bold 9px monospace');
  txt('Arrows move  Z jump  X club  C fire  V spear  Q roll  E hook  P map  M mute',VW/2,VH-14,'#ddd','center','bold 8px monospace');return;}
 if(S.state==='intro'){drawIntro();return;}
 if(S.state==='ending'){drawEnding();return;}
 drawWorld();drawHUD();
 if(S.state==='ascend'){ctx.fillStyle=`rgba(255,253,235,${Math.min(1,stateT/3.5)})`;ctx.fillRect(0,0,VW,VH);txt('Gruk understands...',VW/2,VH/2-6,`rgba(120,80,20,${Math.min(1,stateT/2)})`,'center','bold 14px monospace');}
 if(banner)drawBanner();
 if(fadeIn>0){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,fadeIn/.32)})`;ctx.fillRect(0,0,VW,VH);}
 if(S.state==='dead'){ctx.fillStyle=`rgba(60,0,0,${Math.min(.7,Math.max(0,stateT-.6)/1.2)})`;ctx.fillRect(0,0,VW,VH);if(stateT>1){txt('GRUK FALL DOWN...',VW/2,VH/2-10,'#fcc','center','bold 18px monospace');txt('Back to last campfire',VW/2,VH/2+14,'#fcc','center','bold 9px monospace');}}
 if(S.state==='pause'&&trading){ctx.fillStyle='rgba(8,4,2,.86)';ctx.fillRect(0,0,VW,VH);txt("CAVE PAINTER'S TRADE",VW/2,12,'#ffcf6a','center','bold 12px monospace');txt('"Shiny stones for Gruk-things. Fair, yes?"',VW/2,30,'#e8d8b0','center','bold 8px monospace');{const gx=VW/2-24,gy=44;ctx.fillStyle='#6ff';ctx.fillRect(gx,gy,5,7);txt(S.stones+' shiny stones',gx+9,gy-1,'#bff','left','bold 9px monospace');}}
 else if(S.state==='pause'){ctx.fillStyle='rgba(0,0,0,.75)';ctx.fillRect(0,0,VW,VH);txt('PAUSED — MOUNTAIN MAP',VW/2,10,'#ffcf6a','center','bold 12px monospace');drawMinimap(150,28,50,20,true);{const o=objective(),[ox,oy]=o[1].split(',').map(Number),X=150+(ox+2)*51+25,Y=28+(oy+1)*21,b=((stateT*4)|0)%2;ctx.fillStyle=b?'#fff':'#ff4';ctx.fillRect(X-1,Y-6+b,3,4);ctx.fillRect(X-3,Y-3+b,7,2);ctx.fillRect(X-2,Y-1+b,5,1);ctx.fillRect(X,Y+b,1,1);txt('NEXT: '+o[2],150,158,'#ff8','left','bold 8px monospace');}
  let y=28;txt('KNOWLEDGE',14,y,'#ffcf6a');for(const k in ABIL){y+=12;txt((S.ab[k]?'* ':'- ')+(S.ab[k]?ABIL[k].n:'???'),14,y,S.ab[k]?ABIL[k].c:'#666','left','bold 8px monospace');}
  txt('Time '+fmtTime(S.time),14,y+16,'#ccc','left','bold 8px monospace');txt('Scrolls '+Object.keys(S.flags.scrolls).length+'/'+TOTAL.scrolls+'  Hearts '+Object.keys(S.flags.hearts).length+'/'+TOTAL.hearts,14,y+28,'#fe6','left','bold 8px monospace');
  txt('Map: red heart, yellow scroll, color shrine, orange fire',150,170,'#999','left','bold 7px monospace');txt('Stones '+S.stones+(S.ng?'   NG+'+S.ng:''),14,y+40,'#9df','left','bold 8px monospace');}}
function drawSummit(cx,glow){ctx.fillStyle='#1c1838';ctx.beginPath();ctx.moveTo(cx-260,VH);ctx.lineTo(cx-40,70);ctx.lineTo(cx-18,52);ctx.lineTo(cx,40);ctx.lineTo(cx+22,58);ctx.lineTo(cx+60,90);ctx.lineTo(cx+280,VH);ctx.fill();
 ctx.fillStyle='#2c2650';ctx.beginPath();ctx.moveTo(cx,40);ctx.lineTo(cx+22,58);ctx.lineTo(cx+60,90);ctx.lineTo(cx+280,VH);ctx.lineTo(cx+120,VH);ctx.fill();ctx.fillStyle='#d8e0f4';ctx.beginPath();ctx.moveTo(cx-18,52);ctx.lineTo(cx,40);ctx.lineTo(cx+22,58);ctx.lineTo(cx+8,54);ctx.lineTo(cx-4,60);ctx.fill();
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.15*Math.sin(stateT*2);const r=34+glow*8+Math.sin(stateT*3)*3;ctx.drawImage(glowSpr('#ffe8a0'),cx-r,40-r,r*2,r*2);ctx.globalAlpha=.18;ctx.fillStyle='#fff4c0';ctx.fillRect(cx-3,0,6,40);ctx.restore();ctx.fillStyle='#fffbe0';ctx.fillRect(cx-2,38,4,4);}
function drawIntro(){const t=stateT;drawBg('peak',1);drawSummit(300,0);
 ctx.fillStyle='#0e0c1c';ctx.fillRect(0,214,VW,58);ctx.fillStyle='#1a2a1e';ctx.fillRect(0,212,VW,4);for(let x=0;x<VW;x+=3){ctx.fillRect(x,209+hash(x,1,2)%3,1,3);}
 for(let i=0;i<5;i++)pine(ctx,30+i*22+(i%2)*9,160+(i%3)*8,40,'#0c1410','#162418');
 const fx=150,fy=212;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35+.05*Math.sin(t*14);ctx.drawImage(glowSpr('#ff8a30'),fx-90,fy-90,180,180);ctx.restore();
 ctx.fillStyle='#5a3418';ctx.fillRect(fx-10,fy-2,20,3);ctx.fillStyle='#777';ctx.fillRect(fx-12,fy,3,2);ctx.fillRect(fx+9,fy,3,2);
 for(let i=0;i<5;i++){const h=10-Math.abs(i-2)*3+((t*12+i*3|0)%4);ctx.fillStyle=i%2?'#ffb030':'#ff6020';ctx.fillRect(fx-5+i*2,fy-2-h,2,h);}
 if(Math.random()<.3)parts.push({x:fx+rnd(-4,4),y:fy-10,vx:rnd(-8,8),vy:-30,t:1,c:'#ffb030',g:0});for(const p of parts){p.t-=1/60;p.x+=p.vx/60;p.y+=p.vy/60;ctx.fillStyle=p.c;ctx.fillRect(p.x|0,p.y|0,1,1);}parts=parts.filter(p=>p.t>0);
 drawFrame(ctx,animFrame('idle',t),fx+14,fy-48,-1,2);
 let line='';for(const [t0,l] of INTRO)if(t>=t0)line=l.slice(0,Math.floor((t-t0)*34));
 ctx.font='bold 10px monospace';const ls=wrap(line,400);panel(30,226,420,40,.85);ls.forEach((l,i)=>txt(l,42,232+i*12,'#ffe9b0','left','bold 10px monospace'));
 if(t>1&&((t*2)|0)%2)txt('[JUMP / tap to skip]',VW-12,4,'#aaa','right','bold 8px monospace');
 if(t<1.2){ctx.fillStyle=`rgba(0,0,0,${1-t/1.2})`;ctx.fillRect(0,0,VW,VH);}if(t>INTRO_T-1){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,t-(INTRO_T-1))})`;ctx.fillRect(0,0,VW,VH);}}
function completion(){const ab=AB_ORDER.filter(k=>S.ab[k]).length/AB_ORDER.length,bo=BOSSES.filter(k=>S.flags.bosses[k]).length/BOSSES.length,he=Object.keys(S.flags.hearts).length/Math.max(1,TOTAL.hearts),sc=Object.keys(S.flags.scrolls).length/Math.max(1,TOTAL.scrolls);
 return Math.round(ab*30+bo*25+he*20+sc*20+(S.flags.relic?5:0));}
function achievements(){return[['Ascended','Reach the summit',1],['Heart of Stone','All hearts',Object.keys(S.flags.hearts).length>=TOTAL.hearts],['Scholar','All scrolls',Object.keys(S.flags.scrolls).length>=TOTAL.scrolls],
 ['Secret Keeper','Golden Club',!!S.flags.relic],['Untouchable','No falls',S.deaths===0],['Swift Climber','Under 25:00',S.time<1500],['Storm Breaker','Fell the Thunder Bird'+(S.ng?' (NG+'+S.ng+')':''),!!S.flags.bosses.tbird]];}
function drawEnding(){const t=stateT;drawBg('peak',1);ctx.fillStyle=`rgba(255,250,230,${Math.min(.55,t*.1)})`;ctx.fillRect(0,0,VW,VH);
 ctx.fillStyle='#d8e0f4';ctx.fillRect(VW/2-60,170,120,6);ctx.fillStyle='#8480aa';ctx.fillRect(VW/2-70,176,140,VH);ctx.fillStyle='#bab4d8';ctx.fillRect(VW/2-70,176,140,2);
 const glow=Math.min(1,t/2.5);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.25+glow*.35;const r=60+glow*60+Math.sin(t*3)*6;ctx.drawImage(glowSpr('#ffe8a0'),VW/2-r,130-r,r*2,r*2);
 for(let i=0;i<14;i++){const an=i/14*Math.PI*2+t*.25;ctx.globalAlpha=.12*glow;ctx.fillStyle='#fff4c0';for(let q=24;q<220;q+=6)ctx.fillRect(VW/2+Math.cos(an)*q|0,130+Math.sin(an)*q|0,3,3);}ctx.restore();
 let evo=t>5.5;if(t>2.5&&t<5.5){const f=2+(t-2.5)*6;evo=((t*f)|0)%2===1;}
 if(t>2.5&&t<5.6&&Math.random()<.8)parts.push({x:VW/2+rnd(-30,30),y:170-rnd(0,60),vx:rnd(-20,20),vy:rnd(-80,-20),t:1,c:Math.random()<.5?'#fff8c0':'#ffd060',g:0});
 for(const p of parts){p.t-=1/60;p.x+=p.vx/60;p.y+=p.vy/60;ctx.fillStyle=p.c;ctx.fillRect(p.x|0,p.y|0,2,2);}parts=parts.filter(p=>p.t>0);
 drawFrame(ctx,animFrame(evo?'eidle':'idle',t),VW/2-24,170-72,1,3);
 if(t>5.4&&t<6.4){ctx.fillStyle=`rgba(255,255,255,${1-Math.abs(t-5.6)/.8})`;ctx.fillRect(0,0,VW,VH);}
 if(t>6){const a=Math.min(1,(t-6)*1.5);ctx.globalAlpha=a;txt('ENLIGHTENMENT',VW/2,10,'#7a4a10','center','bold 22px monospace');txt('Gruk has EVOLVED into GRUK SAPIENS!',VW/2,38,'#5a3010','center','bold 11px monospace');
  if(ART.elder){ctx.globalAlpha=a*.8;ctx.drawImage(ART.elder,VW/2+70,104+Math.round(Math.sin(t*1.7)*3));ctx.globalAlpha=a;txt('"You have climbed far, child."',VW/2,56,'#3a6a9a','center','bold 8px monospace');}ctx.globalAlpha=1;}
 if(t>7.5){const a=Math.min(1,(t-7.5)*1.5),sx=Math.round((1-a)*-140);ctx.globalAlpha=a;panel(8+sx,60,150,150,.9);const c=completion();
  txt('COMPLETION',83+sx,66,'#ffcf6a','center','bold 9px monospace');txt(c+'%',83+sx,78,c>=100?'#ffe060':'#fff','center','bold 22px monospace');
  ctx.fillStyle='#2a1a10';ctx.fillRect(20+sx,104,126,5);ctx.fillStyle='#ffcf6a';ctx.fillRect(20+sx,104,126*c/100,5);
  const rows=[['Time',fmtTime(S.time)],['Falls',S.deaths],['Stones',S.stones],['Hearts',Object.keys(S.flags.hearts).length+'/'+TOTAL.hearts],['Scrolls',Object.keys(S.flags.scrolls).length+'/'+TOTAL.scrolls],['Secret',S.flags.relic?'FOUND':'---']];
  rows.forEach(([k,v],i)=>{txt(k,20+sx,114+i*11,'#ccb','left','bold 8px monospace');txt(String(v),146+sx,114+i*11,'#fff','right','bold 8px monospace');});
  panel(VW-158-sx,60,150,150,.9);txt('ACHIEVEMENTS',VW-83-sx,66,'#ffcf6a','center','bold 9px monospace');
  achievements().forEach(([n,d,ok],i)=>{const y=80+i*18,x=VW-150-sx;ctx.fillStyle=ok?'#ffd040':'#3a3030';ctx.fillRect(x,y,12,12);ctx.fillStyle=ok?'#fff6b0':'#4a4040';ctx.fillRect(x+2,y+2,4,4);ctx.fillStyle='#0c0604';ctx.fillRect(x,y+12,12,1);
   txt(n,x+18,y-1,ok?'#ffe9b0':'#776','left','bold 8px monospace');txt(d,x+18,y+8,ok?'#bba':'#554','left','bold 7px monospace');});ctx.globalAlpha=1;}
 if(t>8.5){txt('A game by Gavenecko  -  thanks for playing!',VW/2,VH-30,'#5a3010','center','bold 10px monospace');}if(t>9&&((t*2)|0)%2)txt('[ JUMP / tap to return to title ]',VW/2,VH-14,'#7a5a30','center','bold 9px monospace');
 if(t<1){ctx.fillStyle=`rgba(255,253,240,${1-t})`;ctx.fillRect(0,0,VW,VH);}}
let last=performance.now(),acc=0;
function frame(now){const raw=(now-last)/1000,el=Math.min(.1,raw);last=now;
 if(raw>0&&raw<1&&S.state==='play'&&!document.hidden){fpsEma+=(1/raw-fpsEma)*.05;if(CFG.fx==='auto'&&!lowFx){if(fpsEma<45)fpsLowT+=raw;else fpsLowT=0;if(fpsLowT>3){lowFx=true;say(P.x-20,P.y-14,'Low effects mode on','#aaa');}}}acc+=el;while(acc>=1/60){pollInput();update(1/60);acc-=1/60;}draw();requestAnimationFrame(frame);}
function resize(){const w=innerWidth,h=innerHeight;let s=Math.min(w/VW,h/VH);const si=Math.floor(s);if(si>=2&&si/s>.88)s=si;cv.style.width=Math.floor(VW*s)+'px';cv.style.height=Math.floor(VH*s)+'px';}
addEventListener('resize',resize);resize();titleMenu();loadArt();requestAnimationFrame(frame);
window.GRUK={skipIntro(){if(S.state==='intro'){S.state='play';stateT=0;fadeIn=0;}},completion,get fadeIn(){return fadeIn},S,get boss(){return boss},get banner(){return banner},set banner(v){banner=v},get P(){return P},get cur(){return cur},get ents(){return ents},kb,enterRoom,newGame,give:a=>{S.ab[a]=1},ROOMS,get ctrlMode(){return ctrlMode},I,CFG,ART,exportArt,get lowFx(){return lowFx},set lowFx(v){lowFx=v},get cut(){return cut},set cut(v){cut=v},travelMenu,settingsMenu,objective,pauseGame,tradeMenu,startNGP,get bolts(){return bolts},get wind(){return wind},get nearTrader(){return nearTrader},get crum(){return crum}};
