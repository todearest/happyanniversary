/* ============================================================
   NEBULA DIARY — script.js
   ============================================================ */

const MKEY = "nebula_playing",
  TKEY = "nebula_time";
let audio = null,
  isPlaying = false;

// ── Persistent Music ──
function initMusic() {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.src = "asset/music.mp3";
  }
  const t = parseFloat(sessionStorage.getItem(TKEY) || "0");
  if (t > 0) audio.currentTime = t;

  setInterval(() => {
    if (audio && !audio.paused) sessionStorage.setItem(TKEY, audio.currentTime);
  }, 1000);

  if (sessionStorage.getItem(MKEY) === "true") playMusic();
  updateMusicUI();
}

function playMusic() {
  if (!audio) return;
  audio
    .play()
    .then(() => {
      isPlaying = true;
      sessionStorage.setItem(MKEY, "true");
      updateMusicUI();
    })
    .catch(() => {
      isPlaying = false;
      updateMusicUI();
    });
}

function pauseMusic() {
  if (!audio) return;
  audio.pause();
  isPlaying = false;
  sessionStorage.setItem(MKEY, "false");
  updateMusicUI();
}

function toggleMusic() {
  isPlaying ? pauseMusic() : playMusic();
}

function updateMusicUI() {
  const btn = document.getElementById("music-btn");
  const wave = document.querySelector(".music-wave");
  if (!btn) return;
  btn.innerHTML = isPlaying ? "⏸" : "♫";
  if (wave) wave.classList.toggle("paused", !isPlaying);
}

// ── TRUE SPA NAVIGATION ──
async function navigateTo(url) {
  if (audio && !audio.paused) {
    sessionStorage.setItem(TKEY, audio.currentTime);
    sessionStorage.setItem(MKEY, "true");
  }
  const ov = document.getElementById("page-transition");
  if (ov) ov.classList.add("on");

  try {
    const res = await fetch(url);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    setTimeout(() => {
      document.title = doc.title;
      document.body.innerHTML = doc.body.innerHTML;

      // FIX: Re-evaluate <script> tags injected via innerHTML
      // Without this, the window.STAR_WISHES array in letter.html is ignored by the browser
      const scripts = document.body.querySelectorAll("script");
      scripts.forEach((oldScript) => {
        const newScript = document.createElement("script");
        Array.from(oldScript.attributes).forEach((attr) =>
          newScript.setAttribute(attr.name, attr.value),
        );
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });

      pageLoad();
      setupNavLinks();
      setupReveal();
      setupWarpBtn();
      setupOrbit();
      setupGameLog();
      setupTyping();
      setupStars();
      setupSeal();

      const newMusicBtn = document.getElementById("music-btn");
      if (newMusicBtn) newMusicBtn.addEventListener("click", toggleMusic);
      updateMusicUI();

      window.history.pushState({}, "", url);
      window.scrollTo(0, 0);
    }, 480);
  } catch (e) {
    location.href = url;
  }
}

function setupNavLinks() {
  document.querySelectorAll("a[data-nav], button[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(el.dataset.href || el.getAttribute("href"));
    });
  });
}

window.addEventListener("popstate", () => {
  navigateTo(location.pathname);
});

function pageLoad() {
  const ov = document.getElementById("page-transition");
  if (ov) ov.classList.remove("on");
  document.body.style.opacity = "0";
  document.body.style.transition = "opacity .5s ease";
  setTimeout(() => (document.body.style.opacity = "1"), 50);
}

