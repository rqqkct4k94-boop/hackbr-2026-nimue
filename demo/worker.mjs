// Hack Brasil 2026 — original, synthetic-only demonstration.
const DAY = 86_400_000;
const topics = [
  ['frações', 'Qual é metade de 8?', '4', 'Divida o número em duas partes iguais.'],
  ['leitura', 'Quantas letras tem a palavra CASA?', '4', 'Conte cada letra da palavra.'],
  ['geometria', 'Quantos lados tem um triângulo?', '3', 'Identifique os lados da figura.'],
  ['escrita', 'Complete: O sol ___ claro. (é/ser)', 'é', 'Use o verbo no presente.'],
  ['ciências', 'Qual gás as plantas liberam na fotossíntese?', 'oxigênio', 'Relacione luz, água e gás carbônico.'],
  ['aritmética', 'Quanto é 7 × 6?', '42', 'Decomponha 7 × 6 em 7 × 5 + 7.']
];
const roster = [45,55,76,42,85,60];
const people = [
  ...roster.map((_,i)=>({id:'S'+(i+1),name:'Estudante '+(i+1),role:'student'})),
  ...roster.flatMap((_,i)=>[1,2].map(j=>({id:`G${i+1}-${j}`,name:`Responsável ${i+1}.${j}`,role:'guardian',studentId:'S'+(i+1)}))),
  ...[1,2,3,4].map(i=>({id:'T'+i,name:'Professor '+i,role:'teacher'})),
  {id:'A1',name:'Coordenação',role:'admin'},{id:'A2',name:'Direção',role:'admin'},{id:'A3',name:'Administração',role:'admin'}
];
export const actors = () => structuredClone(people);
const fail = (message,status=400) => Object.assign(new Error(message),{status});
const bounded = (v,max=500) => { if(typeof v!=='string'||!v.trim()||v.length>max) throw fail('Texto inválido.'); return v.trim(); };
const demoPhrases={approve:['Vamos dividir em partes.','Revisar o tema em uma sessão guiada.','Praticar com exemplos e acompanhar na próxima aula.'],feedback:['Preciso de ajuda com frações.','Compreendi o conceito.','Quero tentar outro exemplo.'],message:['Obrigado.','Podemos acompanhar o plano nesta semana?','A reunião sugerida funciona para a família.','Sugiro uma atividade curta de revisão.']};
function demoPhrase(type,value){if(!demoPhrases[type]?.includes(value))throw fail('Use uma frase fictícia da demonstração. Não envie dados pessoais.');return value;}
const now = () => Date.now();
export function seed(at=now()) {
  return {actor:null,students:roster.map((score,i)=>({id:'S'+(i+1),teacherId:'T'+(i%4+1),topic:topics[i][0],score,
    attendance:[true,true,i%3!==0,true,true],assessments:[{at:at-3*DAY,score,topic:topics[i][0],kind:'avaliação inicial'}],
    plan:null,feedback:[],messages:[]})),createdAt:at};
}
function getActor(state){const a=people.find(x=>x.id===state.actor);if(!a)throw fail('Selecione um papel de demonstração.',401);return a;}
function visible(a,s){return a.role==='student'&&s.id===a.id||a.role==='guardian'&&s.id===a.studentId||a.role==='teacher'&&s.teacherId===a.id;}
export function recommendation(s){const t=topics.find(x=>x[0]===s.topic);return s.score<70?{topic:s.topic,evidence:`Último resultado: ${s.score}/100`,next:t[3],meetingMinutes:15,status:s.plan?.status||'teacher-review'}:null;}
function reports(s,at=now()){return [7,30,60,365].map(days=>{const events=s.assessments.filter(e=>e.at>=at-days*DAY);return {days,attempts:events.length,average:events.length?Math.round(events.reduce((sum,e)=>sum+e.score,0)/events.length):null,attendance:s.attendance.filter(Boolean).length+'/'+s.attendance.length};});}
export function view(state){const a=getActor(state);const students=state.students.filter(s=>visible(a,s)).map(s=>{const t=topics.find(x=>x[0]===s.topic);return {id:s.id,name:'Estudante '+s.id.slice(1),teacherId:s.teacherId,topic:s.topic,score:s.score,attendance:s.attendance.filter(Boolean).length+'/'+s.attendance.length,assessment:s.assessments,plan:s.plan,feedback:s.feedback,messages:s.messages,recommendation:recommendation(s),reports:reports(s),practice:a.role==='student'?{question:t[1],hint:t[3]}:undefined};});
  return {actor:a,students,aggregate:a.role==='admin'?{students:state.students.length,teacherReview:state.students.filter(recommendation).length,approved:state.students.filter(s=>s.plan?.status==='approved').length,meanScore:Math.round(state.students.reduce((v,s)=>v+s.score,0)/state.students.length),feedbackCount:state.students.reduce((v,s)=>v+s.feedback.length,0),messageCount:state.students.reduce((v,s)=>v+s.messages.length,0)}:undefined,method:'Recomendação baseada em regras e evidências; IA generativa não conectada.'};}
