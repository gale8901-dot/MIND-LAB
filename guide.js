// MIND LAB 안내 내용.
// 전문가 검토와 문구 수정을 쉽게 하려고 앱 동작 코드(app.js)와 분리했다.
// 의학 내용을 바꿀 때는 출처를 함께 확인하고 REVIEWED_ON 날짜를 고친다.
(() => {
"use strict";

const REVIEWED_ON = "2026년 11월 6일";

const SOURCES = {
  portalDepression: ["국가정신건강정보포털: 우울과 우울장애", "https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=38&srCodeNm=%EC%9A%B0%EC%9A%B8%EA%B3%BC+%EC%9A%B0%EC%9A%B8%EC%9E%A5%EC%95%A0"],
  portalPanic: ["국가정신건강정보포털: 공황장애", "https://www.mentalhealth.go.kr/portal/disease/diseaseDetail.do?dissId=33&srCodeNm=%EA%B3%B5%ED%99%A9%EC%9E%A5%EC%95%A0"],
  nhsPanic: ["NHS: Panic disorder", "https://www.nhs.uk/mental-health/conditions/panic-disorder/"],
  nhsCbt: ["NHS: Cognitive behavioural therapy", "https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/talking-therapies-and-counselling/cognitive-behavioural-therapy-cbt/overview/"],
  nhsHelp: ["NHS: How to help someone with depression", "https://www.nhs.uk/mental-health/advice-for-life-situations-and-events/how-to-help-someone-with-depression/"],
  niceDepression: ["NICE NG222: Depression in adults", "https://www.nice.org.uk/guidance/ng222"],
  niceAnxiety: ["NICE CG113: Generalised anxiety disorder and panic disorder", "https://www.nice.org.uk/guidance/cg113"],
  mindDbt: ["Mind: Dialectical behaviour therapy", "https://www.mind.org.uk/information-support/drugs-and-treatments/talking-therapy-and-counselling/dialectical-behaviour-therapy-dbt/"],
  emptinessReview: ["PLOS ONE 2020: 만성적 공허감 체계적 문헌고찰", "https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0233970"],
  emptinessStudy: ["2021 공허감 경험 면담 연구", "https://pmc.ncbi.nlm.nih.gov/articles/PMC8351135/"],
  emptinessAcross: ["Journal of Clinical Psychology 2024: 진단을 넘나드는 공허감", "https://onlinelibrary.wiley.com/doi/full/10.1002/jclp.23689"],
  line109: ["자살예방상담전화 109", "https://www.129.go.kr/109"],
  line1577: ["전북 정신건강복지센터: 1577-0199 안내", "https://www.jbmhc.or.kr/sub.php?menukey=99"],
  amcFaq: ["서울아산병원 정신건강의학과: 자주 묻는 질문", "https://www.amc.seoul.kr/asan/depts/psy/K/content.do?menuId=3472"],
  amcColumn: ["서울아산병원: 치료 사실이 알려질까요", "https://www.amc.seoul.kr/asan/depts/mind/K/bbsDetail.do?menuId=4548&contentId=259513"],
  voucher: ["보건복지부: 2026년 심리상담 바우처 지침", "https://www.mohw.go.kr/board.es?mid=a10409020000&bid=0026&list_no=1488771&act=view"],
  voucherLocal: ["하남시 보건소: 심리상담 바우처 안내", "https://www.hanam.go.kr/health/contents.do?key=13057"],
  voucherSeoul: ["서울특별시: 심리상담 지원사업 안내", "https://news.seoul.go.kr/welfare/archives/562723"],
  line1577Seoul: ["서울특별시: 정신건강 위기상담 전화 1577-0199", "https://news.seoul.go.kr/welfare/archives/561837"],
  teen1388: ["복지로: 청소년상담 1388", "https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1307645_1118.html"],
  madeullan: ["연제구정신건강복지센터: 자살예방 SNS 상담 마들랜 안내", "https://ymhc.or.kr/sub.php?id=notice&mode=view&menukey=17&idx=437&page=1"],
  prevalence: ["e-나라지표: 성인 정신장애 평생 유병률", "https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?idx_cd=1441"],
  attitude2024: ["보건복지부: 2024년 국민 정신건강 지식 및 태도 조사", "https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1482175&nPage=1"],
  safetyStudy: ["JAMA Psychiatry 2018: 안전 계획과 후속 연락 연구", "https://doi.org/10.1001/jamapsychiatry.2018.1776"],
  safetyPlan: ["Stanley-Brown Safety Plan", "https://suicidesafetyplan.com/"]
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

const source = (...keys) => `
  <p class="guide-source">출처: ${keys.map(k => `
    <a href="${SOURCES[k][1]}" target="_blank" rel="noopener noreferrer">${SOURCES[k][0]}</a>
  `).join(" · ")}</p>
`;

const list = items => `<ul class="guide-list">${items.map(x => `<li>${x}</li>`).join("")}</ul>`;

const head = (title, lead) => `
  <h1 class="page-title">${title}</h1>
  <p class="lead">${lead}</p>
`;

const notMedical = `
  <div class="notice">
    이 안내는 진단이나 치료를 대신하지 않아요.
    나의 상태와 치료는 정신건강의학과 전문의나 전문 상담자와 함께 확인해 주세요.
  </div>
`;

const crisisLines = `
  <ul class="crisis-lines">
    <li>
      <span>자살예방 상담 (24시간)</span>
      <span class="line-actions"><a href="tel:109">전화 109</a><a href="sms:109">문자</a></span>
    </li>
    <li>
      <span>정신건강 위기상담 (24시간)</span>
      <span class="line-actions"><a href="tel:15770199">1577-0199</a></span>
    </li>
    <li>
      <span>청소년상담 (24시간, 9~24세)<small>휴대폰으로 걸 때는 지역번호를 붙여요. 예: 서울 02-1388</small></span>
      <span class="line-actions"><a href="tel:021388">전화 02-1388</a><a href="sms:1388">문자</a></span>
    </li>
  </ul>
  <p>말하기 어렵다면 문자나 카카오톡 <strong>마들랜</strong>(24시간)으로 시작해도 돼요. 당장 위험하다면 112 또는 119에 연락하세요.</p>
`;

// 지금 힘든 사람이 자기 상태를 고르면 바로 할 일만 보여 준다.
const CALM_CHOICES = [
  ["die", "죽고 싶은 생각이 들어요"],
  ["panic", "숨이 막히고 무서워요"],
  ["empty", "아무것도 느껴지지 않아요"],
  ["nobody", "말할 사람이 없어요"]
];

function calmReply(id, hasPlan) {
  const planButton = `<button class="btn secondary" data-go="safety" type="button">${hasPlan ? "내 안전 계획 열기" : "내 안전 계획 만들기"}</button>`;

  const replies = {
    die: `
      <p class="hand">말해 줘서 고마워요.</p>
      <p>그런 생각이 든다고 해서 당신이 이상하거나 나쁜 사람인 건 아니에요. 혼자 버티지 않아도 돼요. 그대로 말해도 괜찮아요.</p>
      <div class="button-row">
        <a class="btn" href="tel:109">109에 전화하기</a>
        <a class="btn secondary" href="sms:109">109에 문자하기</a>
        ${planButton}
      </div>
      <p class="reply-note"><strong>이미 몸을 다쳤거나 곧 해칠 것 같다면 지금 119에 연락해 주세요.</strong> 할 수 있다면 위험한 물건에서 떨어지고, 다른 사람 곁으로 가 주세요.</p>
    `,
    panic: `
      <p class="hand">지금 정말 무섭죠. 대개 지나가요.</p>
      ${list([
        "할 수 있다면 그 자리에 머물러요.",
        "천천히, 깊게 숨을 쉬어요.",
        "지나갈 거라고 스스로에게 말해 줘요."
      ])}
      <div class="button-row">
        <button class="btn" data-scroll="restCard" type="button">함께 숨 고르기</button>
      </div>
      <p class="reply-note"><strong>처음 겪는 증상이거나, 가슴 통증이나 호흡곤란이 심해 걱정되면 119에 연락하세요.</strong> 다른 원인일 수도 있어요.</p>
      ${source("nhsPanic")}
    `,
    empty: `
      <p class="hand">설명하지 못해도 괜찮아요.</p>
      <p>느껴지지 않는 것도 힘든 일이에요. 지금 뭔가 느껴 보려고 애쓰지 않아도 돼요. 원한다면 하나만 골라 보세요.</p>
      ${list([
        "물 한 컵 마시기",
        "창문을 열거나 잠깐 밖의 공기 쐬기",
        "누군가에게 \"나 요즘 좀 힘들어\" 한 줄 보내기"
      ])}
      <div class="button-row">
        <button class="btn secondary" data-go="reach" type="button">보낼 말 골라 보기</button>
        <button class="btn ghost" data-go="understand" type="button">공허감에 대해 읽어 보기</button>
      </div>
      <p class="reply-note">오래가거나 나를 해치고 싶은 마음으로 이어진다면 혼자 안고 있지 말아 주세요. 위에 있는 109는 24시간 열려 있어요.</p>
    `,
    nobody: `
      <p class="hand">아는 사람이 아니어도 돼요.</p>
      <p>모르는 사람이라서 오히려 편하게 말할 수 있을 때도 있어요. 잘 설명하지 못해도 괜찮아요.</p>
      ${list([
        "<strong>문자:</strong> 109로 문자를 보내면 상담원과 연결돼요.",
        "<strong>카카오톡:</strong> 돋보기를 눌러 '마들랜'을 검색한 뒤 말풍선을 눌러요. 365일 24시간이에요.",
        "<strong>앱:</strong> 앱 마켓에서 '마들랜'을 내려받아 가입한 뒤 이용해요."
      ])}
      <div class="button-row">
        <a class="btn" href="sms:109">109에 문자하기</a>
        <button class="btn secondary" data-go="reach" type="button">첫마디 골라 보기</button>
      </div>
      ${source("madeullan")}
    `
  };

  return replies[id] ? `<div class="calm-reply">${replies[id]}</div>` : "";
}

// 내 안전 계획: Stanley-Brown 안전 계획의 순서를 참고해 쉬운 말로 다시 썼다.
const SAFETY_STEPS = [
  ["signs", "힘들어지기 시작한다는 신호", "어떤 생각, 기분, 상황이 오면 위험해지기 시작하나요?", "예: 잠을 며칠 못 잤을 때, 다 끝났다는 생각이 들 때"],
  ["alone", "혼자서도 할 수 있는 일", "다른 사람 없이도 마음을 잠깐 돌릴 수 있는 일이에요.", "예: 샤워하기, 산책, 좋아하는 노래 듣기"],
  ["places", "마음을 돌릴 수 있는 사람과 장소", "힘들다고 말하지 않아도 돼요. 그냥 같이 있을 수 있으면 돼요.", "예: 동네 카페, 친구 ○○와 게임하기"],
  ["people", "힘들다고 말할 수 있는 사람과 연락처", "한 사람이면 충분해요. 떠오르지 않으면 비워 둬도 돼요.", "예: 언니 010-0000-0000"],
  ["pros", "연락할 전문가와 기관", "109와 1577-0199는 아래에 늘 적혀 있어요. 다니는 병원이나 상담 선생님이 있다면 적어 주세요.", "예: ○○정신건강의학과 02-000-0000"],
  ["safe", "주변을 더 안전하게 만드는 방법", "위험해질 수 있는 것과 거리를 두는 방법이에요. 혼자 어렵다면 믿는 사람이나 상담자에게 부탁해도 돼요.", "예: 힘든 날에는 혼자 있지 않기, 믿는 사람에게 맡겨 두기"],
  ["reason", "그래도 나를 붙잡아 주는 것 (선택)", "작아도 괜찮아요. 지금 떠오르지 않으면 비워 둬도 돼요.", "예: 우리 집 고양이, 다음 주에 보기로 한 영화"]
];

function safetyText(plan) {
  const lines = SAFETY_STEPS
    .filter(([key]) => String(plan[key] || "").trim())
    .map(([key, title]) => `${title}\n${String(plan[key]).trim()}`);

  return [
    "내 안전 계획",
    ...lines,
    "자살예방 상담 109 (전화, 문자 24시간)\n정신건강 위기상담 1577-0199 (24시간)\n당장 위험하면 119 또는 112"
  ].join("\n\n");
}

function safety(data) {
  const plan = data.safetyPlan || {};
  const filled = SAFETY_STEPS.filter(([key]) => String(plan[key] || "").trim());

  return `
    ${head(
      "내 안전 계획",
      "견디기 어려운 순간에는 무엇을 해야 할지 떠올리기 어려워요. 조금 괜찮을 때 미리 적어 두는 나만의 짧은 메모예요."
    )}

    ${filled.length ? `
      <section class="crisis-card" id="safetyView">
        <p><strong>힘들어지면 위에서부터 차례로 해 보세요. 언제든 건너뛰고 바로 전화해도 돼요.</strong></p>
        <ol class="plan-list">
          ${filled.map(([key, title]) => `
            <li><strong>${title}</strong><span>${esc(plan[key])}</span></li>
          `).join("")}
        </ol>
        ${crisisLines}
        <div class="button-row">
          <button class="btn secondary small" id="copySafety" type="button">계획 복사하기</button>
        </div>
        <p class="muted small-text plan-tip">화면을 사진으로 찍어 두거나, 믿는 사람이나 상담 선생님과 나눠도 좋아요.</p>
      </section>
    ` : `
      <div class="notice">
        <strong>지금 많이 위험하다면 적지 않아도 돼요.</strong> 먼저 <a class="tel-link" href="tel:109">109에 전화</a>하거나 <a class="tel-link" href="sms:109">문자</a>를 보내 주세요. 다 채우지 않아도 괜찮아요.
      </div>
    `}

    <section class="card guide-section">
      <div class="form-actions">
        <h2 class="guide-h2">${filled.length ? "계획 고치기" : "하나씩 적어 보기"}</h2>
        <span class="save-status" id="safetyStatus">쓰는 대로 내 기기에 저장돼요</span>
      </div>
      <form id="safetyForm">
        ${SAFETY_STEPS.map(([key, title, hint, placeholder], i) => `
          <div class="field">
            <label for="plan-${key}">${i + 1}. ${title}</label>
            <span class="hint">${hint}</span>
            <textarea id="plan-${key}" name="${key}" placeholder="${placeholder}">${esc(plan[key] || "")}</textarea>
          </div>
        `).join("")}
        <button class="btn" type="submit">계획 저장하기</button>
      </form>
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">이 계획에 대해</h2>
      <p>자살 위기를 다루는 Stanley-Brown 안전 계획의 순서를 참고해 쉬운 말로 옮겼어요. 응급실 환자를 비교한 2018년 연구에서는 전문가와 안전 계획을 세우고 후속 전화를 받은 사람들의 6개월 내 자살 행동이 더 적었어요(3.03%, 일반 진료 5.29%).</p>
      <div class="notice">
        그 연구는 전문가와 함께한 경우이고, 이 앱으로 혼자 만든 계획을 시험한 것은 아니에요. 가능하다면 상담자나 의사와 함께 살펴봐 주세요. 이 계획이 전문가의 도움을 대신하지는 않아요.
      </div>
      ${source("safetyPlan", "safetyStudy")}
    </section>
  `;
}

const FIRST_WORDS = [
  ["가까운 사람에게", "요즘 많이 힘들어. 해결해 주지 않아도 되는데, 그냥 조금 들어 줄 수 있어?"],
  ["자세히 말하기 어려울 때", "요즘 내가 좀 안 좋아. 자세히는 아직 말 못 하겠는데, 네가 알고 있어 줬으면 해서."],
  ["같이 가 달라고 할 때", "병원이나 상담을 한번 가 보려고 하는데 혼자는 좀 무서워. 같이 가 줄 수 있어?"],
  ["죽고 싶은 생각까지 들 때", "요즘 죽고 싶다는 생각까지 들어. 무슨 일을 하겠다는 말은 아니어도, 혼자 들고 있기가 너무 힘들어."],
  ["상담 전화나 문자에", "어디서부터 말해야 할지 모르겠어요. 요즘 너무 힘들어서 연락했어요."],
  ["병원 예약 전화에", "처음 진료를 받고 싶어서요. 요즘 잠을 잘 못 자고 마음이 많이 힘들어요. 예약하려면 어떻게 하면 될까요?"]
];

const CLINIC_FIELDS = [
  ["since", "언제부터 힘들었나요?", "예: 올봄부터, 석 달쯤"],
  ["worst", "가장 힘든 것은 무엇인가요?", "예: 아침에 일어나기가 어렵고 이유 없이 눈물이 나요"],
  ["body", "잠, 식사, 몸은 어떤가요?", "예: 새벽 4시까지 잠을 못 자요. 입맛이 없어요"],
  ["life", "일상에서 달라진 것이 있나요?", "예: 회사를 자주 빠져요. 사람을 안 만나요"],
  ["thoughts", "죽고 싶은 생각이나 나를 해치고 싶은 마음이 있나요?", "말로 꺼내기 어려우면 여기에 적어 보여 줘도 돼요"],
  ["meds", "먹는 약이나 다니는 병원이 있나요?", "예: 없음, 또는 약 이름"],
  ["ask", "묻고 싶은 것이 있나요?", "예: 약을 꼭 먹어야 하나요? 얼마나 다녀야 하나요?"]
];

function clinicText(note) {
  const lines = CLINIC_FIELDS
    .filter(([key]) => String(note[key] || "").trim())
    .map(([key, title]) => `${title}\n${String(note[key]).trim()}`);

  return lines.length ? ["진료 메모", ...lines].join("\n\n") : "";
}

function reach(data) {
  const note = data.clinicNote || {};

  return `
    ${head(
      "말 꺼내는 법",
      "첫마디가 가장 어려워요. 잘 설명하지 않아도 되고, 아래 문장을 그대로 보내도 돼요."
    )}

    <section class="guide-section">
      <h2 class="guide-h2">그대로 보내도 되는 첫마디</h2>
      <div class="grid grid-2">
        ${FIRST_WORDS.map(([title, text]) => `
          <article class="card word-card">
            <h3 class="guide-h3">${title}</h3>
            <p>${text}</p>
            <button class="btn secondary small" data-copy-text="${esc(text)}" type="button">복사하기</button>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">기대와 다른 대답이 돌아오면</h2>
      <p>말을 꺼내기까지 정말 많은 힘이 들었을 거예요. 가까운 사람도 어떻게 답할지 몰라서 서툴게 말할 수 있어요. 그 한 사람의 대답이 당신의 힘듦을 정하지는 않아요. 다른 사람이나 <a class="tel-link" href="sms:109">109 문자</a>, 카카오톡 마들랜에 다시 말해도 괜찮아요.</p>
      <div class="button-row">
        <button class="btn ghost small" data-go="allies" type="button">곁에 있는 사람에게 이 안내 보여 주기</button>
      </div>
    </section>

    <section class="card guide-section">
      <div class="form-actions">
        <h2 class="guide-h2">병원이나 상담에 가져갈 메모</h2>
        <span class="save-status" id="clinicStatus">쓰는 대로 내 기기에 저장돼요</span>
      </div>
      <p>막상 앞에 앉으면 말이 안 나올 수 있어요. 적을 수 있는 것만 적어서 화면을 그대로 보여 줘도 돼요.</p>
      <form id="clinicForm">
        ${CLINIC_FIELDS.map(([key, title, placeholder]) => `
          <div class="field">
            <label for="note-${key}">${title}</label>
            <textarea id="note-${key}" name="${key}" placeholder="${placeholder}">${esc(note[key] || "")}</textarea>
          </div>
        `).join("")}
      </form>
      <h3 class="guide-h3">보여 줄 메모</h3>
      <div class="clinic-preview" id="clinicPreview">${esc(clinicText(note)) || "적으면 여기에 한 장으로 모여요."}</div>
      <div class="button-row">
        <button class="btn secondary small" id="copyClinic" type="button">메모 복사하기</button>
        <button class="btn ghost small" data-go="help" type="button">어디로 가면 되나요</button>
      </div>
    </section>
  `;
}

function supportCard() {
  return `
    <section class="crisis-card support-card" id="supportCard" tabindex="-1">
      <p><strong>방금 쓴 글에 무거운 말이 있었어요.</strong></p>
      <p>글은 저장만 됐고 아무에게도 가지 않았어요. 혹시 지금 많이 힘들다면, 혼자 들고 있지 않아도 돼요.</p>
      <div class="button-row">
        <a class="btn" href="tel:109">109에 전화하기</a>
        <a class="btn secondary" href="sms:109">109에 문자하기</a>
        <button class="btn secondary" data-go="safety" type="button">내 안전 계획</button>
        <button class="btn ghost" id="supportClose" type="button">괜찮아요, 닫기</button>
      </div>
    </section>
  `;
}

function keepSafe() {
  return `
    <section class="card guide-section" id="keepSafe">
      <h2 class="guide-h2">기록을 오래 지키려면</h2>
      <p>기록은 이 브라우저에만 있어서 기기를 바꾸거나 사이트 데이터를 지우면 사라져요. 특히 iPhone의 Safari는 한동안 쓰지 않은 사이트의 데이터를 지울 수 있어요.</p>
      ${list([
        "<strong>iPhone:</strong> Safari의 공유 버튼에서 '홈 화면에 추가'",
        "<strong>Android:</strong> Chrome 메뉴에서 '앱 설치' 또는 '홈 화면에 추가'",
        "<strong>가끔 백업:</strong> 아래 '데이터 백업하기'로 파일을 만들어 안전한 곳에 두세요. 파일은 암호화되지 않아요."
      ])}
      <button class="btn secondary hidden" id="installApp" type="button">이 기기에 앱으로 추가하기</button>
    </section>
  `;
}

const sayings = [
  "울고 싶으면 울어도 돼요. 그만큼 많이 참았다는 거니까요.",
  "실컷 울고 나면, 어디로든 천천히 다시 걸어가면 돼요.",
  "오늘 일어나고, 씻고, 밥을 먹었다면 정말 큰 일을 한 거예요.",
  "남들이 뭐라고 해도, 뭐라도 해 보려는 당신이 대견해요.",
  "포기하지 않아 줘서 고마워요.",
  "원래 그런 인생은 없어요. 사는 방법은 정말 다양해요."
];

function calm(data) {
  const hasPlan = Object.values(data?.safetyPlan || {}).some(x => String(x).trim());

  return `
    <div class="calm">
      <p class="calm-permission">아무것도 하지 않아도 돼요. 여기 잠시 있어도 돼요.</p>
      <div class="calm-quick">
        <a class="btn" href="tel:109">109 전화</a>
        <a class="btn secondary" href="sms:109">109 문자</a>
        ${hasPlan ? `<button class="btn secondary" data-go="safety" type="button">내 안전 계획</button>` : ""}
      </div>
      <p class="calm-saying" id="calmSaying" aria-live="polite">${sayings[0]}</p>
      <button class="btn secondary" id="nextSaying" type="button">다른 말 듣기</button>
    </div>

    <section class="card calm-choose">
      <h2 class="guide-h2">지금 어떤 쪽에 가까운가요?</h2>
      <p class="muted small-text">고르지 않아도 돼요. 무엇을 골랐는지 저장되지 않아요.</p>
      <div class="choice-list">
        ${CALM_CHOICES.map(([id, label]) => `
          <button class="choice-button" data-calm="${id}" aria-pressed="false" type="button">${label}</button>
        `).join("")}
      </div>
      <div id="calmReply" aria-live="polite"></div>
    </section>

    <section class="crisis-card">
      <p><strong>혼자 견디기 어렵다면, 지금 연락해도 괜찮아요.</strong></p>
      ${crisisLines}
      ${source("line109", "line1577Seoul", "teen1388", "madeullan")}
    </section>

    <section class="rest-card" id="restCard">
      <svg class="rest-scene" viewBox="0 0 640 220" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="lanternLight">
            <stop offset="0" stop-color="#ffcf87" stop-opacity="0.75"></stop>
            <stop offset="1" stop-color="#ffcf87" stop-opacity="0"></stop>
          </radialGradient>
        </defs>
        <circle cx="520" cy="130" r="118" fill="url(#lanternLight)"></circle>
        <path d="M0 190 C120 150 280 158 400 178 C490 192 570 184 640 170 V220 H0 Z" fill="#26365d"></path>
        <circle cx="96" cy="52" r="20" fill="#f6e5bd"></circle>
        <circle cx="105" cy="46" r="17" fill="#16203f"></circle>
        <path d="M0 128 C70 104 150 118 240 106 C330 94 430 124 640 110 V170 H0 Z" fill="#1d2a4d"></path>
        <path d="M506 98 H534 L538 106 H502 Z M506 156 H534 V162 H506 Z" fill="#3c3a5e"></path>
        <rect x="508" y="106" width="24" height="50" rx="4" fill="#ffd590"></rect>
        <path d="M520 88 C512 88 512 98 512 98 M520 88 C528 88 528 98 528 98" fill="none" stroke="#3c3a5e" stroke-width="2.5"></path>
      </svg>

      <div class="rest-body">
        <h2 class="guide-h2">천천히 숨 골라 보기</h2>
        <p class="muted small-text">원할 때만 해 보세요. 어지럽거나 불편하면 바로 멈추고 편하게 숨 쉬면 돼요.</p>

        <div class="breath-row">
          <div class="breath-orb" id="breathOrb" aria-hidden="true"></div>
          <p class="breath-cue" id="breathCue">버튼을 누르면 시작해요</p>
        </div>

        <div class="rest-controls">
          <button class="rest-toggle" id="restToggle" type="button" aria-pressed="false" aria-label="숨 고르기 시작하기">▶</button>
          <div class="rest-track">
            <div class="progress"><span id="restProgress"></span></div>
            <span class="rest-time" id="restTime"></span>
          </div>
        </div>

        <button class="btn ghost small" id="soundToggle" type="button" aria-pressed="false">잔잔한 소리 켜기</button>
      </div>
    </section>

    <div class="grid grid-2 calm-options">
      <section class="card">
        <h2 class="guide-h2">쓰고 싶을 때만</h2>
        <p class="muted small-text">이 칸의 글은 어디에도 저장되지 않아요. 안 써도 괜찮아요.</p>
        <div class="field">
          <textarea id="looseWords" aria-label="저장되지 않는 글쓰기 칸" placeholder="아무 말이나 적어도 돼요."></textarea>
        </div>
        <button class="btn ghost small" id="clearWords" type="button">지우기</button>
      </section>

      <section class="card">
        <h2 class="guide-h2">조금 더 필요하다면</h2>
        <div class="button-column">
          <button class="btn ghost" data-go="understand" type="button">공황이 왔을 때 알아두면 좋은 것</button>
          <button class="btn ghost" data-go="reach" type="button">누군가에게 말 꺼내 보기</button>
          <button class="btn ghost" data-go="safety" type="button">내 안전 계획 만들기</button>
          <button class="btn ghost" data-go="help" type="button">어디에 도움을 요청할 수 있나요</button>
        </div>
      </section>
    </div>
  `;
}

function understand() {
  return `
    ${head(
      "마음 알아보기",
      "우울, 불안과 공황, 공허감은 약하거나 게을러서 생기는 일이 아니에요. 원인도 모습도 사람마다 달라요."
    )}
    ${notMedical}

    <section class="card guide-section not-alone">
      <h2 class="guide-h2">당신만 이런 게 아니에요</h2>
      ${list([
        "한국 성인의 <strong>27.8%</strong>, 4명 중 1명 넘게 평생 한 번 이상 정신장애를 겪어요. (2021년 조사, 만 18~79세. 우울장애, 불안장애, 알코올과 니코틴 사용장애 포함)",
        "2024년 조사에서 15~69세 응답자의 <strong>73.6%</strong>가 지난 1년 동안 정신건강 문제를 경험했다고 답했어요. 모두 병을 진단받았다는 뜻은 아니에요."
      ])}
      <p>말하지 않아서 보이지 않을 뿐, 많은 사람이 비슷한 시간을 지나고 있어요.</p>
      ${source("prevalence", "attitude2024")}
    </section>

    <section class="card guide-section" id="depression">
      <h2 class="guide-h2">우울</h2>
      <p>잠깐 기분이 가라앉는 것과 달리, 일상을 꾸려 가기 어려워질 만큼 이어질 수 있어요. 이런 모습으로 나타나기도 해요.</p>
      ${list([
        "슬픔, 공허함, 절망감. 짜증이 늘기도 해요.",
        "좋아하던 일에 흥미나 즐거움을 느끼기 어려워요.",
        "잠을 못 자거나 너무 많이 자고, 쉽게 지쳐요.",
        "식욕과 체중이 변하고, 집중하기 어려워요.",
        "내가 쓸모없게 느껴지거나 죄책감이 들어요.",
        "설명되지 않는 몸의 통증이 이어져요.",
        "죽음이나 자살에 대한 생각이 반복돼요."
      ])}
      <p>정확한 원인은 하나로 말할 수 없고, 몸과 뇌의 변화, 가족력, 어린 시절의 상처, 상실과 경제적 어려움 같은 일이 함께 영향을 줄 수 있어요. <strong>검사 하나로 판단하지 않고 전문의가 종합적으로 살펴봐요.</strong></p>
      ${source("portalDepression")}
    </section>

    <section class="card guide-section" id="panic">
      <h2 class="guide-h2">불안과 공황</h2>
      <p>공황발작은 갑자기 극심한 공포가 밀려와 몇 분 안에 가장 심해지는 일이에요. 심장이 뛰고, 땀이 나고, 몸이 떨리고, 숨이 막히고, 가슴이 아프고, 어지럽고, 죽을 것 같은 두려움이 들 수 있어요.</p>
      <p>정말 무서운 경험이지만, NHS(영국 공공의료)는 공황발작 자체는 위험하지 않고 몸에 해를 주지 않는다고 설명해요. 불편함은 대개 30분 안에 가라앉아요.</p>
      <div class="notice">
        <strong>처음 겪거나 평소와 다른 증상이라면 진료를 받아 주세요.</strong>
        심장, 폐, 호르몬 문제 같은 다른 원인으로도 비슷한 증상이 나타날 수 있어요.
        가슴 통증이나 호흡곤란이 심해 걱정되면 119에 연락하세요.
      </div>
      <h3 class="guide-h3">공황이 왔을 때 (NHS 안내)</h3>
      ${list([
        "할 수 있다면 그 자리에 머물러요.",
        "천천히, 깊게 숨을 쉬어요.",
        "지나갈 거라고 스스로에게 말해 줘요.",
        "편안하게 느껴지는 장면을 떠올려요."
      ])}
      <p>발작이 반복되고, 또 올까 봐 계속 걱정하거나 익숙한 곳을 피하게 되면 공황장애일 수 있어요. 공황장애는 치료를 받을 수 있는 병이에요.</p>
      ${source("portalPanic", "nhsPanic")}
    </section>

    <section class="card guide-section" id="emptiness">
      <h2 class="guide-h2">공허감</h2>
      <p>슬픈 것과도 조금 달라요. 연구에 참여한 사람들은 공허감을 아무것도 느껴지지 않는 것, 나 자신과 다른 사람들로부터 끊어진 느낌, 삶의 목적을 잃은 느낌으로 설명했어요. 사람들 곁에 있어도 그렇게 느낄 수 있어요.</p>
      ${list([
        "말로 설명하기가 정말 어려운 감정이에요. 잘 설명하지 못해도 괜찮아요.",
        "바쁘지 않을 때, 하루가 끝날 무렵 더 또렷해지기도 해요.",
        "우울증과 경계성 성격장애에서 함께 보고되지만, 공허감이 있다고 어떤 병이라는 뜻은 아니에요."
      ])}
      <div class="notice">
        공허감만을 위한 치료법은 아직 연구가 부족해요. 정의와 측정도 연구자마다 달라요.
        그래도 혼자 안고 있을 일은 아니에요. 공허감이 오래가거나 나를 해치고 싶은 마음으로 이어진다면 전문가에게 그대로 말해 주세요.
      </div>
      ${source("emptinessReview", "emptinessStudy", "emptinessAcross")}
    </section>
  `;
}

function care() {
  return `
    ${head(
      "어떤 치료가 있나요",
      "실제로 쓰이는 치료를 정리했어요. 나에게 맞는 치료는 사람마다 달라서, 전문가와 함께 고르면 돼요."
    )}
    ${notMedical}

    <section class="guide-section">
      <h2 class="guide-h2">심리치료</h2>
      <div class="grid grid-2">
        <article class="card">
          <h3 class="guide-h3">인지행동치료 (CBT)</h3>
          <p>어려운 상황에서 드는 생각, 감정, 행동의 연결을 살피고, 피하던 일을 조금씩 해 보는 치료예요. 우울과 불안, 공황에 널리 쓰여요. 영국 NHS 기준으로 보통 5~15회 진행하고, 회기 사이의 연습이 중요해요.</p>
        </article>
        <article class="card">
          <h3 class="guide-h3">행동활성화</h3>
          <p>우울할 때 줄어든 활동을 작은 것부터 다시 늘려 가는 치료예요. 영국 NICE 지침은 CBT와 함께 효과가 좋은 선택으로 다뤄요.</p>
        </article>
        <article class="card">
          <h3 class="guide-h3">대인관계치료 (IPT)</h3>
          <p>기분과 관계에서 일어난 일의 연결을 살피고, 관계의 어려움을 다뤄요. 우울증에 쓰이는 치료예요.</p>
        </article>
        <article class="card">
          <h3 class="guide-h3">마음챙김 기반 인지치료 (MBCT)</h3>
          <p>생각과 감정을 알아차리는 연습을 인지치료와 함께 해요. NICE 지침의 우울증 치료 선택지에 들어 있어요.</p>
        </article>
        <article class="card">
          <h3 class="guide-h3">변증법적 행동치료 (DBT)</h3>
          <p>감정을 아주 강하게 느끼는 사람을 위해 CBT를 바탕으로 만들어졌어요. 나를 받아들이는 일과 변화를 함께 다루고, 감정을 견디고 조절하는 기술을 배워요.</p>
        </article>
        <article class="card">
          <h3 class="guide-h3">이완 훈련과 노출</h3>
          <p>공황 치료에서는 공황에 대한 잘못된 믿음을 바로잡고, 두려운 상황에 천천히 다가가는 연습을 해요. 호흡법과 근육 이완을 함께 하기도 해요.</p>
        </article>
      </div>
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">약물치료</h2>
      ${list([
        "<strong>항우울제</strong>는 우울뿐 아니라 공황과 불안에도 쓰여요. 효과는 천천히 나타나서, 판단하려면 몇 주가 걸려요.",
        "<strong>항불안제(벤조디아제핀 계열)</strong>는 효과가 빠르지만 내성과 의존 위험이 있어 의사의 관리 아래 단기간 사용해요.",
        "<strong>좋아져도 일정 기간 유지해요.</strong> 공황장애는 6~12개월, 우울증은 재발 위험에 따라 더 길게 유지하기도 해요.",
        "<strong>혼자 끊거나 줄이지 마세요.</strong> 갑자기 끊으면 금단 증상이나 악화가 올 수 있어요. 줄이고 싶을 때는 의사에게 그대로 말해 주세요."
      ])}
      ${source("portalDepression", "portalPanic")}
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">치료를 고를 때</h2>
      ${list([
        "우울증에는 약물과 심리치료를 함께 받는 경우가 많고, 심리치료만 받기도 해요. 영국 NICE 지침은 증상의 심한 정도와 본인의 선호를 함께 고려해 고르도록 해요.",
        "첫 치료가 안 맞아도 실패가 아니에요. 횟수를 늘리거나 다른 치료로 바꿀 수 있어요.",
        "약물치료가 어렵거나 자살 위험이 높을 때 전기경련요법(ECT)을 쓰기도 해요. 자기 펄스로 뇌를 자극하는 경두개자기자극술(TMS)도 있어요."
      ])}
      ${source("niceDepression", "niceAnxiety", "nhsCbt", "mindDbt", "portalDepression")}
    </section>
  `;
}

function help() {
  return `
    ${head(
      "도움받는 법",
      "어디서부터 시작할지 몰라도 괜찮아요. 잘 설명하지 못해도 괜찮아요."
    )}

    <section class="crisis-card">
      <p><strong>지금 위험하거나 혼자 있기 어렵다면</strong></p>
      ${crisisLines}
      ${source("line109", "line1577", "line1577Seoul", "teen1388")}
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">전화가 어렵다면</h2>
      <p>목소리를 내기 힘들어도 괜찮아요. 글로 시작할 수 있어요.</p>
      ${list([
        "<strong>마들랜(자살예방 SNS 상담, 365일 24시간):</strong> 카카오톡에서 돋보기를 눌러 '마들랜'을 검색해 말풍선을 누르거나, 앱을 내려받아 가입한 뒤 이용해요. 109로 문자를 보내도 상담원과 연결돼요.",
        "<strong>청소년상담 1388(9~24세, 365일 24시간):</strong> 1388로 문자를 보내거나, 카카오톡에서 '청소년상담1388' 채널을 추가해 고민을 보내요."
      ])}
      <div class="button-row">
        <a class="btn secondary" href="sms:109">109에 문자하기</a>
        <button class="btn ghost" data-go="reach" type="button">첫마디 골라 보기</button>
      </div>
      ${source("madeullan", "teen1388")}
    </section>

    <section class="grid grid-2 guide-section">
      <article class="card">
        <h2 class="guide-h2">정신건강의학과</h2>
        <p>진단과 약물치료를 받을 수 있어요. 증상이 심하거나 잠, 식사, 일상이 무너지고 있다면 먼저 찾아가 보세요.</p>
        <p class="muted small-text">"언제부터 어떤 일이 힘든지" 메모 한 줄이면 충분해요.</p>
        <button class="btn ghost small" data-go="reach" type="button">진료 메모 만들기</button>
      </article>
      <article class="card">
        <h2 class="guide-h2">정신건강복지센터</h2>
        <p>지역 주민을 위한 공공 기관이에요. 상담과 정보를 받을 수 있고, 내 지역 센터는 1577-0199나 국가정신건강정보포털에서 찾을 수 있어요.</p>
        <p class="muted small-text">이용 조건은 센터마다 달라서 전화로 먼저 물어보세요.</p>
      </article>
      <article class="card">
        <h2 class="guide-h2">심리상담 바우처</h2>
        <p>정부가 심리상담 비용을 지원하는 사업이에요. 2026년 기준 1:1 대면 상담 8회를 120일 안에 이용할 수 있고, 소득에 따라 본인 부담금이 달라요. 복지로나 주소지 행정복지센터에서 신청해요.</p>
        <p>정신건강복지센터나 대학교 상담센터 등의 의뢰서, 정신건강의학과 진단서나 소견서, 또는 국가건강검진 우울 선별검사 결과 등이 필요해요. 사설 상담센터의 의뢰서는 인정되지 않아요.</p>
        <p class="muted small-text">신청은 1년에 1번이고, 예산이 소진되면 일찍 마감될 수 있어요. 해가 바뀌면 기준이 달라질 수 있으니 보건복지상담센터 129에 먼저 물어보세요. 급한 자살 위기에는 진료가 먼저예요.</p>
        ${source("voucher", "voucherLocal", "voucherSeoul")}
      </article>
      <article class="card">
        <h2 class="guide-h2">청소년이라면</h2>
        <p>9~24세라면 1388에서 24시간 무료로 상담받을 수 있어요. 휴대폰으로 걸 때는 지역번호를 붙이고(예: 02-1388), 문자는 1388로 보내면 돼요. 믿을 수 있는 보호자나 선생님, 학교 상담 선생님에게 말하는 것도 좋은 시작이에요.</p>
      </article>
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">진료 기록이 걱정된다면</h2>
      <p>걱정 때문에 치료를 미루는 분이 많아요. 서울아산병원 정신건강의학과는 이렇게 안내해요.</p>
      ${list([
        "진료 기록은 본인 동의 없이 공개되지 않고, 가까운 가족도 볼 수 없어요. 본인 동의나 법원 결정 같은 경우는 예외예요.",
        "회사는 진료 기록을 볼 수 없고, 공무원 임용 시험에서도 사용되지 않아요.",
        "건강보험으로 진료하면 건강보험공단과 심사평가원에도 자료가 남지만, 법적 근거 없는 조회는 금지돼 있어요.",
        "민간 보험은 회사마다 기준이 달라요. 치료 중이거나 끝낸 지 얼마 안 됐다면 가입이 거절될 수 있어요. 궁금하면 가입 전에 보험사에 확인해 주세요."
      ])}
      ${source("amcFaq", "amcColumn")}
    </section>
  `;
}

function allies() {
  return `
    ${head(
      "곁에 있는 사람에게",
      "고쳐 주지 않아도 괜찮아요. 곁에 있어 주는 것만으로 큰 힘이 돼요."
    )}

    <div class="grid grid-2">
      <section class="card guide-section">
        <h2 class="guide-h2">이렇게 말해 주세요</h2>
        ${list([
          "\"요즘 많이 힘들어 보여. 괜찮으면 이야기해 줄래?\"",
          "\"말하지 않아도 괜찮아. 그냥 옆에 있을게.\"",
          "\"네 페이스대로 가면 돼.\"",
          "\"여기까지 오느라 정말 애썼어.\"",
          "\"같이 병원에 가 줄까?\""
        ])}
      </section>
      <section class="card guide-section">
        <h2 class="guide-h2">이런 말은 피해 주세요</h2>
        ${list([
          "\"다들 그렇게 살아.\"",
          "\"마음을 강하게 먹어.\"",
          "\"네가 뭐가 힘들어?\"",
          "\"그만 울어.\"",
          "\"약은 안 먹는 게 좋아.\""
        ])}
      </section>
    </div>

    <section class="card guide-section">
      <h2 class="guide-h2">할 수 있는 일</h2>
      ${list([
        "판단하지 말고 그 사람 그대로 받아들이며 들어 주세요.",
        "연락을 이어 가 주세요. 답이 없어도 짧은 메시지 하나가 닿아요.",
        "상담이나 진료 정보를 대신 찾아 주고, 예약할 때 옆에 있어 주세요.",
        "회복에는 시간이 걸려요. 재촉하지 말고 기다려 주세요.",
        "당신의 마음도 돌봐 주세요. 혼자 다 책임지지 않아도 돼요."
      ])}
      ${source("nhsHelp")}
    </section>

    <section class="crisis-card">
      <p><strong>자살이 걱정된다면 혼자 판단하지 말고 함께 도움을 요청해 주세요.</strong> 곁에 있어 주거나 다른 사람에게 함께 살펴봐 달라고 부탁해 주세요.</p>
      ${crisisLines}
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">이곳을 알려 주고 싶다면</h2>
      <p>가입도 설치도 필요 없어서 링크만 보내면 바로 열려요. 쓴 글은 그 사람의 기기에만 남고, 당신도 볼 수 없어요.</p>
      <button class="btn secondary" data-share type="button">링크 보내기</button>
    </section>
  `;
}

function about() {
  return `
    ${head(
      "이 사이트에 대해",
      "가장 힘든 시간을 혼자 견디는 사람이 줄어들었으면 하는 마음으로 만들었어요."
    )}

    <section class="card guide-section">
      <h2 class="guide-h2">이 사이트가 지키는 약속</h2>
      ${list([
        "가입과 광고가 없고, 무료예요.",
        "지금 그대로의 당신을 평가하지 않아요. 연속 기록이나 남과의 비교로 재촉하지 않아요.",
        "내 기록은 내 기기에만 저장돼요. 서버로 보내지 않아요.",
        "진단하거나 치료를 대신하지 않고, 도움받을 곳을 언제나 보여 줘요.",
        "글을 저장할 때 '죽고 싶다' 같은 말이 있으면 도움받을 곳을 살며시 보여 줘요. 이 확인은 내 기기 안에서만 일어나고, 누구에게도 알려지지 않아요."
      ])}
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">내용은 어떻게 만들었나요</h2>
      <p>공공기관, 진료 지침, 병원, 학술 자료를 쉬운 말로 옮겼고, 각 내용 아래에 출처를 적었어요. 공공 안내는 ${REVIEWED_ON} 기준으로 확인했어요.</p>
      <div class="notice">
        <strong>아직 전문가 검수를 받지 않았어요.</strong>
        숨 고르기 안내도 전문가 검토 전이에요.
        영국 지침은 한국의 의료 제도와 다를 수 있어요. 틀린 내용을 발견하면 진료받는 전문가의 말을 먼저 따라 주세요.
      </div>
    </section>

    <section class="card guide-section">
      <h2 class="guide-h2">전체 출처</h2>
      <ul class="guide-list">
        ${Object.values(SOURCES).map(([name, url]) => `
          <li><a href="${url}" target="_blank" rel="noopener noreferrer">${name}</a></li>
        `).join("")}
      </ul>
    </section>
  `;
}

const hubCard = ([page, icon, title, desc]) => `
  <button class="feature-card" data-go="${page}" type="button">
    <span class="feature-icon">${icon}</span>
    <strong>${title}</strong>
    <small>${desc}</small>
  </button>
`;

function record() {
  return `
    ${head("기록", "쓰고 싶을 때만 쓰면 돼요. 기록은 내 기기에만 저장돼요.")}
    <div class="grid grid-2 guide-section">
      ${[
        ["journal", "▤", "나의 일기", "지금의 나를 그대로 적어요."],
        ["emotion", "♡", "감정 기록", "감정과 강도를 남기고 최근 7일을 돌아봐요."],
        ["thought", "◈", "생각 살피기", "상황과 생각을 나누어 다른 관점을 찾아요."],
        ["future", "✉", "나에게 보내는 편지", "과거, 지금, 미래의 나에게 편지를 남겨요."]
      ].map(hubCard).join("")}
    </div>
  `;
}

function explore() {
  return `
    ${head("탐험", "지금 궁금한 곳부터 천천히 둘러보세요.")}

    <div class="section-head"><div><h2>마음 안내</h2><p>공공기관과 진료 지침을 쉬운 말로 옮겼어요.</p></div></div>
    <div class="grid grid-2">
      ${[
        ["understand", "◐", "마음 알아보기", "우울, 불안과 공황, 공허감"],
        ["care", "✚", "어떤 치료가 있나요", "심리치료와 약물치료"],
        ["help", "☎", "도움받는 법", "어디에 어떻게 연락할까요"],
        ["safety", "☂", "내 안전 계획", "힘든 순간을 위해 미리 적어 두기"],
        ["reach", "❝", "말 꺼내는 법", "첫마디와 진료 메모"],
        ["allies", "♥", "곁에 있는 사람에게", "어떤 말이 힘이 될까요"]
      ].map(hubCard).join("")}
    </div>

    <div class="section-head"><div><h2>나를 알아가기</h2><p>자기 이해를 돕는 질문이에요. 진단 검사는 아니에요.</p></div></div>
    <div class="grid grid-2">
      ${[
        ["know", "✦", "나를 돌아보기", "감정의 흐름과 내가 쓴 말 모아 보기"],
        ["self", "◎", "나를 탐색하기", "나를 이해하기 위한 8가지 질문"],
        ["values", "✧", "나의 가치관", "내 삶에서 중요한 것 고르기"],
        ["career", "⌁", "진로 탐색", "자체 구성한 18문항 흥미 질문"],
        ["action", "↗", "목표와 실천", "큰 목표를 작은 행동으로"]
      ].map(hubCard).join("")}
    </div>

    <div class="guide-section">
      <div class="button-row">
        <button class="btn ghost" data-go="about" type="button">이 사이트에 대해</button>
        <button class="btn ghost" data-share type="button">이곳 알려 주기</button>
      </div>
    </div>
  `;
}

// 오늘의 기분에 따른 답. 기록으로 저장하지 않는다.
const moods = [
  {
    id: "very-hard",
    tone: "heavy",
    label: "매우 힘들어요",
    say: "말해 줘서 고마워요. 지금은 아무것도 하지 않아도 돼요.",
    actions: [["calm", "잠시 여기 있기", ""], ["help", "도움받을 곳 보기", "secondary"], ["reach", "누군가에게 말 꺼내 보기", "secondary"]]
  },
  {
    id: "hard",
    tone: "heavy",
    label: "힘들어요",
    say: "오늘도 정말 애썼어요. 천천히 가도 괜찮아요.",
    actions: [["emotion", "지금 감정 적어 보기", ""], ["calm", "잠시 쉬어가기", "secondary"]]
  },
  {
    id: "so-so",
    tone: "even",
    label: "그저 그래요",
    say: "그런 날도 있어요. 꼭 무언가 하지 않아도 돼요.",
    actions: [["journal", "오늘 한 줄 남기기", "secondary"]]
  },
  {
    id: "okay",
    tone: "even",
    label: "괜찮아요",
    say: "다행이에요. 오늘의 괜찮음도 소중해요.",
    actions: [["self", "나에 대해 알아가기", "secondary"]]
  },
  {
    id: "happy",
    tone: "bright",
    label: "행복해요",
    say: "정말 기뻐요. 오늘의 마음을 미래의 나에게 남겨 볼까요?",
    actions: [["future", "미래의 나에게 편지 쓰기", ""], ["journal", "일기로 남기기", "secondary"]]
  }
];

function moodReply(id) {
  const mood = moods.find(item => item.id === id);

  if (!mood) return "";

  return `
    <div class="mood-reply">
      <p class="hand">${mood.say}</p>
      <div class="button-row">
        ${mood.actions.map(([page, label, style]) => `
          <button class="btn ${style}" data-go="${page}" type="button">${label}</button>
        `).join("")}
      </div>
    </div>
  `;
}

// 홈 첫 장면. 사진을 통째로 넣지 않고 요소별로 그려 글자와 버튼을 따로 둔다.
function heroScene() {
  // 도시의 불빛: 강가에 모였다 흩어지도록 파도 모양으로 배치한다.
  const lights = Array.from({ length: 120 }, (_, i) => {
    const x = (i * 6.7 + Math.sin(i * 1.7) * 9) % 700;
    const y = 279 + Math.sin(i * 0.9) * 4 + Math.sin(i * 2.3) * 3;
    const size = 0.45 + ((i * 7) % 5) * 0.2;
    const opacity = 0.45 + ((i * 3) % 5) * 0.12;

    return `
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(2)}" fill="#ffd9a0" opacity="${opacity.toFixed(2)}"></circle>
      ${i % 5 === 0 ? `<rect x="${x.toFixed(1)}" y="${(y + 7).toFixed(1)}" width="1" height="${8 + (i % 4) * 5}" fill="#ffd9a0" opacity="0.16"></rect>` : ""}
    `;
  }).join("");

  return `
    <svg class="hero-scene" viewBox="0 0 800 400" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#47457c" stop-opacity="0.34"></stop>
          <stop offset="1" stop-color="#10182f" stop-opacity="0"></stop>
        </linearGradient>
        <radialGradient id="dusk">
          <stop offset="0" stop-color="#e7b5a5" stop-opacity="0.5"></stop>
          <stop offset="1" stop-color="#77739f" stop-opacity="0"></stop>
        </radialGradient>
        <linearGradient id="meteor" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#ffffff"></stop>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"></stop>
        </linearGradient>
      </defs>

      <path d="M694 70 L772 18" stroke="url(#meteor)" stroke-width="1.6"></path>
      <circle cx="694" cy="70" r="2.2" fill="#fff5d8"></circle>

      <ellipse cx="310" cy="274" rx="420" ry="66" fill="url(#dusk)"></ellipse>
      <path class="ridge-far" d="M0 258 C70 232 130 266 214 250 C286 236 340 268 430 248 C520 230 600 262 800 240 V300 H0 Z"></path>
      <rect y="284" width="800" height="116" fill="url(#lake)"></rect>
      ${lights}

      <path class="scene-cliff" d="M430 400 C472 374 520 364 580 360 C640 350 716 346 800 350 V400 Z"></path>

      <g class="scene-tree">
        <path d="M778 350 C780 316 776 284 766 252 M771 276 C758 258 744 248 728 240 M775 296 C786 276 792 256 796 234" fill="none" stroke-width="4" stroke-linecap="round"></path>
        ${[[724, 232, 15], [742, 212, 19], [766, 196, 23], [794, 206, 25], [752, 238, 14], [784, 236, 17], [812, 232, 20]]
          .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"></circle>`).join("")}
      </g>

      <g transform="translate(206 116) scale(0.72)">
        <path class="scene-legs" d="M640 322 C650 300 668 296 682 300 L694 324 Z"></path>
        <path class="scene-hoodie" d="M658 322 C650 286 660 254 680 248 C702 244 716 268 716 324 Z"></path>
        <path class="scene-hood" d="M668 256 C672 246 694 244 702 256 C696 268 676 268 668 256 Z"></path>
        <circle class="scene-hair" cx="685" cy="234" r="15"></circle>
      </g>

      <g class="scene-cat" transform="translate(208 118) scale(0.72)">
        <ellipse cx="744" cy="316" rx="24" ry="11"></ellipse>
        <circle cx="724" cy="310" r="9"></circle>
        <path d="M717 304 L718 295 L724 301 Z M727 301 L733 295 L733 304 Z"></path>
        <path d="M766 318 C782 322 786 312 778 308" fill="none" stroke-width="4" stroke-linecap="round"></path>
      </g>
    </svg>
  `;
}

const FACES = {
  "very-hard": ["#7f9ce0", "M15 31 C18 26 26 26 29 31", "M13 17 L19 14 M31 17 L25 14"],
  hard: ["#a3a6bd", "M16 30 C19 27 25 27 28 30", "M14 16 L19 15 M30 16 L25 15"],
  "so-so": ["#c9a798", "M16 28 H28", ""],
  okay: ["#c9d3bd", "M15 26 C18 30 26 30 29 26", ""],
  happy: ["#f5dcbc", "M14 25 C17 33 27 33 30 25 Z", ""]
};

function moodFace(id) {
  const [color, mouth, brows] = FACES[id];

  return `
    <svg class="mood-face" viewBox="0 0 44 44" aria-hidden="true">
      <circle cx="22" cy="22" r="21" fill="${color}"></circle>
      <circle cx="16" cy="20" r="2" fill="#26304f"></circle>
      <circle cx="28" cy="20" r="2" fill="#26304f"></circle>
      ${brows ? `<path d="${brows}" fill="none" stroke="#26304f" stroke-width="1.6" stroke-linecap="round"></path>` : ""}
      <path d="${mouth}" fill="${id === "happy" ? "#26304f" : "none"}" stroke="#26304f" stroke-width="1.8" stroke-linecap="round"></path>
    </svg>
  `;
}

const ART = {
  record: `
    <path d="M78 74 L122 54 L150 88 L104 112 Z" fill="#b9b3e0"></path>
    <path d="M78 74 L104 112 L104 120 L78 82 Z" fill="#7d78ac"></path>
    <path d="M104 112 L150 88 L150 96 L104 120 Z" fill="#f4f0ff"></path>
    <path d="M136 92 L168 26 L176 30 L146 96 L134 102 Z" fill="#f6e5bd"></path>
  `,
  calm: `
    <path d="M60 112 C60 94 82 92 90 100 C98 82 134 84 138 104 C154 102 166 108 166 120 H60 Z" fill="#c5bceb" opacity="0.75"></path>
    <path d="M132 24 A25 25 0 1 0 156 62 A20 20 0 1 1 132 24 Z" fill="#f6e5bd"></path>
    <circle cx="92" cy="44" r="1.8" fill="#ffffff"></circle>
    <circle cx="170" cy="28" r="1.4" fill="#ffffff"></circle>
  `,
  self: `
    <path d="M62 56 L100 26 L154 44 L168 76 L126 72 L104 96 Z" fill="none" stroke="#e8e2ff" stroke-width="1.2"></path>
    ${[[62, 56], [100, 26], [154, 44], [168, 76], [126, 72], [104, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#f6e5bd"></circle>`).join("")}
  `,
  letter: `
    <path d="M84 44 L168 24 L180 86 L98 106 Z" fill="#d9d4f4"></path>
    <path d="M84 44 L136 72 L168 24" fill="none" stroke="#8d88bd" stroke-width="2"></path>
    <path d="M130 58 l4 9 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 z" fill="#f6e5bd"></path>
  `
};

const artCard = ([page, art, title, desc]) => `
  <button class="art-card" data-go="${page}" type="button">
    <svg class="art-card-art" viewBox="0 0 190 130" preserveAspectRatio="xMaxYMin meet" aria-hidden="true">${ART[art]}</svg>
    <span class="art-card-text">
      <strong>${title}</strong>
      <small>${desc}</small>
    </span>
    <span class="art-card-arrow" aria-hidden="true">→</span>
  </button>
`;

function homeSections() {
  return `
    <section class="mood-check reveal" id="moodCheck">
      <h2>오늘의 기분은 어떠세요?</h2>
      <p class="mood-note">고르지 않아도 괜찮아요. 저장되지 않아요.</p>
      <div class="mood-list">
        ${moods.map(mood => `
          <button class="mood-button" data-mood="${mood.id}" aria-pressed="false" type="button">
            ${moodFace(mood.id)}
            <span>${mood.label}</span>
          </button>
        `).join("")}
      </div>
      <div id="moodReply" aria-live="polite"></div>
    </section>

    <section class="art-grid reveal" aria-label="나를 돌보는 방법">
      ${[
        ["record", "record", "마음 기록", "일기와 감정, 생각을 적어 보세요"],
        ["calm", "calm", "잠시 쉬어가기", "아무것도 하지 않아도 되는 곳"],
        ["know", "self", "나를 알아가기", "내가 남긴 기록으로 돌아봐요"],
        ["future", "letter", "나에게 보내는 편지", "과거, 지금, 미래의 나에게"]
      ].map(artCard).join("")}
    </section>

    <section class="card alone-card reveal">
      <h2 class="guide-h2">혼자 앓고 있다면</h2>
      <p>말을 꺼내는 일이 가장 어려울 수 있어요. 전화가 어려우면 문자로, 아는 사람이 어려우면 모르는 상담자에게 시작해도 돼요.</p>
      <div class="button-row">
        <button class="btn secondary" data-go="reach" type="button">말 꺼내는 법</button>
        <button class="btn ghost" data-go="safety" type="button">내 안전 계획</button>
      </div>
    </section>

    <section class="help-bar reveal">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-9"></path><path d="M12 13C12 8 8 6 3.5 6c0 5 3.5 7 8.5 7z"></path><path d="M12 11c0-4 3-6 8.5-6 0 5-3.5 6-8.5 6z"></path></svg>
      <div class="help-bar-text">
        <strong>당신은 혼자가 아니에요</strong>
        <span>24시간 자살예방 상담 <a class="tel-link" href="tel:109">전화 109</a> <a class="tel-link" href="sms:109">문자</a></span>
      </div>
      <button class="btn secondary help-bar-button" data-go="help" type="button">도움이 필요해요</button>
    </section>
  `;
}

window.MindLabGuide = {
  sayings,
  moods,
  moodReply,
  heroScene,
  homeSections,
  calm,
  calmReply,
  crisisLines,
  safety,
  safetyText,
  reach,
  clinicText,
  supportCard,
  keepSafe,
  understand,
  care,
  help,
  allies,
  about,
  record,
  explore
};
})();
