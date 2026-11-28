/* CORSO I.A. – lettore vocale locale basato su Web Speech API.
   Nessun testo viene inviato a un servizio TTS da questo script.
   La gestione della sintesi e le voci disponibili dipendono dal browser/sistema. */
(function(){
'use strict';
if(window.CorsoIALettoreAvviato)return;
window.CorsoIALettoreAvviato=true;
const supported=('speechSynthesis' in window)&&('SpeechSynthesisUtterance' in window);
const synthesizer=supported?window.speechSynthesis:null;
let segments=[],index=0,playing=false,paused=false,run=0,currentTarget=null;
const key='corso_ia_speech_rate_v1';
let speed=1;
try{const saved=Number(localStorage.getItem(key));if([0.8,1,1.2,1.4].includes(saved))speed=saved}catch(e){}
const css=`
#corso-ia-audio{position:sticky;top:0;z-index:20;max-width:840px;margin:12px auto 20px;padding:12px;border:1px solid #54708a;border-radius:13px;background:#152d42;color:#f3f7fc;box-shadow:0 5px 14px #0003}
#corso-ia-audio .audio-head{font-weight:700;margin-bottom:9px;display:flex;gap:8px;align-items:center}
#corso-ia-audio .audio-buttons{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#corso-ia-audio button,#corso-ia-audio select{font:inherit;border:1px solid #8ab6d5;color:#fff;background:#315b7b;border-radius:9px;padding:10px 13px;min-height:43px;cursor:pointer}
#corso-ia-audio button:disabled{opacity:.45;cursor:default}
#corso-ia-audio select{background:#263f56}
#corso-ia-audio label{font-size:13px;display:flex;align-items:center;gap:6px}
#corso-ia-audio p{margin:9px 0 0;color:#bfd4e5;font-size:13px;line-height:1.4}
#corso-ia-audio button:focus-visible,#corso-ia-audio select:focus-visible{outline:3px solid #fff}
`;
const style=document.createElement('style');style.textContent=css;document.head.appendChild(style);
function getTarget(){return document.querySelector('main#app')||document.querySelector('main')}
function isLesson(){const m=getTarget();return !!m && (!!m.querySelector('h1')) && (location.pathname.includes('/lezioni/')|| !!m.querySelector('.tag')&&m.textContent.includes('Modulo 1'))}
function clean(t){return (t||'').replace(/\s+/g,' ').trim()}
function content(){
const root=getTarget();if(!root)return[];
const result=[];
const head=root.querySelector('h1');if(head)result.push(clean(head.textContent));
const lead=root.querySelector('.lead');if(lead)result.push(clean(lead.textContent));
const parts=[...root.querySelectorAll('section.card, section.exercise, .card')].filter(el=>!el.parentElement.closest('section.card, section.exercise, .card'));
for(const part of parts){
 if(part.querySelector('fieldset')||/verifica (dell.apprendimento|interattiva|con correzione)/i.test(part.querySelector('h2')?.textContent||''))continue;
 if(/fonti ufficiali|documentazione per approfondire|per approfondire/i.test(part.querySelector('h2')?.textContent||''))continue;
 const texts=[...part.querySelectorAll('h2,h3,p,li')].filter(e=>!e.closest('fieldset')&&!e.closest('.sources')&&!e.closest('button')&&!e.querySelector('p,li,h2,h3'));
 for(const el of texts){const t=clean(el.textContent);if(t&&t.length>3&&t.length<6000)result.push(t)}
}
return result;
}
function chunkText(items){
const chunks=[];
for(const item of items){
 const text=clean(item);
 const sentences=text.match(/[^.!?;:]+[.!?;:]?/g)||[text];
 let piece='';
 for(let sentence of sentences){
  sentence=clean(sentence);
  if(!sentence)continue;
  if(sentence.length>190){
   if(piece){chunks.push(piece);piece=''}
   const words=sentence.split(' ');let sub='';
   for(const w of words){if(sub&&sub.length+w.length+1>160){chunks.push(sub);sub=''}sub+=(sub?' ':'')+w}
   if(sub)chunks.push(sub);
  }else if(piece.length+sentence.length+1>185){chunks.push(piece);piece=sentence}else piece+=(piece?' ':'')+sentence;
 }
 if(piece)chunks.push(piece);
}
return chunks.filter(Boolean);
}
function voice(){
const voices=synthesizer.getVoices();
return voices.find(v=>v.lang.toLowerCase()==='it-it'&&v.localService)||voices.find(v=>v.lang.toLowerCase()==='it-it')||voices.find(v=>v.lang.toLowerCase().startsWith('it'))||null;
}
function sayNext(token){
 if(!playing||paused||run!==token)return;
 if(index>=segments.length){finish('Lettura completata.');return}
 const utter=new SpeechSynthesisUtterance(segments[index]);utter.lang='it-IT';utter.rate=speed;
 const v=voice();if(v)utter.voice=v;
 utter.onend=()=>{if(token!==run||!playing||paused)return;index++;setStatus('Lettura in corso · parte '+Math.min(index+1,segments.length)+' di '+segments.length);sayNext(token)};
 utter.onerror=e=>{if(token!==run)return;if(e.error==='interrupted'||e.error==='canceled')return;finish('La voce non è disponibile. Prova con Safari e controlla il volume.')};
 setStatus('Lettura in corso · parte '+(index+1)+' di '+segments.length);
 try{synthesizer.speak(utter)}catch(e){finish('Impossibile avviare la voce su questo dispositivo.')}
}
function stopSpeaking(){run++;if(supported){try{synthesizer.cancel()}catch(e){}}playing=false;paused=false;index=0;renderButtons()}
function finish(message){stopSpeaking();setStatus(message)}
let box,playButton,pauseButton,stopButton,status;
function setStatus(text){if(status)status.textContent=text}
function renderButtons(){if(!box)return;playButton.textContent=playing?'↻ Ricomincia':'▶ Ascolta la lezione';pauseButton.textContent=paused?'▶ Riprendi':'⏸ Pausa';pauseButton.disabled=!playing;stopButton.disabled=!playing}
function start(){
 if(!supported){setStatus('Sintesi vocale non disponibile in questo browser.');return}
 stopSpeaking();segments=chunkText(content());if(!segments.length){setStatus('Non ho trovato testo da leggere in questa pagina.');return}
 playing=true;paused=false;index=0;run++;renderButtons();sayNext(run);
}
function pauseResume(){
 if(!supported||!playing)return;
 if(!paused){paused=true;try{synthesizer.pause()}catch(e){}setStatus('Lettura in pausa.');renderButtons()}
 else{paused=false;try{synthesizer.resume()}catch(e){}setStatus('Lettura ripresa.');renderButtons()}
}
function install(){
 const target=getTarget();
 if(!target||!isLesson()){if(box){stopSpeaking();box.remove();box=null;currentTarget=null}return}
 if(box&&currentTarget===target)return;
 if(box){stopSpeaking();box.remove()}
 currentTarget=target;
 box=document.createElement('section');box.id='corso-ia-audio';box.setAttribute('aria-label','Lettore vocale della lezione');
 box.innerHTML='<div class="audio-head">🔊 Ascolta la lezione in italiano</div><div class="audio-buttons"><button type="button" class="start">▶ Ascolta la lezione</button><button type="button" class="pause" disabled>⏸ Pausa</button><button type="button" class="stop" disabled>■ Ferma</button><label>Velocità <select aria-label="Velocità di lettura"><option value="0.8">0,8×</option><option value="1">1×</option><option value="1.2">1,2×</option><option value="1.4">1,4×</option></select></label></div><p role="status" aria-live="polite"></p>';
 const lead=target.querySelector('h1');
 if(lead)lead.insertAdjacentElement('afterend',box);else target.prepend(box);
 playButton=box.querySelector('.start');pauseButton=box.querySelector('.pause');stopButton=box.querySelector('.stop');status=box.querySelector('[role=status]');
 const select=box.querySelector('select');select.value=String(speed);
 playButton.addEventListener('click',start);pauseButton.addEventListener('click',pauseResume);
 stopButton.addEventListener('click',()=>finish('Lettura interrotta.'));
 select.addEventListener('change',()=>{speed=Number(select.value);try{localStorage.setItem(key,String(speed))}catch(e){}if(playing){setStatus('La nuova velocità si applica al prossimo brano.')}});
 setStatus(supported?'Premi Ascolta per iniziare. La voce dipende dalle impostazioni dell’iPhone.':'Lettura vocale non disponibile in questo browser.');
 if(!supported){playButton.disabled=true}
}
let pending=false;
const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;const target=getTarget();if(!isLesson()){install();return}if(!box||!box.isConnected||target!==currentTarget)install()})});
observer.observe(document.body,{subtree:true,childList:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){/* iOS may interrupt playback in background; user may resume manually */}});
window.addEventListener('pagehide',()=>{if(playing)stopSpeaking()});
install();
})();