// Transitions — canvas-based transition effects for clips
// Applied between two clips on the same track

export const TRANSITIONS = {
    crossfade: {
        name: 'Crossfade',
        icon: 'XF',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(fromFrame, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = progress;
            ctx.drawImage(toFrame, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    },
    fadeBlack: {
        name: 'Fade to Black',
        icon: 'FB',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            if (progress < 0.5) {
                ctx.drawImage(fromFrame, 0, 0, canvas.width, canvas.height);
                ctx.fillStyle = `rgba(0,0,0,${progress * 2})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                ctx.drawImage(toFrame, 0, 0, canvas.width, canvas.height);
                ctx.fillStyle = `rgba(0,0,0,${(1 - progress) * 2})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    },
    wipeLeft: {
        name: 'Wipe Left',
        icon: 'WL',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width;
            const split = Math.round(w * progress);
            ctx.drawImage(toFrame, 0, 0, w, canvas.height);
            ctx.drawImage(fromFrame, 0, 0, split, canvas.height, 0, 0, split, canvas.height);
        }
    },
    wipeRight: {
        name: 'Wipe Right',
        icon: 'WR',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width;
            const split = Math.round(w * (1 - progress));
            ctx.drawImage(toFrame, 0, 0, w, canvas.height);
            ctx.drawImage(fromFrame, split, 0, w - split, canvas.height, split, 0, w - split, canvas.height);
        }
    },
    wipeUp: {
        name: 'Wipe Up',
        icon: 'WU',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const h = canvas.height;
            const split = Math.round(h * (1 - progress));
            ctx.drawImage(toFrame, 0, 0, canvas.width, h);
            ctx.drawImage(fromFrame, 0, split, canvas.width, h - split, 0, split, canvas.width, h - split);
        }
    },
    wipeDown: {
        name: 'Wipe Down',
        icon: 'WD',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const h = canvas.height;
            const split = Math.round(h * progress);
            ctx.drawImage(toFrame, 0, 0, canvas.width, h);
            ctx.drawImage(fromFrame, 0, 0, canvas.width, split, 0, 0, canvas.width, split);
        }
    },
    slideLeft: {
        name: 'Slide Left',
        icon: 'SL',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width;
            const offset = Math.round(w * progress);
            ctx.drawImage(fromFrame, -offset, 0, w, canvas.height);
            ctx.drawImage(toFrame, w - offset, 0, w, canvas.height);
        }
    },
    zoomIn: {
        name: 'Zoom In',
        icon: 'ZI',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            // Outgoing zooms in, incoming fades
            const scale = 1 + progress * 0.3;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(scale, scale);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            ctx.globalAlpha = 1 - progress;
            ctx.drawImage(fromFrame, 0, 0, canvas.width, canvas.height);
            ctx.restore();
            ctx.globalAlpha = progress;
            ctx.drawImage(toFrame, 0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    },
    // --- Phase 2.2: 5 new transitions ---
    dissolve: {
        name: 'Dissolve',
        icon: 'DI',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width, h = canvas.height;
            // Draw both frames, use pixel-level mixing with random threshold
            ctx.drawImage(fromFrame, 0, 0, w, h);
            const fromData = ctx.getImageData(0, 0, w, h);

            ctx.drawImage(toFrame, 0, 0, w, h);
            const toData = ctx.getImageData(0, 0, w, h);

            const result = ctx.createImageData(w, h);
            const rd = result.data;
            const fd = fromData.data;
            const td = toData.data;

            // Random dissolve using seeded threshold
            for (let i = 0; i < rd.length; i += 4) {
                const px = (i / 4) % w;
                const py = Math.floor((i / 4) / w);
                // Use position-based pseudo-random for consistency
                const noise = ((px * 7 + py * 13) % 256) / 256;
                const mix = noise < progress ? 1 : 0;
                rd[i] = mix ? td[i] : fd[i];
                rd[i + 1] = mix ? td[i + 1] : fd[i + 1];
                rd[i + 2] = mix ? td[i + 2] : fd[i + 2];
                rd[i + 3] = 255;
            }
            ctx.putImageData(result, 0, 0);
        }
    },
    barnDoor: {
        name: 'Barn Door',
        icon: 'BD',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width, h = canvas.height;
            const split = Math.round((w / 2) * progress);
            ctx.drawImage(toFrame, 0, 0, w, h);
            ctx.drawImage(fromFrame, 0, 0, w / 2 - split, h, 0, 0, w / 2 - split, h);
            ctx.drawImage(fromFrame, w / 2 + split, 0, w / 2 - split, h, w / 2 + split, 0, w / 2 - split, h);
        }
    },
    iris: {
        name: 'Iris',
        icon: 'IR',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width, h = canvas.height;
            const maxRadius = Math.sqrt(w * w + h * h) / 2;
            const radius = maxRadius * (1 - progress);

            // Draw to frame as base
            ctx.drawImage(toFrame, 0, 0, w, h);

            // Clip circle for from frame
            if (radius > 0) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(fromFrame, 0, 0, w, h);
                ctx.restore();
            }
        }
    },
    clockWipe: {
        name: 'Clock Wipe',
        icon: 'CW',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width, h = canvas.height;

            // Draw to frame as base
            ctx.drawImage(toFrame, 0, 0, w, h);

            // Clip pie slice for from frame
            if (progress < 1) {
                const angle = progress * Math.PI * 2;
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(w / 2, h / 2);
                ctx.arc(w / 2, h / 2, Math.max(w, h), -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 - angle));
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(fromFrame, 0, 0, w, h);
                ctx.restore();
            }
        }
    },
    push: {
        name: 'Push',
        icon: 'PU',
        apply: (ctx, canvas, fromFrame, toFrame, progress) => {
            const w = canvas.width;
            const offset = Math.round(w * progress);
            ctx.drawImage(toFrame, -w + offset, 0, w, canvas.height);
            ctx.drawImage(fromFrame, offset, 0, w, canvas.height);
        }
    },
};

// Apply a transition between two frames
export function applyTransition(transitionId, ctx, canvas, fromFrame, toFrame, progress) {
    const transition = TRANSITIONS[transitionId];
    if (!transition) {
        // Default: crossfade
        ctx.globalAlpha = 1 - progress;
        ctx.drawImage(fromFrame, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = progress;
        ctx.drawImage(toFrame, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        return;
    }
    transition.apply(ctx, canvas, fromFrame, toFrame, Math.max(0, Math.min(1, progress)));
}

export function getTransitionList() {
    return Object.entries(TRANSITIONS).map(([id, t]) => ({ id, name: t.name, icon: t.icon }));
}
