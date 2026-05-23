// FilterEngine — unified canvas-based video filter system
// Merged from FilterEngine + FilterPipeline into single canonical engine

const CSS_FILTERS = {
    brightness: { css: (v) => `brightness(${1 + v.value / 100})` },
    contrast: { css: (v) => `contrast(${1 + v.value / 100})` },
    saturation: { css: (v) => `saturate(${1 + v.value / 100})` },
    hue: { css: (v) => `hue-rotate(${v.degrees}deg)` },
    blur: { css: (v) => v.radius > 0 ? `blur(${v.radius}px)` : '' },
    grayscale: { css: (v) => v.enabled ? 'grayscale(1)' : '' },
    sepia: { css: (v) => v.enabled ? 'sepia(1)' : '' },
    invert: { css: (v) => v.enabled ? 'invert(1)' : '' },
};

export const FILTERS = {
    brightness: {
        name: 'Brightness', icon: '☀', category: 'color',
        params: { value: { min: -100, max: 100, default: 0, step: 1, label: 'Value' } },
        apply: (ctx, canvas, { value }) => { ctx.filter = `brightness(${1 + value / 100})`; }
    },
    contrast: {
        name: 'Contrast', icon: '◐', category: 'color',
        params: { value: { min: -100, max: 100, default: 0, step: 1, label: 'Value' } },
        apply: (ctx, canvas, { value }) => { ctx.filter = `contrast(${1 + value / 100})`; }
    },
    saturation: {
        name: 'Saturation', icon: '🎨', category: 'color',
        params: { value: { min: -100, max: 100, default: 0, step: 1, label: 'Value' } },
        apply: (ctx, canvas, { value }) => { ctx.filter = `saturate(${1 + value / 100})`; }
    },
    hue: {
        name: 'Hue Rotate', icon: '🔄', category: 'color',
        params: { degrees: { min: 0, max: 360, default: 0, step: 1, label: 'Degrees' } },
        apply: (ctx, canvas, { degrees }) => { ctx.filter = `hue-rotate(${degrees}deg)`; }
    },
    blur: {
        name: 'Blur', icon: 'Blur', category: 'effect',
        params: { radius: { min: 0, max: 20, default: 0, step: 0.5, label: 'Radius' } },
        apply: (ctx, canvas, { radius }) => { if (radius > 0) ctx.filter = `blur(${radius}px)`; }
    },
    grayscale: {
        name: 'Grayscale', icon: 'Gray', category: 'effect',
        params: { enabled: { type: 'toggle', default: false, label: 'On' } },
        apply: (ctx, canvas, { enabled }) => { if (enabled) ctx.filter = 'grayscale(1)'; }
    },
    sepia: {
        name: 'Sepia', icon: 'Sepia', category: 'effect',
        params: { enabled: { type: 'toggle', default: false, label: 'On' } },
        apply: (ctx, canvas, { enabled }) => { if (enabled) ctx.filter = 'sepia(1)'; }
    },
    invert: {
        name: 'Invert', icon: 'Invert', category: 'effect',
        params: { enabled: { type: 'toggle', default: false, label: 'On' } },
        apply: (ctx, canvas, { enabled }) => { if (enabled) ctx.filter = 'invert(1)'; }
    },
    vignette: {
        name: 'Vignette', icon: 'Vig', category: 'effect',
        params: { strength: { min: 0, max: 100, default: 50, step: 1, label: 'Strength' } },
        apply: (ctx, canvas, { strength }) => {
            if (strength <= 0) return;
            const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
                canvas.width / 2, canvas.height / 2, canvas.width * 0.7
            );
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0,0,0,${strength / 100})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },
    mirror: {
        name: 'Mirror', icon: 'Mirror', category: 'transform',
        params: { horizontal: { type: 'toggle', default: false, label: 'H' }, vertical: { type: 'toggle', default: false, label: 'V' } },
        apply: (ctx, canvas, { horizontal, vertical }) => {
            if (horizontal || vertical) {
                ctx.translate(horizontal ? canvas.width : 0, vertical ? canvas.height : 0);
                ctx.scale(horizontal ? -1 : 1, vertical ? -1 : 1);
            }
        }
    },
    opacity: {
        name: 'Opacity', icon: 'Op', category: 'color',
        params: { value: { min: 0, max: 100, default: 100, step: 1, label: 'Value' } },
        apply: (ctx, canvas, { value }) => { ctx.globalAlpha = value / 100; }
    },
    pixelate: {
        name: 'Pixelate', icon: 'Pixel', category: 'effect',
        params: { size: { min: 1, max: 50, default: 8, step: 1, label: 'Block Size' } },
        apply: (ctx, canvas, { size }) => {
            if (size <= 1) return;
            const w = Math.max(1, Math.floor(canvas.width / size));
            const h = Math.max(1, Math.floor(canvas.height / size));
            const temp = document.createElement('canvas');
            temp.width = w; temp.height = h;
            temp.getContext('2d').drawImage(canvas, 0, 0, w, h);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
        }
    },
    border: {
        name: 'Border', icon: 'Border', category: 'overlay',
        params: { width: { min: 0, max: 50, default: 4, step: 1, label: 'Width' }, color: { type: 'color', default: '#ffffff', label: 'Color' } },
        apply: (ctx, canvas, { width, color }) => {
            if (width <= 0) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.strokeRect(width / 2, width / 2, canvas.width - width, canvas.height - width);
        }
    },
    temperature: {
        name: 'Temperature', icon: 'Temp', category: 'color',
        params: { value: { min: -100, max: 100, default: 0, step: 1, label: 'Value' } },
        apply: (ctx, canvas, { value }) => {
            if (value === 0) return;
            ctx.fillStyle = value > 0
                ? `rgba(255,160,0,${Math.abs(value) / 500})`
                : `rgba(0,100,255,${Math.abs(value) / 500})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    },
    tint: {
        name: 'Tint', icon: 'Tint', category: 'color',
        params: { color: { type: 'color', default: '#000000', label: 'Color' }, strength: { min: 0, max: 100, default: 0, step: 1, label: 'Strength' } },
        apply: (ctx, canvas, { color, strength }) => {
            if (strength <= 0) return;
            ctx.globalAlpha = strength / 200;
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    },
    noise: {
        name: 'Noise', icon: 'Noise', category: 'effect',
        params: { amount: { min: 0, max: 100, default: 0, step: 1, label: 'Amount' } },
        apply: (ctx, canvas, { amount }) => {
            if (amount <= 0) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const intensity = amount * 2.55;
            for (let i = 0; i < data.length; i += 4) {
                const n = (Math.random() - 0.5) * intensity;
                data[i] += n; data[i + 1] += n; data[i + 2] += n;
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    crop: {
        name: 'Crop', icon: 'Crop', category: 'transform',
        params: {
            x: { min: 0, max: 100, default: 0, step: 1, label: 'X' },
            y: { min: 0, max: 100, default: 0, step: 1, label: 'Y' },
            width: { min: 0, max: 100, default: 100, step: 1, label: 'W' },
            height: { min: 0, max: 100, default: 100, step: 1, label: 'H' }
        },
        apply: (ctx, canvas, { x, y, width, height }) => {
            const sx = (x / 100) * canvas.width, sy = (y / 100) * canvas.height;
            const sw = (width / 100) * canvas.width, sh = (height / 100) * canvas.height;
            const imageData = ctx.getImageData(sx, sy, sw, sh);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.putImageData(imageData, 0, 0);
        }
    },
    // --- From FilterPipeline (merged) ---
    flip: {
        name: 'Flip', icon: 'F', category: 'transform',
        params: {},
        apply: (ctx, canvas) => { ctx.translate(0, canvas.height); ctx.scale(1, -1); }
    },
    rotate: {
        name: 'Rotate', icon: 'R', category: 'transform',
        params: { degrees: { min: -180, max: 180, default: 0, step: 1, label: 'Degrees' } },
        apply: (ctx, canvas, { degrees }) => {
            const rad = degrees * Math.PI / 180;
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
        }
    },
    'white-balance': {
        name: 'White Balance', icon: 'WB', category: 'color',
        params: { temperature: { min: -100, max: 100, default: 0, step: 5, label: 'Temp' }, tint: { min: -100, max: 100, default: 0, step: 5, label: 'Tint' } },
        apply: (ctx, canvas, { temperature, tint }) => {
            if (temperature === 0 && tint === 0) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            const tf = temperature / 100, tt = tint / 100;
            for (let i = 0; i < d.length; i += 4) {
                d[i] = Math.min(255, Math.max(0, d[i] + tf * 30));
                d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + tt * 15));
                d[i + 2] = Math.min(255, Math.max(0, d[i + 2] - tf * 30));
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    'color-grade': {
        name: 'Color Grade', icon: 'CG', category: 'color',
        params: {
            shadowsR: { min: -100, max: 100, default: 0, step: 1, label: 'Shadows R' },
            shadowsG: { min: -100, max: 100, default: 0, step: 1, label: 'Shadows G' },
            shadowsB: { min: -100, max: 100, default: 0, step: 1, label: 'Shadows B' },
            midsR: { min: -100, max: 100, default: 0, step: 1, label: 'Mids R' },
            midsG: { min: -100, max: 100, default: 0, step: 1, label: 'Mids G' },
            midsB: { min: -100, max: 100, default: 0, step: 1, label: 'Mids B' },
            highlightsR: { min: -100, max: 100, default: 0, step: 1, label: 'Highlights R' },
            highlightsG: { min: -100, max: 100, default: 0, step: 1, label: 'Highlights G' },
            highlightsB: { min: -100, max: 100, default: 0, step: 1, label: 'Highlights B' },
        },
        apply: (ctx, canvas, p) => {
            if (!p.shadowsR && !p.midsR && !p.highlightsR) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            for (let i = 0; i < d.length; i += 4) {
                const lum = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
                let r = 0, g = 0, b = 0;
                if (lum < 0.33) {
                    const t = 1 - lum / 0.33;
                    r = p.shadowsR * t / 100; g = p.shadowsG * t / 100; b = p.shadowsB * t / 100;
                } else if (lum < 0.66) {
                    const t = 1 - Math.abs((lum - 0.33) / 0.33 - 0.5) * 2;
                    r = p.midsR * t / 100; g = p.midsG * t / 100; b = p.midsB * t / 100;
                } else {
                    const t = (lum - 0.66) / 0.34;
                    r = p.highlightsR * t / 100; g = p.highlightsG * t / 100; b = p.highlightsB * t / 100;
                }
                d[i] = Math.min(255, Math.max(0, d[i] + r * 255));
                d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + g * 255));
                d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + b * 255));
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    sharpen: {
        name: 'Sharpen', icon: 'Sharp', category: 'effect',
        params: { amount: { min: 0, max: 100, default: 50, step: 1, label: 'Amount' } },
        apply: (ctx, canvas, { amount }) => {
            if (amount <= 0) return;
            const w = canvas.width, h = canvas.height;
            const imageData = ctx.getImageData(0, 0, w, h);
            const d = imageData.data;
            const copy = new Uint8ClampedArray(d);
            const s = amount / 50; // scale: 0-2 → 0-2x kernel strength
            const kernel = [0, -s, 0, -s, 1 + 4 * s, -s, 0, -s, 0];
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    for (let c = 0; c < 3; c++) {
                        let sum = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                sum += copy[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        d[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, sum));
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },

    // --- Phase 2.1: 10 NEW Kdenlive-inspired filters ---
    curves: {
        name: 'Curves', icon: 'Curve', category: 'color',
        params: {
            redMid: { min: -100, max: 100, default: 0, step: 1, label: 'Red' },
            greenMid: { min: -100, max: 100, default: 0, step: 1, label: 'Green' },
            blueMid: { min: -100, max: 100, default: 0, step: 1, label: 'Blue' },
        },
        apply: (ctx, canvas, { redMid, greenMid, blueMid }) => {
            if (!redMid && !greenMid && !blueMid) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            // Build LUTs
            const rLUT = new Uint8Array(256), gLUT = new Uint8Array(256), bLUT = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                const t = i / 255;
                rLUT[i] = Math.min(255, Math.max(0, Math.round(i + redMid * t * (1 - t) * 4)));
                gLUT[i] = Math.min(255, Math.max(0, Math.round(i + greenMid * t * (1 - t) * 4)));
                bLUT[i] = Math.min(255, Math.max(0, Math.round(i + blueMid * t * (1 - t) * 4)));
            }
            for (let i = 0; i < d.length; i += 4) {
                d[i] = rLUT[d[i]]; d[i + 1] = gLUT[d[i + 1]]; d[i + 2] = bLUT[d[i + 2]];
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    levels: {
        name: 'Levels', icon: 'Lvl', category: 'color',
        params: {
            inLow: { min: 0, max: 255, default: 0, step: 1, label: 'Input Low' },
            inHigh: { min: 0, max: 255, default: 255, step: 1, label: 'Input High' },
            gamma: { min: 10, max: 300, default: 100, step: 1, label: 'Gamma' },
        },
        apply: (ctx, canvas, { inLow, inHigh, gamma }) => {
            if (inLow === 0 && inHigh === 255 && gamma === 100) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            const range = Math.max(1, inHigh - inLow);
            const g = gamma / 100;
            const LUT = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                let v = Math.max(0, Math.min(1, (i - inLow) / range));
                v = Math.pow(v, 1 / g);
                LUT[i] = Math.round(v * 255);
            }
            for (let i = 0; i < d.length; i += 4) {
                d[i] = LUT[d[i]]; d[i + 1] = LUT[d[i + 1]]; d[i + 2] = LUT[d[i + 2]];
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    liftgammagain: {
        name: 'Lift/Gamma/Gain', icon: 'LGG', category: 'color',
        params: {
            lift: { min: -100, max: 100, default: 0, step: 1, label: 'Lift' },
            gamma: { min: 10, max: 300, default: 100, step: 1, label: 'Gamma' },
            gain: { min: 0, max: 300, default: 100, step: 1, label: 'Gain' },
        },
        apply: (ctx, canvas, { lift, gamma, gain }) => {
            if (!lift && gamma === 100 && gain === 100) return;
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            const lf = lift / 100;
            const gf = 1 / (gamma / 100);
            const gn = gain / 100;
            for (let i = 0; i < d.length; i += 4) {
                for (let c = 0; c < 3; c++) {
                    let v = d[i + c] / 255;
                    v = v * gn + lf;
                    v = Math.max(0, v);
                    v = Math.pow(v, gf);
                    d[i + c] = Math.min(255, Math.max(0, Math.round(v * 255)));
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    posterize: {
        name: 'Posterize', icon: 'Post', category: 'effect',
        params: { levels: { min: 2, max: 32, default: 4, step: 1, label: 'Levels' } },
        apply: (ctx, canvas, { levels }) => {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            const step = 255 / (levels - 1);
            for (let i = 0; i < d.length; i += 4) {
                d[i] = Math.round(Math.round(d[i] / step) * step);
                d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
                d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    cartoon: {
        name: 'Cartoon', icon: 'Cartoon', category: 'effect',
        params: { edges: { min: 0, max: 100, default: 50, step: 1, label: 'Edges' }, levels: { min: 2, max: 16, default: 6, step: 1, label: 'Levels' } },
        apply: (ctx, canvas, { edges, levels }) => {
            const w = canvas.width, h = canvas.height;
            const imageData = ctx.getImageData(0, 0, w, h);
            const d = imageData.data;
            // Posterize
            const step = 255 / (levels - 1);
            for (let i = 0; i < d.length; i += 4) {
                d[i] = Math.round(Math.round(d[i] / step) * step);
                d[i + 1] = Math.round(Math.round(d[i + 1] / step) * step);
                d[i + 2] = Math.round(Math.round(d[i + 2] / step) * step);
            }
            // Edge detect
            if (edges > 0) {
                const copy = new Uint8ClampedArray(d);
                const threshold = 128 - edges;
                for (let y = 1; y < h - 1; y++) {
                    for (let x = 1; x < w - 1; x++) {
                        const idx = (y * w + x) * 4;
                        for (let c = 0; c < 3; c++) {
                            const gx = -copy[((y - 1) * w + (x - 1)) * 4 + c] + copy[((y - 1) * w + (x + 1)) * 4 + c]
                                - 2 * copy[(y * w + (x - 1)) * 4 + c] + 2 * copy[(y * w + (x + 1)) * 4 + c]
                                - copy[((y + 1) * w + (x - 1)) * 4 + c] + copy[((y + 1) * w + (x + 1)) * 4 + c];
                            const gy = -copy[((y - 1) * w + (x - 1)) * 4 + c] - 2 * copy[((y - 1) * w + x) * 4 + c] - copy[((y - 1) * w + (x + 1)) * 4 + c]
                                + copy[((y + 1) * w + (x - 1)) * 4 + c] + 2 * copy[((y + 1) * w + x) * 4 + c] + copy[((y + 1) * w + (x + 1)) * 4 + c];
                            const mag = Math.sqrt(gx * gx + gy * gy);
                            if (mag > threshold) {
                                d[idx + c] = 0; // black edge
                            }
                        }
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    glow: {
        name: 'Glow', icon: 'Glow', category: 'effect',
        params: { radius: { min: 0, max: 30, default: 10, step: 1, label: 'Radius' }, intensity: { min: 0, max: 100, default: 50, step: 1, label: 'Intensity' } },
        apply: (ctx, canvas, { radius, intensity }) => {
            if (radius <= 0 || intensity <= 0) return;
            // Screen-blend a blurred copy
            const temp = document.createElement('canvas');
            temp.width = canvas.width; temp.height = canvas.height;
            const tctx = temp.getContext('2d');
            tctx.filter = `blur(${radius}px)`;
            tctx.drawImage(canvas, 0, 0);
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = intensity / 100;
            ctx.drawImage(temp, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
    },
    emboss: {
        name: 'Emboss', icon: 'Emboss', category: 'effect',
        params: { depth: { min: 1, max: 10, default: 2, step: 1, label: 'Depth' } },
        apply: (ctx, canvas, { depth }) => {
            const w = canvas.width, h = canvas.height;
            const imageData = ctx.getImageData(0, 0, w, h);
            const d = imageData.data;
            const copy = new Uint8ClampedArray(d);
            const s = depth;
            const kernel = [-s, 0, s, -s, 1, s, -s, 0, s];
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    for (let c = 0; c < 3; c++) {
                        let sum = 0;
                        for (let ky = -1; ky <= 1; ky++) {
                            for (let kx = -1; kx <= 1; kx++) {
                                sum += copy[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                            }
                        }
                        d[(y * w + x) * 4 + c] = Math.min(255, Math.max(0, sum));
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    charcoal: {
        name: 'Charcoal', icon: 'Char', category: 'effect',
        params: {},
        apply: (ctx, canvas) => {
            const w = canvas.width, h = canvas.height;
            const imageData = ctx.getImageData(0, 0, w, h);
            const d = imageData.data;
            // Sobel edge detection → grayscale → invert
            const gray = new Uint8Array(w * h);
            for (let i = 0; i < d.length; i += 4) {
                gray[i / 4] = Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114);
            }
            for (let y = 1; y < h - 1; y++) {
                for (let x = 1; x < w - 1; x++) {
                    const gx = -gray[(y - 1) * w + x - 1] + gray[(y - 1) * w + x + 1]
                        - 2 * gray[y * w + x - 1] + 2 * gray[y * w + x + 1]
                        - gray[(y + 1) * w + x - 1] + gray[(y + 1) * w + x + 1];
                    const gy = -gray[(y - 1) * w + x - 1] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + x + 1]
                        + gray[(y + 1) * w + x - 1] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + x + 1];
                    const val = Math.min(255, Math.sqrt(gx * gx + gy * gy));
                    const idx = (y * w + x) * 4;
                    d[idx] = d[idx + 1] = d[idx + 2] = 255 - val; // invert for charcoal look
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    filmgrain: {
        name: 'Film Grain', icon: 'Grain', category: 'effect',
        params: { amount: { min: 0, max: 100, default: 30, step: 1, label: 'Amount' }, size: { min: 1, max: 4, default: 1, step: 1, label: 'Size' } },
        apply: (ctx, canvas, { amount, size }) => {
            if (amount <= 0) return;
            const w = canvas.width, h = canvas.height;
            const imageData = ctx.getImageData(0, 0, w, h);
            const d = imageData.data;
            const intensity = amount * 1.5;
            // Animated grain using random seed per frame
            for (let y = 0; y < h; y += size) {
                for (let x = 0; x < w; x += size) {
                    const n = (Math.random() - 0.5) * intensity;
                    for (let dy = 0; dy < size && y + dy < h; dy++) {
                        for (let dx = 0; dx < size && x + dx < w; dx++) {
                            const idx = ((y + dy) * w + (x + dx)) * 4;
                            d[idx] = Math.min(255, Math.max(0, d[idx] + n));
                            d[idx + 1] = Math.min(255, Math.max(0, d[idx + 1] + n));
                            d[idx + 2] = Math.min(255, Math.max(0, d[idx + 2] + n));
                        }
                    }
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
    oldfilm: {
        name: 'Old Film', icon: 'Film', category: 'effect',
        params: { scratch: { min: 0, max: 100, default: 30, step: 1, label: 'Scratches' }, grain: { min: 0, max: 100, default: 40, step: 1, label: 'Grain' } },
        apply: (ctx, canvas, { scratch, grain }) => {
            const w = canvas.width, h = canvas.height;
            // Sepia tint
            ctx.filter = 'sepia(0.8)';
            // Vignette
            const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.7);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            ctx.filter = 'none';
            // Scratches
            if (scratch > 0) {
                ctx.strokeStyle = `rgba(255,255,255,${scratch / 300})`;
                ctx.lineWidth = 1;
                const numScratches = Math.floor(scratch / 5);
                for (let i = 0; i < numScratches; i++) {
                    const x = Math.random() * w;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x + (Math.random() - 0.5) * 20, h);
                    ctx.stroke();
                }
            }
            // Grain
            if (grain > 0) {
                const imageData = ctx.getImageData(0, 0, w, h);
                const d = imageData.data;
                const intensity = grain * 2;
                for (let i = 0; i < d.length; i += 4) {
                    const n = (Math.random() - 0.5) * intensity;
                    d[i] += n; d[i + 1] += n; d[i + 2] += n;
                }
                ctx.putImageData(imageData, 0, 0);
            }
        }
    },
    chromakey: {
        name: 'Chroma Key', icon: 'Green', category: 'effect',
        params: {
            color: { type: 'color', default: '#00ff00', label: 'Key Color' },
            similarity: { min: 1, max: 100, default: 30, step: 1, label: 'Similarity' },
            smoothness: { min: 0, max: 100, default: 10, step: 1, label: 'Smooth' },
        },
        apply: (ctx, canvas, { color, similarity, smoothness }) => {
            // Parse key color
            const kr = parseInt(color.slice(1, 3), 16);
            const kg = parseInt(color.slice(3, 5), 16);
            const kb = parseInt(color.slice(5, 7), 16);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;
            const thresh = similarity * 2.55;
            const smooth = smoothness * 2.55;
            for (let i = 0; i < d.length; i += 4) {
                const dist = Math.sqrt((d[i] - kr) ** 2 + (d[i + 1] - kg) ** 2 + (d[i + 2] - kb) ** 2);
                if (dist < thresh) {
                    d[i + 3] = 0;
                } else if (dist < thresh + smooth) {
                    d[i + 3] = Math.round(((dist - thresh) / smooth) * 255);
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    },
};

// Apply a pipeline of filters
export function applyFilters(ctx, canvas, activeFilters) {
    if (!activeFilters || activeFilters.length === 0) return;
    activeFilters.forEach(({ filterId, params }) => {
        const filter = FILTERS[filterId];
        if (filter && filter.apply) {
            ctx.save();
            filter.apply(ctx, canvas, { ...getDefaultParams(filterId), ...params });
            ctx.restore();
        }
    });
}

export function getDefaultParams(filterId) {
    const filter = FILTERS[filterId];
    if (!filter) return {};
    const defaults = {};
    Object.entries(filter.params).forEach(([key, config]) => {
        defaults[key] = config.default;
    });
    return defaults;
}

export function getFilterList() {
    return Object.entries(FILTERS).map(([id, filter]) => ({
        id, name: filter.name, icon: filter.icon, category: filter.category, params: filter.params
    }));
}

// Build CSS filter string from active filters (for preview rendering)
export function buildCSSFilter(filters) {
    if (!filters || filters.length === 0) return 'none';
    const parts = [];
    filters.forEach(({ filterId, params }) => {
        const cssDef = CSS_FILTERS[filterId];
        if (cssDef) {
            const resolved = { ...getDefaultParams(filterId), ...params };
            const result = cssDef.css(resolved);
            if (result) parts.push(result);
        }
    });
    return parts.length > 0 ? parts.join(' ') : 'none';
}
