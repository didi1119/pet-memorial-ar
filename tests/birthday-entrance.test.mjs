import test from 'node:test';import assert from 'node:assert/strict';import worker from '../work/birthday-reveal/entrance/worker.mjs';
const req=()=>new Request('https://a-little-note.example/');
async function upstream(r,run){const old=globalThis.fetch;globalThis.fetch=async()=>r;try{await run()}finally{globalThis.fetch=old}}
test('unknown upstream must never expose the old birthday page',()=>upstream(new Response('黑醬生日'),async()=>{const r=await worker.fetch(req());assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/黑醬/)}));
test('locked page is the only proxied body',()=>upstream(new Response('等待揭曉',{headers:{'X-Gift-Revealed':'no'}}),async()=>{assert.equal(await (await worker.fetch(req())).text(),'等待揭曉')}));
test('revealed state only redirects to gift',()=>upstream(new Response('birthday',{headers:{'X-Gift-Revealed':'yes'}}),async()=>{const r=await worker.fetch(req());assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'https://heijiang-always-here.pages.dev/')}));
test('foreign-origin submission is rejected',async()=>{const r=await worker.fetch(new Request('https://a-little-note.example/__reveal',{method:'POST',headers:{Origin:'https://evil.example'},body:'password=TEST-PIN'}));assert.equal(r.status,403)});
