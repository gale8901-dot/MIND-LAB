(() => {
"use strict";

const KEY = "fyw3_data_v1";
const DRAFT = "fyw3_drafts_v1";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const today = () => new Date().toISOString().slice(0, 10);

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
    dark: false
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

let data = load();
let page = "home";
let draftTimer = null;
let activeEdit = null;

function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) return defaultData();

    const x = JSON.parse(raw);

    if (!x || x.version !== 1) {
      throw Error("지원하지 않는 데이터 형식");
    }

    return {
      ...defaultData(),
      ...x,
      profile: {
        ...defaultData().profile,
        ...(x.profile || {})
      }
    };
  } catch (e) {
    console.warn(e);
    return defaultData();
  }
}

function save() {
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
  return (
    Date.now() - new Date(d).getTime() <= n * 86400000 &&
    new Date(d).getTime() <= Date.now() + 86400000
  );
}

function header() {
  const names = {
    home: "홈",
    self: "나를 탐색하기",
    emotion: "감정 이해하기",
    thought: "생각 탐색하기",
    values: "나의 가치관",
    career: "진로 탐색",
    action: "목표와 실천",
    journal: "나의 일기",
    growth: "성장 리포트",
    future: "미래의 나",
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

  document.body.classList.toggle("dark", !!data.profile.dark);
  document.body.classList.toggle("large-text", !!data.profile.largeText);
}

function go(p) {
  page = p;
  activeEdit = null;
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

function entries(items, kind) {
  if (!items.length) {
    return empty("아직 기록이 없어요. 첫 기록을 남겨보세요.");
  }

  return `
    <div class="entry-list">
      ${items.slice().reverse().map(x => `
        <article class="entry">
          <div class="entry-top">
            <div>
              <div class="entry-title">
                ${esc(x.title || x.mood || x.name || "기록")}
              </div>
              <div class="entry-meta">
                ${esc(x.date || "")}
                ${x.intensity ? ` · 강도 ${x.intensity}/10` : ""}
              </div>
            </div>

            <div class="entry-actions">
              <button class="btn ghost small"
                data-edit="${kind}"
                data-id="${esc(x.id)}">수정</button>

              <button class="btn danger small"
                data-delete="${kind}"
                data-id="${esc(x.id)}">삭제</button>
            </div>
          </div>

          <div class="entry-body">
            ${esc(x.body || x.content || x.situation || x.note || "")}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

/* =========================
   HOME
========================= */

function home() {
  const week =
    data.emotions.filter(x => withinDays(x.date, 7)).length +
    data.journals.filter(x => withinDays(x.date, 7)).length;

  const done = data.goals.filter(x => x.done).length;
  const active = data.goals.length - done;

  return `
    ${pageHead(
      "WELCOME TO YOUR SPACE",
      `반가워요${data.profile.name ? `, ${esc(data.profile.name)}님` : ""}.<br>오늘의 나를 천천히 만나보세요.`,
      "나를 이해하는 일에는 정답도, 정해진 속도도 없어요. 작은 기록 하나부터 시작해도 충분합니다."
    )}

    <div class="hero">
      <div>
        <div class="eyebrow">A LITTLE STEP EVERY DAY</div>
        <h1>나를 알아가는 시간이<br>나를 바꿔갑니다.</h1>
        <p>감정을 기록하고, 생각을 살펴보고, 나에게 중요한 가치를 발견해 보세요.</p>

        <div class="button-row">
          <button class="btn" data-go="self">나 탐색 시작하기</button>
          <button class="btn secondary" data-go="journal">오늘의 일기 쓰기</button>
        </div>
      </div>

      <div class="hero-art" aria-hidden="true"></div>
    </div>

    <div class="grid grid-4">
      <div class="card stat-card">
        <div class="stat-label">전체 감정 기록</div>
        <div class="stat-value">${data.emotions.length}</div>
        <div class="stat-foot">감정 알아차리기</div>
      </div>

      <div class="card stat-card">
        <div class="stat-label">작성한 일기</div>
        <div class="stat-value">${data.journals.length}</div>
        <div class="stat-foot">나의 순간들</div>
      </div>

      <div class="card stat-card">
        <div class="stat-label">진행 중인 목표</div>
        <div class="stat-value">${active}</div>
        <div class="stat-foot">작은 실천 이어가기</div>
      </div>

      <div class="card stat-card">
        <div class="stat-label">이번 주 기록</div>
        <div class="stat-value">${week}</div>
        <div class="stat-foot">최근 7일 기준</div>
      </div>
    </div>

    <div class="section-head">
      <div>
        <h2>나를 이해하는 여정</h2>
        <p>지금 필요한 주제를 선택해 보세요.</p>
      </div>
    </div>

    <div class="grid grid-3">
      ${[
        ["self", "◎", "나를 탐색하기", "나의 특성과 생각을 살펴봐요."],
        ["emotion", "♡", "감정 이해하기", "감정을 알아차리고 기록해요."],
        ["thought", "◈", "생각 탐색하기", "생각을 다른 관점에서 바라봐요."],
        ["values", "✧", "나의 가치관", "내 삶에서 중요한 것을 찾아요."],
        ["career", "⌁", "진로 탐색", "흥미와 관심 분야를 탐색해요."],
        ["action", "↗", "목표와 실천", "원하는 방향을 작은 행동으로 옮겨요."]
      ].map(a => `
        <button class="feature-card" data-go="${a[0]}">
          <span class="feature-icon">${a[1]}</span>
          <strong>${a[2]}</strong>
          <small>${a[3]}</small>
        </button>
      `).join("")}
    </div>

    <div class="section-head">
      <div>
        <h2>최근 기록</h2>
        <p>최근 작성한 기록을 확인해 보세요.</p>
      </div>

      <button class="btn ghost small" data-go="growth">
        성장 리포트 보기
      </button>
    </div>

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

  if (!all.length) {
    return empty("아직 기록이 없습니다. 오늘의 작은 생각부터 남겨보세요.");
  }

  return `
    <div class="entry-list">
      ${all.map(x => `
        <div class="entry">
          <div class="entry-top">
            <strong>${esc(x.title)}</strong>
            <span class="entry-meta">${esc(x.kind)} · ${esc(x.date)}</span>
          </div>
          <div class="entry-body">
            ${esc(x.body || x.content || x.situation || "")}
          </div>
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
            <label for="mood">지금 느끼는 감정</label>
            <select id="mood" required>
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
                <div class="stat-value" style="font-size:22px">${v}</div>
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
                      data-goal-done="${g.id}"
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
                      data-id="${g.id}"
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

function journalPage() {
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
            value="${esc(activeEdit?.item?.title || "")}"
          >
        </div>

        <div class="field">
          <label for="journalCategory">분류</label>
          <select id="journalCategory">
            <option>일상</option>
            <option>감정</option>
            <option>관계</option>
            <option>공부·일</option>
            <option>성장</option>
            <option>기타</option>
          </select>
        </div>

        <div class="field">
          <label for="journalBody">내용</label>
          <textarea
            id="journalBody"
            required
            placeholder="오늘 있었던 일, 느낀 점, 떠오른 생각을 자유롭게 적어보세요."
          >${esc(activeEdit?.item?.body || "")}</textarea>
        </div>

        <div class="form-actions">
          <span class="save-status" id="journalDraftStatus">
            작성 중 자동 임시 저장
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
        ${["일상", "감정", "관계", "공부·일", "성장", "기타"]
          .map(x => `<option>${x}</option>`).join("")}
      </select>
    </div>

    <div id="journalList">
      ${entries(data.journals, "journal")}
    </div>
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

function futurePage() {
  return `
    ${pageHead(
      "A LETTER TO FUTURE ME",
      "미래의 나에게",
      "지금의 마음과 바람을 미래의 나에게 남겨보세요."
    )}

    <section class="card">
      <form id="futureForm">
        <div class="field">
          <label for="futureDate">다시 읽어볼 날짜</label>
          <input type="date" id="futureDate">
        </div>

        <div class="field">
          <label for="futureBody">미래의 나에게 전하고 싶은 말</label>
          <textarea
            id="futureBody"
            required
            style="min-height:220px"
            placeholder="안녕, 미래의 나야..."
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
                  <strong>${esc(x.date)}에 다시 읽기</strong>

                  <button
                    class="btn danger small"
                    data-delete="future"
                    data-id="${x.id}"
                  >삭제</button>
                </div>

                <div class="entry-body">${esc(x.body)}</div>
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
            <input id="darkMode" type="checkbox" ${data.profile.dark ? "checked" : ""}>
            어두운 화면 사용
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
        </p>
      </section>
    </div>

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
      앱 버전 3.0 · 로컬 우선 구조 · 심리 진단 및 치료 목적이 아닌 자기성찰 도구
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

  const views = {
    home,
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

  $("#app").innerHTML = (views[page] || home)();

  bindPage();
}

/* =========================
   EVENT BINDINGS
========================= */

function bindPage() {
  const on = (sel, ev, fn) =>
    $(sel)?.addEventListener(ev, fn);

  on("#selfForm", "input", e => {
    if (e.target.name) {
      data.selfAnswers[e.target.name] = e.target.value;
      debouncedSave("#draftStatus");
    }
  });

  on("#selfForm", "submit", e => {
    e.preventDefault();
    save();
    toast("답변을 저장했어요.");
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

  on("#journalForm", "input", e => {
    if (
      e.target.id === "journalBody" ||
      e.target.id === "journalTitle"
    ) {
      debouncedSave("#journalDraftStatus");
    }
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

      createdAt: new Date().toISOString(),

      title: $("#journalTitle").value || "제목 없는 기록",
      category: $("#journalCategory").value,
      body: $("#journalBody").value
    };

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
      $("#journalTitle").value = "";
      $("#journalBody").value = "";
      clearDraft("journal");
    }
  });

  on("#journalSearch", "input", filterJournals);
  on("#journalFilter", "change", filterJournals);

  on("#futureForm", "submit", e => {
    e.preventDefault();

    data.futureLetters.push({
      id: uid(),
      date: $("#futureDate").value || "날짜 미정",
      body: $("#futureBody").value,
      createdAt: new Date().toISOString()
    });

    save();
    toast("미래의 나에게 보내는 편지를 보관했어요.");
    render();
  });

  on("#saveSettings", "click", () => {
    data.profile.name = $("#profileName").value.trim();
    data.profile.ageGroup = $("#ageGroup").value;
    data.profile.largeText = $("#largeText").checked;
    data.profile.dark = $("#darkMode").checked;

    save();
    render();
    toast("설정을 저장했어요.");
  });

  on("#exportData", "click", exportData);
  on("#importFile", "change", importData);

  on("#deleteAll", "click", () => {
    if (confirm("모든 기록과 설정을 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(DRAFT);

      data = defaultData();

      toast("모든 데이터를 삭제했어요.");
      go("home");
    }
  });

  on("#globalSearch", "input", globalSearch);

  $$("[data-go]").forEach(b => {
    b.addEventListener("click", () => go(b.dataset.go));
  });

  $$("[data-edit]").forEach(b => {
    b.addEventListener("click", () =>
      editEntry(b.dataset.edit, b.dataset.id)
    );
  });

  $$("[data-delete]").forEach(b => {
    b.addEventListener("click", () =>
      deleteEntry(b.dataset.delete, b.dataset.id)
    );
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

function debouncedSave(statusSel) {
  const status = $(statusSel);

  if (status) {
    status.textContent = "저장 중…";
  }

  clearTimeout(draftTimer);

  draftTimer = setTimeout(() => {
    save();

    if (status) {
      status.textContent = "자동 저장됨";
    }
  }, 450);
}

function clearDraft(k) {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT) || "{}");

    delete d[k];

    localStorage.setItem(DRAFT, JSON.stringify(d));
  } catch {}
}

function filterJournals() {
  const q = ($("#journalSearch")?.value || "").toLowerCase();
  const cat = $("#journalFilter")?.value || "";

  const list = data.journals.filter(x =>
    (!cat || x.category === cat) &&
    (`${x.title} ${x.body}`).toLowerCase().includes(q)
  );

  $("#journalList").innerHTML = entries(list, "journal");

  $$("[data-delete]", $("#journalList")).forEach(b => {
    b.addEventListener("click", () =>
      deleteEntry(b.dataset.delete, b.dataset.id)
    );
  });

  $$("[data-edit]", $("#journalList")).forEach(b => {
    b.addEventListener("click", () =>
      editEntry(b.dataset.edit, b.dataset.id)
    );
  });
}

function globalSearch() {
  const q = $("#globalSearch").value.toLowerCase();

  const all = [
    ...data.journals.map(x => ({
      ...x,
      kind: "일기",
      body: x.body
    })),

    ...data.emotions.map(x => ({
      ...x,
      kind: "감정",
      title: x.mood,
      body: x.body
    })),

    ...data.thoughts.map(x => ({
      ...x,
      kind: "생각",
      title: "생각 기록",
      body: x.situation + " " + x.body
    }))
  ].filter(x =>
    (x.title + " " + x.body).toLowerCase().includes(q)
  );

  $("#globalResults").innerHTML =
    q ? entries(all, "search") : empty("검색어를 입력하면 기록을 찾아볼 수 있어요.");
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

      go("journal");
    }
  } else {
    toast("이 항목은 현재 삭제만 지원합니다.");
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
    app: "FIND YOUR WAY",
    version: 1
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );

  download(blob, `find-your-way-backup-${today()}.json`);

  toast("백업 파일을 만들었어요.");
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

      const clean = {
        ...defaultData(),
        ...x,
        profile: {
          ...defaultData().profile,
          ...x.profile
        }
      };

      for (const k of [
        "emotions",
        "thoughts",
        "journals",
        "goals",
        "values",
        "futureLetters"
      ]) {
        if (!Array.isArray(clean[k])) {
          clean[k] = [];
        }
      }

      data = clean;

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

$("#menuToggle").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

$$(".nav-item[data-page]").forEach(b => {
  b.addEventListener("click", () => go(b.dataset.page));
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(err => console.warn("SW registration failed", err));
  });
}

render();

})();