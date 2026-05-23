// Transition effects between clips
// Each transition takes: ctx, canvas, fromImage, toImage, progress (0-1)

export const TRANSITIONS = {
    crossfade: {
        name: 'Crossfade',
        icon: 'XF',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            if (fromImage) {
                ctx.globalAlpha = 1 - progress;
                ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
            }
            if (toImage) {
                ctx.globalAlpha = progress;
                ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
            }
            ctx.globalAlpha = 1;
        }
    },
    fadeBlack: {
        name: 'Fade to Black',
        icon: 'FB',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            if (progress < 0.5) {
                if (fromImage) ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
                ctx.fillStyle = `rgba(0,0,0,${progress * 2})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                if (toImage) ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
                ctx.fillStyle = `rgba(0,0,0,${(1 - progress) * 2})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    },
    wipeLeft: {
        name: 'Wipe Left',
        icon: 'WL',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            const wipeX = canvas.width * progress;
            if (fromImage) ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
            if (toImage) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, wipeX, canvas.height);
                ctx.clip();
                ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }
    },
    wipeRight: {
        name: 'Wipe Right',
        icon: 'WR',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            const wipeX = canvas.width * (1 - progress);
            if (fromImage) ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
            if (toImage) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(wipeX, 0, canvas.width - wipeX, canvas.height);
                ctx.clip();
                ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }
    },
    wipeUp: {
        name: 'Wipe Up',
        icon: 'WU',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            const wipeY = canvas.height * progress;
            if (fromImage) ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
            if (toImage) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, 0, canvas.width, wipeY);
                ctx.clip();
                ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }
    },
    wipeDown: {
        name: 'Wipe Down',
        icon: 'WD',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            const wipeY = canvas.height * (1 - progress);
            if (fromImage) ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
            if (toImage) {
                ctx.save();
                ctx.beginPath();
                ctx.rect(0, wipeY, canvas.width, canvas.height - wipeY);
                ctx.clip();
                ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }
    },
    slideLeft: {
        name: 'Slide Left',
        icon: 'SL',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            const offset = canvas.width * progress;
            if (fromImage) ctx.drawImage(fromImage, -offset, 0, canvas.width, canvas.height);
            if (toImage) ctx.drawImage(toImage, canvas.width - offset, 0, canvas.width, canvas.height);
        }
    },
    zoomIn: {
        name: 'Zoom In',
        icon: 'ZI',
        apply: (ctx, canvas, fromImage, toImage, progress) => {
            if (fromImage) {
                const scale = 1 + progress * 0.5;
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.scale(scale, scale);
                ctx.globalAlpha = 1 - progress;
                ctx.translate(-canvas.width / 2, -canvas.height / 2);
                ctx.drawImage(fromImage, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
            if (toImage) {
                ctx.globalAlpha = progress;
                ctx.drawImage(toImage, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
            }
        }
    },
};

export const getTransitionList = () => Object.entries(TRANSITIONS).map(([id, t]) => ({
    id,
    name: t.name,
    icon: t.icon,
}));

export const applyTransition = (transitionId, ctx, canvas, fromImage, toImage, progress) => {
    const transition = TRANSITIONS[transitionId];
    if (transition) {
        transition.apply(ctx, canvas, fromImage, toImage, progress);
    }
};
