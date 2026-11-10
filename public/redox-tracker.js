(function () {
  'use strict';
  var script = document.currentScript;
  if (!script || window.RedoxTrack) return;
  var funnel = script.dataset.funnel;
  var base = new URL(script.src).origin;
  var consentRequired = script.dataset.consent !== 'off';
  var running = false, enabled = false, session = null, pending = [], busy = false, lastPath = '', pageStart = Date.now(), activeSeconds = 0;
  var videoState = new WeakMap(), forms = new WeakSet(), scrollMarks = new Set();
  function clean(v) { return String(v || '').replace(/[^\p{L}\p{N} ._/-]/gu, '').slice(0, 80); }
  function path() { return location.pathname.slice(0, 300); }
  function storage(k, value) { try { if (value !== undefined) { sessionStorage.setItem(k, value); return value; } return sessionStorage.getItem(k); } catch (_) { return null; } }
  var key = 'redox-funnel:' + funnel;
  function visitor() { try { var id = localStorage.getItem(key + ':visitor'); if (!id) { id = crypto.randomUUID(); localStorage.setItem(key + ':visitor', id); } return id; } catch (_) { return crypto.randomUUID(); } }
  var visitorId;
  function event(name, options) {
    if (!enabled) return;
    options = options || {};
    var allowed = ['page_view','page_complete','click','scroll','engagement','form_start','form_submit','quiz_start','quiz_step','quiz_complete','vsl_start','vsl_progress','vsl_complete','checkout_click'];
    if (allowed.indexOf(name) < 0) return;
    pending.push({ event_id: crypto.randomUUID(), event: name, path: path(), label: clean(options.label), value: Math.max(0, Math.min(86400, Math.round(Number(options.value) || 0))) });
    if (pending.length > 100) pending.shift();
    flush();
  }
  async function flush() {
    if (busy || !pending.length || !enabled) return;
    busy = true;
    var batch = pending.slice(0, 20), params = new URLSearchParams(location.search), ref = '';
    try { ref = new URL(document.referrer).hostname; } catch (_) {}
    var payload = { funnel_id: funnel, visitor_id: visitorId, source: clean(params.get('utm_source') || ref || 'Direto'), campaign: clean(params.get('utm_campaign')), medium: clean(params.get('utm_medium')), device: /iPad|Tablet/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop', events: batch };
    if (session) { payload.session_id = session.session_id; payload.token = session.token; }
    try {
      var response = await fetch(base + '/api/public/funnel-events', { method: 'POST', headers: {'Content-Type':'application/json'}, credentials:'omit', body:JSON.stringify(payload), keepalive:true });
      if (response.ok) {
        var result = await response.json();
        if (!enabled) return;
        session = {session_id:result.session_id,token:result.token,expires:Date.now()+30*60*1000};
        storage(key,JSON.stringify(session)); pending.splice(0,batch.length);
      } else if (response.status === 403) { session=null; storage(key,''); pending=[]; }
    } catch (_) {} finally { busy=false; }
    if (pending.length && enabled) setTimeout(flush,1500);
  }
  function pageView() { if (!enabled || lastPath === path()) return; lastPath=path(); scrollMarks.clear(); activeSeconds=0; pageStart=Date.now(); event('page_view'); }
  function hookVideos() {
    document.querySelectorAll('video').forEach(function (video, index) {
      if (videoState.has(video)) return;
      var seen=new Set(), label=clean(video.dataset.redoxVsl || 'VSL '+(index+1)); videoState.set(video,seen);
      video.addEventListener('play',function () { if (!seen.has('start')) {seen.add('start');event('vsl_start',{label:label});} });
      video.addEventListener('timeupdate',function () { if (video.seeking || !isFinite(video.duration) || !video.duration) return; var watched=0; for(var i=0;i<video.played.length;i++) watched+=video.played.end(i)-video.played.start(i); [25,50,75,90].forEach(function (n) {if(watched/video.duration*100>=n && !seen.has(n)){seen.add(n);event('vsl_progress',{label:label,value:n});}}); });
      video.addEventListener('ended',function () {if(!seen.has('end')){seen.add('end');event('vsl_complete',{label:label,value:100});} });
    });
  }
  function start() {
    if (enabled || navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;
    enabled=true; storage(key+':consent','yes'); visitorId=visitor();
    try { var saved=JSON.parse(storage(key)||'null'); if(saved && saved.expires>Date.now()) session=saved; } catch (_) {}
    lastPath=''; pageView(); hookVideos();
    if(running) return; running=true;
    document.addEventListener('click',function (e) {
      var target=e.target instanceof Element ? e.target.closest('a,button,[data-redox-event]') : null; if(!target || !enabled) return;
      var custom=target.dataset.redoxEvent;
      if(custom) event(custom,{label:target.dataset.redoxLabel || 'Funil',value:target.dataset.redoxValue});
      else event('click',{label:target.tagName==='A'?'Link':'Botao'});
      if(target.tagName==='A') {
        try { var url=new URL(target.href,location.href); if(url.origin!==location.origin || url.pathname!==location.pathname) event('page_complete');
          if((url.hostname==='www.redoxpay.site' || url.hostname==='redoxpay.lovable.app' || url.origin===base) && /^\/(c\/|p\/|txuna-)/.test(url.pathname)) {event('checkout_click'); if(session) {url.searchParams.set('rxf_session',session.session_id);url.searchParams.set('rxf_token',session.token);target.href=url.href;}}
        } catch (_) {}
      }
    },true);
    document.addEventListener('focusin',function(e){var form=e.target instanceof Element?e.target.closest('form'):null;if(form&&!forms.has(form)){forms.add(form);event('form_start',{label:form.dataset.redoxLabel||'Formulario'});if(form.dataset.redoxQuiz)event('quiz_start',{label:form.dataset.redoxQuiz});}});
    document.addEventListener('submit',function(e){var form=e.target;if(form instanceof HTMLFormElement){event('form_submit',{label:form.dataset.redoxLabel||'Formulario'});if(form.dataset.redoxQuiz)event('quiz_complete',{label:form.dataset.redoxQuiz});event('page_complete');}},true);
    window.addEventListener('scroll',function(){var height=document.documentElement.scrollHeight-innerHeight;var depth=height>0?Math.round(scrollY/height*100):100;[25,50,75,100].forEach(function(n){if(depth>=n&&!scrollMarks.has(n)){scrollMarks.add(n);event('scroll',{value:n});}});},{passive:true});
    setInterval(function(){if(enabled&&document.visibilityState==='visible'){activeSeconds+=15;event('engagement',{value:15});}if(enabled){pageView();hookVideos();}},15000);
    window.addEventListener('popstate',pageView);
    ['pushState','replaceState'].forEach(function(name){var original=history[name];history[name]=function(){var result=original.apply(this,arguments);pageView();return result;};});
    window.addEventListener('pagehide',flush);
    new MutationObserver(hookVideos).observe(document.documentElement,{childList:true,subtree:true});
  }
  window.RedoxTrack={event:event,consent:function(allowed){if(allowed)start();else{enabled=false;pending=[];session=null;storage(key,'');storage(key+':consent','');try{localStorage.removeItem(key+':visitor');}catch(_){}}},page:pageView};
  if(!consentRequired || storage(key+':consent')==='yes') start();
})();