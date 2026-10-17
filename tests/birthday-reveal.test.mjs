import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from '../cases/heijiang/site/_worker.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
class DB {
 constructor(){this.released=false;this.attempts=new Map();}
 prepare(sql){const db=this;let args=[];return {bind(...a){args=a;return this},async first(){if(sql.includes('reveal_state'))return db.released?{released_at:'2026-10-17'}:null;return db.attempts.get(args[0])??null},async run(){if(sql.includes('INSERT INTO reveal_state'))db.released=true;else if(sql.includes('reveal_attempts')){const old=db.attempts.get(args[0]);db.attempts.set(args[0],{count:(old?.count??0)+1,window_start:old?.window_start??args[1]})}return {success:true}}};}
}
const salt='test-only-salt';const digest=async p=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+p)))).map(b=>b.toString(16).padStart(2,'0')).join('');
async function setup(){return {REVEAL_DB:new DB(),REVEAL_PASSWORD_HASH:await digest('TEST-PIN'),REVEAL_PASSWORD_SALT:salt,ASSETS:{fetch:async r=>new Response('birthday asset '+new URL(r.url).pathname)}}}
const request=(path='/',options={})=>new Request('https://heijiang-always-here.pages.dev'+path,options);
const post=p=>request('/__reveal',{method:'POST',headers:{'Origin':'https://heijiang-always-here.pages.dev','Content-Type':'application/x-www-form-urlencoded'},body:'password='+p});
test('locked landing shows requested greeting without gift/assets/password leak',async()=>{const env=await setup();const r=await worker.fetch(request(),env);const html=await r.text();assert.equal(r.status,200);assert.match(html,/<h1>祝福77<br>誕辰大壽<\/h1>/);assert.doesNotMatch(html,/心意|有些話|剛剛好/);assert.doesNotMatch(html,/黑醬|琦琦|TEST-PIN|hero\.png|\.mp4|\.glb/);assert.match(r.headers.get('Cache-Control'),/no-store/)});
test('locked assets and alternate paths cannot bypass protection',async()=>{const env=await setup();for(const p of ['/hero.png','/poses/pose-01.glb','/film/test.mp4','/index.html','/manifest.webmanifest']){const r=await worker.fetch(request(p),env);assert.equal(r.status,403,p)}});
test('wrong password keeps everyone locked',async()=>{const e=await setup();assert.equal((await worker.fetch(post('0000'),e)).status,401);assert.equal(e.REVEAL_DB.released,false)});
test('correct password releases once; a fresh device needs no cookie',async()=>{const e=await setup();assert.equal((await worker.fetch(post('TEST-PIN'),e)).status,303);assert.equal(e.REVEAL_DB.released,true);const r=await worker.fetch(request('/hero.png'),e);assert.equal(r.status,200);assert.match(await r.text(),/birthday asset/)});
test('cross-site POST cannot reveal',async()=>{const e=await setup();const r=await worker.fetch(request('/__reveal',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/x-www-form-urlencoded'},body:'password=TEST-PIN'}),e);assert.equal(r.status,403);assert.equal(e.REVEAL_DB.released,false)});
test('ten failed guesses rate limit the source',async()=>{const e=await setup();for(let n=0;n<10;n++)await worker.fetch(post('0000'),e);assert.equal((await worker.fetch(post('TEST-PIN'),e)).status,429);assert.equal(e.REVEAL_DB.released,false)});
test('missing database/credentials fails closed',async()=>{const e=await setup();delete e.REVEAL_DB;assert.equal((await worker.fetch(request('/hero.png'),e)).status,503)});
test('worker source and configuration never served even after release',async()=>{const e=await setup();e.REVEAL_DB.released=true;for(const p of ['/_worker.js','/_routes.json','/wrangler.jsonc'])assert.equal((await worker.fetch(request(p),e)).status,404)});
test('gate permits browser same-origin form Origin rather than null',async()=>{const r=await worker.fetch(request(),await setup());assert.equal(r.headers.get('Referrer-Policy'),'same-origin')});