// ── Parallax Starfield ──
function initStarfield() {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H;
  const layers = [
    {
      count: 80,
      r: [0.3, 0.8],
      speed: 0.015,
      alpha: [0.2, 0.5],
      color: [192, 132, 252],
    },
    {
      count: 50,
      r: [0.8, 1.5],
      speed: 0.035,
      alpha: [0.4, 0.8],
      color: [224, 242, 254],
    },
    {
      count: 20,
      r: [1.5, 2.5],
      speed: 0.07,
      alpha: [0.6, 1.0],
      color: [240, 171, 252],
    },
  ];
  let stars = [];
  let mouse = { x: 0, y: 0 };
  let gyro = { x: 0, y: 0 };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", () => {
    resize();
    build();
  });

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function build() {
    stars = [];
    layers.forEach((l, li) => {
      for (let i = 0; i < l.count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: rand(l.r[0], l.r[1]),
          alpha: rand(l.alpha[0], l.alpha[1]),
          da: (Math.random() - 0.5) * 0.008,
          speed: l.speed,
          layer: li,
          color: l.color,
          ox: 0,
          oy: 0,
        });
      }
    });
  }
  build();

  document.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / W - 0.5) * 2;
    mouse.y = (e.clientY / H - 0.5) * 2;
  });

  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (e) => {
      gyro.x = (e.gamma || 0) / 45;
      gyro.y = (e.beta || 0) / 45;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const dx = mouse.x + gyro.x,
      dy = mouse.y + gyro.y;
    stars.forEach((s) => {
      const px = dx * s.speed * 60,
        py = dy * s.speed * 60;
      s.ox += (px - s.ox) * 0.08;
      s.oy += (py - s.oy) * 0.08;
      s.alpha += s.da;
      if (s.alpha > 1 || s.alpha < 0.15) s.da *= -1;
      const cx = (((s.x + s.ox) % W) + W) % W,
        cy = (((s.y + s.oy) % H) + H) % H;
      ctx.beginPath();
      ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${s.color.join(",")},${s.alpha})`;
      ctx.fill();
      if (s.r > 1.4) {
        ctx.beginPath();
        ctx.arc(cx, cy, s.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.color.join(",")},${s.alpha * 0.2})`;
        ctx.fill();
      }
    });
    requestAnimationFrame(draw);
  }
  draw();

  function shootStar() {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed; top:${5 + Math.random() * 40}%; left:-60px; width:${60 + Math.random() * 80}px; height:1.5px; background:linear-gradient(90deg,transparent,rgba(240,171,252,.8),white); border-radius:2px; pointer-events:none; z-index:1; animation:shootStar ${1.5 + Math.random()}s ease forwards;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
  shootStar();
  setInterval(shootStar, 5000 + Math.random() * 5000);
}

function setupReveal() {
  const obs = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      }),
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
  );
  document.querySelectorAll(".reveal").forEach((el) => obs.observe(el));
}

function setupWarpBtn() {
  const btn = document.getElementById("gate-btn");
  const wrap = document.getElementById("warp-overlay");
  if (!btn || !wrap) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    wrap.classList.add("on");
    for (let i = 0; i < 20; i++) {
      const line = document.createElement("div");
      line.classList.add("warp-line");
      const len = 100 + Math.random() * 200;
      line.style.cssText = `position:absolute; width:${len}px; height:1px; background:linear-gradient(90deg,transparent,rgba(192,132,252,.7),transparent); left:50%; top:${10 + Math.random() * 80}%; transform-origin:left center; transform:rotate(${Math.random() * 10 - 5}deg) scaleX(0); animation:warpLines .5s ease ${Math.random() * 0.2}s forwards;`;
      wrap.appendChild(line);
    }
    setTimeout(() => {
      navigateTo(btn.getAttribute("href") || btn.dataset.href);
    }, 700);
  });
}

