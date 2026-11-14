/* Mountain range painter from summit-teams-template (MIT License, Kedhareswer Naidu, https://kedhar.pages.dev). */
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RANGE_TONES = {
    golden: {
        sky: ["#34405a", "#7d7c8e", "#d9a582", "#f7d2a2"].map(hex), horizon: 0.66, sun: [0.42, 0.6], sunColor: [255, 214, 158], sunSize: 0.22,
        haze: [200, 160, 146], rockLit: [226, 156, 112], rockShadow: [40, 38, 54], snowLit: [255, 238, 222], snowShadow: [138, 146, 176],
        forest: [20, 22, 24], water: [58, 66, 82], mist: 0.55, snowLine: 0.5, snow: 1, peak: 0, peakX: 0.5, lake: true, clouds: 0.75, stars: false,
    },
    alpenglow: {
        sky: ["#3a3446", "#8d6f7e", "#eaa983", "#ffd3a8"].map(hex), horizon: 0.7, sun: [0.88, 0.22], sunColor: [255, 196, 140], sunSize: 0.3,
        haze: [222, 164, 140], rockLit: [240, 126, 70], rockShadow: [92, 52, 54], snowLit: [255, 200, 156], snowShadow: [150, 116, 140],
        forest: [26, 18, 18], water: [70, 60, 70], mist: 1, snowLine: 0.42, snow: 1.4, peak: 1, peakX: 0.2, lake: false, clouds: 0.35, stars: false,
    },
    lake: {
        sky: ["#263840", "#4f6c72", "#9ab3ad", "#d6dfd4"].map(hex), horizon: 0.62, sun: [0.55, 0.28], sunColor: [246, 244, 226], sunSize: 0.18,
        haze: [170, 192, 186], rockLit: [168, 184, 172], rockShadow: [40, 58, 60], snowLit: [240, 246, 244], snowShadow: [130, 152, 162],
        forest: [14, 30, 28], water: [34, 72, 74], mist: 1, snowLine: 0.4, snow: 0.9, peak: 0, peakX: 0.5, lake: true, clouds: 0.5, stars: false,
    },
    haze: {
        sky: ["#1f2a44", "#45557a", "#8796b8", "#c8cede"].map(hex), horizon: 0.6, sun: [0.3, 0.4], sunColor: [236, 232, 246], sunSize: 0.2,
        haze: [150, 162, 196], rockLit: [126, 138, 172], rockShadow: [42, 50, 76], snowLit: [220, 226, 244], snowShadow: [110, 122, 160],
        forest: [16, 20, 34], water: [40, 50, 76], mist: 1, snowLine: 0.3, snow: 0, peak: 0, peakX: 0.5, lake: false, clouds: 0.3, stars: false,
    },
    night: {
        sky: ["#050811", "#0d172c", "#24345a", "#4a5b84"].map(hex), horizon: 0.62, sun: [0.5, 0.18], sunColor: [214, 224, 255], sunSize: 0.08,
        haze: [62, 76, 112], rockLit: [118, 132, 170], rockShadow: [24, 30, 48], snowLit: [214, 224, 250], snowShadow: [80, 96, 136],
        forest: [8, 10, 18], water: [20, 28, 48], mist: 1, snowLine: 0.45, snow: 1.2, peak: 0.6, peakX: 0.55, lake: false, clouds: 0.18, stars: true,
    },
    dusk: {
        sky: ["#2a2a40", "#685872", "#c48a7a", "#ebb592"].map(hex), horizon: 0.64, sun: [0.6, 0.56], sunColor: [255, 200, 170], sunSize: 0.24,
        haze: [180, 138, 140], rockLit: [204, 132, 118], rockShadow: [42, 36, 52], snowLit: [252, 224, 216], snowShadow: [128, 124, 156],
        forest: [20, 16, 22], water: [56, 50, 70], mist: 0.6, snowLine: 0.48, snow: 1, peak: 0, peakX: 0.5, lake: false, clouds: 0.6, stars: false,
    },
};
const RANGE_LAYERS = [
    { b: 0.6, a: 0.4, f: 1.5, snow: 0.09, fog: 0.4, mist: 0.6, trees: 0 },
    { b: 0.66, a: 0.28, f: 2.3, snow: 0.06, fog: 0.28, mist: 0.55, trees: 0 },
    { b: 0.72, a: 0.18, f: 3.3, snow: 0.03, fog: 0.18, mist: 0.5, trees: 0 },
    { b: 0.78, a: 0.11, f: 4.6, snow: 0, fog: 0.1, mist: 0.42, trees: 0.012 },
    { b: 0.83, a: 0.06, f: 6.5, snow: 0, fog: 0.04, mist: 0.3, trees: 0.022 },
    { b: 1.0, a: 0.34, f: 2.6, snow: 0, fog: 0, mist: 0, trees: 0.03 },
];
function hash2(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s);
    const b = hash2(xi + 1, yi, s);
    const c = hash2(xi, yi + 1, s);
    const d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct) {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
        sum += amp * vnoise(x, y, s + i * 31);
        norm += amp;
        amp *= 0.5;
        x *= 2.03;
        y *= 2.03;
    }
    return sum / norm;
}
function ridged(x, s, oct) {
    let sum = 0;
    let amp = 0.5;
    let norm = 0;
    let w = 1;
    for (let i = 0; i < oct; i++) {
        const n = 1 - Math.abs(vnoise(x, 0.37 + i * 1.7, s + i * 13) * 2 - 1);
        const r = n * n * w;
        w = Math.min(1, r * 1.6 + 0.25);
        sum += amp * r;
        norm += amp;
        amp *= 0.52;
        x *= 2.1;
    }
    return sum / norm;
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0, e1, v) => {
    const t = clamp01((v - e0) / (e1 - e0));
    return t * t * (3 - 2 * t);
};
/** Ridgelines for every layer of a range, computed once per picture. */
function planRange(W, H, tone, seed) {
    const ridges = [];
    const bases = [];
    RANGE_LAYERS.forEach((L, i) => {
        const r = new Float32Array(W);
        const base = new Float32Array(W);
        const off = hash2(i, 7, seed) * 50;
        for (let x = 0; x < W; x++) {
            const xn = x / W;
            let a = L.a;
            let b = L.b;
            if (i === 0 && tone.peak) {
                const g = Math.exp(-(((xn - tone.peakX) / 0.2) ** 2));
                a *= mix(1, 0.45 + 1.45 * g, tone.peak);
                b -= 0.04 * tone.peak;
            }
            if (i === RANGE_LAYERS.length - 1)
                a *= smooth(0.1, 0.5, Math.abs(xn - 0.5));
            const y = (b - a * ridged(xn * L.f * (W / H) * 0.62 + off, seed + i * 101, 7)) * H;
            base[x] = y;
            let t = 0;
            if (L.trees) {
                const tw = Math.max(3, W * 0.006);
                const k = Math.floor(x / tw + hash2(i, 3, seed) * 9);
                const local = (x / tw) % 1;
                const th = L.trees * H * (0.45 + 0.9 * hash2(k, i, seed + 5));
                t = th * Math.max(0, 1 - Math.abs(local * 2 - 1) * (1.1 + hash2(k, 9, seed) * 0.5));
            }
            r[x] = y - t;
        }
        ridges.push(r);
        bases.push(base);
    });
    const win = Math.max(3, Math.round(W * 0.045));
    const slopes = bases.map((b) => {
        const sl = new Float32Array(W);
        for (let x = 0; x < W; x++)
            sl[x] = Math.max(-1.6, Math.min(1.6, (b[Math.min(W - 1, x + win)] - b[Math.max(0, x - win)]) / (2 * win)));
        return sl;
    });
    return { W, H, tone, seed, ridges, bases, slopes, lakeTop: H * 0.82 };
}
function sky(P, x, y, out) {
    const { W, H, tone: t, seed } = P;
    const xn = x / W;
    const yn = y / H;
    const s = t.sky;
    const k = clamp01(yn / t.horizon) * (s.length - 1);
    const i = Math.min(s.length - 2, Math.floor(k));
    const f = k - i;
    for (let c = 0; c < 3; c++)
        out[c] = mix(s[i][c], s[i + 1][c], f);
    const dx = (xn - t.sun[0]) * (W / H);
    const dy = yn - t.sun[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    const glow = Math.exp(-((d / t.sunSize) ** 2)) * 0.75 + Math.exp(-d / (t.sunSize * 2.4)) * 0.3;
    for (let c = 0; c < 3; c++)
        out[c] = mix(out[c], t.sunColor[c], clamp01(glow));
    if (t.clouds) {
        const n = fbm(xn * 3.2 * (W / H), yn * 11, seed + 900, 5);
        const band = smooth(0.02, 0.2, yn) * (1 - smooth(t.horizon * 0.6, t.horizon * 0.95, yn));
        const cl = smooth(0.5, 0.78, n) * band * t.clouds;
        const lit = clamp01(1 - d * 1.4);
        const under = fbm(xn * 3.2 * (W / H), yn * 11 + 0.08, seed + 900, 3) < n ? 1 : 0.6;
        for (let c = 0; c < 3; c++)
            out[c] = mix(out[c], mix(out[c] * 0.82 + 30 * under, t.sunColor[c], lit * 0.75), cl);
    }
    if (t.stars) {
        const h = hash2(x, y, seed + 77);
        if (h > 0.9965) {
            const b = (h - 0.9965) / 0.0035;
            const fade = 1 - smooth(0.25, 0.6, yn);
            for (let c = 0; c < 3; c++)
                out[c] = mix(out[c], 255, b * fade);
        }
    }
}
function terrain(P, i, x, y, out) {
    const { W, H, tone: t, seed, ridges, bases } = P;
    const L = RANGE_LAYERS[i];
    const xn = x / W;
    const yn = y / H;
    const r = ridges[i][x];
    const d = (y - r) / H;
    const B = bases[i];
    const slope = (B[Math.min(W - 1, x + 2)] - B[Math.max(0, x - 2)]) / 4;
    const S = P.slopes[i][x];
    const side = t.sun[0] > 0.5 ? 1 : -1;
    const fx = L.f * 5.5 * (W / H);
    /* texture hangs from the crest and is sheared along the slope, so ribs and
       gullies run down the face instead of straight down the picture */
    const u = xn * fx - d * S * fx * 0.95;
    const v = d * L.f * 7 + i * 3.7;
    const n0 = fbm(u, v, seed + i * 41, 5);
    const n1 = fbm(u + 0.035, v, seed + i * 41, 5);
    const gully = Math.tanh((n1 - n0) * side * 16);
    const near = Math.exp(-d * 9);
    const face = Math.tanh(S * side * 1.5) * (0.35 + 0.65 * near) + Math.tanh(slope * side * 1.5) * Math.exp(-d * 40) * 0.6;
    const tone2 = fbm(u * 0.35, v * 0.5, seed + i * 7, 3);
    let light = clamp01(0.4 + 0.3 * face + 0.55 * gully + (tone2 - 0.5) * 0.5);
    light *= 1 - clamp01(d * 1.6) * 0.45;
    if (L.trees) {
        const tex = vnoise(x * 0.9, y * 0.35, seed + i);
        for (let c = 0; c < 3; c++)
            out[c] = mix(t.forest[c] * (0.75 + 0.5 * tex), t.rockLit[c] * 0.42, light * 0.3 * (1 - d * 3));
    }
    else {
        /* snow only on high ground: above the tone's snow line, thickest at the crest
           and lingering in the gullies */
        const line = t.snowLine + 0.14 * (fbm(xn * 9, 3.3, seed + 50 + i, 4) - 0.5) + 0.09 * (n0 - 0.5);
        const high = 1 - smooth(line - 0.03, line + 0.02, yn);
        const cap = 1 - smooth(L.snow * 0.6, L.snow, d + 0.03 * (n0 - 0.5));
        const couloir = smooth(0.55, 0.63, n0) * (1 - smooth(line, line + 0.09, yn));
        const snow = t.snow ? clamp01(Math.max(high * cap, couloir * (L.snow ? 1 : 0)) * t.snow) : 0;
        for (let c = 0; c < 3; c++) {
            const rock = mix(t.rockShadow[c], t.rockLit[c], light);
            const sn = mix(t.snowShadow[c], t.snowLit[c], clamp01(light * 1.25 - 0.1));
            out[c] = mix(rock, sn, snow);
        }
        const rim = Math.exp((-d * H) / 2.2) * clamp01(light * 1.6 - 0.4) * 0.55;
        for (let c = 0; c < 3; c++)
            out[c] = mix(out[c], t.sunColor[c], rim);
    }
    const dx = (xn - t.sun[0]) * (W / H);
    const glow = Math.exp(-((Math.sqrt(dx * dx + (yn - t.sun[1]) ** 2) / (t.sunSize * 2)) ** 2)) * 0.5;
    const m = Math.pow(clamp01(d / 0.2), 1.5) * L.mist * t.mist;
    for (let c = 0; c < 3; c++) {
        const hz = mix(t.haze[c], t.sunColor[c], glow);
        out[c] = mix(out[c], hz, L.fog * (0.4 + 0.6 * t.mist));
        out[c] = mix(out[c], hz, m);
    }
}
function layerAt(P, x, y, top) {
    for (let i = top; i >= 0; i--)
        if (y >= P.ridges[i][x])
            return i;
    return -1;
}
/** One pixel of the range, without the foreground layer when `top` excludes it. */
function shadePixel(P, x, y, top, out) {
    const last = RANGE_LAYERS.length - 1;
    const i = layerAt(P, x, y, top);
    if (i === last)
        return terrain(P, i, x, y, out);
    const { W, H, tone: t, seed, lakeTop } = P;
    if (t.lake && top === last && y > lakeTop) {
        const k = (y - lakeTop) / (H - lakeTop);
        const half = 0.08 + 0.5 * k + 0.04 * (vnoise(y * 0.05, 1, seed) - 0.5);
        if (Math.abs(x / W - 0.5) < half) {
            const rip = Math.sin(y * 1.3 + vnoise(x * 0.02, y * 0.3, seed + 3) * 6) * (1 + k * 3);
            const sx = Math.max(0, Math.min(W - 1, Math.round(x + rip)));
            const sy = Math.max(0, Math.round(2 * lakeTop - y - k * 6));
            shadePixel(P, sx, sy, last - 1, out);
            const glint = Math.exp(-(((x / W - t.sun[0]) / 0.03) ** 2)) * (vnoise(x * 0.3, y * 1.2, seed + 8) > 0.6 ? 0.5 : 0.1);
            for (let c = 0; c < 3; c++)
                out[c] = mix(mix(out[c] * 0.84, t.water[c], 0.28 + 0.4 * k), t.sunColor[c], glint * (1 - k));
            const edge = smooth(half - 0.012, half, Math.abs(x / W - 0.5));
            if (edge > 0) {
                const o2 = [0, 0, 0];
                const j = layerAt(P, x, y, last - 1);
                if (j < 0)
                    sky(P, x, y, o2);
                else
                    terrain(P, j, x, y, o2);
                for (let c = 0; c < 3; c++)
                    out[c] = mix(out[c], o2[c], edge);
            }
            return;
        }
    }
    if (i < 0)
        return sky(P, x, y, out);
    terrain(P, i, x, y, out);
}
/** Paints rows [y0, y1) into an RGBA buffer, with a little film grain. */
function paintRows(P, buf, y0, y1) {
    const out = [0, 0, 0];
    const last = RANGE_LAYERS.length - 1;
    for (let y = y0; y < y1; y++) {
        for (let x = 0; x < P.W; x++) {
            shadePixel(P, x, y, last, out);
            const g = (hash2(x, y, P.seed + 999) - 0.5) * 9;
            const o = (y * P.W + x) * 4;
            buf[o] = out[0] + g;
            buf[o + 1] = out[1] + g;
            buf[o + 2] = out[2] + g;
            buf[o + 3] = 255;
        }
    }
}

export { RANGE_TONES, planRange, paintRows };
