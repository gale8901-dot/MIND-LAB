// 밤하늘 배경. 사진 대신 별과 은하수를 한 번만 그려 성능 부담을 줄인다.
(() => {
"use strict";

const canvas = document.getElementById("skyCanvas");
const twinkles = document.getElementById("skyTwinkles");

if (!canvas || !twinkles) return;

// 매번 같은 하늘이 그려지도록 고정된 난수를 쓴다.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function draw() {
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const random = seeded(20261106);
  const gauss = () => (random() + random() + random() - 1.5) / 1.5;

  // 은하수: 왼쪽 아래에서 오른쪽 위로 흐르는 옅은 빛
  const angle = -0.62;
  const span = Math.hypot(width, height);
  const cx = width * 0.55;
  const cy = height * 0.34;

  for (let i = 0; i < 26; i++) {
    const along = (random() - 0.5) * span;
    const across = gauss() * span * 0.05;
    const x = cx + Math.cos(angle) * along - Math.sin(angle) * across;
    const y = cy + Math.sin(angle) * along + Math.cos(angle) * across;
    const radius = span * (0.05 + random() * 0.08);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);

    glow.addColorStop(0, "rgba(197,188,235,0.05)");
    glow.addColorStop(1, "rgba(197,188,235,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  const area = width * height;

  const star = (x, y, size, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.fillStyle = "#f5f3fa";

  // 은하수 안의 촘촘한 별
  const bandCount = Math.min(900, Math.round(area / 1500));

  for (let i = 0; i < bandCount; i++) {
    const along = (random() - 0.5) * span;
    const across = gauss() * span * 0.08;

    star(
      cx + Math.cos(angle) * along - Math.sin(angle) * across,
      cy + Math.sin(angle) * along + Math.cos(angle) * across,
      0.35 + random() * 0.5,
      0.18 + random() * 0.4
    );
  }

  // 하늘 전체의 별
  const count = Math.min(420, Math.round(area / 3200));

  for (let i = 0; i < count; i++) {
    star(
      random() * width,
      random() * height * 0.82,
      0.4 + random() * 0.9,
      0.25 + random() * 0.6
    );
  }

  ctx.globalAlpha = 1;
}

function addTwinkles() {
  const random = seeded(7);
  const stars = [];

  for (let i = 0; i < 16; i++) {
    const el = document.createElement("span");

    el.style.left = `${(random() * 100).toFixed(2)}%`;
    el.style.top = `${(random() * 72).toFixed(2)}%`;
    el.style.animationDelay = `${(random() * 7).toFixed(2)}s`;
    el.style.animationDuration = `${(4 + random() * 5).toFixed(2)}s`;
    stars.push(el);
  }

  twinkles.append(...stars);
}

let lastWidth = window.innerWidth;
let resizeTimer = null;

// 휴대폰 주소창이 움직일 때는 다시 그리지 않고, 폭이 바뀔 때만 다시 그린다.
window.addEventListener("resize", () => {
  if (window.innerWidth === lastWidth) return;

  lastWidth = window.innerWidth;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(draw, 200);
});

draw();
addTwinkles();
})();
