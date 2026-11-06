(() => {
"use strict";

const KEY = "fyw3_data_v1";
const DRAFT = "fyw3_drafts_v1";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// 사용자가 있는 지역의 날짜를 사용한다. (한국 오전 9시 이전에 어제로 저장되는 문제 방지)
const today = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const RECOVERY_PREFIX = "fyw3_recovery_";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

const defaultData = () => ({
  version: 1,
  profile: {
    name: "",
    ageGroup: "adult",
    largeText: false,
    dark: false,
    dawn: false
  },
  emotions: [],
  thoughts: [],
  journals: [],
  goals: [],
  values: [],
  selfAnswers: {},
  careerAnswers: {},
  futureLetters: [],
  createdAt: new Date().toISOString()
});

let saveBlocked = false;
let recoveredOnStart = false;

let data = load();
let page = "home";
let draftTimer = null;
let pendingDraftTask = null;
let activeEdit = null;
let globalQuery = "";
let todayMood = null;
let navDepth = 0;

// 저장된 값이나 백업 파일의 내용을 앱이 쓰는 형태로만 받아들인다.
function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .filter(x => x && typeof x === "object" && !Array.isArray(x))
    .map(x => {
      const item = {
        ...x,
        id: typeof x.id === "string" && x.id ? x.id : uid(),
        createdAt: typeof x.createdAt === "string"
          ? x.createdAt
          : String(x.date || "")
      };

      if (typeof item.date !== "string") {
        delete item.date;
      }

      if (item.intensity !== undefined) {
        item.intensity = Number(item.intensity) || 0;
      }

      return item;
    });
}

function normalizeAnswers(answers, convert) {
  const clean = {};

  if (answers && typeof answers === "object" && !Array.isArray(answers)) {
    for (const [k, v] of Object.entries(answers)) {
      clean[k] = convert(v);
    }
  }

  return clean;
}

function normalizeData(x) {
  const base = defaultData();
  const profile = x.profile && typeof x.profile === "object" ? x.profile : {};

  return {
    version: 1,
    profile: {
      name: typeof profile.name === "string" ? profile.name : "",
      ageGroup: ["teen", "young", "adult", "senior"].includes(profile.ageGroup)
        ? profile.ageGroup
        : base.profile.ageGroup,
      largeText: profile.largeText === true,
      dark: profile.dark === true,
      dawn: profile.dawn === true
    },
    emotions: normalizeList(x.emotions),
    thoughts: normalizeList(x.thoughts),
    journals: normalizeList(x.journals),
    goals: normalizeList(x.goals),
    futureLetters: normalizeList(x.futureLetters),
    values: (Array.isArray(x.values) ? x.values : [])
      .filter(v => typeof v === "string"),
    selfAnswers: normalizeAnswers(x.selfAnswers, String),
    careerAnswers: normalizeAnswers(x.careerAnswers, Number),
    createdAt: typeof x.createdAt === "string" ? x.createdAt : base.createdAt
  };
}

// 읽을 수 없는 기록은 덮어쓰지 않고 따로 보관해 내려받을 수 있게 한다.
function keepUnreadableData(raw) {
  try {
    localStorage.setItem(RECOVERY_PREFIX + Date.now(), raw);
    localStorage.removeItem(KEY);
    recoveredOnStart = true;
  } catch (e) {
    console.warn(e);
    saveBlocked = true;
  }
}

function recoveryKeys() {
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(RECOVERY_PREFIX));
  } catch (e) {
    return [];
  }
}

function load() {
  let raw = null;

  try {
    raw = localStorage.getItem(KEY);
  } catch (e) {
    console.warn(e);
    return defaultData();
  }

  if (!raw) return defaultData();

  try {
    const x = JSON.parse(raw);

    if (!x || x.version !== 1) {
      throw Error("지원하지 않는 데이터 형식");
    }

    return normalizeData(x);
  } catch (e) {
    console.warn(e);
    keepUnreadableData(raw);
    return defaultData();
  }
}

function save() {
  if (saveBlocked) {
    toast("기존 기록을 보호하기 위해 저장을 멈췄어요. 저장 공간을 확인한 뒤 다시 열어 주세요.");
    return false;
  }

  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    toast("저장 공간이 부족하거나 브라우저 저장이 차단되었습니다.");
    return false;
  }
}

function toast(msg) {
  const el = $("#toast");

  el.textContent = msg;
  el.classList.add("show");

  clearTimeout(toast.t);

  toast.t = setTimeout(() => {
    el.classList.remove("show");
  }, 2600);
}

function withinDays(d, n) {
  const time = new Date(`${d}T00:00:00`).getTime();

  return (
    Date.now() - time <= n * 86400000 &&
    time <= Date.now() + 86400000
  );
}

function crisisNotice() {
  return `
    <div class="notice crisis-notice">
      <strong>지금 많이 힘들다면 혼자 견디지 않아도 괜찮아요.</strong><br>
      자살예방 상담전화 <a href="tel:109">109</a> (24시간) ·
      정신건강 위기상담 <a href="tel:15770199">1577-0199</a> ·
      청소년전화 <a href="tel:1388">1388</a><br>
      당장 위험하다면 112 또는 119에 연락하세요.
      이 앱은 상담이나 치료를 대신하지 않아요.
    </div>
  `;
}

function header() {
  const names = {
    home: "홈",
    calm: "지금 힘들어요",
    understand: "마음 알아보기",
    care: "어떤 치료가 있나요",
    help: "도움받는 법",
    allies: "곁에 있는 사람에게",
    about: "이 사이트에 대해",
    record: "기록",
    explore: "탐험",
    know: "나를 알아가기",
    self: "나를 탐색하기",
    emotion: "감정 이해하기",
    thought: "생각 탐색하기",
    values: "나의 가치관",
    career: "진로 탐색",
    action: "목표와 실천",
    journal: "나의 일기",
    growth: "성장 리포트",
    future: "나에게 보내는 편지",
    settings: "설정 및 데이터"
  };

  $("#pageName").textContent = names[page] || "홈";

  $("#todayLabel").textContent =
    new Date().toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short"
    });

  $$(".nav-item[data-page]").forEach(b => {
    b.classList.toggle("active", b.dataset.page === page);
  });

  const group = PAGE_GROUPS[page] || page;

  $$(".bottom-item").forEach(b => {
    b.classList.toggle("active", b.dataset.group === group);
  });

  document.body.classList.toggle("dawn", !!data.profile.dawn);
  document.body.classList.toggle("large-text", !!data.profile.largeText);
}

// 하단 메뉴의 어느 묶음에 속하는 화면인지 알려 준다.
const PAGE_GROUPS = {
  journal: "record",
  emotion: "record",
  thought: "record",
  future: "record",
  understand: "explore",
  care: "explore",
  help: "explore",
  allies: "explore",
  about: "explore",
  know: "explore",
  self: "explore",
  values: "explore",
  career: "explore",
  action: "explore"
};

const GROUP_NAMES = {
  record: "기록",
  explore: "탐험"
};

