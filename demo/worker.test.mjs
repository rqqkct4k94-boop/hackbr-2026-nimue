import {test} from 'node:test';
import assert from 'node:assert/strict';
import {actors, seed, recommendation, MemoryStore,D1Store,createApp} from './worker.mjs';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
test('six students, twelve guardians, four teachers, three administrators',()=>{
 const a=actors();for(const [role,count] of Object.entries({student:6,guardian:12,teacher:4,admin:3}))assert.equal(a.filter(x=>x.role===role).length,count);
 assert.equal(seed().students.filter(recommendation).length,4);
});
test('student, teacher, parent, administrator workflow; denied cross-role access',async()=>{
 const store=new MemoryStore(),app=createApp(store);let cookie='';
 async function call(path,body){const r=await app(new Request('https://test.invalid'+path,{method:body?'POST':'GET',headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));if(r.headers.has('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,body:await r.json()};}
 assert.equal((await call('/api/view')).status,401);
 let r=await call('/api/role',{actor:'S1'});assert.equal(r.body.students.length,1);assert.equal(r.body.students[0].id,'S1');
 assert.equal((await call('/api/action',{type:'approve',studentId:'S1',text:'bad'})).status,403);
 assert.equal((await call('/api/action',{type:'practice',studentId:'S2',answer:'4'})).status,403);
 assert.equal((await call('/api/action',{type:'practice',studentId:'S1',answer:'2'})).body.result.correct,false);
 await call('/api/action',{type:'feedback',studentId:'S1',text:'Preciso de ajuda com frações.'});
 r=await call('/api/role',{actor:'T1'});assert.deepEqual(r.body.students.map(x=>x.id),['S1','S5']);
 assert.equal((await call('/api/action',{type:'approve',studentId:'S2',text:'bad'})).status,403);
 assert.equal((await call('/api/action',{type:'approve',studentId:'S1',text:'Vamos dividir em partes.'})).body.result.status,'approved');
 r=await call('/api/role',{actor:'G1-1'});assert.equal(r.body.students[0].plan.status,'approved');assert.equal(r.body.students.length,1);
 assert.equal((await call('/api/action',{type:'message',studentId:'S1',text:'Obrigado.'})).status,200);
 assert.equal((await call('/api/action',{type:'message',studentId:'S1',text:'Unapproved free-form text'})).status,400);
 assert.equal((await call('/api/action',{type:'message',studentId:'S5',text:'bad'})).status,403);
 r=await call('/api/role',{actor:'A1'});assert.equal(r.body.students.length,0);assert.equal(r.body.aggregate.approved,1);assert.equal(r.body.aggregate.messageCount,1);
 const second=createApp(store);const persisted=await second(new Request('https://test.invalid/api/view',{headers:{cookie}}));assert.equal((await persisted.json()).aggregate.approved,1);
});
test('cross-origin posts blocked and live health is independent of activity',async()=>{const app=createApp(new MemoryStore());const r=await app(new Request('https://test.invalid/api/role',{method:'POST',headers:{origin:'https://other.invalid','content-type':'application/json'},body:'{"actor":"S1"}'}));assert.equal(r.status,403);assert.equal((await app(new Request('https://test.invalid/health'))).status,200);});
test('D1 SQL adapter persists state and rejects stale writes using local SQLite',async()=>{const db=new DatabaseSync(':memory:');try{db.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));const wrapper={prepare(sql){const q=db.prepare(sql);return {bind(...args){return {first:async()=>q.get(...args),run:async()=>({meta:{changes:Number(q.run(...args).changes)}})};}};}};const store=new D1Store(wrapper);await store.create('demo',seed());const r=await store.get('demo');assert.equal(r.version,0);r.payload.actor='S1';assert.equal(await store.save('demo',r.version,r.payload),true);assert.equal(await store.save('demo',r.version,r.payload),false);assert.equal((await new D1Store(wrapper).get('demo')).payload.actor,'S1');}finally{db.close();}});

