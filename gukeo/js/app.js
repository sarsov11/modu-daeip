/* 모두의 국어 — 문학 개념 드릴(선지 O/X → 작품에서 근거 줄 고르기 → 근거·풀이 확인) */
(function () {
  'use strict';
  const $view = document.getElementById('view');
  const KEY = 'modu-kor-v1';
  const DATA = { concepts: null, index: null, sets: {} };

  // ───── 저장 ─────
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  const S = Object.assign({ att: {}, skin: 'paper', theme: 'auto' }, load());
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장 안 돼도 화면은 돈다 */ } }
  function applySkin() {
    document.documentElement.dataset.skin = S.skin;
    if (S.theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = S.theme;
  }
  applySkin();

  // ───── 자료 ─────
  async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }
  async function boot() {
    [DATA.concepts, DATA.index] = await Promise.all([getJSON('data/lit_concepts.json'), getJSON('data/lit_index.json')]);
    DATA.cmap = {}; DATA.concepts['개념'].forEach(c => DATA.cmap[c.id] = c);
    DATA.gmap = {}; DATA.concepts['묶음'].forEach(g => DATA.gmap[g.id] = g);
    DATA.smap = {}; DATA.index.sets.forEach(s => DATA.smap[s.id] = s);
    DATA.byConcept = {};
    // 개념 드릴은 표현 문항 선지만 쓴다 — <보기> 감상·내용 문항에 붙은 개념은 느슨하다(2026-10-08 표본 20 중 5건, 모두 비표현 문항)
    DATA.index.items.forEach(it => { if (it.u === '표현') it.c.forEach(c => (DATA.byConcept[c] = DATA.byConcept[c] || []).push(it)); });
    route();
  }
  async function getSet(id, kind) {
    const k = (kind || 'lit') + ':' + id;
    if (!DATA.sets[k]) DATA.sets[k] = await getJSON('data/' + (kind === 'read' ? 'rsets' : 'sets') + '/' + encodeURIComponent(id) + '.json');
    return DATA.sets[k];
  }

  // ───── 도우미 ─────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CIRC = '①②③④⑤';
  const itemKey = it => (it.r ? 'r|' : '') + it.s + '|' + it.q + '|' + it.n;
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function setTitle(s) { return `${s.학년} ${s.연도}년 ${s.월}월 ${s.시험}`; }
  const worksH = s => (s.작품 || []).map(w => '<span>' + esc((w.작가 ? w.작가 + ', ' : '') + '「' + (w.제목 || '?') + '」') + '</span>').join('');
  function works(s) { return (s.작품 || []).map(w => (w.작가 ? w.작가 + ', ' : '') + '「' + (w.제목 || '?') + '」').join(' · '); }
  function conceptStat(cid) {
    const its = DATA.byConcept[cid] || []; let n = 0, ok = 0;
    its.forEach(it => { const a = S.att[itemKey(it)]; if (a) { n++; if (a.ox && a.ev !== false) ok++; } });
    return { total: its.length, n, ok };
  }

  // 근거 구절 → 블록별 글자 표시 (띄어쓰기 무시하고 찾는다)
  function markRanges(blocks, quotes) {
    const pos = [], flat = [];
    blocks.forEach((b, i) => { for (let j = 0; j < b.t.length; j++) if (!/\s/.test(b.t[j])) { pos.push([i, j]); flat.push(b.t[j]); } });
    const fs = flat.join('');
    const marks = blocks.map(b => new Uint8Array(b.t.length));
    let found = 0;
    (quotes || []).forEach(q => {
      const g = String(q).replace(/\s+/g, ''); if (!g) return;
      let k = fs.indexOf(g); if (k < 0) return; found++;
      while (k >= 0) {
        for (let x = k; x < k + g.length; x++) { const [i, j] = pos[x]; marks[i][j] = 1; }
        k = fs.indexOf(g, k + g.length);
        break; // 첫 자리만
      }
    });
    return { marks, found };
  }
  function renderBlocks(blocks, marks) {
    return blocks.map((b, i) => {
      let h = '', open = false;
      for (let j = 0; j < b.t.length; j++) {
        const m = marks && marks[i][j];
        if (m && !open) { h += '<mark>'; open = true; }
        if (!m && open) { h += '</mark>'; open = false; }
        h += esc(b.t[j]);
      }
      if (open) h += '</mark>';
      return `<span class="ln ${b.k === 'p' ? 'p' : ''} ${b.k === 's' ? 'small' : ''}" data-i="${i}">${h || '&nbsp;'}</span>`;
    }).join('');
  }

  // ───── 화면 ─────
  // ───── 머리띠 · 아래 탭 (화면표준_1110 1·2절) ─────
  const SV = b => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">' + b + '</svg>';
  const GRID = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>';
  const TABS = [
    { k: 'home', n: '오늘', go: '#/home', i: SV('<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>') },
    { k: 'map', n: '합격 지도', go: '#/map', i: SV('<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="8" cy="18" r="2.4"/><circle cx="18" cy="17" r="2.4"/><path d="M8.2 7 15.8 7M7 8.2 7.6 15.6M16.6 9.2 8.8 16.6M18 9.4v5.2"/>') },
    { k: 'sets', n: '기출', go: '#/sets', i: SV('<path d="M13 3 5.5 13.5H11L10 21l7.5-10.5H12z"/>') },
    { k: 'vocab', n: '고전 어휘', go: '#/vocab', i: SV('<path d="M5 4.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 12.5h4"/>') },
    { k: 'records', n: '기록', go: '#/records', i: SV('<path d="M5 19.5V12M12 19.5V5M19 19.5V9"/>') },
    { k: 'settings', n: '설정', go: '#/settings', i: SV('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>') }
  ];
  const HNAV = [['home', '오늘', '#/home'], ['map', '합격 지도', '#/map'], ['sets', '기출', '#/sets'], ['vocab', '고전 어휘', '#/vocab'], ['records', '기록', '#/records'], ['settings', '설정', '#/settings']];
  function chrome(o) {
    o = o || {};
    document.body.classList.toggle('notab', !!o.notab);
    document.body.classList.toggle('wide', !!o.wide);
    const t = document.getElementById('top'), tb = document.getElementById('tab');
    if (o.back) t.innerHTML = `<div class="in"><a class="back" href="${o.back}" aria-label="뒤로">‹</a><div class="ttl">${esc(o.title || '')}</div><div class="sp"></div>${o.prog ? `<span class="hprog">${o.prog}</span>` : ''}<a class="xb" href="${o.back}" aria-label="닫기">✕</a></div>`;
    else t.innerHTML = `<div class="in"><span class="mark">대</span><div class="logo">모두의 <b>대입</b></div><div class="sub">국어</div><div class="sp"></div><nav class="hnav">${HNAV.map(h => `<a data-nav="${h[0]}" href="${h[2]}">${h[1]}</a>`).join('')}</nav><a class="gridb" href="https://teralearning.kr/" aria-label="테라러닝 전체 서비스">${GRID}</a></div>`;
    tb.innerHTML = TABS.map(x => `<a data-nav="${x.k}" href="${x.go}">${x.i}<span>${x.n}</span></a>`).join('');
  }
  function nav(name) { const tab = { lit: 'map', grammar: 'map', reading: 'sets' }[name] || name; chrome({ wide: ['lit', 'grammar', 'reading', 'sets', 'map'].includes(name) }); document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === tab)); }
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'home';
    const [p, a, b] = h.split('/');
    window.scrollTo(0, 0);
    if (p === 'lit' && a === 'c') return viewConcept(decodeURIComponent(b));
    if (p === 'lit' || p === 'map') return viewJido();
    if (p === 'drill') return viewDrill(decodeURIComponent(a || ''));
    if (p === 'sets') return viewSets();
    if (p === 'set') return viewSet(decodeURIComponent(a));
    if (p === 'records') return viewRecords();
    if (p === 'vocab' && window.viewVocab) { nav('vocab'); return window.viewVocab(a); }      // 고전 어휘장(js/vocab.js, 11-11)
    if (p === 'settings') return viewSettings();
    if (p === 'grammar' && a === 'c') return viewGConcept(decodeURIComponent(b));
    if (p === 'grammar' && a === 'drill') return viewGDrill(decodeURIComponent(b || ''));
    if (p === 'grammar') return viewJido();
    if (p === 'reading' && a) return viewRDrill(decodeURIComponent(a));
    if (p === 'reading') return viewReading();
    return viewHome();
  }
  window.addEventListener('hashchange', route);

  function viewHome() {
    nav('home');
    const nSets = DATA.index.sets.length, nItems = DATA.index.items.length;
    const tagged = DATA.index.items.filter(i => i.c.length && i.u === '표현').length;
    const weak = DATA.concepts['개념'].map(c => ({ c, st: conceptStat(c.id) })).filter(x => x.st.total >= 3)
      .sort((a, b) => (a.st.n ? a.st.ok / a.st.n : 0.5) - (b.st.n ? b.st.ok / b.st.n : 0.5) || b.st.total - a.st.total)[0];
    const today = new Date().toDateString();
    const vals = Object.values(S.att), nDone = vals.length, okN = vals.filter(a => a.ox && a.ev !== false).length;
    const nToday = vals.filter(a => a.t && new Date(a.t).toDateString() === today).length;
    const wk = weak ? `#/drill/${encodeURIComponent(weak.c.id)}` : '#/lit';
    const steps = [
      [weak ? weak.c.이름 : '문학 개념 드릴', weak ? `기출 선지 ${weak.st.total}개 · ${weak.st.n ? `맞힌 비율 ${Math.round(weak.st.ok / weak.st.n * 100)}%` : '아직 안 풀었음'}` : '개념어 선지를 작품에 대어 봅니다', '10문항', wk],
      ['어법', '음운 변동, 품사, 문장 성분, 중세 국어', '기출', '#/map'],
      ['비문학 근거 찾기', '선지마다 지문 속 근거 문장 찾기', '기출', '#/reading']];
    $view.innerHTML = `
      <div class="dline"><span>수능·모의평가·학력평가 국어 기출</span></div>
      <div class="dbig">${nDone.toLocaleString()} <small>/ ${nItems.toLocaleString()} 푼 선지 (문학)</small></div>
      <section class="today"><h3>오늘 ${fmtMin(dayPlan().per)}</h3><p class="tsum">문학 세트 ${nSets}개 · 개념어 선지 ${tagged.toLocaleString()}개</p>
        ${steps.map((x, k) => `<a class="stp${k ? '' : ' now'}" href="${x[3]}"><span class="n">${k + 1}</span><span class="tx"><b>${esc(x[0])}${k ? '' : '<i class="recpill">추천</i>'}</b><span>${esc(x[1])}</span></span><span class="m">${x[2]}</span></a>`).join('')}
        <a class="btn red full" href="${wk}">시작</a></section>
      <div class="stat2"><div class="card"><b>${nDone ? Math.round(okN / nDone * 100) + '%' : '—'}</b><span>판단·근거 맞힘</span></div><div class="card"><b>${nToday}</b><span>오늘 푼 선지</span></div></div>
      <h2 class="sec">다른 드릴·기출</h2>
      <div class="list">
        <a class="li" href="#/sets"><div><div class="t">문학 기출</div><div class="d">세트를 통째로 풀고 선지마다 작품 속 근거를 확인합니다.</div></div></a>
        <a class="li" href="#/map"><div><div class="t">합격 지도</div><div class="d">개념어가 들어간 기출 선지를 작품에 직접 대어 봅니다.</div></div></a>
        <a class="li" href="#/map"><div><div class="t">어법</div><div class="d">음운 변동, 품사, 문장 성분, 중세 국어를 기출 문항으로 연습합니다.</div></div></a>
        <a class="li" href="javascript:void 0" data-zs="1"><div><div class="t">합격 전략</div></div></a>
        <a class="li" href="#/reading"><div><div class="t">비문학</div><div class="d">선지 하나마다 지문 속 근거 문장을 찾는 드릴입니다.</div></div></a>
      </div>`;
  }

  function viewSoon(p) {
    nav(p);
    $view.innerHTML = `<h1>${p === 'grammar' ? '어법' : '비문학 근거 찾기'}</h1><p class="sub">문학편 다음에 엽니다.</p>`;
  }

  // ───── 합격 지도 (화면표준 11절): 문학 · 어법 · 비문학을 한 장에 ─────
  // 칸의 숫자(avg) = 앱에 들어 있는 기출 선지 수 ÷ 그 자료가 걸친 해 수. 자료에 없는 값은 만들지 않는다.
  async function viewJido() {
    nav('map');
    if (!window.TERA_MAP) { $view.innerHTML = `<h1>합격 지도</h1><div class="actions"><a class="btn primary" href="#/home">다음</a></div>`; return; }
    const [gd, ri] = await Promise.all([gload(), rload()]);
    const r1 = x => Math.round(x * 10) / 10;
    const lit = DATA.index.sets, yL = new Set(lit.map(s => s.연도)).size || 1;
    const yG = new Set(gd.qs.map(q => (/(\d{4})년/.exec(q.출처) || [])[1]).filter(Boolean)).size || 1;
    const yR = new Set(ri.sets.map(s => s.연도)).size || 1;
    const share = (done, total) => total ? Math.round(done / total * 100) : 0;
    // 문학: 줄 한 개, 칸 = 개념 묶음, 세부 = 개념
    const litNodes = DATA.concepts['묶음'].map(g => {
      const leaves = DATA.concepts['개념'].filter(c => c.묶음 === g.id).map(c => {
        const st = conceptStat(c.id); return { name: c.이름, id: c.id, k: 'lit', avg: r1(st.total / yL), pct: share(st.n, st.total) };
      });
      const tot = leaves.reduce((s, l) => s + l.avg * yL, 0), got = leaves.reduce((s, l) => s + l.avg * yL * l.pct / 100, 0);
      return { id: 'L' + g.id, name: g.이름, k: 'lit', avg: r1(tot / yL), pct: share(got, tot), leaves };
    });
    // 어법: 칸 = 개념 묶음
    const gramNodes = gd.concepts['묶음'].map(g => {
      const leaves = gd.concepts['개념'].filter(c => c.묶음 === g.id).map(c => {
        const st = gstat(c.id); return { name: c.이름, id: c.id, k: 'gram', avg: r1(st.total / yG), pct: share(st.n, st.total) };
      });
      const tot = leaves.reduce((s, l) => s + l.avg * yG, 0), got = leaves.reduce((s, l) => s + l.avg * yG * l.pct / 100, 0);
      return { id: 'G' + g.id, name: g.이름, k: 'gram', avg: r1(tot / yG), pct: share(got, tot), leaves };
    });
    // 비문학: 칸 = 독서 분야, 세부 = 학년
    const fields = [...new Set(ri.sets.map(s => s.분야))];
    const grades = [...new Set(ri.sets.map(s => s.학년))].sort();
    const readNodes = fields.map(f => {
      const ss = ri.sets.filter(s => s.분야 === f);
      const leaves = grades.map(gr => {
        const xs = ss.filter(s => s.학년 === gr); const tot = xs.reduce((a, s) => a + s.nc, 0), n = xs.reduce((a, s) => a + rdone(s.id), 0);
        return { name: gr, id: f + '|' + gr, k: 'read', f, gr, avg: r1(tot / yR), pct: share(n, tot) };
      }).filter(l => l.avg > 0);
      const tot = ss.reduce((a, s) => a + s.nc, 0), n = ss.reduce((a, s) => a + rdone(s.id), 0);
      return { id: 'R' + f, name: f, k: 'read', f, avg: r1(tot / yR), pct: share(n, tot), leaves };
    }).sort((a, b) => b.avg - a.avg);
    const go = leaf => {
      if (leaf.k === 'lit') location.hash = '#/lit/c/' + encodeURIComponent(leaf.id);
      else if (leaf.k === 'gram') location.hash = '#/grammar/c/' + encodeURIComponent(leaf.id);
      else { RF = { 학년: leaf.gr || '전체', 분야: leaf.f }; location.hash = '#/reading'; }
    };
    const first = n => (n.leaves.slice().sort((a, b) => a.pct - b.pct || b.avg - a.avg)[0]) || n;
    $view.innerHTML = '<div id="jido"></div>';
    window.TERA_MAP.mount(document.getElementById('jido'), {
      title: '국어 합격 지도', sub: '수능·모의평가·학력평가', unit: '선지', mark: 'star',
      groups: [{ name: '문학', nodes: litNodes }, { name: '어법', nodes: gramNodes }, { name: '비문학', nodes: readNodes }],
      onLeaf: (leaf, node) => go(leaf.k ? leaf : Object.assign({}, leaf, { k: node.k, f: node.f })),
      onStart: node => go(node.k === 'read' ? { k: 'read', f: node.f, gr: '전체' } : first(node))
    });
  }

  function viewMap() {
    nav('lit');
    const groups = DATA.concepts['묶음'].map(g => {
      const cs = DATA.concepts['개념'].filter(c => c.묶음 === g.id);
      return `<div class="card group"><span class="gtag">${esc(g.갈래)}</span><h3>${esc(g.이름)}</h3><div class="clist">${cs.map(c => {
        const st = conceptStat(c.id); const pct = st.n ? Math.round(st.ok / st.n * 100) : 0;
        return `<a class="cbtn ${st.total ? '' : 'zero'}" href="#/lit/c/${encodeURIComponent(c.id)}">${esc(c.이름)} <small>${st.total}</small>${st.n ? `<span class="bar"><i style="width:${pct}%"></i></span>` : ''}</a>`;
      }).join('')}</div></div>`;
    }).join('');
    $view.innerHTML = `<h1>문학 개념 드릴</h1><p class="sub">개념을 고르면 그 개념을 묻는 기출 선지가 작품과 함께 나옵니다. 숫자는 기출 선지 수입니다.</p><div class="groups">${groups}</div>`;
  }

  async function viewConcept(cid) {
    nav('lit');
    const c = DATA.cmap[cid]; if (!c) return viewJido();
    const its = DATA.byConcept[cid] || [];
    const st = conceptStat(cid);
    // 실제 기출 예: O 선지 가운데 근거가 있는 것 3개
    const exItems = shuffle(its.filter(i => i.ox === 'O')).slice(0, 3);
    $view.innerHTML = `
      <a href="#/map" class="muted" style="text-decoration:none">← 합격 지도</a>
      <div class="concept-head" style="margin-top:8px"><div>
        <span class="chip">${esc(DATA.gmap[c.묶음].이름)}</span>
        <h1 style="margin-top:8px">${esc(c.이름)}</h1></div>
        <a class="btn primary" href="#/drill/${encodeURIComponent(cid)}" style="text-decoration:none" ${its.length ? '' : 'aria-disabled="true"'}>드릴 ${Math.min(10, its.length)}문제</a>
      </div>
      ${개념도식(c, c.헷갈림.map(h => DATA.cmap[h]).filter(Boolean), [])}
      <div class="how concept-how"><b>작품에서 확인하는 법</b>${esc(c.확인법)}</div>
      ${c.헷갈림.length ? `<p class="muted" style="margin-top:12px">함께 구별할 개념: ${c.헷갈림.map(h => DATA.cmap[h] ? `<a class="chip link" href="#/lit/c/${h}" style="text-decoration:none">${esc(DATA.cmap[h].이름)}</a>` : '').join(' ')}</p>` : ''}
      <h2>기출에서는 이렇게 나왔습니다</h2>
      <div class="examples" id="ex"><span class="muted">불러오는 중…</span></div>
      <p class="muted" style="margin-top:16px">기출 선지 ${its.length}개 · 푼 것 ${st.n}개</p>`;
    const parts = [];
    for (const it of exItems) {
      const s = await getSet(it.s); const q = s.qs.find(x => x.no === it.q); const o = q.선지[it.n - 1];
      const meta = DATA.smap[it.s];
      parts.push(`<div class="card ex"><div>${esc(q.choices[it.n - 1])}</div>${o.근거.length ? `<div style="margin-top:6px">작품: ${o.근거.map(g => `<q>${esc(g)}</q>`).join(' … ')}</div>` : ''}<div class="src"><span>${esc(setTitle(meta))} ${it.q}번 ${CIRC[it.n - 1]}</span>${worksH(meta)}</div></div>`);
    }
    const ex = document.getElementById('ex'); if (ex) ex.innerHTML = parts.join('') || '<span class="muted">아직 태깅된 선지가 없습니다.</span>';
  }

  // ───── 드릴 ─────
  let D = null;
  // ───── 문제 화면 공용 부품(tera-q.js?v=1112c · tera-pad.js) — 화면표준 12절 ─────
  const TQI = {
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.6M12 16.5h.01" stroke-linecap="round"/></svg>',
    note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6.5C10.2 5 7.6 4.5 4.5 4.8v13c3.1-.3 5.7.2 7.5 1.7 1.8-1.5 4.4-2 7.5-1.7v-13c-3.1-.3-5.7.2-7.5 1.7zM12 6.5v13"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 19.5l1-4L16 5l3 3L8.5 18.5z"/></svg>'
  };
  let HOT = null;
  // 중요도 별: 합격 지도 칸(문학 묶음 · 어법 묶음 · 독서 분야)의 해마다 선지 수 순위 — 상위 20% 별 3개 · 다음 30% 별 2개 · 나머지 별 1개
  async function hotSet() {
    if (HOT) return HOT;
    try {
      const [gd, ri] = await Promise.all([gload(), rload()]);
      const lit = DATA.index.sets, yL = new Set(lit.map(s => s.연도)).size || 1;
      const yG = new Set(gd.qs.map(q => (/(\d{4})년/.exec(q.출처) || [])[1]).filter(Boolean)).size || 1;
      const yR = new Set(ri.sets.map(s => s.연도)).size || 1;
      const L = DATA.concepts['묶음'].map(g => ['L' + g.id, DATA.concepts['개념'].filter(c => c.묶음 === g.id).reduce((a, c) => a + (DATA.byConcept[c.id] || []).length, 0) / yL]);
      const Gm = gd.concepts['묶음'].map(g => ['G' + g.id, gd.concepts['개념'].filter(c => c.묶음 === g.id).reduce((a, c) => a + (G.by[c.id] || []).length, 0) / yG]);
      const R = [...new Set(ri.sets.map(s => s.분야))].map(f => ['R' + f, ri.sets.filter(s => s.분야 === f).reduce((a, s) => a + s.nc, 0) / yR]);
      const all = L.concat(Gm, R).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
      const n3 = Math.max(1, Math.ceil(all.length * 0.2)), n2 = Math.max(n3, Math.ceil(all.length * 0.5));
      HOT = new Map(all.map((x, i) => [x[0], i < n3 ? 3 : i < n2 ? 2 : 1]));
    } catch (e) { HOT = new Map(); }
    return HOT;
  }
  // 개념어 뜻: 앱이 가진 문학 · 어법 개념 자료의 이름(과 별칭) → 뜻만 쓴다
  function feedTerms() {
    if (!window.TERA_Q) return;
    const o = {};
    const add = c => { if (!c || !c.뜻) return; o[c.이름] = c.뜻; (c.별칭 || []).forEach(a => { if (a && a.length >= 2 && !o[a]) o[a] = c.뜻; }); };
    if (DATA.concepts) DATA.concepts['개념'].forEach(add);
    if (G.data) G.data.concepts['개념'].forEach(add);
    window.TERA_Q.terms(o);
  }
  const ANNOTATE_PASSAGE = false; // 지문 글자에도 밑줄을 걸 수 있다. 지문 줄을 눌러 근거를 고르는 화면에서는 클릭이 겹치므로 꺼 둔다
  function tqProg(i, n) { return `<div class="tq-prog"><i><u style="width:${Math.round((i + 1) / n * 100)}%"></u></i><span><b>${n - i - 1}</b>문제 남았어요</span></div>`; }
  function tqMeta(label, extra) { return `<div class="tq-meta"><span class="tq-no">${label}</span><span data-tq="badge"></span><span class="tq-sp"></span>${extra || ''}<span data-tq="toggle"></span></div>`; }
  function tqBarHtml(pos, n, tools) {
    const t = tools || ['unsure', 'exp', 'pen'];
    return `<div class="tq-bar" id="tqbar">${t.includes('unsure') ? `<button class="tq-tool" data-t="unsure" aria-pressed="false">${TQI.help}헷갈림</button>` : ''}${t.includes('exp') ? `<button class="tq-tool" data-t="exp" disabled>${TQI.note}해설</button>` : ''}${t.includes('pen') ? `<button class="tq-tool" data-t="pen">${TQI.pen}펜</button>` : ''}<span class="tq-sp"></span><button class="tq-nav" data-t="prev" aria-label="이전">‹</button><button class="tq-pos" data-t="pos" type="button">${pos} <small>/ ${n}</small></button><button class="tq-nav is-next" data-t="next" aria-label="다음" disabled>다음 ›</button></div>`;
  }
  // 아래 줄 단추 연결. o: { unsure(on), exp(), key(), prev, next }
  function tqBind(o) {
    const bar = document.getElementById('tqbar'); if (!bar) return;
    const q = t => bar.querySelector(`[data-t="${t}"]`);
    const u = q('unsure'); if (u) u.onclick = () => { const on = u.getAttribute('aria-pressed') !== 'true'; u.setAttribute('aria-pressed', on); u.classList.toggle('is-on', on); if (o.unsure) o.unsure(on); };
    const e = q('exp'); if (e) e.onclick = () => { if (o.exp) o.exp(); };
    const p = q('pen'); if (p) p.onclick = () => { if (window.TERA_PAD) window.TERA_PAD.pen({ key: o.key ? o.key() : '기본', onChange: on => p.classList.toggle('is-on', on) }); };
    const pv = q('prev'); pv.disabled = !o.prev; pv.onclick = () => { if (o.prev) o.prev(); };
    const nx = q('next'); nx.onclick = () => { if (!nx.disabled && o.next) o.next(); };
    const ps = q('pos'); if (ps) ps.onclick = () => { if (o.pos) o.pos(); };
  }
  function tqEnable(exp, next) {
    const bar = document.getElementById('tqbar'); if (!bar) return;
    const e = bar.querySelector('[data-t="exp"]'); if (e) e.disabled = !exp;
    const n = bar.querySelector('[data-t="next"]'); if (n) n.disabled = !next;
  }
  // 번호 줄 단추(중요도 별 · 개념어 켜기/끄기) · 개념어 밑줄 · 첫 사용 안내
  function tqPost(root, hot, sel) {
    if (!window.TERA_Q) return;
    root.querySelectorAll('[data-tq="badge"]').forEach((b, i) => { const n = Array.isArray(hot) ? hot[i] : hot; if (n > 0) window.TERA_Q.badge(b, { stars: n }); });
    root.querySelectorAll('[data-tq="toggle"]').forEach(t => window.TERA_Q.toggle(t));
    window.TERA_Q.annotate(root.querySelectorAll(sel || '.tq-stem,.tq-claim .tq-t,.tq-choice .tq-t,.tq-box,.tq-exp-box'));
    if (ANNOTATE_PASSAGE) window.TERA_Q.annotate(document.querySelectorAll('#psg .ln'));
  }
  function tqCoach() {
    if (!window.TERA_Q) return;
    const st = [
      ['.tq-term', 'term', '띠가 있는 말을 누르면 뜻이 나와요', '번호 줄 단추로 켜고 끌 수 있어요.'],
      ['.tq-tool[data-t="unsure"]', 'unsure', '헷갈리면 표시해 두세요', '표시한 선지는 다음 드릴에 먼저 나와요.'],
      ['.tq-tool[data-t="pen"]', 'pen', '펜으로 문제 위에 바로 쓸 수 있어요', '다시 누르면 필기가 끝나요.']
    ];
    const run = k => { for (; k < st.length; k++) { const el = document.querySelector(st[k][0]); if (!el) continue; const kk = k; if (window.TERA_Q.coach(el, { key: st[kk][1], title: st[kk][2], text: st[kk][3], onDone: () => run(kk + 1) })) return; } };
    setTimeout(() => run(0), 450);
  }

  function viewDrill(cid) {
    nav('lit');
    const pool = DATA.byConcept[cid] || [];
    if (!pool.length) { $view.innerHTML = '<p class="sub">이 개념의 기출 선지가 아직 없습니다.</p><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/map">다음</a></div>'; return; }
    // 안 푼 것 먼저, 틀린 것 다음, 맞힌 것 마지막
    const rank = it => { const a = S.att[itemKey(it)]; return !a ? 0 : (a.ox && a.ev !== false && !a.h) ? 2 : 1; };
    const q = shuffle(pool).sort((a, b) => rank(a) - rank(b)).slice(0, 10);
    D = { kind: 'lit', cid, q, i: 0, right: 0, back: { href: '#/lit/c/' + encodeURIComponent(cid), label: DATA.cmap[cid].이름 } };
    drawItem();
  }

  async function drawItem() {
    const it = D.q[D.i];
    const s = await getSet(it.s, D.kind), meta = D.kind === 'read' ? RD.smap[it.s] : DATA.smap[it.s];
    const q = s.qs.find(x => x.no === it.q), o = q.선지[it.n - 1];
    const hot = await hotSet();
    const nodes = D.kind === 'read' ? ['R' + meta.분야] : (it.c || []).map(c => DATA.cmap[c] ? 'L' + DATA.cmap[c].묶음 : '');
    D.cur = { it, s, q, o, meta, stage: 'ox', picked: new Set(), hot: Math.max(0, ...nodes.map(x => hot.get(x) || 0)), unsure: false };
    const metaLine = D.kind === 'read'
      ? `<span>${esc(setTitle(meta))} ${meta.범위}번</span><span>${esc(meta.분야)}</span><span>${esc(meta.제재 || '')}</span>`
      : `<span>${esc(setTitle(meta))} ${meta.범위}번</span><span>${esc(meta.갈래)}</span>${worksH(meta).replace(/<span>/g, '<span class="wk">')}`;
    const paras = D.kind === 'read' && s.문단 && s.문단.length
      ? `<details class="card" style="padding:10px 14px"><summary class="muted">문단별 중심 내용</summary><ol style="margin:8px 0 0;padding-left:20px;font-size:14px">${s.문단.map(p => `<li>${esc(p.요약)}</li>`).join('')}</ol></details>` : '';
    $view.innerHTML = `
      ${paras}
      <div class="drill" style="margin-top:12px">
        <div class="passage" id="psg"><div class="meta">${metaLine}</div><div id="lines">${renderBlocks(s.blocks)}</div></div>
        <div class="q-panel" id="qp"></div>
      </div>${tqBarHtml(D.i + 1, D.q.length)}`;
    chrome({ back: D.back.href, title: D.back.label, notab: true, wide: true });
    tqBind({
      unsure: on => { D.cur.unsure = on; },
      key: () => itemKey(it),
      exp: () => { const e = document.getElementById('tqexp'); if (e) { e.hidden = !e.hidden; if (!e.hidden) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
      prev: D.i > 0 ? () => { D.i--; drawItem(); } : null,
      next: () => { D.i++; if (D.i < D.q.length) drawItem(); else drillEnd(); }
    });
    if (window.TERA_PAD) window.TERA_PAD.penHide();
    feedTerms();
    drawPanel();
  }

  function drawPanel() {
    const { q, o, it, stage } = D.cur;
    const W = D.kind === 'read' ? '지문' : '작품';
    const qp = document.getElementById('qp');
    const head = tqProg(D.i, D.q.length) + tqMeta(`${q.no}번 문제`);
    const stem = `<p class="tq-stem">${esc(q.stem)}</p>${q.body ? `<details class="tq-more"><summary>문항의 &lt;보기&gt; 보기</summary><div class="tq-box">${esc(q.body)}</div></details>` : ''}`;
    const claim = `<div class="tq-choice tq-claim"><span class="tq-n">${it.n}</span><span class="tq-t">${esc(q.choices[it.n - 1])}</span></div>`;
    if (stage === 'ox') {
      qp.innerHTML = `${head}${stem}${claim}
        <p class="tq-hint">이 선지는 ${W}과 맞을까요?</p>
        <div class="tq-ox"><button data-a="O">맞다</button><button data-a="X">틀리다</button></div>`;
      tqPost(qp, D.cur.hot);
      qp.querySelectorAll('.tq-ox button').forEach(b => b.onclick = () => { D.cur.ans = b.dataset.a; D.cur.stage = 'ev'; drawPanel(); });
      tqCoach();
      return;
    }
    if (stage === 'ev') {
      const psg = document.getElementById('psg'); psg.classList.add('picking');
      qp.innerHTML = `${head}${stem}${claim}
        <div class="tq-ox one"><button class="is-pick" disabled>${D.cur.ans === 'O' ? '맞다' : '틀리다'}</button></div>
        <div class="step"><b>근거 찾기</b> · 근거가 된 줄을 눌러 고르세요.</div>
        <div class="actions"><button class="btn primary" id="go" disabled>확정</button><button class="btn" id="none">${W}에 그런 내용이 없다</button></div>`;
      tqPost(qp, D.cur.hot);
      const go = qp.querySelector('#go');
      psg.querySelectorAll('.ln').forEach(el => el.onclick = () => {
        const i = +el.dataset.i;
        if (D.cur.picked.has(i)) D.cur.picked.delete(i); else D.cur.picked.add(i);
        el.classList.toggle('picked'); go.disabled = !D.cur.picked.size;
      });
      go.onclick = () => finish(false);
      qp.querySelector('#none').onclick = () => finish(true);
      return;
    }
  }

  function finish(saidNone) {
    const { o, s, it, q } = D.cur;
    const psg = document.getElementById('psg'); psg.classList.remove('picking');
    psg.querySelectorAll('.ln').forEach(el => el.onclick = null);
    const { marks, found } = markRanges(s.blocks, o.근거);
    const oxOK = D.cur.ans === o.ox;
    let evOK;
    if (o.없음 || !o.근거.length) evOK = saidNone || !D.cur.picked.size ? true : null;
    else if (saidNone) evOK = false;
    else evOK = [...D.cur.picked].some(i => marks[i] && marks[i].some(v => v));
    document.getElementById('lines').innerHTML = renderBlocks(s.blocks, marks);
    D.cur.picked.forEach(i => { const el = psg.querySelector(`.ln[data-i="${i}"]`); if (el) el.classList.add('picked', marks[i].some(v => v) ? 'hit' : 'miss'); });
    const first = psg.querySelector('mark'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const rec = { ox: oxOK, ev: evOK === null ? undefined : evOK, t: Date.now() }; if (D.cur.unsure) rec.h = 1;
    S.att[itemKey(it)] = rec; save();
    if (oxOK && evOK !== false) D.right++;
    const qp = document.getElementById('qp');
    const W = D.kind === 'read' ? '지문' : '작품';
    const truth = o.ox === 'O' ? W + '과 맞는 선지' : W + '과 다른 선지';
    const evMsg = o.없음 || !o.근거.length ? (saidNone ? W + '에 없는 내용이라는 것도 맞게 짚었습니다.' : '이 선지가 말한 내용은 ' + W + '에 없습니다.')
      : evOK ? '고른 줄에 근거가 있습니다.' : saidNone ? '근거가 ' + W + '에 있습니다. 색칠된 줄을 보세요.' : '근거는 색칠된 줄입니다.';
    const TRAP = { 반대: '정반대로 바꾼 선지', 바꿔치기: '주체나 대상을 바꿔 놓은 선지', 범위: '범위(전부·일부, 항상·때때로)를 바꾼 선지', 인과: '원인과 결과를 엇갈리게 한 선지', 없는내용: '지문에 없는 내용을 넣은 선지' };
    const cs = (o.개념 || []).map(id => DATA.cmap[id]).filter(Boolean);
    const expHtml = `<div class="verdict ${oxOK && evOK !== false ? 'ok' : 'no'}"><b>${oxOK ? '판단 맞음' : '판단 틀림'} · ${truth}</b></div>
        <div>${evMsg}</div>
        ${o.함정 && TRAP[o.함정] ? `<div><span class="chip">함정: ${TRAP[o.함정]}</span></div>` : ''}
        <div class="why">${esc(o.풀이)}</div>
        <span class="tq-ans">정답 : ${o.ox === 'O' ? '맞다' : '틀리다'}</span>`;
    const conHtml = cs.map(c => `<div class="tq-con"><button class="chip link" data-c="${c.id}">${esc(c.이름)}</button><span>${esc(c.뜻 || '')}</span></div>`).join('');
    const head = tqProg(D.i, D.q.length) + tqMeta(`${q.no}번 문제`);
    qp.innerHTML = `${head}<p class="tq-stem">${esc(q.stem)}</p>
      <div class="tq-choice tq-claim"><span class="tq-n">${it.n}</span><span class="tq-t">${esc(q.choices[it.n - 1])}</span></div>
      <div class="tq-ox one"><button class="${oxOK ? 'is-ok' : 'is-no'}" disabled>${D.cur.ans === 'O' ? '맞다' : '틀리다'}</button></div>
      <div class="tq-exp" id="tqexp"><div class="tq-tabs"><button class="is-on" data-x="e">해설</button>${cs.length ? '<button data-x="c">개념</button>' : ''}</div><div class="tq-exp-box" id="tqexb">${expHtml}</div></div>
      ${D.kind === 'lit' ? `<div class="actions"><a class="btn" style="text-decoration:none" href="#/set/${encodeURIComponent(it.s)}">이 세트 기출</a></div>` : ''}`;
    tqPost(qp, D.cur.hot);
    const box = qp.querySelector('#tqexb');
    const bindCon = () => box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => sheet(b.dataset.c));
    qp.querySelectorAll('.tq-tabs button').forEach(b => b.onclick = () => {
      qp.querySelectorAll('.tq-tabs button').forEach(x => x.classList.toggle('is-on', x === b));
      box.innerHTML = b.dataset.x === 'c' ? conHtml : expHtml; bindCon();
      if (window.TERA_Q) window.TERA_Q.annotate(box);
    });
    tqEnable(true, true);
    tqCoach();
  }

  function drillEnd() {
    if (D.kind === 'read') {
      $view.innerHTML = `<h1>근거 찾기 끝</h1><p class="sub">선지 ${D.q.length}개 가운데 판단과 근거를 모두 맞힌 것 ${D.right}개.</p><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/reading">다음</a></div>`;
      return;
    }
    const c = DATA.cmap[D.cid];
    $view.innerHTML = `<h1>${esc(c.이름)} 드릴 끝</h1><p class="sub">${D.q.length}문제 가운데 판단과 근거를 모두 맞힌 것 ${D.right}문제.</p>
      <div class="actions"><a class="btn primary" style="text-decoration:none" href="#/drill/${encodeURIComponent(D.cid)}">시작</a><a class="btn" style="text-decoration:none" href="#/lit">합격 지도</a></div>`;
  }

  function sheet(cid) {
    const c = DATA.cmap[cid]; if (!c) return;
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet"><span class="chip">${esc(DATA.gmap[c.묶음].이름)}</span><h2 style="margin-top:8px">${esc(c.이름)}</h2><p class="def">${esc(c.뜻)}</p><div class="how concept-how"><b>작품에서 확인하는 법</b>${esc(c.확인법)}</div>
      <div class="actions" style="margin-top:14px"><a class="btn" style="text-decoration:none" href="#/lit/c/${c.id}">개념 카드</a><button class="btn primary">닫기</button></div></div>`;
    bg.onclick = e => { if (e.target === bg || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') bg.remove(); };
    document.body.appendChild(bg);
  }

  // ───── 기출 세트 ─────
  let F = { 학년: '전체', 갈래: '전체' };
  function viewSets() {
    nav('sets');
    const all = DATA.index.sets;
    const grades = ['전체', ...new Set(all.map(s => s.학년))];
    const kinds = ['전체', ...new Set(all.map(s => s.갈래))];
    const list = all.filter(s => (F.학년 === '전체' || s.학년 === F.학년) && (F.갈래 === '전체' || s.갈래 === F.갈래));
    const recSet = list.find(s => !Object.keys(S.att).some(k => k.startsWith(s.id + '|')));
    $view.innerHTML = `<h1>문학 기출</h1>
      <div class="filters" id="kind"><button class="on" data-go="#/sets">문학</button><button data-go="#/reading">비문학</button></div>
      <div class="filters" id="fg">${grades.map(g => `<button class="${F.학년 === g ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="filters" id="fk">${kinds.map(g => `<button class="${F.갈래 === g ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="setlist">${list.map(s => `<a class="card setcard" href="#/set/${encodeURIComponent(s.id)}"><span class="muted">${esc(setTitle(s))} · ${s.범위}번</span><span class="t">${esc(s.갈래)}${s === recSet ? '<i class="recpill">추천</i>' : ''}</span><span class="w">${worksH(s)}</span></a>`).join('')}</div>`;
    document.querySelectorAll('#kind button').forEach(b => b.onclick = () => { location.hash = b.dataset.go; });
    document.querySelectorAll('#fg button').forEach(b => b.onclick = () => { F.학년 = b.dataset.v; viewSets(); });
    document.querySelectorAll('#fk button').forEach(b => b.onclick = () => { F.갈래 = b.dataset.v; viewSets(); });
  }

  async function viewSet(id) {
    nav('sets');
    const s = await getSet(id), meta = DATA.smap[id];
    const hot = await hotSet();
    chrome({ back: '#/sets', title: '문학 기출', notab: true, wide: true });
    const pick = {};
    const N = s.qs.length;
    const qHot = q => Math.max(0, ...(q.선지 || []).flatMap(o => (o.개념 || []).map(c => DATA.cmap[c] ? (hot.get('L' + DATA.cmap[c].묶음) || 0) : 0)));
    $view.innerHTML = `<div class="drill" style="margin-top:12px">
        <div class="passage" id="psg"><div class="meta"><span>${esc(setTitle(meta))} ${meta.범위}번</span><span>${esc(meta.갈래)}</span>${worksH(meta).replace(/<span>/g, '<span class="wk">')}</div><div id="lines">${renderBlocks(s.blocks)}</div></div>
        <div class="q-panel" id="qp">
          <aside class="tq-omr" id="omr"><div id="jp"></div>${s.qs.map(q => `<div class="tq-omr-row" data-r="${q.no}"><span class="tq-qn">${q.no}번</span>${q.choices.map((c, i) => `<i data-n="${i + 1}">${i + 1}</i>`).join('')}</div>`).join('')}</aside>
          ${s.qs.map(q => `<section class="tq-q" data-q="${q.no}">${tqMeta(`${q.no}번 문제`, q.pts === 3 ? '<span class="tq-pts">3점</span>' : '')}
            <p class="tq-stem">${esc(q.stem)}</p>
            ${q.body ? `<div class="tq-box">${esc(q.body)}</div>` : ''}
            <ul class="tq-choices">${q.choices.map((c, i) => `<li><button class="tq-choice" data-n="${i + 1}"><span class="tq-n">${i + 1}</span><span class="tq-t">${esc(c)}</span></button><div class="exp" hidden></div></li>`).join('')}</ul></section>`).join('')}
          <div class="actions"><button class="btn primary" id="grade">제출</button></div>
        </div>
      </div>${tqBarHtml(1, N, ['exp', 'pen'])}`;
    const qp = document.getElementById('qp'), omr = document.getElementById('omr');
    feedTerms();
    tqPost(qp, s.qs.map(qHot));
    const cards = () => [...qp.querySelectorAll('.tq-q')];
    let cur = 0, graded = false;
    const todo = () => s.qs.filter(q => !pick[q.no]);
    const jp = window.TERA_Q ? window.TERA_Q.jump(document.getElementById('jp'), { count: N, onClick: () => { const t = todo()[0]; if (t) qp.querySelector(`.tq-q[data-q="${t.no}"]`).scrollIntoView({ block: 'center', behavior: 'smooth' }); } }) : null;
    function paintOmr() {
      s.qs.forEach((q, k) => {
        const row = omr.querySelector(`[data-r="${q.no}"]`);
        row.classList.toggle('is-now', k === cur); row.classList.toggle('is-todo', !pick[q.no]);
        row.querySelectorAll('i').forEach(i => i.classList.toggle('is-on', +i.dataset.n === pick[q.no]));
      });
      if (jp) jp.setCount(todo().length);
      const pos = document.querySelector('#tqbar .tq-pos'); if (pos) pos.innerHTML = `${cur + 1} <small>/ ${N}</small>`;
    }
    function choose(qn, n) {
      if (graded) return;
      pick[qn] = n;
      qp.querySelectorAll(`.tq-q[data-q="${qn}"] .tq-choice`).forEach(x => x.classList.toggle('is-pick', +x.dataset.n === n));
      paintOmr();
    }
    const go = k => { cur = Math.max(0, Math.min(N - 1, k)); cards()[cur].scrollIntoView({ block: 'start', behavior: 'smooth' }); paintOmr(); };
    omr.querySelectorAll('.tq-omr-row').forEach(row => row.onclick = e => {
      const i = e.target.closest('i');
      if (i) choose(+row.dataset.r, +i.dataset.n); else { cur = s.qs.findIndex(q => q.no === +row.dataset.r); cards()[cur].scrollIntoView({ block: 'start', behavior: 'smooth' }); paintOmr(); }
      if (window.innerWidth < 960) omr.classList.remove('is-open');
    });
    window.addEventListener('scroll', function sc() {
      if (!document.body.contains(qp)) { window.removeEventListener('scroll', sc); return; }
      let k = 0; cards().forEach((c, i) => { if (c.getBoundingClientRect().top < window.innerHeight * 0.45) k = i; });
      if (k !== cur) { cur = k; paintOmr(); }
    }, { passive: true });
    qp.querySelectorAll('.tq-choice').forEach(el => el.onclick = () => {
      const qn = +el.closest('[data-q]').dataset.q;
      if (graded) { // 채점 뒤: 선지를 누르면 근거 표시
        const q = s.qs.find(x => x.no === qn), o = q.선지[+el.dataset.n - 1];
        const { marks } = markRanges(s.blocks, o.근거);
        document.getElementById('lines').innerHTML = renderBlocks(s.blocks, marks);
        const m = document.querySelector('#psg mark'); if (m) m.scrollIntoView({ block: 'center', behavior: 'smooth' });
        qp.querySelectorAll('.exp').forEach(e => e.hidden = true);
        const ex = el.parentNode.querySelector('.exp'); ex.hidden = false;
        ex.innerHTML = `<div style="margin:6px 0 0 40px;font-size:14px;color:var(--ink-2)">${o.ox === 'O' ? '작품과 맞음' : '작품과 다름'} · ${esc(o.풀이)} ${(o.개념 || []).map(cid => DATA.cmap[cid] ? `<a class="chip link" style="text-decoration:none" href="#/lit/c/${cid}">${esc(DATA.cmap[cid].이름)}</a>` : '').join(' ')}</div>`;
        return;
      }
      choose(qn, +el.dataset.n);
    });
    tqBind({
      key: () => 'set|' + id + '|' + (s.qs[cur] ? s.qs[cur].no : ''),
      exp: () => { const ex = qp.querySelector('.exp:not([hidden])') || qp.querySelector('.exp'); if (ex) ex.scrollIntoView({ block: 'center', behavior: 'smooth' }); },
      prev: () => go(cur - 1),
      next: () => go(cur + 1),
      pos: () => omr.classList.toggle('is-open')
    });
    const nxb = document.querySelector('#tqbar [data-t="next"]'); if (nxb) nxb.disabled = false;
    paintOmr();
    document.getElementById('grade').onclick = () => {
      let ok = 0; graded = true;
      s.qs.forEach(q => {
        const card = qp.querySelector(`.tq-q[data-q="${q.no}"]`); card.classList.add('graded');
        card.querySelectorAll('.tq-choice').forEach(el => {
          const n = +el.dataset.n;
          el.classList.remove('is-pick');
          el.classList.toggle('is-ok', n === q.ans); el.classList.toggle('is-no', n !== q.ans && n === pick[q.no]);
        });
        if (pick[q.no] === q.ans) ok++;
      });
      tqEnable(true, true);
      const all = DATA.index.sets, nx = all[all.findIndex(x => x.id === id) + 1] || all[0];
      document.getElementById('grade').outerHTML = `<div class="step"><b>${ok} / ${s.qs.length}</b> · 선지를 누르면 작품 속 근거와 풀이가 나옵니다.</div><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/set/${encodeURIComponent(nx.id)}">다음</a></div>`;
    };
    tqCoach();
  }

  // ───── 어법 ─────
  const G = { data: null };
  async function gload() {
    if (!G.data) {
      try { G.data = await getJSON('data/gram.json'); }
      catch (e) { G.data = { concepts: await getJSON('data/gram_concepts.json').catch(() => ({ 묶음: [], 개념: [] })), qs: [] }; }
      G.cmap = {}; G.data.concepts['개념'].forEach(c => G.cmap[c.id] = c);
      G.by = {};
      G.data.qs.forEach(q => q.선지.forEach((o, i) => (o.개념 || []).forEach(c => (G.by[c] = G.by[c] || []).push({ q, n: i + 1 }))));
    }
    return G.data;
  }
  const gkey = it => 'g|' + it.q.id + '|' + it.n;
  function gstat(cid) {
    const its = G.by[cid] || []; let n = 0, ok = 0;
    its.forEach(it => { const a = S.att[gkey(it)]; if (a) { n++; if (a.ox) ok++; } });
    return { total: its.length, n, ok };
  }

  async function viewGMap() {
    nav('grammar');
    const d = await gload();
    if (!d.qs.length) { $view.innerHTML = `<h1>어법</h1><p class="sub">기출 문법 문항을 정리하는 중입니다. 문학편 다음에 엽니다.</p>`; return; }
    $view.innerHTML = `<h1>어법</h1><p class="sub">문법 기출 선지 하나하나를 맞다·틀리다로 판단하고, 예로 든 말을 직접 분석해 봅니다. 숫자는 기출 선지 수입니다.</p>
      <div class="groups">${d.concepts['묶음'].map(g => `<div class="card group"><h3>${esc(g.이름)}</h3><div class="clist">${d.concepts['개념'].filter(c => c.묶음 === g.id).map(c => {
        const st = gstat(c.id); const pct = st.n ? Math.round(st.ok / st.n * 100) : 0;
        return `<a class="cbtn ${st.total ? '' : 'zero'}" href="#/grammar/c/${c.id}">${esc(c.이름)} <small>${st.total}</small>${st.n ? `<span class="bar"><i style="width:${pct}%"></i></span>` : ''}</a>`;
      }).join('')}</div></div>`).join('')}</div>`;
  }

  /* 개념 도식(2026-10-25 대표님 「줄글만 줄줄 있으니 공부하기 싫다, 구조화할 수 있는 건 다이어그램으로」)
     뜻은 개념어 상자, 함께 구별할 개념이 있으면 뜻끼리 나란히 견준다. 데이터의 뜻·예만 쓴다(새 글 없음). */
  function 개념도식(c, 짝, 예) {
    if (!window.DIAGRAM) return `<p class="def">${esc(c.뜻)}</p>`;
    // 구별할 개념이 있으면 견주기 하나로(뜻을 두 번 적지 않는다), 없으면 개념어 상자
    if (짝.length) return DIAGRAM.html({ t: 'vs', title: '함께 구별할 개념', cols: [c].concat(짝.slice(0, 2)).map(x => ({ name: x.이름, items: [x.뜻] })) });
    return DIAGRAM.html({ t: 'def', term: c.이름, text: c.뜻, ex: 예 });
  }
  async function viewGConcept(cid) {
    nav('grammar');
    await gload(); const c = G.cmap[cid]; if (!c) return viewJido();
    const its = G.by[cid] || [];
    $view.innerHTML = `<a href="#/grammar" class="muted" style="text-decoration:none">← 어법</a>
      <div class="concept-head" style="margin-top:8px"><div><h1>${esc(c.이름)}</h1></div>
      <a class="btn primary" style="text-decoration:none" href="#/grammar/drill/${cid}">드릴 ${Math.min(10, its.length)}문제</a></div>
      ${개념도식(c, [], c.예 || [])}<div class="how concept-how"><b>확인하는 법</b>${esc(c.확인법)}</div>
      <p class="muted" style="margin-top:16px">기출 선지 ${its.length}개</p>`;
  }

  let GD = null;
  async function viewGDrill(cid) {
    nav('grammar');
    await gload();
    const pool = G.by[cid] || [];
    if (!pool.length) { $view.innerHTML = '<p class="sub">이 개념의 기출 선지가 아직 없습니다.</p><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/map">다음</a></div>'; return; }
    const rank = it => { const a = S.att[gkey(it)]; return !a ? 0 : (a.ox && !a.h) ? 2 : 1; };
    GD = { cid, q: shuffle(pool).sort((a, b) => rank(a) - rank(b)).slice(0, 10), i: 0, right: 0 };
    gdraw();
  }

  async function gdraw() {
    const it = GD.q[GD.i], q = it.q, o = q.선지[it.n - 1], c = G.cmap[GD.cid];
    const hot = await hotSet();
    const isHot = Math.max(0, ...(o.개념 || []).map(id => G.cmap[id] ? (hot.get('G' + G.cmap[id].묶음) || 0) : 0));
    let unsure = false;
    $view.innerHTML = `
      <div class="drill" style="margin-top:12px">
        <div class="passage"><div class="meta"><span>${esc(q.출처)} ${q.no}번</span></div>
          ${q.lines && q.lines.length ? `<div>${q.lines.map(l => `<span class="ln">${esc(l)}</span>`).join('')}</div>` : ''}
          ${q.body ? `<div class="tq-box" style="margin-top:8px">${esc(q.body)}</div>` : ''}
        </div>
        <div class="q-panel" id="gp"></div>
      </div>${tqBarHtml(GD.i + 1, GD.q.length)}`;
    chrome({ back: '#/grammar/c/' + GD.cid, title: c.이름, notab: true, wide: true });
    const head = tqProg(GD.i, GD.q.length) + tqMeta(`${q.no}번 문제`);
    const claim = `<div class="tq-choice tq-claim"><span class="tq-n">${it.n}</span><span class="tq-t">${esc(q.choices[it.n - 1])}</span></div>`;
    const stem = `<p class="tq-stem">${esc(q.stem)}</p>`;
    const next = () => { GD.i++; if (GD.i < GD.q.length) gdraw(); else $view.innerHTML = `<h1>${esc(c.이름)} 드릴 끝</h1><p class="sub">${GD.q.length}문제 가운데 ${GD.right}문제를 맞혔습니다.</p><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/grammar/drill/${GD.cid}">시작</a><a class="btn" style="text-decoration:none" href="#/map">합격 지도</a></div>`; };
    tqBind({
      unsure: on => { unsure = on; },
      key: () => gkey(it),
      exp: () => { const e = document.getElementById('tqexp'); if (e) { e.hidden = !e.hidden; if (!e.hidden) e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
      prev: GD.i > 0 ? () => { GD.i--; gdraw(); } : null,
      next
    });
    if (window.TERA_PAD) window.TERA_PAD.penHide();
    feedTerms();
    const gp = document.getElementById('gp');
    gp.innerHTML = `${head}${stem}${claim}<p class="tq-hint">이 선지는 맞을까요?</p><div class="tq-ox"><button data-a="O">맞다</button><button data-a="X">틀리다</button></div>`;
    tqPost(gp, isHot);
    tqCoach();
    gp.querySelectorAll('.tq-ox button').forEach(b => b.onclick = () => {
      const okk = b.dataset.a === o.ox;
      const rec = { ox: okk, t: Date.now() }; if (unsure) rec.h = 1;
      S.att[gkey(it)] = rec; save(); if (okk) GD.right++;
      const expHtml = `<div class="verdict ${okk ? 'ok' : 'no'}"><b>${okk ? '판단 맞음' : '판단 틀림'} · ${o.ox === 'O' ? '맞는 선지' : '틀린 선지'}</b></div>
          ${o.대상 ? `<div><b>${esc(o.대상)}</b> → ${esc(o.분석)}</div>` : ''}
          <div class="why">${esc(o.풀이)}</div>
          <span class="tq-ans">정답 : ${o.ox === 'O' ? '맞다' : '틀리다'}</span>`;
      const cs = (o.개념 || []).map(id => G.cmap[id]).filter(Boolean);
      const conHtml = cs.map(x => `<div class="tq-con"><a class="chip link" style="text-decoration:none" href="#/grammar/c/${x.id}">${esc(x.이름)}</a><span>${esc(x.뜻 || '')}</span></div>`).join('');
      gp.innerHTML = `${head}${stem}${claim}
        <div class="tq-ox one"><button class="${okk ? 'is-ok' : 'is-no'}" disabled>${b.dataset.a === 'O' ? '맞다' : '틀리다'}</button></div>
        <div class="tq-exp" id="tqexp"><div class="tq-tabs"><button class="is-on" data-x="e">해설</button>${cs.length ? '<button data-x="c">개념</button>' : ''}</div><div class="tq-exp-box" id="tqexb">${expHtml}</div></div>`;
      tqPost(gp, isHot);
      const box = gp.querySelector('#tqexb');
      gp.querySelectorAll('.tq-tabs button').forEach(t => t.onclick = () => {
        gp.querySelectorAll('.tq-tabs button').forEach(x => x.classList.toggle('is-on', x === t));
        box.innerHTML = t.dataset.x === 'c' ? conHtml : expHtml;
        if (window.TERA_Q) window.TERA_Q.annotate(box);
      });
      tqEnable(true, true);
    });
  }

  // ───── 비문학 근거 찾기 ─────
  const RD = { index: null, smap: {} };
  let RF = { 학년: '전체', 분야: '전체' };
  async function rload() {
    if (!RD.index) {
      try { RD.index = await getJSON('data/read_index.json'); } catch (e) { RD.index = { sets: [] }; }
      RD.index.sets.forEach(s => RD.smap[s.id] = s);
    }
    return RD.index;
  }
  function rdone(sid) { const s = RD.smap[sid]; let n = 0; for (const k in S.att) if (k.startsWith('r|' + sid + '|')) n++; return n; }

  async function viewReading() {
    nav('reading');
    const ix = await rload();
    if (!ix.sets.length) { $view.innerHTML = `<h1>비문학 근거 찾기</h1><p class="sub">독서 기출을 정리하는 중입니다.</p><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/home">다음</a></div>`; return; }
    const grades = ['전체', ...new Set(ix.sets.map(s => s.학년))];
    const kinds = ['전체', ...new Set(ix.sets.map(s => s.분야))];
    const list = ix.sets.filter(s => (RF.학년 === '전체' || s.학년 === RF.학년) && (RF.분야 === '전체' || s.분야 === RF.분야));
    const recRd = list.find(s => !rdone(s.id));
    $view.innerHTML = `<h1>비문학 근거 찾기</h1>
      <div class="filters" id="kind"><button data-go="#/sets">문학</button><button class="on" data-go="#/reading">비문학</button></div>
      <div class="filters" id="rg">${grades.map(g => `<button class="${RF.학년 === g ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="filters" id="rk">${kinds.map(g => `<button class="${RF.분야 === g ? 'on' : ''}" data-v="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      <div class="setlist">${list.map(s => `<a class="card setcard" href="#/reading/${encodeURIComponent(s.id)}"><span class="muted">${esc(setTitle(s))} · ${s.범위}번 · 선지 ${s.nc}개${rdone(s.id) ? ` · ${rdone(s.id)}개 풂` : ''}</span><span class="t">${esc(s.분야)}${s === recRd ? '<i class="recpill">추천</i>' : ''}</span><span class="w">${String(s.제재 || '').split(' / ').map(x => `<span>${esc(x)}</span>`).join('')}</span></a>`).join('')}</div>`;
    document.querySelectorAll('#kind button').forEach(b => b.onclick = () => { location.hash = b.dataset.go; });
    document.querySelectorAll('#rg button').forEach(b => b.onclick = () => { RF.학년 = b.dataset.v; viewReading(); });
    document.querySelectorAll('#rk button').forEach(b => b.onclick = () => { RF.분야 = b.dataset.v; viewReading(); });
  }

  async function viewRDrill(sid) {
    nav('reading');
    await rload();
    const s = await getSet(sid, 'read');
    const q = [];
    // 어휘 문항은 근거 찾기 훈련이 안 된다(근거가 낱말 앞뒤 몇 글자뿐 — 2026-10-09 표본 검산) → 뺀다
    s.qs.forEach(x => { if (x.유형 !== '어휘') x.선지.forEach((o, i) => { if (o.ox) q.push({ s: sid, q: x.no, n: i + 1, r: true }); }); });
    D = { kind: 'read', q, i: 0, right: 0, back: { href: '#/reading', label: '비문학' } };
    drawItem();
  }

  // ───── 기록·설정 ─────
  function viewRecords() {
    nav('records');
    const vals = Object.values(S.att); const n = vals.length, ok = vals.filter(a => a.ox && a.ev !== false).length;
    const rows = DATA.concepts['개념'].map(c => ({ c, st: conceptStat(c.id) })).filter(x => x.st.n).sort((a, b) => a.st.ok / a.st.n - b.st.ok / b.st.n);
    $view.innerHTML = `<h1>기록</h1>
      <div class="stat-row"><div class="card stat"><span class="muted">푼 선지</span><b>${n}</b></div><div class="card stat"><span class="muted">판단·근거 모두 맞힘</span><b>${n ? Math.round(ok / n * 100) : 0}%</b></div><div class="card stat"><span class="muted">다룬 개념</span><b>${rows.length}</b></div></div>
      <h2>약한 개념부터</h2><div class="weak">${rows.map((r, i) => `<a class="card" href="#/drill/${r.c.id}"><span>${esc(r.c.이름)}${i ? '' : '<i class="recpill">추천</i>'}</span><span class="muted">${r.st.ok}/${r.st.n}</span></a>`).join('') || '<p class="muted">아직 푼 선지가 없습니다.</p><a class="btn primary" style="text-decoration:none" href="#/home">시작</a>'}</div>`;
  }

  /* 화면표준 7절: 하루 공부 시간(대입 공용 저장 키) */
  const SUBJ = [['tongsa', '통합사회'], ['hanguksa', '한국사'], ['tonggwa', '통합과학'], ['math', '수학'], ['gukeo', '국어'], ['english', '영어']];
  const PERS = [[15, '15분'], [30, '30분'], [45, '45분'], [60, '1시간'], [90, '1시간 30분'], [120, '2시간']];
  const fmtMin = m => m < 60 ? m + '분' : (Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : ''));
  function dayPlan() {
    let subs; try { subs = JSON.parse(localStorage.getItem('tera_daeip_subjects')); } catch (e) { subs = null; }
    subs = Array.isArray(subs) ? subs.filter(x => SUBJ.some(y => y[0] === x)) : [];
    if (!subs.includes('gukeo')) subs.push('gukeo');
    let per = Number(localStorage.getItem('tera_daeip_per_min')) || 30;
    const cap = Math.floor(480 / subs.length); if (per > cap) per = PERS.filter(x => x[0] <= cap).pop()[0];
    return { subs, per };
  }
  function savePlan(subs, per) { try { localStorage.setItem('tera_daeip_subjects', JSON.stringify(subs)); localStorage.setItem('tera_daeip_per_min', String(per)); } catch (e) { } }
  function viewSettings() {
    nav('settings');
    const skins = [['paper', '시험지'], ['ink', '먹색'], ['marker', '형광펜']];
    const themes = [['auto', '기기 설정 따름'], ['light', '밝게'], ['dark', '어둡게']];
    const plan = dayPlan();
    $view.innerHTML = `<h1>설정</h1>
      <h2>하루 공부 시간</h2><div class="filters" id="subj">${SUBJ.map(([v, l]) => `<button class="${plan.subs.includes(v) ? 'on' : ''}" data-v="${v}" ${v === 'gukeo' ? 'disabled aria-disabled="true"' : ''}>${l}</button>`).join('')}</div>
      <div class="filters" id="per">${PERS.map(([m, l]) => `<button class="${plan.per === m ? 'on' : ''}" data-m="${m}" ${m * plan.subs.length > 480 ? 'disabled aria-disabled="true"' : ''}>${l}</button>`).join('')}</div>
      <p class="muted" id="plansum">고른 과목 ${plan.subs.length}개 · 하루 합계 ${fmtMin(plan.per * plan.subs.length)}</p>
      <div class="list" style="margin-top:12px"><a class="li" href="javascript:void 0" data-zs="1"><div><div class="t">합격 전략</div></div></a></div>
      <h2>화면 스킨</h2><div class="filters" id="sk">${skins.map(([v, l]) => `<button class="${S.skin === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
      <h2>밝기 (시험지 스킨)</h2><div class="filters" id="th">${themes.map(([v, l]) => `<button class="${S.theme === v ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
      <h2>기록 지우기</h2><button class="btn" id="wipe">푼 기록 모두 지우기</button>`;
    document.querySelectorAll('#subj button').forEach(b => b.onclick = () => { if (b.dataset.v === 'gukeo') return; const on = plan.subs.includes(b.dataset.v); const subs = on ? plan.subs.filter(x => x !== b.dataset.v) : plan.subs.concat(b.dataset.v); const cap = Math.floor(480 / subs.length); const per = plan.per > cap ? PERS.filter(x => x[0] <= cap).pop()[0] : plan.per; savePlan(subs, per); viewSettings(); });
    document.querySelectorAll('#per button').forEach(b => b.onclick = () => { if (b.disabled) return; savePlan(plan.subs, Number(b.dataset.m)); viewSettings(); });
    document.querySelectorAll('#sk button').forEach(b => b.onclick = () => { S.skin = b.dataset.v; save(); applySkin(); viewSettings(); });
    document.querySelectorAll('#th button').forEach(b => b.onclick = () => { S.theme = b.dataset.v; save(); applySkin(); viewSettings(); });
    document.getElementById('wipe').onclick = () => { if (confirm('푼 기록을 모두 지울까요?')) { S.att = {}; save(); viewSettings(); } };
  }


  /* 화면표준 14절: 「합격 전략」은 떠 있는 알약 대신 오늘 · 설정의 줄에서 연다. 공용 창(zzstrat.js)은 그대로 두고 열릴 때 덮개 style 만 넣는다 */
  document.addEventListener('click', function (e) { const a = e.target.closest && e.target.closest('[data-zs]'); if (a) { e.preventDefault(); if (window.ZZSTRAT) window.ZZSTRAT.open('gukeo'); } });
  (function(){
    var P="#0F766E", PI="#0B4F4A", PS="rgba(15, 118, 110, .10)";
    var 덮개=[
      "#zs,#zst,#zsy{--zs-bg:#FFFFFF;--zs-card:#FFFFFF;--zs-line:#E6E8EC;--zs-red:"+P+";--zs-blue:#8AD9D0;--zs-gold:#7C818C;--zs-soft:#F1F3F6;--zs-tx:#111419;--zs-sub:#5F6670}",
      "#zs .top .t{letter-spacing:0;font-size:13px}#zs .top button{border-radius:12px}",
      "#zs section{border-radius:18px;box-shadow:none}",
      "#zs .chip{border-radius:999px;background:#F1F3F6;color:#333941}#zs .chip.r{background:"+PS+";color:"+PI+"}",
      "#zs .pk{border:1px solid #E6E8EC;border-radius:14px;background:#FFFFFF}#zs .pk.on{border-color:"+P+";background:"+PS+";box-shadow:none}",
      "#zs .tg{border-radius:999px;font-size:11.5px}#zs .tg.a{background:"+P+";color:#fff}#zs .tg.l{background:rgba(15, 118, 110, .16);color:"+PI+";border:0}#zs .tg.g{background:#F1F3F6;color:#5F6670;border:0}",
      "#zs .sc,#zs .sc.s,#zs .sc.d{border:1px solid #E6E8EC;border-radius:14px}#zs .sc.on{background:#FFFFFF}#zs .sc .rb{border-radius:999px}",
      "#zs .sc.s .rb,#zs .sc.s .bar b{background:"+P+"}#zs .sc.d .rb,#zs .sc.d .bar b{background:#8AD9D0}#zs .sc.b .bar b{background:#B4BAC3}",
      "#zs .det{border-radius:14px}#zs .vl i{background:"+P+";border-radius:50%}",
      "#zs .gauge .fl{background:rgba(15, 118, 110, .14)}#zs .stack i.s{background:"+P+"}#zs .stack i.d{background:#8AD9D0}#zs .stack i.b{background:#B4BAC3}",
      "#zs .gp b{background:"+P+";border-radius:12px}#zs .gp::after{background:"+P+"}#zs .gb .gline b{border-radius:12px}",
      "#zs .gc .cd{border:1px solid #E6E8EC;border-radius:14px}",
      "#zs .gc .cd:nth-child(1){--c:"+P+"!important}#zs .gc .cd:nth-child(2){--c:#8AD9D0!important}#zs .gc .cd:nth-child(3){--c:#A8D5D0!important}#zs .gc .cd:nth-child(n+4){--c:#9CA3AF!important}",
      "#zs .gc .cg{border-radius:999px}#zs .hit{border-radius:14px}",
      "#zs .q li.a::before{background:"+P+";border-color:"+P+"}#zs .q .st.f{color:"+PI+";border-color:"+PI+"}#zs .q{border-radius:14px}",
      "#zs .go{background:"+P+";border-radius:12px}#zst .nx{background:"+P+";border-radius:12px}#zst .hole{border-radius:14px}#zst .bub{border-radius:18px}",
      "#zsy .nx{background:"+P+"}#zsy .pg i{background:"+P+"}#zsy .pk{border:1px solid #E6E8EC}#zsy .pk.on{border-color:"+P+";box-shadow:none}",
      "#zsy .end button{border:1px solid "+P+";color:"+PI+"}#zsy .end .main{background:"+P+";color:#fff}"
    ].join("\n");
    function 글(root){ var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false), n; while((n=w.nextNode())){ if(n.nodeValue.indexOf("합격전략")>=0) n.nodeValue=n.nodeValue.replace(/합격전략/g,"합격 전략"); } }
    function 말(){
      document.querySelectorAll(".zs-fab,.zs-btn").forEach(function(el){ 글(el); });
      var h=document.getElementById("zs-host");
      if(h && h.shadowRoot){
        if(!h.shadowRoot.getElementById("mj-ov")){ var st=document.createElement("style"); st.id="mj-ov"; st.textContent=덮개; h.shadowRoot.appendChild(st); }
        글(h.shadowRoot);
      }
    }
    new MutationObserver(말).observe(document.documentElement,{childList:true,subtree:true}); 말();
  })();
  boot().catch(e => { $view.innerHTML = `<p class="sub">자료를 못 불러왔습니다: ${esc(e.message)}</p>`; });
})();