function go(p, options = {}) {
  // 이동 기록을 남겨 휴대폰과 브라우저의 뒤로 가기가 사이트 안에서 작동하게 한다.
  if (p !== page) {
    navDepth++;

    try {
      history.pushState({ page: p, depth: navDepth }, "");
    } catch (e) {
      console.warn(e);
    }
  }

  page = p;
  globalQuery = "";

  if (!options.keepEdit) {
    activeEdit = null;
  }

  render();

  $("#sidebar").classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function pageHead(kicker, title, desc) {
  return `
    <div class="eyebrow">${kicker}</div>
    <h1 class="page-title">${title}</h1>
    <p class="lead">${desc}</p>
  `;
}

function card(title, body, extra = "") {
  return `
    <section class="card ${extra}">
      <h2 style="font-size:17px;margin:0 0 14px">${title}</h2>
      ${body}
    </section>
  `;
}

function empty(msg) {
  return `<div class="empty">${msg}</div>`;
}

function entryText(x) {
  return [
    x.situation && `상황: ${x.situation}`,
    x.body || x.content || x.note,
    x.thought && `그때 든 생각: ${x.thought}`,
    x.need && `필요한 것: ${x.need}`
  ].filter(Boolean).join("\n");
}

function entries(items, kind, emptyMessage) {
  if (!items.length) {
    return empty(emptyMessage || "아직 기록이 없어요. 첫 기록을 남겨보세요.");
  }

  return `
    <div class="entry-list">
      ${items.slice().reverse().map(x => {
        const source = kind === "search" ? x.sourceKind : kind;

        return `
        <article class="entry">
          <div class="entry-top">
            <div>
              <div class="entry-title">
                ${esc(x.title || x.mood || x.name || "기록")}
              </div>
              <div class="entry-meta">
                ${esc(x.date || "")}
                ${x.category ? ` · ${esc(x.category)}` : ""}
                ${x.intensity ? ` · 강도 ${Number(x.intensity)}/10` : ""}
              </div>
            </div>

            <div class="entry-actions">
              ${source === "journal" ? `
                <button class="btn ghost small"
                  data-edit="${source}"
                  data-id="${esc(x.id)}">수정</button>
              ` : ""}

              <button class="btn danger small"
                data-delete="${esc(source)}"
                data-id="${esc(x.id)}">삭제</button>
            </div>
          </div>

          <div class="entry-body">${esc(entryText(x))}</div>
        </article>
      `;
      }).join("")}
    </div>
  `;
}

/* =========================
   HOME
========================= */

function home() {
  const newLetters = data.futureLetters.filter(
    x => !x.read && !isLetterLocked(x) && isDatedLetter(x)
  ).length;

  return `

    ${newLetters ? `
      <div class="notice green">
        과거의 내가 보낸 편지 ${newLetters}통을 읽을 수 있어요.
        <button class="btn secondary small" data-go="future">편지 읽기</button>
      </div>
    ` : ""}

    <section class="hero">
      ${window.MindLabGuide.heroScene()}
      <div class="hero-copy">
        <h1 class="hero-line">오늘도 많이 힘들었죠.<br>여기서는 괜찮아요.</h1>
        <svg class="hero-underline" viewBox="0 0 150 8" aria-hidden="true"><path d="M2 6 C40 1 96 1 148 5"></path></svg>
        <p class="hero-sub">${data.profile.name ? `${esc(data.profile.name)}님의 ` : "당신의 "}마음이<br>조금이라도 편안해지길 바라요. <span aria-hidden="true">☽</span></p>
        <button class="hero-button" id="lookInside" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 6 6.5.8-4.8 4.5 1.3 6.5L12 17.2l-5.8 3.2 1.3-6.5L2.7 9.4l6.5-.8z"></path></svg>
          지금, 마음 들여다보기
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>

    ${window.MindLabGuide.homeSections()}

    ${recentHome()}
  `;
}

function recentHome() {
  const all = [
    ...data.emotions.map(x => ({
      ...x,
      title: x.mood,
      kind: "감정"
    })),

    ...data.journals.map(x => ({
      ...x,
      title: x.title || "일기",
      kind: "일기"
    })),

    ...data.thoughts.map(x => ({
      ...x,
      title: "생각 기록",
      kind: "생각"
    }))
  ]
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  .slice(0, 4);

  // 기록이 없어도 재촉하지 않는다.
  if (!all.length) {
    return "";
  }

  return `
    <div class="section-head">
      <div>
        <h2>최근 기록</h2>
      </div>

      <button class="btn ghost small" data-go="growth">
        돌아보기
      </button>
    </div>

    <div class="entry-list">
      ${all.map(x => `
        <div class="entry">
          <div class="entry-top">
            <strong>${esc(x.title)}</strong>
            <span class="entry-meta">${esc(x.kind)} · ${esc(x.date)}</span>
          </div>
          <div class="entry-body">${esc(x.situation || x.body || x.content || "")}</div>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   SELF
========================= */

const selfQs = [
  ["나는 어떤 활동을 할 때 시간 가는 줄 모르는가?", "관심과 몰입"],
  ["주변 사람들이 나에게 자주 부탁하는 일은 무엇인가?", "강점"],
  ["어려운 상황에서 내가 자주 사용하는 대처 방식은?", "대처 방식"],
  ["최근 스스로 뿌듯했던 순간은 언제인가?", "성취 경험"],
  ["내가 중요하게 생각하지만 자주 미루는 것은?", "가치와 행동"],
  ["어떤 환경에서 가장 편안하고 자연스러운가?", "환경"],
  ["반복해서 후회하는 선택이나 행동이 있는가?", "반복 패턴"],
  ["앞으로 더 키우고 싶은 능력은 무엇인가?", "성장 방향"]
];

// 쓴 말을 모아 돌려주는 글. 점수나 성격 판정을 하지 않고, 답은 어디로도 보내지 않는다.
const selfMirrors = [
  ["시간 가는 줄 모르는 때로", "를 떠올렸어요. 그 안에 마음이 편히 머무는 곳이 있을지 몰라요."],
  ["주변에서 자주 부탁받는 일로", "를 적었어요. 다른 사람 눈에는 이미 보이는 당신의 힘일 수 있어요."],
  ["어려울 때 하는 방식으로", "를 적었어요. 힘든 시간을 지나오며 찾아낸 당신만의 방법이에요."],
  ["뿌듯했던 순간으로", "를 떠올렸어요. 그 순간을 기억해 준 것만으로도 충분해요."],
  ["중요하지만 자꾸 미루는 것으로", "를 적었어요. 미루면서도 잊지 않은 건, 그만큼 소중해서일 수 있어요."],
  ["편안한 곳으로", "를 적었어요. 지칠 때 돌아갈 자리를 하나 알고 있는 거예요."],
  ["반복해서 후회하는 일로", "를 적었어요. 솔직하게 들여다보는 일은 쉽지 않은데, 해내셨어요."],
  ["더 키우고 싶은 것으로", "를 적었어요. 서두르지 않아도 돼요. 당신의 속도로 가면 돼요."]
];

function selfReflection() {
  const lines = selfMirrors
    .map(([before, after], i) => {
      const answer = String(data.selfAnswers["q" + i] || "").trim();

      if (!answer) return "";

      const quote = answer.length > 70 ? `${answer.slice(0, 70)}…` : answer;

      return `<p>${before} <strong>“${esc(quote)}”</strong>${after}</p>`;
    })
    .filter(Boolean);

  if (!lines.length) return "";

  return `
    <section class="card self-mirror" id="selfMirror">
      <h2 class="guide-h2">당신이 쓴 말을 모아 보았어요</h2>
      ${lines.join("")}
      <p class="mirror-close">뚜렷하지 않아도, 몇 개만 적어도 괜찮아요. 지금 이만큼 나를 들여다본 것만으로 충분해요.</p>
      <p class="muted small-text">이 글은 내가 적은 말을 정해진 문장에 담아 돌려주는 것이에요. 성격을 판정하거나 진단하지 않고, 답은 내 기기 밖으로 나가지 않아요.</p>
    </section>
  `;
}

function selfPage() {
  return `
    ${pageHead(
      "SELF DISCOVERY",
      "나를 탐색하기",
      "정답을 찾는 검사가 아니라, 나 자신을 이해하기 위한 질문입니다. 편안한 마음으로 솔직하게 작성해 보세요."
    )}

    <div class="notice">
      이 질문들은 자기성찰을 돕기 위해 구성한 질문이며,
      표준화되거나 임상적으로 타당화된 심리검사가 아닙니다.
    </div>

    <section class="card">
      <div class="form-actions">
        <h2 style="margin:0;font-size:18px">나를 이해하는 질문</h2>
        <span class="save-status" id="draftStatus">작성 내용 자동 저장</span>
      </div>

      <form id="selfForm">
        ${selfQs.map((q, i) => `
          <div class="field">
            <label for="self${i}">
              ${i + 1}. ${q[0]}
              <span class="hint">· ${q[1]}</span>
            </label>

            <textarea
              id="self${i}"
              name="q${i}"
              placeholder="떠오르는 생각을 자유롭게 적어보세요."
            >${esc(data.selfAnswers["q" + i] || "")}</textarea>
          </div>
        `).join("")}

        <div class="form-actions">
          <span class="hint">입력 내용은 자동 저장됩니다.</span>
          <button class="btn" type="submit">나의 답변 저장하기</button>
        </div>
      </form>
    </section>

    ${selfReflection()}

    <div class="section-head">
      <h2>나의 탐색 결과</h2>
    </div>

    ${card(
      "내가 작성한 답변 요약",
      selfQs.map((q, i) =>
        data.selfAnswers["q" + i]
          ? `
            <div class="entry">
              <strong>${i + 1}. ${q[0]}</strong>
              <div class="entry-body">${esc(data.selfAnswers["q" + i])}</div>
            </div>
          `
          : ""
      ).filter(Boolean).join("") ||
      empty("질문에 답하면 이곳에서 다시 확인할 수 있어요.")
    )}
  `;
}

/* =========================
   EMOTION
========================= */

const EMOTION_COLORS = {
  "기쁨": "#f6d98b",
  "평온": "#8fd3c1",
  "감사": "#f4b6a6",
  "설렘": "#f39fc0",
  "자신감": "#f2bc6b",
  "슬픔": "#7fa2e8",
  "불안": "#a892e6",
  "분노": "#d9707a",
  "외로움": "#8d8fc4",
  "답답함": "#9aa7b8",
  "피곤함": "#b3a7c9",
  "혼란": "#7fc0cf"
};

function emotionPage() {
  const moods = [
    "기쁨", "평온", "감사", "설렘",
    "자신감", "슬픔", "불안", "분노",
    "외로움", "답답함", "피곤함", "혼란"
  ];

  return `
    ${pageHead(
      "EMOTION AWARENESS",
      "감정 이해하기",
      "감정은 없애야 할 문제가 아니라, 내 상태와 욕구를 알려주는 신호일 수 있어요."
    )}

    <div class="grid grid-2">
      <section class="card">
        <h2 style="font-size:18px;margin-top:0">오늘의 감정 기록</h2>

        <form id="emotionForm">
          <div class="field">
            <span class="field-title" id="moodLabel">지금 느끼는 감정</span>
            <div class="orb-list" role="group" aria-labelledby="moodLabel">
              ${moods.map((m, i) => `
                <button
                  type="button"
                  class="orb-button"
                  data-orb="${m}"
                  aria-pressed="${i === 0}"
                  style="--orb:${EMOTION_COLORS[m]}"
                >
                  <span class="orb" aria-hidden="true"></span>
                  ${m}
                </button>
              `).join("")}
            </div>
            <select id="mood" required hidden aria-hidden="true" tabindex="-1">
              ${moods.map(m => `<option>${m}</option>`).join("")}
            </select>
          </div>

          <div class="field">
            <label for="intensity">
              감정의 강도:
              <output id="intensityOut">5</output>/10
            </label>
            <input id="intensity" type="range" min="1" max="10" value="5">
          </div>

          <div class="field">
            <label for="emotionEvent">어떤 일이 있었나요?</label>
            <textarea id="emotionEvent" placeholder="감정이 생긴 상황을 적어보세요."></textarea>
          </div>

          <div class="field">
            <label for="emotionThought">그때 어떤 생각이 들었나요?</label>
            <textarea id="emotionThought" placeholder="머릿속에 떠오른 생각"></textarea>
          </div>

          <div class="field">
            <label for="emotionNeed">지금 나에게 필요한 것은?</label>
            <input id="emotionNeed" placeholder="휴식, 대화, 혼자만의 시간 등">
          </div>

          <button class="btn" type="submit">감정 기록 저장</button>
        </form>
      </section>

      <section class="card">
        <h2 style="font-size:18px;margin-top:0">최근 7일 감정 빈도</h2>
        ${moodBars(moods)}

        <div class="notice">
          이 그래프는 사용자가 직접 기록한 횟수를 보여줍니다.
          감정의 원인이나 심리 상태를 진단하지 않습니다.
        </div>
      </section>
    </div>

    <div class="section-head">
      <h2>감정 기록 모아보기</h2>
    </div>

    ${entries(data.emotions, "emotion")}

    ${crisisNotice()}
  `;
}

function moodBars(moods) {
  const list = data.emotions.filter(x => withinDays(x.date, 7));
  const max = Math.max(
    1,
    ...moods.map(m => list.filter(x => x.mood === m).length)
  );

  const html = moods
    .filter(m => list.some(x => x.mood === m))
    .map(m => `
      <div class="bar-row">
        <span>${m}</span>
        <div class="bar">
          <i style="width:${list.filter(x => x.mood === m).length / max * 100}%"></i>
        </div>
        <b>${list.filter(x => x.mood === m).length}</b>
      </div>
    `).join("");

  return html || empty("최근 7일 기록이 아직 없습니다.");
}

/* =========================
   THOUGHT
========================= */

function thoughtPage() {
  return `
    ${pageHead(
      "THOUGHT EXPLORATION",
      "생각 탐색하기",
      "상황과 생각, 감정을 구분해서 살펴보면 다른 관점을 발견하는 데 도움이 될 수 있어요."
    )}

    <div class="notice">
      인지행동치료(CBT)에서 활용되는 사고기록의 기본 구조를 참고한
      자기성찰 도구입니다. 치료나 전문적인 상담을 대체하지 않습니다.
    </div>

    <section class="card">
      <form id="thoughtForm">
        <div class="form-grid">
          <div class="field full">
            <label for="situation">1. 어떤 상황이 있었나요?</label>
            <textarea id="situation" required placeholder="가능한 한 사실 중심으로 적어보세요."></textarea>
          </div>

          <div class="field">
            <label for="autoThought">2. 그때 떠오른 생각은?</label>
            <textarea id="autoThought" placeholder="가장 먼저 떠오른 생각"></textarea>
          </div>

          <div class="field">
            <label for="thoughtEmotion">3. 어떤 감정을 느꼈나요?</label>
            <textarea id="thoughtEmotion" placeholder="감정과 강도"></textarea>
          </div>

          <div class="field">
            <label for="evidenceFor">4. 그 생각을 뒷받침하는 근거</label>
            <textarea id="evidenceFor"></textarea>
          </div>

          <div class="field">
            <label for="evidenceAgainst">5. 그 생각과 다른 근거</label>
            <textarea id="evidenceAgainst"></textarea>
          </div>

          <div class="field full">
            <label for="balancedThought">6. 조금 더 균형 잡힌 관점은?</label>
            <textarea id="balancedThought"></textarea>
          </div>

          <div class="field full">
            <label for="nextAction">7. 지금 할 수 있는 작은 행동</label>
            <textarea id="nextAction"></textarea>
          </div>
        </div>

        <button class="btn" type="submit">생각 기록 저장</button>
      </form>
    </section>

    <div class="section-head">
      <h2>저장한 생각 기록</h2>
    </div>

    ${entries(data.thoughts, "thought")}

    ${crisisNotice()}
  `;
}

/* =========================
   VALUES
========================= */

const valueOptions = [
  "가족", "사랑", "우정", "건강", "성장", "자유",
  "안정", "성취", "창의성", "배움", "정직", "배려",
  "책임", "독립", "도전", "평등", "공정", "소속감",
  "즐거움", "평온", "모험", "기여", "전문성", "경제적 여유"
];

function valuesPage() {
  return `
    ${pageHead(
      "PERSONAL VALUES",
      "나의 가치관",
      "나에게 정말 중요한 것이 무엇인지 생각하고, 그것을 일상에서 실천할 방법을 찾아보세요."
    )}

    <section class="card">
      <h2 style="font-size:18px;margin-top:0">
        중요하게 생각하는 가치를 선택하세요.
      </h2>

      <p class="muted small-text">
        최대 7개까지 선택할 수 있습니다.
        정답은 없으며 현재의 나를 기준으로 골라보세요.
      </p>

      <div class="chip-list" id="valueChips">
        ${valueOptions.map(v => `
          <button
            type="button"
            class="chip ${data.values.includes(v) ? "selected" : ""}"
            data-value="${v}"
            aria-pressed="${data.values.includes(v)}"
          >${v}</button>
        `).join("")}
      </div>

      <div class="button-row">
        <button class="btn" id="saveValues">선택한 가치 저장</button>
        <span class="save-status" id="valueCount">${data.values.length}/7 선택</span>
      </div>
    </section>

    <div class="section-head">
      <h2>나의 핵심 가치</h2>
    </div>

    ${
      data.values.length
        ? `
          <div class="grid grid-3">
            ${data.values.map((v, i) => `
              <div class="card">
                <div class="eyebrow">VALUE 0${i + 1}</div>
                <div class="stat-value" style="font-size:22px">${esc(v)}</div>
              </div>
            `).join("")}
          </div>
        `
        : empty("아직 선택한 가치가 없습니다.")
    }
  `;
}

/* =========================
   CAREER
========================= */

const careerItems = [
  ["R", "손으로 도구나 장비를 다루는 활동이 좋다."],
  ["R", "기계나 장치가 어떻게 작동하는지 궁금하다."],
  ["R", "몸을 움직이며 구체적인 결과를 만드는 일이 좋다."],
  ["I", "복잡한 문제의 원인을 분석하는 것이 흥미롭다."],
  ["I", "자료를 조사하고 근거를 비교하는 것을 좋아한다."],
  ["I", "새로운 원리나 개념을 깊이 이해하고 싶다."],
  ["A", "글·그림·음악 등으로 나를 표현하는 것이 좋다."],
  ["A", "정해진 답보다 새로운 아이디어를 만드는 것이 좋다."],
  ["A", "디자인이나 콘텐츠를 기획하는 것이 흥미롭다."],
  ["S", "사람의 성장이나 회복을 돕는 일이 보람 있다."],
  ["S", "상대의 이야기를 듣고 이해하는 편이다."],
  ["S", "교육·상담·협력 활동에 관심이 있다."],
  ["E", "목표를 세우고 사람들을 이끄는 것이 좋다."],
  ["E", "아이디어를 실제 사업이나 프로젝트로 만들고 싶다."],
  ["E", "설득하거나 협상하는 활동에 흥미가 있다."],
  ["C", "자료와 정보를 체계적으로 정리하는 것이 좋다."],
  ["C", "절차와 기준을 정확하게 지키는 편이다."],
  ["C", "계획을 세우고 일정에 맞춰 실행하는 것이 편하다."]
];

const typeNames = {
  R: "현실형",
  I: "탐구형",
  A: "예술형",
  S: "사회형",
  E: "진취형",
  C: "관습형"
};

function careerPage() {
  const done = Object.keys(data.careerAnswers).length;

  return `
    ${pageHead(
      "CAREER EXPLORATION",
      "진로 탐색",
      "흥미를 살펴보는 출발점입니다. 점수만으로 직업 적합성을 단정하지 마세요."
    )}

    <div class="notice">
      RIASEC(홀랜드) 진로흥미 유형을 참고해 자체 구성한 18문항입니다.
      공식 표준화 검사나 직업 적성 진단이 아닙니다.
    </div>

    <section class="card">
      <form id="careerForm">
        ${careerItems.map((q, i) => `
          <div class="field">
            <label>${i + 1}. ${q[1]}</label>

            <div class="chip-list">
              ${[1, 2, 3, 4, 5].map(n => `
                <label class="chip ${Number(data.careerAnswers[i]) === n ? "selected" : ""}">
                  <input
                    type="radio"
                    name="c${i}"
                    value="${n}"
                    ${Number(data.careerAnswers[i]) === n ? "checked" : ""}
                    required
                    style="width:auto"
                  >
                  ${n}
                </label>
              `).join("")}
            </div>

            <div class="hint">1 전혀 아니다 · 5 매우 그렇다</div>
          </div>
        `).join("")}

        <button class="btn" type="submit">
          결과 분석하기 (${done}/18 응답)
        </button>
      </form>
    </section>

    ${careerResult()}
  `;
}

function careerResult() {
  if (Object.keys(data.careerAnswers).length < 18) {
    return `
      <div class="notice">
        18개 문항에 답하면 유형별 응답 점수를 확인할 수 있어요.
      </div>
    `;
  }

  const scores = {
    R: 0,
    I: 0,
    A: 0,
    S: 0,
    E: 0,
    C: 0
  };

  careerItems.forEach((q, i) => {
    scores[q[0]] += Number(data.careerAnswers[i] || 0);
  });

  return `
    <div class="section-head">
      <h2>나의 흥미 응답 결과</h2>
    </div>

    <div class="grid grid-2">
      <section class="card">
        ${
          Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `
              <div class="bar-row">
                <span>${typeNames[k]}</span>
                <div class="bar">
                  <i style="width:${v / 15 * 100}%"></i>
                </div>
                <b>${v}/15</b>
              </div>
            `).join("")
        }
      </section>

      <section class="card">
        <div class="eyebrow">TOP INTERESTS</div>

        <div class="stat-value">
          ${
            Object.entries(scores)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(x => x[0])
              .join(" · ")
          }
        </div>

        <p class="muted small-text">
          ${
            Object.entries(scores)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(x => typeNames[x[0]])
              .join(" · ")
          }
          성향의 응답 점수가 상대적으로 높습니다.
          실제 진로 결정 전에는 경험, 역량, 가치관, 환경도 함께 고려하세요.
        </p>
      </section>
    </div>
  `;
}

/* =========================
   GOALS
========================= */

function actionPage() {
  return `
    ${pageHead(
      "GOALS & ACTION",
      "목표와 실천",
      "큰 목표를 작게 나누고, 오늘 할 수 있는 행동으로 바꿔보세요."
    )}

    <section class="card">
      <h2 style="font-size:18px;margin-top:0">새로운 목표</h2>

      <form id="goalForm" class="form-grid">
        <div class="field">
          <label for="goalName">목표</label>
          <input id="goalName" required placeholder="예: 영어 회화 연습">
        </div>

        <div class="field">
          <label for="goalDate">목표 날짜</label>
          <input id="goalDate" type="date">
        </div>

        <div class="field full">
          <label for="goalNote">이 목표가 나에게 중요한 이유 / 첫 행동</label>
          <textarea id="goalNote" placeholder="예: 매일 15분씩 소리 내어 말하기"></textarea>
        </div>

        <div class="field full">
          <button class="btn" type="submit">목표 추가</button>
        </div>
      </form>
    </section>

    <div class="section-head">
      <h2>나의 목표</h2>
      <span class="small-text muted">
        ${data.goals.filter(x => x.done).length}/${data.goals.length} 완료
      </span>
    </div>

    ${
      data.goals.length
        ? `
          <div class="entry-list">
            ${data.goals.map(g => `
              <article class="entry">
                <div class="entry-top">
                  <label style="display:flex;gap:10px;align-items:center">
                    <input
                      type="checkbox"
                      data-goal-done="${esc(g.id)}"
                      ${g.done ? "checked" : ""}
                    >
                    <strong style="${g.done ? "text-decoration:line-through;opacity:.6" : ""}">
                      ${esc(g.name)}
                    </strong>
                  </label>

                  <div class="entry-actions">
                    <button
                      class="btn danger small"
                      data-delete="goal"
                      data-id="${esc(g.id)}"
                    >삭제</button>
                  </div>
                </div>

                <div class="entry-meta">
                  목표일 ${esc(g.due || "미정")}
                </div>

                <div class="entry-body">${esc(g.note || "")}</div>
              </article>
            `).join("")}
          </div>
        `
        : empty("첫 번째 목표를 추가해 보세요.")
    }
  `;
}

/* =========================
   JOURNAL
========================= */

const journalCategories = ["일상", "감정", "관계", "공부·일", "성장", "기타"];

function journalPage() {
  const draft = readDrafts().journal || null;

  // 수정하던 글의 임시 저장본이 있으면 수정 상태를 이어간다.
  if (!activeEdit && draft?.editId) {
    const item = data.journals.find(x => x.id === draft.editId);

    if (item) {
      activeEdit = { kind: "journal", item };
    }
  }

  const useDraft = !!draft && (
    activeEdit
      ? draft.editId === activeEdit.item.id
      : !draft.editId
  );

  const form = useDraft ? draft : (activeEdit?.item || {});

  return `
    ${pageHead(
      "PERSONAL JOURNAL",
      "나의 일기",
      "잘 쓴 글이 아니어도 괜찮아요. 지금의 나를 있는 그대로 기록해 보세요."
    )}

    <section class="card">
      <h2 style="font-size:18px;margin-top:0">
        ${activeEdit?.kind === "journal" ? "일기 수정" : "오늘의 기록"}
      </h2>

      <form id="journalForm">
        <div class="field">
          <label for="journalTitle">제목</label>
          <input
            id="journalTitle"
            placeholder="오늘을 한 문장으로 표현한다면?"
            value="${esc(form.title || "")}"
          >
        </div>

        <div class="field">
          <label for="journalCategory">분류</label>
          <select id="journalCategory">
            ${journalCategories.map(c => `
              <option ${form.category === c ? "selected" : ""}>${c}</option>
            `).join("")}
          </select>
        </div>

        <div class="field">
          <label for="journalBody">내용</label>
          <textarea
            id="journalBody"
            required
            placeholder="오늘은 어떤 하루였나요? 잘 쓰지 않아도, 짧아도 괜찮아요."
          >${esc(form.body || "")}</textarea>
        </div>

        <div class="form-actions">
          <span class="save-status" id="journalDraftStatus">
            ${useDraft ? "임시 저장한 글을 불러왔어요" : "작성 중 자동 임시 저장"}
          </span>

          <div class="button-row">
            <button class="btn ghost" type="button" id="clearJournal">
              비우기
            </button>

            <button class="btn" type="submit">
              ${activeEdit?.kind === "journal" ? "수정 저장" : "일기 저장"}
            </button>
          </div>
        </div>
      </form>
    </section>

    <div class="section-head">
      <h2>나의 기록</h2>
      <span class="small-text muted">${data.journals.length}개</span>
    </div>

    <div class="search-row">
      <input
        class="search-input"
        id="journalSearch"
        placeholder="제목이나 내용 검색하기"
      >

      <select id="journalFilter" class="search-input" style="max-width:130px">
        <option value="">전체 분류</option>
        ${journalCategories
          .map(x => `<option>${x}</option>`).join("")}
      </select>
    </div>

    <div id="journalList">
      ${entries(data.journals, "journal")}
    </div>

    ${crisisNotice()}
  `;
}

/* =========================
   GROWTH REPORT
========================= */

function growthPage() {
  const last7 =
    data.journals.filter(x => withinDays(x.date, 7)).length +
    data.emotions.filter(x => withinDays(x.date, 7)).length +
    data.thoughts.filter(x => withinDays(x.date, 7)).length;

  const last30 =
    data.journals.filter(x => withinDays(x.date, 30)).length +
    data.emotions.filter(x => withinDays(x.date, 30)).length +
    data.thoughts.filter(x => withinDays(x.date, 30)).length;

  const complete = data.goals.filter(x => x.done).length;

  return `
    ${pageHead(
      "YOUR GROWTH",
      "성장 리포트",
      "기록을 숫자와 흐름으로 돌아보는 공간입니다. 수치는 입력한 기록을 단순 집계한 결과입니다."
    )}

    <div class="grid grid-4">
      <div class="card stat-card">
        <div class="stat-label">최근 7일 기록</div>
        <div class="report-number">${last7}</div>
        <div class="stat-foot">감정·생각·일기 합계</div>
      </div>

      <div class="card stat-card">
        <div class="stat-label">최근 30일 기록</div>
        <div class="report-number">${last30}</div>
        <div class="stat-foot">감정·생각·일기 합계</div>
      </div>

      <div class="card stat-card">
        <div class="stat-label">전체 기록</div>
        <div class="report-number">
          ${data.emotions.length + data.thoughts.length + data.journals.length}
        </div>
        <div class="stat-foot">저장된 기록 수</div>
      </div>

      <div class="card stat-card">
        <div class="stat-label">완료한 목표</div>
        <div class="report-number">${complete}</div>
        <div class="stat-foot">총 ${data.goals.length}개 중</div>
      </div>
    </div>

    <div class="section-head">
      <h2>월간 기록 흐름</h2>
    </div>

    <section class="card">
      ${monthlyBars()}
    </section>

    <div class="section-head">
      <h2>이번 주 돌아보기</h2>
    </div>

    <section class="card">
      <p>
        • 최근 7일 동안 감정 기록
        <strong>${data.emotions.filter(x => withinDays(x.date, 7)).length}회</strong>
      </p>

      <p>
        • 최근 7일 동안 생각 기록
        <strong>${data.thoughts.filter(x => withinDays(x.date, 7)).length}회</strong>
      </p>

      <p>
        • 최근 7일 동안 일기
        <strong>${data.journals.filter(x => withinDays(x.date, 7)).length}회</strong>
      </p>

      <p>
        • 완료한 목표
        <strong>${complete}개</strong>
      </p>

      <div class="notice">
        이 리포트는 활동량을 요약할 뿐, 성장의 정도나 정신건강 상태를
        객관적으로 판정하지 않습니다. 기록이 적은 기간도 의미 있는 휴식일 수 있습니다.
      </div>
    </section>

    <div class="section-head">
      <h2>전체 기록 검색</h2>
    </div>

    <div class="search-row">
      <input
        id="globalSearch"
        class="search-input"
        placeholder="일기, 감정, 생각 기록 검색"
      >
    </div>

    <div id="globalResults"></div>
  `;
}

function monthlyBars() {
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);

    const y = d.getFullYear();
    const m = d.getMonth();

    const count = [
      ...data.emotions,
      ...data.thoughts,
      ...data.journals
    ].filter(x => {
      const t = new Date(x.date + "T00:00:00");
      return t.getFullYear() === y && t.getMonth() === m;
    }).length;

    months.push({
      label: `${m + 1}월`,
      count
    });
  }

  const max = Math.max(1, ...months.map(x => x.count));

  return months.map(x => `
    <div class="bar-row" style="grid-template-columns:45px 1fr 35px">
      <span>${x.label}</span>
      <div class="bar">
        <i style="width:${x.count / max * 100}%"></i>
      </div>
      <b>${x.count}</b>
    </div>
  `).join("");
}