// ── Orbit System (Fixed Distance & Huge Active Planet) ──
function setupOrbit() {
  const wrap = document.getElementById("orbit-wrap");
  const planets = document.querySelectorAll(".orbit-planet");
  const panel = document.getElementById("orbit-story");
  if (!wrap || !planets.length) return;

  const isMobile = window.innerWidth <= 768;
  const RADIUS = isMobile ? 150 : parseInt(wrap.dataset.radius || "220");

  const COUNT = planets.length;
  let angle = 0,
    dragging = false,
    startA = 0,
    velocity = 0;

  function positionPlanets() {
    planets.forEach((p, i) => {
      const a = angle + (i / COUNT) * Math.PI * 2;
      const x = Math.cos(a) * RADIUS + wrap.offsetWidth / 2;
      const y = Math.sin(a) * RADIUS + wrap.offsetHeight / 2;
      p.style.left = x + "px";
      p.style.top = y + "px";

      const depth = (Math.cos(a) + 1) / 2;
      const scale = 0.6 + depth * 0.5;
      p.style.transform = `translate(-50%,-50%) scale(${scale})`;
      p.style.opacity = (0.4 + depth * 0.6).toString();

      const normA = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const frontA = Math.PI * 1.5;
      const diff = Math.abs(normA - frontA);
      const isActive = diff < Math.PI / COUNT;

      p.classList.toggle("active", isActive);

      p.style.zIndex = isActive ? "100" : Math.round(depth * 10).toString();

      if (isActive && panel) {
        const title = p.getAttribute("data-title");
        const story = p.getAttribute("data-story");
        if (title && story) {
          panel.querySelector("h3").textContent = title;
          panel.querySelector("p").textContent = story;
          panel.classList.add("show");
        }
      }
    });
  }

  positionPlanets();
  window.addEventListener("resize", positionPlanets);

  function getAngleFromCenter(clientX, clientY, rect) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  wrap.addEventListener("mousedown", (e) => {
    dragging = true;
    if (panel) panel.classList.remove("show");
    const r = wrap.getBoundingClientRect();
    startA = getAngleFromCenter(e.clientX, e.clientY, r) - angle;
    velocity = 0;
    wrap.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const r = wrap.getBoundingClientRect();
    const na = getAngleFromCenter(e.clientX, e.clientY, r) - startA;
    velocity = na - angle;
    angle = na;
    positionPlanets();
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    wrap.style.cursor = "grab";
    function momentumSpin() {
      if (Math.abs(velocity) < 0.001) return;
      velocity *= 0.93;
      angle += velocity;
      positionPlanets();
      requestAnimationFrame(momentumSpin);
    }
    momentumSpin();
  });

  wrap.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      if (panel) panel.classList.remove("show");
      const r = wrap.getBoundingClientRect();
      dragging = true;
      startA = getAngleFromCenter(t.clientX, t.clientY, r) - angle;
      velocity = 0;
    },
    { passive: true },
  );

  wrap.addEventListener(
    "touchmove",
    (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      const r = wrap.getBoundingClientRect();
      const na = getAngleFromCenter(t.clientX, t.clientY, r) - startA;
      velocity = na - angle;
      angle = na;
      positionPlanets();
    },
    { passive: true },
  );

  wrap.addEventListener("touchend", () => {
    dragging = false;
    function momentumSpin() {
      if (Math.abs(velocity) < 0.001) return;
      velocity *= 0.93;
      angle += velocity;
      positionPlanets();
      requestAnimationFrame(momentumSpin);
    }
    momentumSpin();
  });

  planets.forEach((p, i) => {
    p.addEventListener("click", () => {
      if (dragging) return;

      const targetAngle = Math.PI * 1.5 - (i / COUNT) * Math.PI * 2;

      let delta = (targetAngle - angle) % (Math.PI * 2);
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;

      const startAngle = angle;
      const startTime = performance.now();
      const duration = 450;

      function animateSnap(currentTime) {
        let progress = (currentTime - startTime) / duration;
        if (progress > 1) progress = 1;

        const ease = 1 - Math.pow(1 - progress, 3);
        angle = startAngle + delta * ease;
        positionPlanets();

        if (progress < 1) {
          requestAnimationFrame(animateSnap);
        }
      }
      requestAnimationFrame(animateSnap);
    });
  });
  wrap.style.cursor = "grab";
}

