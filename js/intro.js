/*
  Intro 3D: a LiDAR point cloud that rebuilds itself scene by scene as the page scrolls.
  Each scene is procedural (no characters, logos or studio artwork): it only evokes the kind of set
  Ledicia scanned or wrangled data on. One THREE.Points object morphs between per-scene target
  positions (aFrom -> aTo, uMix) while a laser plane sweeps through it.

  Camera (threejs-camera-direction): every scene owns one authored shot (position + target).
  The scroll drives a single interpolation stage between two shots (lerp position, lerp target,
  lookAt once). Pointer look is a bounded offset with frame-rate-independent damping.
*/
import * as THREE from 'three';

const canvas = document.querySelector('#intro-canvas');
const root = document.querySelector('#intro');
const off = () => document.documentElement.classList.remove('intro-on');
if (canvas && root && document.documentElement.classList.contains('intro-on')) {
  try { start(); } catch (e) { console.warn('intro: 3D unavailable, showing the text version', e); off(); }
}

function start() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = matchMedia('(max-width: 768px)').matches;
  const N = small ? 22000 : 56000;

  // ---------- deterministic random ----------
  let seed = 20260;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const range = (a, b) => a + (b - a) * rnd();

  // ---------- sampling helpers ----------
  // fill `count` points on the visible faces of a box (front, sides, top), with optional window grid
  function boxSurface(out, cx, cz, w, d, h, count) {
    for (let i = 0; i < count; i++) {
      const f = rnd();
      let x, y, z;
      if (f < 0.55) { x = cx + range(-w, w) / 2; y = range(0, h); z = cz + d / 2; }       // front
      else if (f < 0.85) { const s = rnd() < 0.5 ? -1 : 1; x = cx + s * w / 2; y = range(0, h); z = cz + range(-d, d) / 2; } // sides
      else { x = cx + range(-w, w) / 2; y = h; z = cz + range(-d, d) / 2; }                  // roof
      out.push(x, y, z);
    }
  }
  function cone(out, cx, cz, r, y0, h, count) {
    for (let i = 0; i < count; i++) {
      const t = Math.sqrt(rnd()); const a = rnd() * Math.PI * 2; const rr = r * (1 - t);
      out.push(cx + Math.cos(a) * rr, y0 + t * h, cz + Math.sin(a) * rr);
    }
  }
  function cylinder(out, cx, cz, r, y0, h, count) {
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2; out.push(cx + Math.cos(a) * r, y0 + rnd() * h, cz + Math.sin(a) * r);
    }
  }
  function sphere(out, cx, cy, cz, r, count) {
    for (let i = 0; i < count; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const k = 0.85 + rnd() * 0.15;
      out.push(cx + Math.cos(a) * s * r * k, cy + u * r * k * 0.8, cz + Math.sin(a) * s * r * k);
    }
  }
  const noise2 = (x, z) => Math.sin(x * 0.35) * Math.cos(z * 0.28) * 1.2 + Math.sin(x * 0.9 + z * 0.6) * 0.35;

  // pad or trim to exactly N points
  function finish(arr) {
    const out = new Float32Array(N * 3);
    const m = arr.length / 3;
    for (let i = 0; i < N; i++) {
      const j = (i % m) * 3, jitter = i >= m ? 0.04 : 0;
      out[i * 3] = arr[j] + (jitter ? range(-jitter, jitter) : 0);
      out[i * 3 + 1] = arr[j + 1] + (jitter ? range(-jitter, jitter) : 0);
      out[i * 3 + 2] = arr[j + 2] + (jitter ? range(-jitter, jitter) : 0);
    }
    // shuffle point order so morphs travel across the frame instead of in bands
    for (let i = N - 1; i > 0; i--) {
      const k = Math.floor(rnd() * (i + 1));
      for (let c = 0; c < 3; c++) { const t = out[i * 3 + c]; out[i * 3 + c] = out[k * 3 + c]; out[k * 3 + c] = t; }
    }
    return out;
  }

  // ---------- scenes ----------
  const scatter = () => { const a = []; for (let i = 0; i < N; i++) { const r = 6 + rnd() * 18, t = rnd() * Math.PI * 2, u = rnd() * 2 - 1; a.push(Math.cos(t) * r, u * 8 + 4, Math.sin(t) * r - 6); } return finish(a); };

  // a gothic city at night: towers, spires, a rooftop ledge in front
  const city = () => {
    const a = [], per = N / 70;
    for (let i = 0; i < 46; i++) {
      const cx = range(-22, 22), cz = range(-26, -4), w = range(1.4, 3.6), d = range(1.4, 3), h = range(3, 15) * (1 - Math.abs(cx) / 40);
      boxSurface(a, cx, cz, w, d, h, per * (0.6 + h / 15));
      if (rnd() < 0.35) cone(a, cx, cz, w * 0.4, h, range(2, 5), per * 0.25);
    }
    boxSurface(a, 0, 1, 30, 3, 1.0, per * 6);          // the rooftop ledge in the foreground
    return finish(a);
  };

  // a cluster of emerald spires on a ridge
  const towers = () => {
    const a = [], per = N / 26;
    for (let i = 0; i < N * 0.22; i++) { const x = range(-26, 26), z = range(-24, 6); a.push(x, noise2(x, z) * 0.6 - 0.5, z); }
    const spires = [[0, -10, 2.2, 22], [-3.2, -9, 1.5, 16], [3.4, -11, 1.6, 17.5], [-6, -12, 1.1, 11], [6.5, -8, 1.2, 12.5], [-1.5, -14, 1.3, 14], [1.8, -6.5, 0.9, 9]];
    for (const [cx, cz, r, h] of spires) { cylinder(a, cx, cz, r, 0, h * 0.72, per * (h / 14)); cone(a, cx, cz, r * 1.05, h * 0.72, h * 0.28 + 2, per * 0.45); }
    return finish(a);
  };

  // a jungle valley: rolling ground, trunks and canopy clusters
  const jungle = () => {
    const a = [];
    for (let i = 0; i < N * 0.35; i++) { const x = range(-28, 28), z = range(-30, 8); a.push(x, noise2(x, z) - 1, z); }
    for (let i = 0; i < 60; i++) {
      const x = range(-26, 26), z = range(-28, 2), base = noise2(x, z) - 1, h = range(4, 10);
      cylinder(a, x, z, 0.22, base, h, 120 * (N / 56000));
      sphere(a, x, base + h + 1, z, range(1.8, 3.6), 380 * (N / 56000));
    }
    return finish(a);
  };

  // a chase road running into the distance between cliffs
  const road = () => {
    const a = [];
    for (let i = 0; i < N * 0.3; i++) { const x = range(-4, 4), z = range(-80, 8); a.push(x, -1, z); }
    for (let i = 0; i < N * 0.08; i++) { const z = range(-80, 8); if ((Math.floor(z / 2) & 1) === 0) a.push(range(-0.12, 0.12), -0.98, z); }
    for (let i = 0; i < N * 0.32; i++) { const s = rnd() < 0.5 ? -1 : 1, z = range(-80, 8), off = range(5, 16); a.push(s * off, -1 + (off - 5) * 0.9 + Math.sin(z * 0.2 + off) * 1.2, z); }
    for (let i = 0; i < N * 0.12; i++) { const s = rnd() < 0.5 ? -1 : 1; a.push(s * range(1.2, 2.4) + range(-0.05, 0.05), range(-0.4, 0.2), range(-60, 6)); } // light streaks
    return finish(a);
  };

  // the name, sampled from a 2D canvas
  const name = () => {
    const c = document.createElement('canvas'), W = 1400, H = 420; c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '500 190px "Hanken Grotesk", system-ui, sans-serif'; g.fillText('LEDICIA', W / 2, 120);
    g.font = '500 190px "Hanken Grotesk", system-ui, sans-serif'; g.fillText('CASTRO', W / 2, 310);
    const data = g.getImageData(0, 0, W, H).data, pts = [];
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 128) pts.push(x, y);
    const a = [], m = pts.length / 2, scale = 22 / W;
    for (let i = 0; i < N; i++) {
      if (i < N * 0.86) { const k = Math.floor(rnd() * m) * 2; a.push((pts[k] - W / 2) * scale, (H / 2 - pts[k + 1]) * scale + 4, range(-0.25, 0.25)); }
      else { const x = range(-26, 26), z = range(-20, 4); a.push(x, -2.5 + noise2(x, z) * 0.3, z); } // the floor it stands on
    }
    return finish(a);
  };

  const SCENES = [
    { make: scatter, cam: [0, 6, 26], look: [0, 4, -6], tint: [0.95, 0.93, 0.9] },
    { make: city, cam: [0, 4.2, 12], look: [0, 6, -14], tint: [0.78, 0.82, 0.95] },
    { make: towers, cam: [0, 5, 16], look: [0, 9, -10], tint: [0.55, 1.0, 0.68] },
    { make: jungle, cam: [-2, 5, 14], look: [2, 3, -12], tint: [0.72, 0.95, 0.62] },
    { make: road, cam: [0, 1.6, 10], look: [0, 0.4, -30], tint: [1.0, 0.78, 0.55] },
    { make: name, cam: [0, 4, 21], look: [0, 4, 0], tint: [0.95, 0.93, 0.9] },
  ];

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'default' });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); off(); });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x0e0d0c, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0e0d0c, 0.028);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

  const targets = []; // built lazily, so the first frame is fast
  const getTarget = i => (targets[i] ||= SCENES[i].make());

  const geo = new THREE.BufferGeometry();
  const aFrom = new THREE.BufferAttribute(getTarget(0).slice(), 3);
  const aTo = new THREE.BufferAttribute(getTarget(1).slice(), 3);
  const rand = new Float32Array(N); for (let i = 0; i < N; i++) rand[i] = rnd();
  geo.setAttribute('position', aFrom);
  geo.setAttribute('aTo', aTo);
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uMix: { value: 0 }, uTime: { value: 0 }, uScan: { value: 0 }, uPx: { value: renderer.getPixelRatio() },
      uTintA: { value: new THREE.Vector3(...SCENES[0].tint) }, uTintB: { value: new THREE.Vector3(...SCENES[1].tint) },
      uLaser: { value: new THREE.Color(0xff4b2b) }, uFogDensity: { value: 0.022 },
    },
    vertexShader: /* glsl */`
      attribute vec3 aTo; attribute float aRand;
      uniform float uMix, uTime, uScan, uPx;
      varying float vLaser, vFade, vDepth;
      void main() {
        // each point leaves at its own moment, so the cloud dissolves and rebuilds instead of sliding
        float t = smoothstep(aRand * 0.45, aRand * 0.45 + 0.55, uMix);
        vec3 p = mix(position, aTo, t);
        // drifting in flight: points lift off and arc while they travel
        p.y += sin(t * 3.14159) * (1.5 + aRand * 3.0);
        p.x += sin(t * 3.14159) * (aRand - 0.5) * 4.0;
        // a laser plane sweeping down through the set
        float d = abs(p.y - uScan);
        vLaser = smoothstep(0.9, 0.0, d);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        vFade = 0.55 + 0.45 * sin(uTime * 1.3 + aRand * 40.0);
        gl_PointSize = clamp((2.4 + vLaser * 3.5) * uPx * (24.0 / max(vDepth, 1.0)), 1.6 * uPx, 4.5 * uPx);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uTintA, uTintB, uLaser; uniform float uMix, uFogDensity;
      varying float vLaser, vFade, vDepth;
      void main() {
        vec2 c = gl_PointCoord - 0.5; float r = dot(c, c);
        if (r > 0.25) discard;
        float soft = smoothstep(0.25, 0.0, r);
        vec3 base = mix(uTintA, uTintB, uMix) * (0.55 + 0.35 * vFade);
        vec3 col = mix(base, uLaser * 2.2, vLaser);
        float fog = max(exp(-uFogDensity * uFogDensity * vDepth * vDepth), 0.18);
        gl_FragColor = vec4(col * soft * fog, soft * fog);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  // ---------- scroll ----------
  const labels = [...root.querySelectorAll('[data-intro-step]')];
  let segment = 0; // which pair of scenes is loaded into aFrom/aTo
  function load(i) {
    if (i === segment) return;
    aFrom.array.set(getTarget(i)); aFrom.needsUpdate = true;
    aTo.array.set(getTarget(Math.min(i + 1, SCENES.length - 1))); aTo.needsUpdate = true;
    mat.uniforms.uTintA.value.set(...SCENES[i].tint);
    mat.uniforms.uTintB.value.set(...SCENES[Math.min(i + 1, SCENES.length - 1)].tint);
    segment = i;
  }
  const forced = new URLSearchParams(location.search).get('introp');
  // ?still=1 renders the frame alone (no nav, no labels): used to make the page's own stills
  if (new URLSearchParams(location.search).has('still')) document.documentElement.classList.add('intro-still'); // debug: ?introp=2.0 freezes the journey
  function progress() {
    if (forced !== null) return Math.min(Math.max(+forced, 0), SCENES.length - 1);
    const r = root.getBoundingClientRect(), total = r.height - innerHeight;
    const p = Math.min(Math.max(-r.top / Math.max(total, 1), 0), 1);
    return p * (SCENES.length - 1); // 0 .. scenes-1
  }

  // ---------- camera ----------
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  const pointer = { x: 0, y: 0 }, look = { x: 0, y: 0 };
  addEventListener('pointermove', e => { pointer.x = e.clientX / innerWidth - 0.5; pointer.y = e.clientY / innerHeight - 0.5; }, { passive: true });

  function shot(p) {
    const i = Math.min(Math.floor(p), SCENES.length - 2), f = p - i;
    // hold on each scene, travel in the middle of the segment (one interpolation stage)
    const e = f < 0.2 ? 0 : f > 0.8 ? 1 : (f - 0.2) / 0.6;
    const k = e * e * (3 - 2 * e);
    camPos.copy(tmpA.fromArray(SCENES[i].cam)).lerp(tmpB.fromArray(SCENES[i + 1].cam), k);
    camLook.copy(tmpA.fromArray(SCENES[i].look)).lerp(tmpB.fromArray(SCENES[i + 1].look), k);
    return { i, k };
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    mat.uniforms.uPx.value = renderer.getPixelRatio();
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 68 : 50; // a phone stands upright: widen the lens so the set still reads
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas); resize();

  // ---------- labels ----------
  function setLabels(p) {
    labels.forEach((el, n) => {
      const d = Math.abs(p - n);
      const o = Math.max(0, 1 - d * 2.6);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((p - n) * -40).toFixed(1)}px)`;
    });
  }

  // ---------- loop ----------
  let last = performance.now(), visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(root);
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    const p = progress();
    const { i, k } = shot(p);
    load(i);
    mat.uniforms.uMix.value = reduced ? Math.round(k) : k;
    mat.uniforms.uTime.value = now / 1000;
    mat.uniforms.uScan.value = 16 - ((now / 1000) * 5.5 % 22); // laser sweeps down every 4 s
    // bounded pointer look, frame-rate independent damping
    const damp = 1 - Math.exp(-dt * 3);
    look.x += (pointer.x - look.x) * damp; look.y += (pointer.y - look.y) * damp;
    camera.position.copy(camPos).add(tmpA.set(look.x * 2.2, -look.y * 1.2, 0));
    camera.lookAt(camLook);
    setLabels(p);
    renderer.render(scene, camera);
  }
  // build the remaining targets after the first paint, one per idle slot
  // one scene per idle slot, chained, so Safari (no requestIdleCallback) never builds them all in one frame
  const idle = window.requestIdleCallback || (f => setTimeout(f, 80));
  const build = n => { if (n < SCENES.length) idle(() => { getTarget(n); build(n + 1); }); };
  build(2);
  // the name scene needs the web font: rebuild it once the font is in, and refresh it if it is already loaded
  document.fonts?.ready.then(() => idle(() => {
    const last = SCENES.length - 1;
    targets[last] = null; getTarget(last);
    if (segment === last - 1) { aTo.array.set(targets[last]); aTo.needsUpdate = true; }
  }));
  requestAnimationFrame(frame);
  root.classList.add('is-live');
}
