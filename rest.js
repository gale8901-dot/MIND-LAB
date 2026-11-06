// 쉬어가기: 천천히 숨 고르기 안내와 잔잔한 소리. 소리 파일 없이 브라우저에서 만든다.
(() => {
"use strict";

const SESSION_SECONDS = 180;
const INHALE_SECONDS = 4;
const EXHALE_SECONDS = 6;

let timer = null;
let elapsed = 0;
let audio = null;

const el = id => document.getElementById(id);

const clock = seconds => {
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

function paint() {
  const time = el("restTime");
  const progress = el("restProgress");

  if (time) time.textContent = `${clock(elapsed)} / ${clock(SESSION_SECONDS)}`;
  if (progress) progress.style.width = `${(elapsed / SESSION_SECONDS) * 100}%`;
}

function cue() {
  const cueEl = el("breathCue");
  const orb = el("breathOrb");

  if (!cueEl || !orb) return;

  const inhale = elapsed % (INHALE_SECONDS + EXHALE_SECONDS) < INHALE_SECONDS;

  cueEl.textContent = inhale ? "천천히 들이쉬어요" : "길게 내쉬어요";
  orb.classList.toggle("in", inhale);
}

function setPlaying(playing) {
  const toggle = el("restToggle");

  if (toggle) {
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute("aria-label", playing ? "숨 고르기 멈추기" : "숨 고르기 시작하기");
    toggle.textContent = playing ? "❚❚" : "▶";
  }
}

function pause() {
  clearInterval(timer);
  timer = null;
  setPlaying(false);
}

function play() {
  if (elapsed >= SESSION_SECONDS) {
    elapsed = 0;
  }

  setPlaying(true);
  cue();
  paint();

  timer = setInterval(() => {
    elapsed++;
    paint();

    if (elapsed >= SESSION_SECONDS) {
      pause();

      const cueEl = el("breathCue");

      if (cueEl) cueEl.textContent = "여기까지 잘 왔어요. 더 쉬어도 괜찮아요.";
      el("breathOrb")?.classList.remove("in");
      return;
    }

    cue();
  }, 1000);
}

function stopSound() {
  if (audio) {
    audio.source.stop();
    audio.context.close();
    audio = null;
  }

  const button = el("soundToggle");

  if (button) {
    button.setAttribute("aria-pressed", "false");
    button.textContent = "잔잔한 소리 켜기";
  }
}

// 파도 소리와 비슷한 낮은 소리를 만들어 반복한다.
function startSound() {
  const Context = window.AudioContext || window.webkitAudioContext;

  if (!Context) return false;

  const context = new Context();
  const length = context.sampleRate * 4;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const samples = buffer.getChannelData(0);
  let last = 0;

  for (let i = 0; i < length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    samples[i] = last * 3.5;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  source.buffer = buffer;
  source.loop = true;
  filter.type = "lowpass";
  filter.frequency.value = 500;
  gain.gain.value = 0.32;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();

  audio = { context, source };

  return true;
}

function toggleSound() {
  if (audio) {
    stopSound();
    return;
  }

  if (startSound()) {
    const button = el("soundToggle");

    button.setAttribute("aria-pressed", "true");
    button.textContent = "소리 끄기";
  }
}

// 화면을 벗어나면 숨 고르기와 소리를 함께 멈춘다.
function stop() {
  clearInterval(timer);
  timer = null;
  elapsed = 0;
  stopSound();
}

function bind() {
  const toggle = el("restToggle");

  if (!toggle) return;

  paint();
  toggle.addEventListener("click", () => (timer ? pause() : play()));
  el("soundToggle")?.addEventListener("click", toggleSound);
}

window.MindLabRest = { bind, stop };
})();
