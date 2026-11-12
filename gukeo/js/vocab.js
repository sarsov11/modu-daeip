/* 모두의 국어 — 고전 어휘장·어휘 드릴 (2026-11-11 대표님 「고전어휘 정리 같은 것도 있음?」)
   자료: data/vocab.json = 기출 고전 작품 시험지 각주(엔진/13_고전어휘.py). app.js 의 route 가 #/vocab 을 여기로 넘긴다. */
(function () {
  'use strict';
  const KEY = 'modu-kor-vocab-v1';
  let V = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const st = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* 저장 안 돼도 화면은 돈다 */ } };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clean = w => w.replace(/\(.*?\)|\s/g, '');
  function hl(line, w) {
    const k = clean(w); if (!line || !k) return esc(line);
    const i = line.replace(/\s/g, '').indexOf(k); if (i < 0) return esc(line);
    // 띄어쓰기를 무시하고 찾은 자리를 원문 위치로 옮긴다
    let n = -1, s = -1, e = -1;
    for (let j = 0; j < line.length; j++) { if (/\s/.test(line[j])) continue; n++; if (n === i) s = j; if (n === i + k.length - 1) { e = j + 1; break; } }
    return s < 0 ? esc(line) : esc(line.slice(0, s)) + '<mark>' + esc(line.slice(s, e)) + '</mark>' + esc(line.slice(e));
  }
  async function load() { if (!V) V = await fetch('data/vocab.json').then(r => r.json()); return V; }

  let F = { q: '', sort: 'freq' };
  async function list($view) {
    const d = await load();
    const q = F.q.trim();
    let arr = d.filter(e => !q || e.어휘.includes(q) || e.뜻.some(m => m.includes(q)));
    if (F.sort === 'abc') arr = arr.slice().sort((a, b) => a.어휘.localeCompare(b.어휘, 'ko'));
    const known = Object.values(st).filter(x => x.ok >= 2).length;
    $view.innerHTML = `<h1>고전 어휘</h1>
      <p class="sub">수능·모의평가·학력평가 고전 작품에 각주로 풀이된 낱말 ${d.length}개입니다. 여러 시험에 거듭 나온 낱말이 앞에 옵니다.</p>
      <div class="actions" style="margin:4px 0 14px"><a class="btn primary" style="text-decoration:none" href="#/vocab/quiz">어휘 드릴 10문제</a><span class="muted" style="align-self:center">두 번 맞힌 낱말 ${known}개</span></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <input id="vq" value="${esc(F.q)}" placeholder="낱말이나 뜻으로 찾기" style="flex:1;min-width:180px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--surface);color:var(--ink)">
        <div class="filters" style="margin:0"><button data-s="freq" class="${F.sort === 'freq' ? 'on' : ''}">자주 나온 순</button><button data-s="abc" class="${F.sort === 'abc' ? 'on' : ''}">가나다순</button></div>
      </div>
      <div id="vl" style="display:grid;gap:8px">${arr.slice(0, 300).map((e, i) => `<button class="card" data-i="${d.indexOf(e)}" style="text-align:left;display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:baseline;cursor:pointer">
        <b style="font-family:var(--font-text);font-size:17px">${esc(e.어휘)}</b><span>${esc(e.뜻[0])}</span><span class="muted">${e.출처.length > 1 ? e.출처.length + '번' : ''}</span></button>`).join('')}
        ${arr.length > 300 ? `<p class="muted">앞의 300개만 보입니다. 찾기 칸에 낱말을 넣어 좁혀 보세요.</p>` : ''}${arr.length ? '' : '<p class="muted">찾는 낱말이 없습니다.</p>'}</div>`;
    const inp = document.getElementById('vq');
    inp.oninput = () => { F.q = inp.value; clearTimeout(inp._t); inp._t = setTimeout(() => { list($view).then(() => { const x = document.getElementById('vq'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }); }, 200); };
    document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { F.sort = b.dataset.s; list($view); });
    document.querySelectorAll('#vl [data-i]').forEach(b => b.onclick = () => card(d[+b.dataset.i]));
  }

  function card(e) {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet"><h2 style="margin:0 0 6px;font-family:var(--font-text)">${esc(e.어휘)}</h2>
      ${e.뜻.map(m => `<p class="def" style="margin:4px 0">${esc(m)}</p>`).join('')}
      <h3 style="font-size:14px;margin:14px 0 6px">기출에 나온 자리</h3>
      ${e.출처.map(s => `<div style="margin-bottom:10px"><div class="muted" style="font-size:13px">${esc(s.회차)} ${esc(s.범위)}번${s.작품 ? ' · ' + esc(s.작품) : ''}</div>${s.구절 ? `<div style="font-family:var(--font-text)">${hl(s.구절, e.어휘)}</div>` : ''}</div>`).join('')}
      <div class="actions" style="margin-top:10px"><button class="btn primary">닫기</button></div></div>`;
    bg.onclick = ev => { if (ev.target === bg || ev.target.tagName === 'BUTTON') bg.remove(); };
    document.body.appendChild(bg);
  }

  // 드릴: 낱말→뜻 / 뜻→낱말 / 구절 속 낱말 뜻. 안 푼 것·틀린 것 먼저.
  let Q = null;
  async function quiz($view) {
    const d = await load();
    const rank = e => { const a = st[e.어휘]; return !a ? 0 : a.ok >= 2 ? 2 : 1; };
    const pool = shuffle(d).sort((a, b) => rank(a) - rank(b) || b.출처.length - a.출처.length).slice(0, 10);
    Q = { d, items: pool.map(e => ({ e, kind: e.출처.some(s => s.구절) && Math.random() < .4 ? 'ctx' : Math.random() < .5 ? 'w2m' : 'm2w' })), i: 0, right: 0 };
    draw($view);
  }
  function draw($view) {
    const it = Q.items[Q.i], e = it.e, d = Q.d;
    const others = shuffle(d.filter(x => x !== e)).slice(0, 3);
    const toM = x => x.뜻[0], toW = x => x.어휘;
    const opts = shuffle([e, ...others]);
    const src = e.출처.find(s => s.구절) || e.출처[0];
    const prompt = it.kind === 'm2w' ? `<div class="claim">${esc(e.뜻[0])}</div><div class="muted">이 뜻을 가진 낱말은?</div>`
      : it.kind === 'ctx' ? `<div class="claim" style="font-family:var(--font-text)">${hl(src.구절, e.어휘)}</div><div class="muted">${esc(src.작품 || src.회차)} — 표시한 낱말의 뜻은?</div>`
      : `<div class="claim" style="font-family:var(--font-text);font-size:22px">${esc(e.어휘)}</div><div class="muted">이 낱말의 뜻은?</div>`;
    const show = it.kind === 'm2w' ? toW : toM;
    $view.innerHTML = `<div class="progress"><a href="#/vocab" style="text-decoration:none">← 고전 어휘</a><span class="track"><i style="width:${Q.i / Q.items.length * 100}%"></i></span><span>${Q.i + 1} / ${Q.items.length}</span></div>
      <div class="q-panel" style="max-width:640px;margin:14px auto 0">${prompt}
      <div id="vo" style="display:grid;gap:8px">${opts.map((x, k) => `<button class="card" data-k="${k}" style="text-align:left;cursor:pointer">${esc(show(x))}</button>`).join('')}</div><div id="vr"></div></div>`;
    document.querySelectorAll('#vo [data-k]').forEach(b => b.onclick = () => {
      const pick = opts[+b.dataset.k], ok = pick === e;
      const a = st[e.어휘] = st[e.어휘] || { ok: 0, ng: 0 }; ok ? a.ok++ : a.ng++; save(); if (ok) Q.right++;
      document.querySelectorAll('#vo [data-k]').forEach(x => { x.disabled = true; const o = opts[+x.dataset.k]; if (o === e) x.style.background = 'var(--ok-soft)'; else if (x === b) x.style.background = 'var(--no-soft)'; });
      document.getElementById('vr').innerHTML = `<div class="result ${ok ? 'ok' : 'no'}" style="margin-top:10px"><div class="verdict">${ok ? '맞음' : '틀림'} · ${esc(e.어휘)}</div><div>${esc(e.뜻.join(' / '))}</div>
        ${src && src.구절 ? `<div class="muted" style="font-size:13px">${esc(src.회차)} ${esc(src.작품 || '')}</div><div style="font-family:var(--font-text)">${hl(src.구절, e.어휘)}</div>` : ''}</div>
        <div class="actions" style="margin-top:10px"><button class="btn primary" id="vn">${Q.i + 1 < Q.items.length ? '다음' : '결과 보기'}</button></div>`;
      document.getElementById('vn').onclick = () => { Q.i++; if (Q.i < Q.items.length) draw($view); else $view.innerHTML = `<h1>어휘 드릴 끝</h1><p class="sub">${Q.items.length}문제 가운데 ${Q.right}문제를 맞혔습니다.</p><div class="actions"><a class="btn primary" style="text-decoration:none" href="#/vocab/quiz">한 번 더</a><a class="btn" style="text-decoration:none" href="#/vocab">어휘장</a></div>`; };
    });
  }

  window.viewVocab = function (sub) {
    const $view = document.getElementById('view');
    window.scrollTo(0, 0);
    (sub === 'quiz' ? quiz($view) : list($view)).catch(err => { $view.innerHTML = `<p class="sub">어휘 자료를 못 불러왔습니다: ${esc(err.message)}</p>`; });
  };
})();
