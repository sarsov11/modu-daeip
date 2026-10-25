/* 문항 글 바로잡기 — 데이터(suneung.js·mock.js)를 읽은 직후, 화면에 그리기 전에 돈다(2026-10-25 보기·표지 검수).
   데이터 파일은 시안에서 통째로 복사되므로 고칠 것은 여기에 둔다. 검사기: 모두의국어\엔진\보기검수_공개판.py
   ① 문항별 손질(FIX) ② 줄 나눔 공통 규칙 ③ [A]…[/A] 구간 표시 ④ 짝짓기 선지(머리 「ⓐ ⓑ」)를 칸으로 나눔 */
(function () {
  "use strict";
  var sets = [];
  (window.GK_EXAMS || []).forEach(function (e) { sets = sets.concat(e.sets || []); });
  (window.GK_MOCKS || []).forEach(function (e) { sets = sets.concat(e.sets || []); });
  var byId = {}; sets.forEach(function (s) { byId[s.id] = s; });

  /* ① 문항별 손질 — [세트, 문항 번호(0 = 지문), 칸, 찾을 글, 바꿀 글]
     칸: box·stem·passage(지문 전체에서 찾음)·passageSet(지문을 통째로 바꿈)·cells(짝짓기 선지 칸)·hide(학생에게 안 냄) */
  var FIX = [
    /* 지문이 통째로 빠짐 → 원본(2016학년도 수능 B형 15쪽)에서 (가)(나)와 각주만 잘라 그림으로(fix\ 폴더 — assets\ 는 배포 때 통째로 갈린다) */
    ["2016-suneung-40-42", 0, "passageSet", null, ["[[img:fix/2016-suneung-b-p40-passage.png]]"]],
    /* 표가 한 줄로 풀림(2026학년도 9월 모평 17번) → 표로 다시 짠다 */
    ["2026-sep-14-17", 17, "box", /<u>소리 A B C D주파수[\s\S]*<\/u>/,
      "[[표:소리|A|B|C|D;;주파수(Hz)|150|1,000|1,500|2,000;;소리 크기(dB)|30|30|63|55;;최소가청강도(dB)|38|8|12|2;;차폐 문턱값(dB)|38|20|38|6]]"],
    /* 상황 제목과 말머리가 붙음 */
    ["2014-sep-11-16", 14, "box", /상황학생 A/, "상황\n학생 A"], ["2014-sep-11-16", 14, "box", /상황언 니/, "상황\n언 니"],
    ["2014-sep-a-11-15", 14, "box", /상황학생 A/, "상황\n학생 A"], ["2014-sep-a-11-15", 14, "box", /상황언 니/, "상황\n언 니"],
    /* 구간 끝 표지가 낱말 한가운데에 끼임 */
    ["2019-jun-04-07", 0, "passage", "아 [/C] 름다워", "아름다워 [/C]"],
    ["2012-jun-13-15", 0, "passage", "내 [/가] 리는", "내리는 [/가]"],
    /* 한 문장이 두 문단으로 갈림 */
    ["2015-suneung-a-09-10", 0, "passage", "한 단락\u2029으로 써 보자.", "한 단락으로 써 보자."],
    /* 구간 끝 표지가 발문에 끼어듦 */
    ["2017-sep-03-05", 5, "stem", / ?\[\/A\]/, ""],
    /* ⓐ 표지가 지문에서 사라졌고 원본 문제지(2009학년도 수능)가 없어 자리를 확정할 수 없다 → 내지 않는다 */
    ["2009-suneung-28-33", 31, "hide"]
  ];
  /* 짝짓기 선지 칸 — 낱말 수로 저절로 못 나누는 것만(칸 안에 띄어쓰기가 있는 것) */
  var CELLS = {
    "2024-jun-12-17:12": [["의식과 함수적 역할", "내 몸의 체험"], ["의식과 함수적 역할", "물질적 반응"], ["의식과 감각질", "내 몸의 체험"], ["의식과 감각질", "물질적 반응"], ["의식과 감각질", "인지 기능"]],
    "2010-suneung-24-26:24": [["해결 방법", "해결 방법의 한계", "보완 방법"], ["주장 제시", "예상 반론 제시", "반론 비판"], ["개념 설명", "사례 제시", "개념 재정립"], ["가설 제시", "가설 검증", "이론 도출"], ["관점 확인", "근거 제시", "사례 설명"]],
    "2011-sep-25-27:25": [["음독", "비판적 읽기", "검색형 독서"], ["음독", "분석적 읽기", "검색형 독서"], ["묵독", "비판적 읽기", "검색형 독서"], ["묵독", "분석적 읽기", "탐색형 독서"], ["묵독", "비판적 읽기", "탐색형 독서"]]
  };

  function q(set, no) { return (set.q || []).filter(function (x) { return x.no === no; })[0]; }
  FIX.forEach(function (f) {
    var set = byId[f[0]]; if (!set) return;
    if (f[2] === "passageSet") { set.passage = f[4].slice(); return; }
    if (f[2] === "passage") { set.passage = set.passage.join("\u2029").split(f[3]).join(f[4]).split("\u2029"); return; }   // \u2029 = 문단 경계
    var x = q(set, f[1]); if (!x) return;
    if (f[2] === "hide") { set.q = set.q.filter(function (y) { return y !== x; }); return; }
    if (x[f[2]] != null) x[f[2]] = String(x[f[2]]).replace(f[3], f[4]);
  });

  /* ② 줄 나눔 — 원문에서 줄이 갈리던 자리가 한 줄로 붙어 온 것을 되돌린다 */
  var 끝 = "(?:[.?!。」』\"”’)\\]]|<\\/u>)";
  var 갈래 = new RegExp("(" + 끝 + ")[ \\t]*(\\((?:가|나|다|라|마)\\))(?![는은의와과를을에이가도로서만,，])", "g");
  var 기호 = new RegExp("(" + 끝 + ")[ \\t]*([ㄱ-ㅎ]\\s*\\.)(?=\\s)", "g");
  var 말머리 = new RegExp("(" + 끝 + "|[ \\t]{2,})[ \\t]*((?:학\\s?생|선생님|사회자|진행자|어머니|아\\s?들|언\\s?니|동\\s?생|민수|지수)\\s?(?:\\d|[A-E])?\\s?:\\s)", "g");
  function 나눔(s) {
    if (!s || /^\[\[img:[^\]]+\]\]$/.test(s)) return s;
    return String(s)
      .replace(/([^\n])[ \t]*(<\s*(?:보\s*기\s*\d|조\s*건|자료\s*\d|용\s*례|분류 절차)\s*>)/g, "$1\n$2")
      .replace(/(<\s*(?:보\s*기\s*\d|조\s*건|용\s*례|분류 절차)\s*>)[ \t]*(?=[^\s\n])/g, "$1\n")
      .replace(/([^\n])[ \t]*(\[[가-힣 ]{3,}\])/g, "$1\n$2")
      .replace(갈래, "$1\n$2").replace(기호, "$1\n$2").replace(말머리, "$1\n$2")
      .replace(/([·…]{3,}\s*\[[A-Z]\])[ \t]*(?=\S)/g, "$1\n");
  }

  /* ③ [A]…[/A] — 끝 표지가 있는 구간만 옅게 칠한다(시작만 있는 표지는 이름표만). 글 안에 표시 문자를 심고 rich()가 바꾼다 */
  function 구간(set) {
    var all = set.passage.join("\n"), 닫힘 = {};
    (all.match(/\[\/([A-Z가-하])\]/g) || []).forEach(function (m) { 닫힘[m.slice(2, -1)] = 1; });
    var 열린 = {};
    set.passage = set.passage.map(function (p) {
      if (/^\[\[img:[^\]]+\]\]$/.test(p)) return p;
      var out = "", i = 0, on = Object.keys(열린).length > 0, re = /\[(\/?)([A-Z가-하])\](?![^<]*>)/g, m;
      if (on) out += "\u0001";
      while ((m = re.exec(p))) {
        var L = m[2], 닫 = m[1] === "/";
        if (!닫 && !/^[A-Z]$/.test(L) && !닫힘[L]) continue;      // [예]·[나] 같은 글자는 그대로
        out += p.slice(i, m.index); i = re.lastIndex;
        if (닫) { if (열린[L]) { delete 열린[L]; if (on && !Object.keys(열린).length) { out += "\u0002"; on = false; } } continue; }
        if (on) out += "\u0002";
        out += "\u0003" + L + "\u0004";
        if (닫힘[L]) 열린[L] = 1;
        on = Object.keys(열린).length > 0; if (on) out += "\u0001";
      }
      out += p.slice(i);
      if (on) out += "\u0002";
      return out;
    });
  }

  /* ④ 짝짓기 선지 — <보기> 끝 줄이 칸 머리(「ⓐ ⓑ」「(가) (나) (다)」「A B」)뿐이고 선지가 그 칸 수만큼 나뉘면 칸으로 */
  function 짝(set, x) {
    /* 머리 줄은 <보기> 끝, 또는 그 뒤에 그림 하나만 있는 자리 */
    var m = String(x.box || "").match(/\n?\s*<u>([^<]{1,60})<\/u>\s*(\n?\s*\[\[img:[^\]]+\]\]\s*)?$/); if (!m) return;
    var 머리 = m[1].trim().split(/\s+/);
    if (머리.length < 2 || 머리.length > 4 || 머리.some(function (h) { return h.length > 12 || /[.?!]$/.test(h); })) return;
    var 칸 = CELLS[set.id + ":" + x.no] || x.c.map(function (c) { var t = /―/.test(c) ? String(c).split(/\s*―\s*/) : 붙임(String(c).trim().split(/\s+/)); return t.length === 머리.length ? t : null; });
    if (칸.some(function (r) { return !r || r.length !== 머리.length; })) return;
    x.hd = 머리; x.cc = 칸; x.box = (x.box.slice(0, m.index).replace(/\s+$/, "") + (m[2] ? "\n" + m[2].trim() : "")).replace(/^\n/, "");
  }

  /* 「ㄱ, ㄷ」「동물 : 개」「술－ 약주」는 한 칸 */
  function 붙임(t) {
    var r = [];
    t.forEach(function (w) {
      var k = r.length - 1;
      if (k >= 0 && (/[,，:：－-]$/.test(r[k]) || /^[:：－-]/.test(w))) r[k] += " " + w; else r.push(w);
    });
    return r;
  }

  sets.forEach(function (set) {
    set.passage = (set.passage || []).map(나눔);
    구간(set);
    (set.q || []).forEach(function (x) { if (x.box) { x.box = 나눔(x.box); 짝(set, x); } });
  });
})();
