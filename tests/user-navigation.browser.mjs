import assert from 'node:assert/strict';
import { browserContext, connectToBrowser } from './browser-context.mjs';
const { app, api, target, report, setPublicationEnabled } = browserContext();
const browser = await connectToBrowser(target), {cmd} = browser;
const actor = '11111111-1111-4111-8111-111111111111';
const A = '22222222-2222-4222-8222-222222222222';
const B = '44444444-4444-4444-8444-444444444444';
const held = [], requests = [], errors = [], cases = [];
let releaseA = false, pass = false;
async function ev(expression) {
  const r = await cmd('Runtime.evaluate', {expression, returnByValue:true, awaitPromise:true});
  assert(!r.exceptionDetails, JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression) {
  const end = Date.now()+15000;
  while (!(await ev(`!!(${expression})`))) {
    assert(Date.now()<end, 'Timed out: '+expression);
    await new Promise(resolve=>setTimeout(resolve,50));
  }
}
const dataFor = id => ({id, name:id===A?'Held A':id===B?'Loaded B':'Synthetic admin', display_name:id===A?'Held A':id===B?'Loaded B':'Synthetic admin', email_verified:true,enabled:true,admin:id===actor,created_at:123,last_login:123,tags:[]});
async function fulfill(requestId,data,status=200) {
  await cmd('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[
    {name:'Content-Type',value:'application/json'},
    {name:'Access-Control-Allow-Origin',value:'*'},
    {name:'Access-Control-Allow-Headers',value:'Authorization, Content-Type'},
    {name:'Access-Control-Allow-Methods',value:'GET, OPTIONS'}
  ],body:Buffer.from(JSON.stringify(data)).toString('base64')});
}
async function mock({request,requestId}) {
  const url = new URL(request.url);
  if (url.origin===app || ['data:','blob:'].includes(url.protocol)) return cmd('Fetch.continueRequest',{requestId});
  if (url.origin!==api) {
    errors.push('external request blocked');
    return cmd('Fetch.failRequest',{requestId,errorReason:'BlockedByClient'});
  }
  assert(['GET','OPTIONS'].includes(request.method),'No fixture write permitted');
  requests.push({method:request.method,path:url.pathname});
  if (request.method==='OPTIONS') return fulfill(requestId,{});
  if (url.pathname===`/auth/users/${A}` && !releaseA) {held.push(requestId);return;}
  if (url.pathname.startsWith('/auth/users/')) return fulfill(requestId,dataFor(url.pathname.split('/').pop()));
  if (/^\/skills\/xp\//.test(url.pathname)) {
    const id=url.pathname.split('/').pop();
    return fulfill(requestId,{total_xp:id===A?42:id===B?84:0,skills:[]});
  }
  if (/^\/shop\/coins\//.test(url.pathname)) return fulfill(requestId,{coins:0});
  if (/^\/auth\/admin\/users\/[^/]+\/publication$/.test(url.pathname)) {
    const isA=url.pathname.includes(A);
    return fulfill(requestId,{profile_visibility:isA?'shared':'private',visibility_revision:isA?3:8,shared_at:isA?123:null,withdrawn_at:isA?null:234});
  }
  return fulfill(requestId,{});
}
browser.onEvent(message=>{
  if (message.method==='Fetch.requestPaused') mock(message.params).catch(error=>errors.push(String(error)));
  if (message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails?.text??'runtime exception');
});
const nuxt = `document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$nuxt`;
const installWalk = `globalThis.__navigationFindPage=()=>{const seen=new Set();let found;function walk(v){if(!v||typeof v!=='object'||seen.has(v))return;seen.add(v);if(v.component){const c=v.component;if(c.setupState&&'supportContext' in c.setupState&&'userID' in c.setupState)found=c;walk(c.subTree);}if(Array.isArray(v.children))v.children.forEach(walk);if(v.suspense){walk(v.suspense.activeBranch);walk(v.suspense.pendingBranch);}}walk(document.querySelector('#__nuxt')._vnode);return found;};`;
const snapshot = `(()=>{const n=${nuxt},p=globalThis.__navigationFindPage(),a=globalThis.__navigationAInstance;return {path:location.pathname,appUser:n.payload.state.$sappUser?{id:n.payload.state.$sappUser.id,name:n.payload.state.$sappUser.name}:null,page:p?{uid:p.uid,userID:p.setupState.userID,isUnmounted:p.isUnmounted}:null,oldA:a?{uid:a.uid,userID:a.setupState.userID,isUnmounted:a.isUnmounted,scopeActive:a.scope.active}:null,xp:[...document.querySelectorAll('main article h6')].map(e=>e.textContent.trim()),publicationStatus:document.querySelector('[data-publication-status]')?.innerText,mainText:document.querySelector('main')?.innerText.slice(0,2400)};})()`;
try {
  for (const method of ['Page.enable','Runtime.enable','Network.enable']) await cmd(method);
  await cmd('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
  await cmd('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
  for (const [name,value] of Object.entries({locale:'en-US',user:JSON.stringify({id:actor,admin:true}),session:JSON.stringify({id:'mfa-session',user_id:actor,mfa_verified:true}),authGeneration:'fixture-login',accessToken:'eyJhbGciOiJub25lIn0.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+10000})).toString('base64url')+'.x',refreshToken:'synthetic-refresh'}))
    await cmd('Network.setCookie',{name,value:encodeURIComponent(value),url:app,path:'/'});
  setPublicationEnabled(true);
  await cmd('Page.navigate',{url:app+`/dashboard/users/${A}`});
  await until(`document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$nuxt?.$router && !!document.querySelector('main')`);
  const heldDeadline=Date.now()+15000;
  while(!held.length){assert(Date.now()<heldDeadline,'A GET held');await new Promise(resolve=>setTimeout(resolve,50));}
  await ev(installWalk);
  await ev(`globalThis.__navigationAInstance=globalThis.__navigationFindPage();true`);
  const beforeNavigation=await ev(snapshot);
  assert.equal(beforeNavigation.page?.userID,A,'capture actual A page instance');
  assert.equal(beforeNavigation.appUser,null,'A GET remains outstanding');
  await ev(`${nuxt}.$router.push('/dashboard/users/${B}').then(()=>true)`);
  await until(`${nuxt}.payload.state.$sappUser?.id === '${B}' && [...document.querySelectorAll('main article h6')].some(e=>e.textContent.trim()==='84 XP')`);
  const beforeRelease=await ev(snapshot);
  assert.equal(beforeRelease.path,`/dashboard/users/${B}`);
  assert.equal(beforeRelease.page?.userID,B);
  assert.equal(beforeRelease.oldA?.isUnmounted,true,'real Nuxt remount complete');
  assert.notEqual(beforeRelease.page.uid,beforeRelease.oldA.uid);
  releaseA=true;
  const released=held.splice(0);
  for(const requestId of released) await fulfill(requestId,dataFor(A));
  await new Promise(resolve=>setTimeout(resolve,800));
  const afterRelease=await ev(snapshot);
  assert.equal(afterRelease.path,`/dashboard/users/${B}`);
  assert.equal(afterRelease.page?.userID,B);
  assert.equal(afterRelease.appUser?.id,B,'unmounted A response cannot replace B');
  assert.equal(afterRelease.appUser?.name,'Loaded B');
  assert(afterRelease.mainText.includes('Loaded B'));
  assert(!afterRelease.mainText.includes('Held A'));
  assert(afterRelease.xp.includes('84 XP'));
  assert(!afterRelease.xp.includes('42 XP'));
  assert(afterRelease.publicationStatus.includes('Private'));
  assert.deepEqual(errors,[]);
  cases.push('Actual Nuxt remount A→B keeps B profile, XP84 and private status after held A response');
  pass=true;
} finally {
  for(const requestId of held.splice(0)) await fulfill(requestId,dataFor(A)).catch(()=>{});
  browser.close();
  report({pass,cases,readCount:requests.filter(r=>r.method==='GET').length,writeCount:0});
}
