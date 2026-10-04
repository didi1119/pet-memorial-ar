// Isolated controller/state tests. This does not load WebGL or verify a phone.
// The cancellation fixture follows v4.3.1 ModelScene.ts 215–251 and
// model-viewer-base.ts 654–689: a cancelled source resolves, then emits its URL.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const crypto = require('node:crypto');
const appPath = path.resolve(__dirname, '../app.js');
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../dist/poses.json'), 'utf8'));
const source = fs.readFileSync(appPath, 'utf8');
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; }

function environment(code, apple = true, reducedMotion = false) {
  class Element {
    constructor() { this.listeners = new Map(); this.attributes = {}; this.dataset = {}; this.children = []; this.hidden = false; this.disabled = false; this.textContent = ''; }
    addEventListener(type, callback) { const items = this.listeners.get(type) || []; items.push(callback); this.listeners.set(type, items); }
    emit(type, detail = {}) { for (const callback of this.listeners.get(type) || []) callback({type, detail, preventDefault(){}}); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    append(...children) { this.children.push(...children); }
    click() { if (!this.disabled) this.emit('click'); }
  }
  const paints = [], glbs = [], downloads = [], blobs = new Map(), revoked = new Set();
  class Viewer extends Element {
    constructor() { super(); this.canActivateAR = true; this.loaded = false; this.actualGLB = null; this.sceneURL = null; this.activated = []; this.paused = true; this.animationName = ''; this.availableAnimations = ['Idle']; this.playCalls = []; this.pauseCalls = []; }
    setAttribute(name, value) {
      if (name === 'src' && this.attributes.src !== value) {
        super.setAttribute(name, value);
        queueMicrotask(() => this.updateSource(value));
      } else super.setAttribute(name, value);
    }
    async sceneSetSource(url) {
      this.actualGLB = null; this.sceneURL = url;
      this.cancelPending?.(); this.cancelPending = null;
      const pending = deferred(); glbs.push({url, ...pending});
      this.cancelPending = () => pending.reject();
      try { await pending.promise; }
      catch (error) { if (error == null) return; throw error; }
      this.cancelPending = null; this.actualGLB = url;
    }
    async updateSource(url) {
      this.loaded = false;
      try {
        await this.sceneSetSource(url);
        this.loaded = true;
        await new Promise(resolve => paints.push(resolve));
        this.emit('load', {url});
      } catch (sourceError) { this.emit('error', {type:'loadfailure', sourceError}); }
    }
    play() { this.paused=false; this.playCalls.push({actualGLB:this.actualGLB, animationName:this.animationName || this.attributes['animation-name']}); }
    pause() { this.paused=true; this.pauseCalls.push({actualGLB:this.actualGLB}); }
    async activateAR() { this.activated.push({src:this.attributes.src, iosSrc:this.attributes['ios-src'], actualGLB:this.actualGLB}); }
  }
  const ids = ['dog','ar-button','ar-label','device-hint','load-status','reset','pose-choices','ar-switcher','error-panel','selected-pose','pose-height','download-glb','download-usdz','reload','motion-toggle','motion-status'];
  const elements = new Map(ids.map(id => [id, id === 'dog' ? new Viewer() : new Element()]));
  const document = new Element(); document.baseURI = 'https://private.example.test/'; document.hidden = false;
  document.getElementById = id => elements.get(id);
  document.createElement = () => new Element();
  document.querySelectorAll = () => [...elements.get('pose-choices').children, ...elements.get('ar-switcher').children];
  const window = new Element(); window.isSecureContext = true;
  window.matchMedia = () => ({matches:reducedMotion, addEventListener(){}});
  class MockURL extends URL {}
  MockURL.createObjectURL = blob => { const url = `blob:test/${blobs.size + 1}`; blobs.set(url,blob); return url; };
  MockURL.revokeObjectURL = url => revoked.add(url);
  let interval = 0;
  vm.runInNewContext(code, {
    document, window, navigator: {userAgent:apple ? 'iPhone' : 'Android', platform:'', maxTouchPoints:0},
    URL:MockURL, Blob, Uint8Array, AbortController, queueMicrotask,
    customElements:{whenDefined:async () => {}},
    fetch:async (url, options) => {
      if (url === 'poses.json') return {ok:true,json:async()=>manifest};
      const pending = deferred(); downloads.push({url,options,...pending}); return pending.promise;
    },
    setInterval:() => ++interval, clearInterval(){}, location:{reload(){}}, console
  }, {filename:appPath});
  const viewer = elements.get('dog');
  const choose = index => elements.get('pose-choices').children[index].click();
  const completeUSDZ = async request => { request.resolve({ok:true,arrayBuffer:async()=>new Uint8Array([0x50,0x4b,3,4,manifest.poses.findIndex(p=>p.usdz===request.url)]).buffer}); await flush(); };
  const paint = async () => { while (paints.length) { paints.shift()(); await flush(); } };
  return {elements, viewer, choose, glbs, downloads, blobs, revoked, completeUSDZ, paint, window};
}

(async () => {
 const e=environment(source,false);await flush();
 e.glbs[0].resolve();await flush();await e.paint();
 assert.equal(e.viewer.cameraOrbit,manifest.poses[0].camera_orbit);
 e.choose(1);await flush();e.glbs.at(-1).resolve();await flush();await e.paint();
 assert.equal(e.viewer.actualGLB,manifest.poses[1].glb);
 assert.equal(e.viewer.cameraOrbit,'-80deg 40deg 95%');
 e.viewer.cameraOrbit='user rotated / zoomed';e.elements.get('reset').click();
 assert.equal(e.viewer.cameraOrbit,'-80deg 40deg 95%');
 e.choose(2);await flush();e.choose(0);await flush();e.choose(1);await flush();
 e.glbs.at(-1).resolve();await flush();await e.paint();
 assert.equal(e.elements.get('ar-button').disabled,true);
 e.glbs.at(-1).resolve();await flush();await e.paint();
 assert.equal(e.viewer.actualGLB,manifest.poses[1].glb);
 assert.equal(e.viewer.cameraOrbit,manifest.poses[1].camera_orbit);
 e.choose(0);await flush();e.glbs.at(-1).resolve();await flush();await e.paint();
 assert.equal(e.viewer.cameraOrbit,manifest.poses[0].camera_orbit);
 e.choose(2);await flush();e.glbs.at(-1).resolve();await flush();await e.paint();
 assert.equal(e.viewer.cameraOrbit,manifest.poses[2].camera_orbit);
 assert.equal(e.viewer.paused,false);assert.equal(e.viewer.animationName,'Idle');
 const result={initial_pose:true,belly_camera:true,reset_after_drag:true,rapid_selection:true,other_pose_angles_preserved:true,animation_preserved:true};
 fs.writeFileSync(path.resolve(__dirname,'camera-check.json'),JSON.stringify(result,null,2));
 console.log('Camera reset, rapid pose selection, default views and animation passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