function setupGameLog() {
  const el = document.getElementById("game-log-text");
  if (!el) return;
  const cursor = el.querySelector(".game-log-cursor");
  const text = el.dataset.text || "";
  let i = 0,
    started = false;

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        obs.disconnect();
        type();
      }
    },
    { threshold: 0.2 },
  );
  obs.observe(el);

  function type() {
    if (i >= text.length) return;
    const ch = text[i];
    el.insertBefore(document.createTextNode(ch), cursor);
    i++;
    const d =
      ch === "\n"
        ? 160
        : ch === "." || ch === "!"
          ? 100
          : 28 + Math.random() * 22;
    setTimeout(type, d);
  }
}

function setupTyping() {
  const target = document.getElementById("letter-output");
  if (!target) return;

  const full = `Happy anniversary ya, sayang. 🤍\n\nMakasih karena selama ini kamu masih milih buat tetap ada. Padahal kita sama-sama tau, jalan kita gak selalu mulus. Pernah salah paham, pernah diem-dieman, pernah capek, bahkan pernah ngerasa "apa masih bisa lanjut ya?"\n\nTapi nyatanya kita masih di sini.\n\nMaaf ya kalau aku belum selalu jadi cowok yang kamu harapin. Kadang aku kurang peka, kadang bikin kamu sedih, kadang bikin kamu kesel.\n\nAku harap tahun depan, dan tahun-tahun setelahnya, kita masih bareng ya. Masih saling cerita hal-hal yg g penting, masih saling ganggu, masih ketawa karena hal random, dan masih saling memilih satu sama lain.\n\nKalau nanti ada hari di mana kita sama-sama capek, jangan buru-buru lepasin aku ya. Ingetin aku kenapa kita bertahan sampai sejauh ini.\n\nHappy anniversary, cintaku.\nThanks udah jadi bagian paling indah di hidupku.\n\nI love u so much sayang ❤️`;

  const cursor = document.createElement("span");
  cursor.classList.add("letter-cursor");
  target.appendChild(cursor);

  let i = 0,
    started = false;
  const sign = document.querySelector(".letter-sign");

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        obs.disconnect();
        type();
      }
    },
    { threshold: 0.1 },
  );
  obs.observe(target);

  function type() {
    if (i >= full.length) {
      if (sign) sign.classList.add("show");
      return;
    }
    const ch = full[i];
    target.insertBefore(document.createTextNode(ch), cursor);
    i++;
    const d =
      ch === "\n"
        ? 180
        : ch === "." || ch === "!" || ch === "?"
          ? 120
          : ch === ","
            ? 80
            : 22 + Math.random() * 25;
    setTimeout(type, d);
  }
}

