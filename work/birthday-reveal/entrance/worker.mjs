// Neutral handoff URL: only the waiting screen is proxied; after reveal, go to the original gift.
const GIFT='https://heijiang-always-here.pages.dev';
export default {async fetch(request){
 const url=new URL(request.url);
 if(!['/','/__reveal'].includes(url.pathname))return new Response('Not found',{status:404});
 if(request.method==='POST' && request.headers.get('Origin')!==url.origin)return new Response('請從原本的入口開啟。',{status:403});
 if(!['GET','HEAD','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
 const headers=new Headers(request.headers);headers.delete('Host');
 if(request.method==='POST')headers.set('Origin',GIFT);
 const upstream=await fetch(new Request(GIFT+url.pathname,{method:request.method,headers,body:request.method==='POST'?request.body:undefined,redirect:'manual'}));
 if(upstream.status===303 || upstream.headers.get('X-Gift-Revealed')==='yes')return new Response(null,{status:303,headers:{Location:GIFT+'/', 'Cache-Control':'no-store'}});
 if(upstream.headers.get('X-Gift-Revealed')!=='no')return new Response('入口準備中，請稍後再試。',{status:503,headers:{'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'}});
 return upstream;
}};
