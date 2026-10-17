// Advanced-mode Pages Worker. This file is executed at the edge, never sent to visitors.
const PRIVATE = new Set(['/_worker.js', '/_routes.json', '/wrangler.jsonc', '/wrangler.toml', '/.dev.vars']);
const NO_STORE = {'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Gift-Revealed':'no'};
const response = (text,status=200,type='text/plain; charset=utf-8') => new Response(text,{status,headers:{...NO_STORE,'Content-Type':type}});
const hash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const equal = (a,b) => {if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0;};
const scopeOf = host => /^(heijiang-always-here|main\.heijiang-always-here)\.pages\.dev$/.test(host) ? 'birthday-2026' : 'preview:'+host;
const gate = (message='',status=200) => response(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta name="theme-color" content="#f3ede3"><title>一份心意・等待揭曉</title><style>
*{box-sizing:border-box}html{background:#f3ede3;color:#514238}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:30px;font-family:"Songti TC","Noto Serif TC",serif;background:radial-gradient(ellipse at 50% 10%,#fffdf6,transparent 65%)}main{width:min(100%,450px);text-align:center;padding:48px 32px 36px;background:#fffbf3;border:1px solid #e6dbca;box-shadow:0 3px 0 #e4d8c7,0 25px 70px #59433014;border-radius:5px;position:relative}main:before{content:"";position:absolute;width:78px;height:24px;top:-11px;left:calc(50% - 39px);transform:rotate(-4deg);background:#a6b5a39c}.mark{font-size:38px;color:#b29361;display:block;margin:0 0 28px}small{font-size:11px;letter-spacing:.28em;color:#927c64}h1{font-size:32px;line-height:1.55;font-weight:400;letter-spacing:.16em;margin:16px 0}p{font-size:16px;line-height:2;color:#88796a;margin:18px 0 32px}label{display:block;font-size:12px;color:#88796a;letter-spacing:.12em;margin-bottom:10px}input{font:22px serif;letter-spacing:.55em;text-align:center;width:100%;height:54px;border:1px solid #d6c7b4;border-radius:8px;background:#f9f3e8;color:#514238;outline-offset:4px}button{margin-top:13px;border:0;border-radius:40px;background:#8c6e53;color:#fffaf1;width:100%;height:52px;font:15px serif;letter-spacing:.12em;cursor:pointer}button:hover{background:#76593f}:focus-visible{outline:2px solid #8c6e53;outline-offset:4px}.hint{font-size:12px;margin:24px 0 0;color:#a29483}.error{font-size:13px;color:#9a493d;margin:12px 0;line-height:1.7}footer{margin-top:30px;font-size:11px;color:#b1a18f;letter-spacing:.18em}@media(max-width:430px){main{padding:42px 25px 30px}h1{font-size:28px}}</style></head><body><main><span class="mark" aria-hidden="true">✧</span><small>留 一 點 期 待</small><h1>有一份心意，<br>正在等你。</h1><p>有些話，<br>想留到剛剛好的時刻，再說。</p><form method="post" action="/__reveal"><label for="password">揭曉密碼</label><input id="password" name="password" type="password" inputmode="numeric" autocomplete="off" maxlength="32" required aria-describedby="reveal-message"><button type="submit">打開這份心意</button><div id="reveal-message" class="error" role="status">${message}</div></form><p class="hint">請把這一刻，留到現場。</p><footer>一 份 心 意 · 等 待 揭 曉</footer></main></body></html>`,status,'text/html; charset=utf-8');
export default {
 async fetch(request,env){
  const url=new URL(request.url),scope=scopeOf(url.hostname);
  if(PRIVATE.has(decodeURIComponent(url.pathname)))return response('Not found',404);
  try{
   if(!env.REVEAL_DB || !env.REVEAL_PASSWORD_HASH || !env.REVEAL_PASSWORD_SALT)return response('入口正在準備中，請稍後再試。',503);
   const released=await env.REVEAL_DB.prepare('SELECT released_at FROM reveal_state WHERE id = ?').bind(scope).first();
   if(released){const asset=await env.ASSETS.fetch(request);const open=new Response(asset.body,asset);open.headers.set('X-Gift-Revealed','yes');return open;}
   if(url.pathname==='/__reveal' && request.method==='POST'){
    if(request.headers.get('Origin')!==url.origin)return response('請從原本的入口開啟。',403);
    if(Number(request.headers.get('content-length')??0)>2048)return response('Request too large',413);
    const type=request.headers.get('content-type')??'';
    if(!type.startsWith('application/x-www-form-urlencoded'))return response('Unsupported request',415);
    const text=await request.text();if(text.length>2048)return response('Request too large',413);
    const password=new URLSearchParams(text).get('password')??'';
    const key=scope+':'+await hash(env.REVEAL_PASSWORD_SALT+':'+(request.headers.get('CF-Connecting-IP')??'local'));
    const now=Math.floor(Date.now()/1000),cutoff=now-900;
    const attempts=await env.REVEAL_DB.prepare('SELECT count, window_start FROM reveal_attempts WHERE client = ?').bind(key).first();
    if(attempts && attempts.window_start>cutoff && attempts.count>=10)return gate('試了好多次，讓心意休息一下。請在 15 分鐘後再試。',429);
    if(!equal(await hash(env.REVEAL_PASSWORD_SALT+':'+password),env.REVEAL_PASSWORD_HASH)){
     await env.REVEAL_DB.prepare('INSERT INTO reveal_attempts (client,count,window_start) VALUES (?,1,?) ON CONFLICT(client) DO UPDATE SET count=CASE WHEN window_start <= ? THEN 1 ELSE count+1 END, window_start=CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END').bind(key,now,cutoff,cutoff).run();
     return gate('還不是這一把鑰匙，再試一次。',401);
    }
    await env.REVEAL_DB.prepare('INSERT INTO reveal_state (id,released_at) VALUES (?,?) ON CONFLICT(id) DO NOTHING').bind(scope,new Date().toISOString()).run();
    return new Response(null,{status:303,headers:{...NO_STORE,Location:'/'}});
   }
   if(url.pathname==='/' && (request.method==='GET'||request.method==='HEAD'))return gate();
   return response('這份心意還在等待揭曉。',403);
  }catch{return response('入口暫時沒有連上，請稍後再試。',503);}
 }
};