/* =========================
   FUTURE LETTER
========================= */

const LETTER_TARGETS = {
  past: {
    tab: "그때의 나에게",
    title: "그때의 나에게",
    label: "그때의 나에게 해 주고 싶은 말",
    placeholder: "그때 정말 많이 힘들었지..."
  },
  now: {
    tab: "지금의 나에게",
    title: "지금의 나에게",
    label: "지금의 나에게 해 주고 싶은 말",
    placeholder: "오늘도 여기까지 왔구나..."
  },
  future: {
    tab: "미래의 나에게",
    title: "미래의 나에게",
    label: "미래의 나에게 전하고 싶은 말",
    placeholder: "안녕, 미래의 나야..."
  }
};

let letterTarget = "future";
let knowTab = "pattern";

// 내가 기록한 감정 강도를 시간 순서로 보여 준다. 기록을 그대로 그릴 뿐 해석하지 않는다.
function emotionChart() {
  const records = data.emotions
    .filter(x => Number(x.intensity) >= 1)
    .slice(-14);

  if (!records.length) {
    return `
      ${empty("감정을 기록하면 이곳에 별자리처럼 흐름이 그려져요.")}
      <div class="button-row">
        <button class="btn secondary" data-go="emotion" type="button">감정 기록하러 가기</button>
      </div>
    `;
  }

  const left = 32;
  const right = 346;
  const top = 14;
  const bottom = 170;
  const xAt = i => records.length === 1
    ? (left + right) / 2
    : left + (i / (records.length - 1)) * (right - left);
  const yAt = value => bottom - ((Math.min(10, Number(value)) - 1) / 9) * (bottom - top);
  const points = records.map((x, i) => [xAt(i), yAt(x.intensity)]);

  const counts = {};
  data.emotions.forEach(x => {
    counts[x.mood] = (counts[x.mood] || 0) + 1;
  });
  const [topMood, topCount] = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0];

  return `
    <div class="chart-scroll">
      <svg class="emotion-chart" viewBox="0 0 360 204" role="img" aria-label="최근 감정 기록 ${records.length}개의 강도 변화">
        ${[1, 5, 10].map(v => `
          <line class="chart-grid" x1="${left}" x2="${right}" y1="${yAt(v)}" y2="${yAt(v)}"></line>
          <text class="chart-label" x="${left - 9}" y="${yAt(v) + 4}" text-anchor="end">${v}</text>
        `).join("")}
        ${points.length > 1 ? `<polyline class="chart-line" points="${points.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ")}"></polyline>` : ""}
        ${points.map((p, i) => `
          <circle class="chart-dot" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="5">
            <title>${esc(records[i].date || "")} ${esc(records[i].mood || "")} ${Number(records[i].intensity)}/10</title>
          </circle>
        `).join("")}
        <text class="chart-label" x="${left}" y="194" text-anchor="start">${esc(records[0].date || "")}</text>
        ${records.length > 1 ? `<text class="chart-label" x="${right}" y="194" text-anchor="end">${esc(records[records.length - 1].date || "")}</text>` : ""}
      </svg>
    </div>
    <p class="know-quote">지금까지 가장 많이 남긴 감정은 <strong>${esc(topMood)}</strong>이에요. (${topCount}번)</p>
    <p class="muted small-text">직접 기록한 강도를 1에서 10까지 그대로 그렸어요. 마음 상태를 진단하지 않아요.</p>
  `;
}

function myWords() {
  const pick = [
    ["주변에서 자주 부탁받는 일", data.selfAnswers.q1],
    ["뿌듯했던 순간", data.selfAnswers.q3],
    ["더 키우고 싶은 것", data.selfAnswers.q7]
  ].filter(([, answer]) => String(answer || "").trim());

  if (!pick.length && !data.values.length) {
    return `
      ${empty("나를 탐색하는 질문이나 가치관을 적으면 그 말을 여기에 모아 드려요.")}
      <div class="button-row">
        <button class="btn secondary" data-go="self" type="button">나를 탐색하기</button>
        <button class="btn ghost" data-go="values" type="button">나의 가치관</button>
      </div>
    `;
  }

  return `
    ${pick.map(([label, answer]) => `
      <div class="entry">
        <div class="entry-meta">${label}</div>
        <div class="entry-body">${esc(answer)}</div>
      </div>
    `).join("")}
    ${data.values.length ? `
      <div class="guide-section">
        <div class="entry-meta">내가 고른 가치</div>
        <div class="chip-list">${data.values.map(v => `<span class="chip">${esc(v)}</span>`).join("")}</div>
      </div>
    ` : ""}
    <div class="notice green">
      이 말들은 모두 당신이 직접 쓴 것이에요. 앱이 어떤 사람인지 판단하지 않아요.
    </div>
    <div class="button-row">
      <button class="btn ghost" data-go="self" type="button">답 고치기</button>
    </div>
  `;
}

function knowPage() {
  const tabs = {
    pattern: "감정의 흐름",
    words: "내가 쓴 말",
    interest: "흥미"
  };

  return `
    ${pageHead(
      "KNOW YOURSELF",
      "나를 알아가기",
      "지금까지 남긴 기록을 돌아보며 나를 조금 더 이해해 봐요."
    )}

    <div class="tab-row" role="group" aria-label="보기 선택">
      ${Object.entries(tabs).map(([id, label]) => `
        <button
          type="button"
          class="tab ${knowTab === id ? "active" : ""}"
          data-know-tab="${id}"
          aria-pressed="${knowTab === id}"
        >${label}</button>
      `).join("")}
    </div>

    <section class="card" id="knowPanel">
      ${
        knowTab === "pattern"
          ? emotionChart()
          : knowTab === "words"
            ? myWords()
            : `
              ${careerResult()}
              <div class="button-row">
                <button class="btn secondary" data-go="career" type="button">진로 흥미 질문 보기</button>
              </div>
            `
      }
    </section>
  `;
}

// 처음 찾아온 사람에게 한 번만 보여 주는 시작 화면
const INTRO_KEY = "fyw3_intro_seen";

function showIntroOnce() {
  let seen = false;

  try {
    seen = localStorage.getItem(INTRO_KEY) === "1" || !!localStorage.getItem(KEY);
  } catch (e) {
    seen = true;
  }

  if (seen) return;

  const intro = document.createElement("section");

  intro.className = "intro";
  intro.setAttribute("aria-label", "MIND LAB 시작 화면");
  intro.innerHTML = `
    <svg class="intro-moon" viewBox="0 0 200 200" aria-hidden="true">
      <path d="M138 18 A88 88 0 1 0 186 136 A70 70 0 1 1 138 18 Z"></path>
    </svg>
    <div class="intro-name">
      <strong>MIND LAB</strong>
      <small>A PLACE TO BE YOURSELF</small>
    </div>
    <p class="intro-line">오늘도 많이 힘들었죠.<br>여기서는 괜찮은 척하지<br>않아도 돼요.</p>
    <p class="intro-sub">당신의 마음이 잠시 쉴 수 있도록.</p>
    <button class="intro-start" id="introStart" type="button">시작하기 <span aria-hidden="true">→</span></button>
    <button class="intro-help" id="introHelp" type="button">지금 많이 힘들어요</button>
  `;

  document.body.append(intro);
  document.body.classList.add("intro-open");

  const close = next => {
    document.body.classList.remove("intro-open");

    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch (e) {
      console.warn(e);
    }

    intro.remove();

    if (next) go(next);
  };

  $("#introStart").addEventListener("click", () => close());
  $("#introHelp").addEventListener("click", () => close("calm"));
  $("#introStart").focus({ preventScroll: true });
}

function isDatedLetter(x) {
  return /^\d{4}-\d{2}-\d{2}$/.test(x.date || "");
}

function isLetterLocked(x) {
  return isDatedLetter(x) && x.date > today() && !x.openedEarly;
}

function futurePage() {
  // 날짜가 된 편지는 이 화면을 열면 읽은 것으로 표시한다.
  const newlyOpened = data.futureLetters.filter(
    x => isDatedLetter(x) && !isLetterLocked(x) && !x.read
  );

  if (newlyOpened.length) {
    newlyOpened.forEach(x => {
      x.read = true;
    });
    save();
  }

  return `
    ${pageHead(
      "A LETTER TO MYSELF",
      "나에게 보내는 편지",
      "그때의 나에게, 지금의 나에게, 그리고 미래의 나에게 하고 싶은 말을 남겨 보세요."
    )}

    <svg class="letter-art" viewBox="0 0 320 170" role="img" aria-label="별이 붙은 편지 봉투">
      <defs>
        <radialGradient id="letterGlow">
          <stop offset="0" stop-color="#f6e5bd" stop-opacity="0.55"></stop>
          <stop offset="1" stop-color="#f6e5bd" stop-opacity="0"></stop>
        </radialGradient>
      </defs>
      <circle cx="160" cy="88" r="88" fill="url(#letterGlow)"></circle>
      <path d="M74 54 L232 22 L256 124 L98 156 Z" fill="#d9d4f4"></path>
      <path d="M74 54 L170 100 L232 22" fill="none" stroke="#8d88bd" stroke-width="3"></path>
      <path d="M170 76 l7 16 17 2 -13 11 4 17 -15 -9 -15 9 4 -17 -13 -11 17 -2 z" fill="#f6d98b"></path>
    </svg>

    <section class="card">
      <form id="futureForm">
        <div class="tab-row" role="group" aria-label="누구에게 쓰나요">
          ${Object.entries(LETTER_TARGETS).map(([id, target]) => `
            <button
              type="button"
              class="tab ${letterTarget === id ? "active" : ""}"
              data-letter-target="${id}"
              aria-pressed="${letterTarget === id}"
            >${target.tab}</button>
          `).join("")}
        </div>

        ${letterTarget === "future" ? `
          <div class="field">
            <label for="futureDate">다시 읽어볼 날짜</label>
            <input type="date" id="futureDate">
          </div>
        ` : ""}

        <div class="field">
          <label for="futureBody">${LETTER_TARGETS[letterTarget].label}</label>
          <textarea
            id="futureBody"
            required
            style="min-height:200px"
            placeholder="${LETTER_TARGETS[letterTarget].placeholder}"
          ></textarea>
        </div>

        <button class="btn" type="submit">편지 보관하기</button>
      </form>
    </section>

    <div class="section-head">
      <h2>보관한 편지</h2>
    </div>

    ${
      data.futureLetters.length
        ? `
          <div class="entry-list">
            ${data.futureLetters.slice().reverse().map(x => `
              <article class="entry">
                <div class="entry-top">
                  <strong>${
                    LETTER_TARGETS[x.to] && x.to !== "future"
                      ? `${LETTER_TARGETS[x.to].title} · ${esc(x.date || "")}`
                      : isDatedLetter(x)
                        ? `${esc(x.date)}에 다시 읽기`
                        : "날짜를 정하지 않은 편지"
                  }</strong>

                  <div class="entry-actions">
                    ${isLetterLocked(x) ? `
                      <button
                        class="btn ghost small"
                        data-open-letter="${esc(x.id)}"
                      >미리 열기</button>
                    ` : ""}

                    <button
                      class="btn danger small"
                      data-delete="future"
                      data-id="${esc(x.id)}"
                    >삭제</button>
                  </div>
                </div>

                <div class="entry-body">${
                  isLetterLocked(x)
                    ? `이 편지는 ${esc(x.date)}에 열려요.`
                    : esc(x.body)
                }</div>
              </article>
            `).join("")}
          </div>
        `
        : empty("아직 보관한 편지가 없습니다.")
    }
  `;
}

/* =========================
   SETTINGS
========================= */

function settingsPage() {
  return `
    ${pageHead(
      "SETTINGS & PRIVACY",
      "설정 및 데이터",
      "편안한 사용 환경을 설정하고, 소중한 기록을 안전하게 보관하세요."
    )}

    <div class="grid grid-2">
      <section class="card">
        <h2 style="font-size:18px;margin-top:0">사용 환경</h2>

        <div class="field">
          <label for="profileName">이름 또는 부를 호칭 (선택)</label>
          <input
            id="profileName"
            value="${esc(data.profile.name)}"
            placeholder="비워두어도 괜찮아요"
          >
        </div>

        <div class="field">
          <label for="ageGroup">이용 안내 유형</label>

          <select id="ageGroup">
            <option value="teen" ${data.profile.ageGroup === "teen" ? "selected" : ""}>청소년</option>
            <option value="young" ${data.profile.ageGroup === "young" ? "selected" : ""}>청년</option>
            <option value="adult" ${data.profile.ageGroup === "adult" ? "selected" : ""}>성인</option>
            <option value="senior" ${data.profile.ageGroup === "senior" ? "selected" : ""}>중장년·노년</option>
          </select>
        </div>

        <label class="field">
          <span>
            <input id="largeText" type="checkbox" ${data.profile.largeText ? "checked" : ""}>
            큰 글씨 사용
          </span>
        </label>

        <label class="field">
          <span>
            <input id="dawnMode" type="checkbox" ${data.profile.dawn ? "checked" : ""}>
            밝은 새벽 화면 사용 (기본은 밤하늘)
          </span>
        </label>

        <button class="btn" id="saveSettings">설정 저장</button>
      </section>

      <section class="card">
        <h2 style="font-size:18px;margin-top:0">이용 안내</h2>

        ${guideText()}

        <div class="divider"></div>

        <h3 style="font-size:15px">개인정보와 저장 방식</h3>

        <p class="small-text muted">
          이 앱은 기록을 현재 브라우저의 로컬 저장소에 보관합니다.
          서버로 자동 전송하지 않으며, 브라우저 데이터 삭제·기기 변경·
          저장 공간 부족 등에 따라 기록이 사라질 수 있습니다.
          중요한 기록은 정기적으로 백업하세요.
          로컬 저장소 자체는 암호화되지 않습니다.
          화면 글꼴은 Google Fonts에서 불러오며, 이때 접속 정보가 Google에 전달될 수 있습니다.
          기록 내용은 전달되지 않습니다.
        </p>
      </section>
    </div>

    ${crisisNotice()}

    ${recoveryKeys().length ? `
      <div class="notice">
        <strong>보관된 이전 기록이 있어요.</strong><br>
        읽을 수 없는 형식의 기록을 지우지 않고 따로 보관했습니다.
        파일로 내려받아 안전하게 보관하세요.
        <div class="button-row">
          <button class="btn secondary small" id="downloadRecovery">
            보관된 기록 내려받기
          </button>
        </div>
      </div>
    ` : ""}

    <div class="section-head">
      <h2>데이터 백업 및 복구</h2>
    </div>

    <section class="card">
      <p class="muted small-text">
        백업 파일은 JSON 형식입니다.
        다른 기기에서 복원하려면 백업 파일을 옮겨 가져오세요.
        복원 전 현재 데이터도 자동으로 백업 파일로 내려받습니다.
      </p>

      <div class="button-row">
        <button class="btn" id="exportData">데이터 백업하기</button>

        <label class="btn secondary" for="importFile">
          백업 파일 가져오기
        </label>

        <input
          id="importFile"
          type="file"
          accept="application/json,.json"
          hidden
        >
      </div>

      <div class="divider"></div>

      <button class="btn danger" id="deleteAll">모든 데이터 삭제</button>
    </section>

    <div class="notice green">
      개인정보 보호 안내: 이름 입력은 선택 사항이며,
      계정·비밀번호·주민등록번호 등 민감한 식별정보를 기록하지 않는 것을 권장합니다.
    </div>

    <div class="small-text muted">
      MIND LAB 앱 버전 3.1 · 로컬 우선 구조 · 심리 진단 및 치료 목적이 아닌 자기성찰 도구
    </div>
  `;
}

function guideText() {
  const g = data.profile.ageGroup;

  const guides = {
    teen: "청소년 이용 안내: 감정과 학교생활, 관심 분야를 편안하게 기록해 보세요. 힘든 감정이 오래 지속되거나 안전이 걱정된다면 믿을 수 있는 보호자·교사·전문가에게 도움을 요청하세요.",

    young: "청년 이용 안내: 진로, 관계, 학업, 일과 삶의 균형을 탐색해 보세요. 작은 행동 목표를 정하고 주기적으로 돌아보는 방식으로 활용할 수 있습니다.",

    adult: "성인 이용 안내: 일상과 관계, 직업, 건강, 가치관을 돌아보고 원하는 방향에 맞는 실천을 기록해 보세요.",

    senior: "중장년·노년 이용 안내: 큰 글씨 설정을 활용하고, 하루의 기억과 감정, 삶에서 소중했던 순간을 짧게 남겨보세요. 필요하면 가족이나 신뢰하는 사람과 함께 사용할 수 있습니다."
  };

  return `
    <p class="small-text muted">
      ${guides[g] || guides.adult}
    </p>
  `;
}

/* =========================
   RENDER
========================= */

function render() {
  header();

  const guide = window.MindLabGuide;

  const views = {
    home,
    calm: guide.calm,
    understand: guide.understand,
    care: guide.care,
    help: guide.help,
    allies: guide.allies,
    about: guide.about,
    record: guide.record,
    explore: guide.explore,
    know: knowPage,
    self: selfPage,
    emotion: emotionPage,
    thought: thoughtPage,
    values: valuesPage,
    career: careerPage,
    action: actionPage,
    journal: journalPage,
    growth: growthPage,
    future: futurePage,
    settings: settingsPage
  };

  window.MindLabRest?.stop();

  const app = $("#app");
  const group = PAGE_GROUPS[page];
  const pageNav = page === "home"
    ? ""
    : `
      <nav class="page-nav" aria-label="화면 이동">
        <button class="sub-back" id="goBack" type="button">‹ 뒤로</button>
        ${group ? `<button class="sub-back" data-go="${group}" type="button">${GROUP_NAMES[group]} 메뉴</button>` : ""}
        <button class="sub-back" data-go="home" type="button">홈으로</button>
      </nav>
    `;

  app.innerHTML = pageNav + (views[page] || home)();

  // 저장할 때는 움직이지 않고, 다른 화면으로 옮겨 갈 때만 부드럽게 전환한다.
  if (page !== renderedPage) {
    app.classList.remove("page-in");
    void app.offsetWidth;
    app.classList.add("page-in");
    renderedPage = page;
  }

  bindPage();
  revealOnScroll();
}

let renderedPage = null;
let revealObserver = null;

function revealOnScroll() {
  if (revealObserver) {
    revealObserver.disconnect();
    revealObserver = null;
  }

  const targets = $$(".reveal");
  const calmer = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (!targets.length || calmer || !("IntersectionObserver" in window)) {
    return;
  }

  document.body.classList.add("reveal-ready");

  revealObserver = new IntersectionObserver(found => {
    found.forEach(item => {
      if (item.isIntersecting) {
        item.target.classList.add("seen");
        revealObserver.unobserve(item.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });

  targets.forEach(el => revealObserver.observe(el));
}

function chooseMood(id) {
  const guide = window.MindLabGuide;
  const nextId = todayMood === id ? null : id;
  const mood = guide.moods.find(item => item.id === nextId);

  todayMood = nextId;

  $$("[data-mood]").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.mood === nextId));
  });

  if (mood) {
    document.body.dataset.skyTone = mood.tone;
  } else {
    delete document.body.dataset.skyTone;
  }

  const reply = $("#moodReply");

  reply.innerHTML = guide.moodReply(nextId);

  $$("[data-go]", reply).forEach(b => {
    b.addEventListener("click", () => go(b.dataset.go));
  });
}

/* =========================
   EVENT BINDINGS
========================= */

function bindPage() {
  const on = (sel, ev, fn) =>
    $(sel)?.addEventListener(ev, fn);

  window.MindLabRest?.bind();

  $$("[data-orb]").forEach(b => {
    b.addEventListener("click", () => {
      $("#mood").value = b.dataset.orb;

      $$("[data-orb]").forEach(other => {
        other.setAttribute("aria-pressed", String(other === b));
      });
    });
  });

  $$("[data-know-tab]").forEach(b => {
    b.addEventListener("click", () => {
      knowTab = b.dataset.knowTab;
      render();
    });
  });

  $$("[data-letter-target]").forEach(b => {
    b.addEventListener("click", () => {
      const written = $("#futureBody").value;

      letterTarget = b.dataset.letterTarget;
      render();
      $("#futureBody").value = written;
    });
  });

  on("#goBack", "click", () => {
    if (navDepth > 0) {
      history.back();
    } else {
      go(PAGE_GROUPS[page] || "home");
    }
  });

  on("#lookInside", "click", () => {
    const calmer = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    $("#moodCheck")?.scrollIntoView({
      behavior: calmer ? "auto" : "smooth",
      block: "start"
    });
    $("[data-mood]")?.focus({ preventScroll: true });
  });

  $$("[data-mood]").forEach(b => {
    b.addEventListener("click", () => chooseMood(b.dataset.mood));
  });

  // 화면을 다시 그려도 오늘 고른 기분은 유지한다.
  if (todayMood && $("#moodReply")) {
    const kept = todayMood;
    todayMood = null;
    chooseMood(kept);
  }

  on("#nextSaying", "click", () => {
    const sayings = window.MindLabGuide.sayings;
    const el = $("#calmSaying");

    el.textContent =
      sayings[(sayings.indexOf(el.textContent) + 1) % sayings.length];
    el.classList.remove("turning");
    void el.offsetWidth;
    el.classList.add("turning");
  });

  // 저장되지 않는 칸. 지우기를 누르거나 화면을 떠나면 사라진다.
  on("#clearWords", "click", () => {
    $("#looseWords").value = "";
    $("#looseWords").focus();
  });

  on("#selfForm", "input", e => {
    if (e.target.name) {
      data.selfAnswers[e.target.name] = e.target.value;
      debouncedSave("#draftStatus");
    }
  });

  on("#selfForm", "submit", e => {
    e.preventDefault();
    save();
    render();
    toast("답변을 저장했어요.");

    $("#selfMirror")?.scrollIntoView({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start"
    });
  });

  on("#emotionForm", "input", e => {
    if (e.target.id === "intensity") {
      $("#intensityOut").textContent = e.target.value;
    }
  });

  on("#emotionForm", "submit", e => {
    e.preventDefault();

    data.emotions.push({
      id: uid(),
      date: today(),
      createdAt: new Date().toISOString(),
      mood: $("#mood").value,
      intensity: Number($("#intensity").value),
      body: $("#emotionEvent").value,
      thought: $("#emotionThought").value,
      need: $("#emotionNeed").value
    });

    save();
    toast("감정 기록을 저장했어요.");
    render();
  });

  on("#thoughtForm", "submit", e => {
    e.preventDefault();

    data.thoughts.push({
      id: uid(),
      date: today(),
      createdAt: new Date().toISOString(),
      situation: $("#situation").value,
      body:
        `떠오른 생각: ${$("#autoThought").value}\n` +
        `감정: ${$("#thoughtEmotion").value}\n` +
        `근거: ${$("#evidenceFor").value}\n` +
        `다른 근거: ${$("#evidenceAgainst").value}\n` +
        `균형 잡힌 관점: ${$("#balancedThought").value}\n` +
        `다음 행동: ${$("#nextAction").value}`
    });

    save();
    toast("생각 기록을 저장했어요.");
    render();
  });

  $$("#valueChips .chip").forEach(b => {
    b.addEventListener("click", () => {
      const v = b.dataset.value;
      let a = [...data.values];

      if (a.includes(v)) {
        a = a.filter(x => x !== v);
      } else if (a.length < 7) {
        a.push(v);
      } else {
        return toast("최대 7개까지 선택할 수 있어요.");
      }

      data.values = a;

      $$(".chip", $("#valueChips")).forEach(x => {
        const yes = data.values.includes(x.dataset.value);

        x.classList.toggle("selected", yes);
        x.setAttribute("aria-pressed", String(yes));
      });

      $("#valueCount").textContent = `${a.length}/7 선택`;
    });
  });

  on("#saveValues", "click", () => {
    save();
    toast("가치관을 저장했어요.");
  });

  on("#careerForm", "change", e => {
    if (e.target.type !== "radio") return;

    $$(`input[name="${e.target.name}"]`).forEach(input => {
      input.closest(".chip")?.classList.toggle("selected", input.checked);
    });
  });

  on("#careerForm", "submit", e => {
    e.preventDefault();

    const a = {};

    careerItems.forEach((q, i) => {
      const v = $(`input[name="c${i}"]:checked`);

      if (v) {
        a[i] = Number(v.value);
      }
    });

    if (Object.keys(a).length !== 18) {
      return toast("모든 문항에 응답해 주세요.");
    }

    data.careerAnswers = a;

    save();
    toast("진로 흥미 응답을 저장했어요.");
    render();
  });

  on("#goalForm", "submit", e => {
    e.preventDefault();

    data.goals.push({
      id: uid(),
      name: $("#goalName").value,
      due: $("#goalDate").value,
      note: $("#goalNote").value,
      done: false,
      createdAt: new Date().toISOString()
    });

    save();
    toast("목표를 추가했어요.");
    render();
  });

  on("#journalForm", "input", () => {
    debouncedSave("#journalDraftStatus", saveJournalDraft);
  });

  on("#journalForm", "submit", e => {
    e.preventDefault();

    const obj = {
      id: activeEdit?.kind === "journal"
        ? activeEdit.item.id
        : uid(),

      date: activeEdit?.kind === "journal"
        ? activeEdit.item.date
        : today(),

      createdAt: activeEdit?.kind === "journal"
        ? activeEdit.item.createdAt
        : new Date().toISOString(),

      title: $("#journalTitle").value || "제목 없는 기록",
      category: $("#journalCategory").value,
      body: $("#journalBody").value
    };

    cancelPendingDraft();

    if (activeEdit?.kind === "journal") {
      data.journals = data.journals.map(x =>
        x.id === obj.id ? obj : x
      );
    } else {
      data.journals.push(obj);
    }

    activeEdit = null;

    save();
    clearDraft("journal");

    toast("일기를 저장했어요.");
    render();
  });

  on("#clearJournal", "click", () => {
    if (confirm("작성 중인 내용을 비울까요?")) {
      cancelPendingDraft();
      clearDraft("journal");
      activeEdit = null;
      render();
    }
  });

  on("#journalSearch", "input", filterJournals);
  on("#journalFilter", "change", filterJournals);

  on("#futureForm", "submit", e => {
    e.preventDefault();

    const toFuture = letterTarget === "future";

    data.futureLetters.push({
      id: uid(),
      to: letterTarget,
      date: toFuture ? ($("#futureDate").value || "날짜 미정") : today(),
      body: $("#futureBody").value,
      read: !toFuture,
      createdAt: new Date().toISOString()
    });

    save();
    toast(`${LETTER_TARGETS[letterTarget].title} 보내는 편지를 보관했어요.`);
    render();
  });

  on("#saveSettings", "click", () => {
    data.profile.name = $("#profileName").value.trim();
    data.profile.ageGroup = $("#ageGroup").value;
    data.profile.largeText = $("#largeText").checked;
    data.profile.dawn = $("#dawnMode").checked;

    save();
    render();
    toast("설정을 저장했어요.");
  });

  on("#exportData", "click", exportData);
  on("#importFile", "change", importData);

  on("#deleteAll", "click", () => {
    if (confirm("모든 기록과 설정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      cancelPendingDraft();

      localStorage.removeItem(KEY);
      localStorage.removeItem(DRAFT);
      recoveryKeys().forEach(k => localStorage.removeItem(k));

      saveBlocked = false;
      data = defaultData();

      toast("모든 데이터를 삭제했어요.");
      go("home");
    }
  });

  on("#globalSearch", "input", globalSearch);

  on("#downloadRecovery", "click", downloadRecovery);

  if ($("#globalSearch") && globalQuery) {
    $("#globalSearch").value = globalQuery;
    globalSearch();
  }

  $$("[data-go]").forEach(b => {
    b.addEventListener("click", () => go(b.dataset.go));
  });

  bindEntryButtons($("#app"));

  $$("[data-open-letter]").forEach(b => {
    b.addEventListener("click", () => {
      if (!confirm("정한 날짜 전에 이 편지를 열까요?")) return;

      const letter = data.futureLetters.find(
        x => x.id === b.dataset.openLetter
      );

      if (letter) {
        letter.openedEarly = true;
        save();
        render();
      }
    });
  });

  $$("[data-goal-done]").forEach(b => {
    b.addEventListener("change", () => {
      const g = data.goals.find(x => x.id === b.dataset.goalDone);

      if (g) {
        g.done = b.checked;
        save();
        toast("목표 상태를 변경했어요.");
        render();
      }
    });
  });
}

/* =========================
   SAVE & SEARCH
========================= */

function debouncedSave(statusSel, task = save) {
  const status = $(statusSel);

  if (status) {
    status.textContent = "저장 중…";
  }

  clearTimeout(draftTimer);

  pendingDraftTask = () => {
    const saved = task() !== false;

    if (status) {
      status.textContent = saved ? "자동 저장됨" : "저장하지 못했어요";
    }
  };

  draftTimer = setTimeout(flushPendingDraft, 450);
}

function flushPendingDraft() {
  clearTimeout(draftTimer);

  const task = pendingDraftTask;
  pendingDraftTask = null;

  if (task) task();
}

function cancelPendingDraft() {
  clearTimeout(draftTimer);
  pendingDraftTask = null;
}

function readDrafts() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || "{}");
    return d && typeof d === "object" ? d : {};
  } catch {
    return {};
  }
}

// 작성 중인 일기를 실제로 저장한다. 수정 중이면 어떤 글을 고치는지도 함께 기억한다.
function saveJournalDraft() {
  const title = $("#journalTitle");
  const body = $("#journalBody");
  const category = $("#journalCategory");

  if (!title || !body || !category) return true;

  try {
    const d = readDrafts();

    if (!title.value && !body.value && !activeEdit) {
      delete d.journal;
    } else {
      d.journal = {
        title: title.value,
        body: body.value,
        category: category.value,
        editId: activeEdit?.kind === "journal" ? activeEdit.item.id : null
      };
    }

    localStorage.setItem(DRAFT, JSON.stringify(d));
    return true;
  } catch (e) {
    toast("임시 저장에 실패했습니다. 저장 공간을 확인해 주세요.");
    return false;
  }
}

function clearDraft(k) {
  try {
    const d = readDrafts();

    delete d[k];

    localStorage.setItem(DRAFT, JSON.stringify(d));
  } catch {}
}

function bindEntryButtons(root) {
  $$("[data-edit]", root).forEach(b => {
    b.addEventListener("click", () =>
      editEntry(b.dataset.edit, b.dataset.id)
    );
  });

  $$("[data-delete]", root).forEach(b => {
    b.addEventListener("click", () =>
      deleteEntry(b.dataset.delete, b.dataset.id)
    );
  });
}

function filterJournals() {
  const q = ($("#journalSearch")?.value || "").toLowerCase();
  const cat = $("#journalFilter")?.value || "";

  const list = data.journals.filter(x =>
    (!cat || x.category === cat) &&
    (`${x.title} ${x.body}`).toLowerCase().includes(q)
  );

  $("#journalList").innerHTML = entries(
    list,
    "journal",
    "조건에 맞는 기록이 없어요."
  );

  bindEntryButtons($("#journalList"));
}

function globalSearch() {
  globalQuery = $("#globalSearch").value;

  const q = globalQuery.toLowerCase();

  const all = [
    ...data.journals.map(x => ({
      ...x,
      sourceKind: "journal"
    })),

    ...data.emotions.map(x => ({
      ...x,
      sourceKind: "emotion",
      title: x.mood
    })),

    ...data.thoughts.map(x => ({
      ...x,
      sourceKind: "thought",
      title: "생각 기록"
    }))
  ].filter(x =>
    `${x.title} ${entryText(x)}`.toLowerCase().includes(q)
  );

  $("#globalResults").innerHTML =
    q
      ? entries(all, "search", "검색 결과가 없어요.")
      : empty("검색어를 입력하면 기록을 찾아볼 수 있어요.");

  bindEntryButtons($("#globalResults"));
}

/* =========================
   EDIT & DELETE
========================= */

function editEntry(kind, id) {
  if (kind === "journal") {
    const item = data.journals.find(x => x.id === id);

    if (item) {
      activeEdit = {
        kind: "journal",
        item
      };

      go("journal", { keepEdit: true });
    }
  }
}

function deleteEntry(kind, id) {
  const map = {
    emotion: "emotions",
    thought: "thoughts",
    journal: "journals",
    goal: "goals",
    future: "futureLetters"
  };

  const key = map[kind];

  if (!key) return;

  if (!confirm("이 기록을 삭제할까요?")) return;

  data[key] = data[key].filter(x => x.id !== id);

  if (kind === "journal") {
    if (activeEdit?.item?.id === id) {
      activeEdit = null;
    }

    if (readDrafts().journal?.editId === id) {
      cancelPendingDraft();
      clearDraft("journal");
    }
  }

  save();
  toast("기록을 삭제했어요.");
  render();
}

/* =========================
   BACKUP & RESTORE
========================= */

function exportData() {
  const payload = {
    ...data,
    exportedAt: new Date().toISOString(),
    app: "MIND LAB",
    version: 1
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );

  download(blob, `mind-lab-backup-${today()}.json`);

  toast("백업 파일을 만들었어요.");
}

function downloadRecovery() {
  recoveryKeys().forEach(k => {
    download(
      new Blob([localStorage.getItem(k) || ""], { type: "application/json" }),
      `mind-lab-recovered-${k.slice(RECOVERY_PREFIX.length)}.json`
    );
  });

  toast("보관된 기록을 내려받았어요.");
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = name;
  a.click();

  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files?.[0];

  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    toast("파일이 너무 큽니다. 5MB 이하 파일을 선택해 주세요.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const x = JSON.parse(reader.result);

      if (
        !x ||
        x.version !== 1 ||
        !Array.isArray(x.emotions) ||
        !Array.isArray(x.thoughts) ||
        !Array.isArray(x.journals) ||
        !Array.isArray(x.goals) ||
        !Array.isArray(x.values) ||
        !x.profile
      ) {
        throw Error("파일 구조가 올바르지 않습니다.");
      }

      if (!confirm("현재 데이터를 먼저 백업한 뒤 선택한 파일의 데이터로 교체할까요?")) {
        return;
      }

      exportData();

      data = normalizeData(x);

      if (!save()) {
        throw Error("저장에 실패했습니다.");
      }

      toast("데이터를 복원했어요.");
      go("home");

    } catch (err) {
      alert("복원하지 못했습니다: " + err.message);

    } finally {
      e.target.value = "";
    }
  };

  reader.readAsText(file);
}

/* =========================
   MOBILE & PWA
========================= */

// 메뉴뿐 아니라 로고와 상단 "나" 버튼도 같은 방식으로 화면을 이동한다.
$$("[data-page]").forEach(b => {
  b.addEventListener("click", e => {
    e.preventDefault();
    go(b.dataset.page);
  });
});

// 뒤로 가기, 앞으로 가기를 누르면 그때의 화면을 다시 그린다.
window.addEventListener("popstate", e => {
  flushPendingDraft();

  page = e.state?.page || "home";
  navDepth = e.state?.depth || 0;
  activeEdit = null;
  globalQuery = "";

  render();
  window.scrollTo(0, 0);
});

try {
  history.replaceState({ page, depth: 0 }, "");
} catch (e) {
  console.warn(e);
}

// 창을 닫는 순간에도 작성 중인 내용을 잃지 않게 한다.
window.addEventListener("pagehide", flushPendingDraft);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushPendingDraft();
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(err => console.warn("SW registration failed", err));
  });
}

render();

showIntroOnce();

if (recoveredOnStart) {
  toast("읽을 수 없는 이전 기록을 따로 보관했어요. 설정에서 내려받을 수 있어요.");
} else if (saveBlocked) {
  toast("이전 기록을 보호하기 위해 저장을 멈췄어요. 저장 공간을 확인해 주세요.");
}

})();