export function action(state,body,at=now()){
  const a=getActor(state);const s=state.students.find(x=>x.id===body.studentId);
  if(!s||!visible(a,s))throw fail('Acesso negado a este estudante.',403);
  if(body.type==='practice'&&a.role==='student'){
    const t=topics.find(x=>x[0]===s.topic);const answer=bounded(body.answer,120).normalize('NFC').toLocaleLowerCase('pt-BR');
    const result=answer===t[2]?100:0;s.assessments.push({at,score:result,topic:s.topic,kind:'prática formativa'});s.assessments=s.assessments.slice(-30);s.score=result;
    return {correct:result===100,score:result,explanation:result===100?'Resposta correta. Continue praticando.':t[3]};
  }
  if(body.type==='approve'&&a.role==='teacher'){
    if(!recommendation(s))throw fail('Não há lacuna que exija revisão.');
    s.plan={status:'approved',teacher:a.id,meetingMinutes:15,at,feedback:demoPhrase(body.type,body.text)};return {status:'approved'};
  }
  if(body.type==='feedback'&&a.role==='student'){
    s.feedback.push({by:a.id,text:demoPhrase(body.type,body.text),at});s.feedback=s.feedback.slice(-20);return {status:'recorded'};
  }
  if(body.type==='message'&&['guardian','teacher'].includes(a.role)){
    s.messages.push({from:a.id,to:a.role==='guardian'?s.teacherId:'responsáveis do estudante',text:demoPhrase(body.type,body.text),at});s.messages=s.messages.slice(-20);return {status:'recorded'};
  }
  throw fail('Operação não autorizada para este papel.',403);
}
export class MemoryStore {
  constructor(){this.runs=new Map();}
  async get(id){return this.runs.has(id)?structuredClone(this.runs.get(id)):null;}
  async create(id,payload){this.runs.set(id,{version:0,payload:structuredClone(payload)});}
  async save(id,version,payload){if(this.runs.get(id)?.version!==version)return false;this.runs.set(id,{version:version+1,payload:structuredClone(payload)});return true;}
}
export class D1Store {
  constructor(db){if(!db)throw fail('Banco de demonstração não configurado.',503);this.db=db;}
  async get(id){const row=await this.db.prepare('SELECT version,payload FROM demo_runs WHERE id=?').bind(id).first();return row?{version:row.version,payload:JSON.parse(row.payload)}:null;}
  async create(id,payload){await this.db.prepare('INSERT INTO demo_runs(id,version,payload) VALUES(?,0,?)').bind(id,JSON.stringify(payload)).run();}
  async save(id,version,payload){const r=await this.db.prepare('UPDATE demo_runs SET version=version+1,payload=? WHERE id=? AND version=?').bind(JSON.stringify(payload),id,version).run();return r.meta.changes===1;}
}
const baseHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'"};
const json=(v,status=200,extra={})=>new Response(JSON.stringify(v),{status,headers:{...baseHeaders,'Content-Type':'application/json; charset=utf-8',...extra}});
const cookieId=(r)=>(r.headers.get('cookie')||'').match(/(?:^|;\s*)nimue_run=([a-f0-9-]{36})(?:;|$)/)?.[1];
async function bodyOf(req){if((req.headers.get('content-type')||'').split(';')[0]!=='application/json')throw fail('JSON obrigatório.',415);const raw=await req.text();if(raw.length>4096)throw fail('Solicitação muito grande.',413);try{return JSON.parse(raw);}catch{throw fail('JSON inválido.');}}
export function createApp(store){return async req=>{try{
  const url=new URL(req.url);const path=url.pathname;const method=req.method;
  if(path==='/'&&method==='GET')return new Response(HTML,{headers:{...baseHeaders,'Content-Type':'text/html; charset=utf-8'}});
  if(path==='/health'&&method==='GET')return json({service:'nimue',status:'ok',data:'synthetic'});
  if(path==='/api/roles'&&method==='GET')return json(actors());
  if(method==='POST'&&req.headers.get('origin')&&req.headers.get('origin')!==url.origin)throw fail('Origem não autorizada.',403);
  let id=cookieId(req);let run=id?await store.get(id):null;
  if(path==='/api/role'&&method==='POST'){
    const b=await bodyOf(req);if(!people.some(x=>x.id===b.actor))throw fail('Papel inválido.');
    const fresh=!run;if(fresh){id=crypto.randomUUID();run={version:0,payload:seed()};run.payload.actor=b.actor;await store.create(id,run.payload);}else{run.payload.actor=b.actor;if(!await store.save(id,run.version,run.payload))throw fail('Tente novamente.',409);}
    return json(view(run.payload),200,{'Set-Cookie':`nimue_run=${id}; Path=/; HttpOnly; SameSite=Strict${url.protocol==='https:'?'; Secure':''}; Max-Age=86400`});
  }
  if(!run)throw fail('Selecione um papel de demonstração.',401);
  if(path==='/api/view'&&method==='GET')return json(view(run.payload));
  if(path==='/api/action'&&method==='POST'){
    const b=await bodyOf(req);const result=action(run.payload,b);if(!await store.save(id,run.version,run.payload))throw fail('Tente novamente.',409);return json({result,view:view(run.payload)});
  }
  return json({error:'Não encontrado.'},404);
}catch(e){return json({error:e.status?e.message:'Erro interno da demonstração.'},e.status||500);}};}
export default {fetch(req,env){return createApp(new D1Store(env.DB))(req);}};