function setupStars() {
  const sky = document.getElementById("star-sky");
  const cardBox = document.getElementById("star-card");
  const overlay = document.getElementById("star-overlay");
  if (!sky) return;

  const wishes = window.STAR_WISHES || [];
  function drawLines() {
    const starEls = sky.querySelectorAll(".wish-star");
    const positions = [...starEls].map((s) => ({
      x: parseFloat(s.style.left),
      y: parseFloat(s.style.top),
    }));
    for (let j = 0; j < positions.length - 1; j++) {
      const a = positions[j],
        b = positions[j + 1];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const line = document.createElement("div");
      line.classList.add("const-line");
      line.style.cssText = `left:${a.x}%;top:${a.y}%;width:${len * 0.7}%;transform:rotate(${angle}deg);`;
      sky.insertBefore(line, sky.firstChild);
    }
  }
  drawLines();

  sky.querySelectorAll(".wish-star").forEach((star, i) => {
    star.addEventListener("click", (e) => {
      e.stopPropagation();
      const w = wishes[i];
      if (!w || !cardBox) return;
      cardBox.querySelector(".star-card-icon").textContent = w.icon;
      cardBox.querySelector("h3").textContent = w.title;
      cardBox.querySelector("p").textContent = w.body;
      cardBox.classList.add("show");
      overlay?.classList.add("show");
      star.classList.add("active");
      for (let k = 0; k < 6; k++) {
        const sp = document.createElement("div");
        const rect = star.getBoundingClientRect();
        sp.style.cssText = `position:fixed;left:${rect.left + 8}px;top:${rect.top + 8}px;font-size:.8rem;pointer-events:none;z-index:9999;transition:all .8s ease;`;
        sp.textContent = ["✨", "💜", "⭐", "🌸"][k % 4];
        document.body.appendChild(sp);
        const a = (k / 6) * Math.PI * 2,
          d = 35 + Math.random() * 25;
        setTimeout(() => {
          sp.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 20}px)`;
          sp.style.opacity = "0";
        }, 60);
        setTimeout(() => sp.remove(), 900);
      }
    });
  });

  function closeCard() {
    cardBox?.classList.remove("show");
    overlay?.classList.remove("show");
    sky
      .querySelectorAll(".wish-star")
      .forEach((s) => s.classList.remove("active"));
  }
  overlay?.addEventListener("click", closeCard);
  document
    .querySelector(".star-card-close")
    ?.addEventListener("click", closeCard);
}

function setupSeal() {
  const btn = document.querySelector(".seal-btn");
  const ring = btn?.querySelector(".seal-ring-fill");
  if (!btn) return;
  let progress = 0,
    interval = null;

  function startHold() {
    clearInterval(interval);
    interval = setInterval(() => {
      progress = Math.min(100, progress + 2.5);
      if (ring)
        ring.style.background = `conic-gradient(rgba(240,171,252,.7) ${progress}%, transparent ${progress}%)`;
      if (progress >= 100) {
        clearInterval(interval);
        const colors = ["#C084FC", "#F0ABFC", "#FCD34D", "#A5F3FC", "#FFFFFF"];
        for (let i = 0; i < 80; i++) {
          setTimeout(() => {
            const el = document.createElement("div");
            el.classList.add("confetti-piece");
            el.style.cssText = `position:fixed;left:${10 + Math.random() * 80}vw;top:-10px; width:${5 + Math.random() * 7}px;height:${5 + Math.random() * 7}px; border-radius:${Math.random() > 0.5 ? "50%" : "2px"}; background:${colors[Math.floor(Math.random() * colors.length)]}; animation:confetti ${2 + Math.random() * 2}s ease forwards; pointer-events:none;z-index:9999;`;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 4000);
          }, i * 30);
        }
        const hint = document.querySelector(".seal-hint");
        if (hint) hint.textContent = "♡ tersegel dengan cinta ♡";
      }
    }, 30);
  }

  function stopHold() {
    clearInterval(interval);
    if (progress < 100) {
      progress = 0;
      if (ring) ring.style.background = "";
    }
  }

  btn.addEventListener("mousedown", startHold);
  btn.addEventListener("mouseup", stopHold);
  btn.addEventListener("mouseleave", stopHold);
  btn.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
      startHold();
    },
    { passive: false },
  );
  btn.addEventListener("touchend", stopHold);
  btn.addEventListener("touchcancel", stopHold);
}

function initApp() {
  pageLoad();
  if (!audio) initMusic();
  initStarfield();
  setupNavLinks();
  setupReveal();
  setupWarpBtn();
  setupOrbit();
  setupGameLog();
  setupTyping();
  setupStars();
  setupSeal();
  const mBtn = document.getElementById("music-btn");
  if (mBtn) {
    mBtn.removeEventListener("click", toggleMusic);
    mBtn.addEventListener("click", toggleMusic);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  function go() {
    if (
      sessionStorage.getItem(MKEY) === null ||
      sessionStorage.getItem(MKEY) === "true"
    )
      playMusic();
    document.removeEventListener("touchstart", go);
    document.removeEventListener("click", go);
  }
  document.addEventListener("touchstart", go, { once: true });
  document.addEventListener("click", go, { once: true });
});