const HTML=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nimue · Escola que acompanha</title><style>
:root{font-family:Segoe UI,system-ui,sans-serif;color:#102735;background:#f0f5f5}*{box-sizing:border-box}body{margin:0}header{background:#103838;color:white;padding:30px max(24px,calc((100vw - 1080px)/2));display:flex;align-items:center;gap:20px;justify-content:space-between}h1{font-size:30px;margin:.2rem 0}h2,h3{margin:0 0 12px}p{line-height:1.5}.eyebrow{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#88e0b9}.wrap{max-width:1100px;margin:auto;padding:24px}.notice{border:1px solid #b4d6c5;background:#e5f5ec;border-radius:12px;padding:14px;margin-bottom:18px}.selector,.card{background:white;border:1px solid #d6e4e0;border-radius:15px;padding:20px;margin-bottom:16px;box-shadow:0 3px 12px #1637270b}.selector{display:flex;gap:12px;align-items:end;flex-wrap:wrap}label{display:block;font-weight:600;font-size:14px}select,input,textarea,button{font:inherit}select,input,textarea{border:1px solid #aac1b9;border-radius:8px;padding:10px;width:100%;background:white}button{border:0;background:#176b54;color:white;padding:10px 14px;border-radius:8px;font-weight:600;cursor:pointer}button:focus,input:focus,select:focus,textarea:focus{outline:3px solid #e7b84e;outline-offset:2px}button:disabled{opacity:.5}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:16px}.metric{font-size:37px;font-weight:700;color:#176b54}.muted{color:#526b65;font-size:14px}.pill{display:inline-block;background:#eff5dc;color:#34481c;padding:5px 9px;border-radius:20px;font-size:13px}.section{border-top:1px solid #d6e4e0;padding-top:12px;margin-top:16px}textarea{min-height:65px}footer{font-size:13px;color:#526b65;padding:22px 0}#status{min-height:24px;color:#175e49;font-weight:600}.error{color:#9b2020!important}.reports{display:grid;gap:5px;font-size:14px}</style></head><body><header><div><div class="eyebrow">Royalcrafter / Hack Brasil 2026</div><h1>Nimue</h1><div>Escola que acompanha cada aprendizado.</div></div><div>Demo escolar</div></header><main class="wrap"><div class="notice"><strong>Ambiente sintético.</strong> Todos os perfis e comunicações são fictícios. Trocar de papel é apenas um recurso de apresentação; a API aplica os limites do papel selecionado. Recomendações são baseadas em regras, e não decisões automáticas.</div><div class="selector"><div style="min-width:250px"><label for="role">Entrar como</label><select id="role"></select></div><button id="enter">Abrir ambiente</button><div id="status" role="status" aria-live="polite"></div></div><div id="content"><p class="muted">Escolha um papel para acompanhar a jornada de aprendizagem.</p></div><footer>Hack Brasil 2026 · Dados exclusivamente sintéticos · Demonstração técnica.</footer></main><script>
const $=id=>document.getElementById(id);const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);if(cls)e.className=cls;return e;};const append=(root,...children)=>{children.forEach(c=>root.append(c));return root;};
async function api(path,body){const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const v=await r.json();if(!r.ok)throw new Error(v.error||'Erro');return v;}
function status(s,error=false){$('status').textContent=s;$('status').className=error?'error':'';}
function card(title,value){return append(el('div',undefined,'card'),el('p',title,'muted'),el('div',value,'metric'));}
const demoPhrases=${JSON.stringify(demoPhrases)};
function form(parent,label,type,s,field='text'){const f=el('form',undefined,'section'),id=type+'-'+s.id;const lab=el('label',label);lab.htmlFor=id;const input=el(field==='answer'?'input':'select');input.id=id;input.required=true;if(field==='answer'){input.maxLength=120;input.autocomplete='off';}else{for(const phrase of demoPhrases[type]){const o=el('option',phrase);o.value=phrase;input.append(o);}}const b=el('button',type==='practice'?'Responder':type==='approve'?'Aprovar plano':type==='feedback'?'Enviar retorno':'Enviar mensagem');b.type='submit';f.addEventListener('submit',async e=>{e.preventDefault();b.disabled=true;try{const r=await api('/api/action',{type,studentId:s.id,[field]:input.value});render(r.view);status(r.result.explanation||'Registro salvo.');}catch(err){status(err.message,true);}finally{b.disabled=false;}});append(f,lab,input,b);parent.append(f);}
function render(v){const root=$('content');root.replaceChildren(el('h2',v.actor.name),el('p',v.method,'muted'));if(v.aggregate){const g=el('div',undefined,'grid');Object.entries({Estudantes:v.aggregate.students,'Atenção pedagógica':v.aggregate.teacherReview,'Planos aprovados':v.aggregate.approved,'Média geral':v.aggregate.meanScore+'%' ,'Retornos':v.aggregate.feedbackCount,'Mensagens':v.aggregate.messageCount}).forEach(([k,n])=>g.append(card(k,n)));root.append(g);return;}const g=el('div',undefined,'grid');for(const s of v.students){const c=el('article',undefined,'card');append(c,el('h3',s.name),el('div',s.score+' / 100','metric'),el('p','Tema: '+s.topic+' · Presença: '+s.attendance),el('span',s.recommendation?'Revisão sugerida':'Progresso adequado','pill'));if(s.recommendation)append(c,el('p',s.recommendation.evidence+' · Próximo passo: '+s.recommendation.next));if(s.plan)append(c,el('p','Plano aprovado: '+s.plan.feedback+' · Reunião '+s.plan.meetingMinutes+' min.'));if(v.actor.role==='student'){append(c,el('h3','Sessão de aprendizagem'),el('p',s.practice.question),el('p',s.practice.hint,'muted'));form(c,'Sua resposta','practice',s,'answer');form(c,'Como foi sua aprendizagem?','feedback',s);}if(v.actor.role==='teacher'&&s.recommendation)form(c,'Plano de intervenção','approve',s);if(v.actor.role==='guardian'||v.actor.role==='teacher')form(c,'Mensagem à escola / família','message',s);if(s.feedback.length)append(c,el('h3','Retornos'),...s.feedback.map(x=>el('p',x.by+': '+x.text)));if(s.messages.length)append(c,el('h3','Comunicação'),...s.messages.map(x=>el('p',x.from+': '+x.text)));const r=el('div',undefined,'section reports');r.append(el('h3','Relatórios de acompanhamento'));for(const p of s.reports)r.append(el('div',p.days+' dias · '+p.attempts+' avaliações · média '+(p.average===null?'—':p.average)+' · presença '+p.attendance));c.append(r);g.append(c);}root.append(g);}
$('enter').onclick=async()=>{try{render(await api('/api/role',{actor:$('role').value}));status('Ambiente aberto.');}catch(e){status(e.message,true);}};api('/api/roles').then(roles=>{for(const a of roles){const o=el('option',a.name+' · '+a.role);o.value=a.id;$('role').append(o);}return api('/api/view').catch(()=>null);}).then(v=>{if(v){$('role').value=v.actor.id;render(v);}}).catch(e=>status(e.message,true));</script></body></html>`;

