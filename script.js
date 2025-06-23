class ClickGoalBar {
    constructor(fillEl, textEl) {
        this.fillEl = fillEl;
        this.textEl = textEl;
        this.goal = 0;
        this.count = 0;
    }
    setGoal(goal) {
        this.goal = goal;
        this.update();
    }
    setCount(count) {
        this.count = count;
        this.update();
    }
    update() {
        if (!this.goal || this.goal <= 0) return;
        let percent = Math.min(100, Math.round((this.count / this.goal) * 100));
        this.fillEl.style.width = percent + '%';
        this.textEl.textContent = `${this.count} / ${this.goal}`;
    }
}

class FloatingCount {
    constructor(contentEl, imgEl) {
        this.content = contentEl;
        this.img = imgEl;
    }
    show(value, isCrit = false) {
        const el = document.createElement('span');
        el.className = 'floating-count';
        el.textContent = isCrit ? `КРИТ! +${value}` : `+${value}`;
        if (isCrit) {
            el.style.color = '#ff2a2a';
            el.style.textShadow = '0 0 8px #fff, 0 0 16px #ff2a2a, 0 2px 8px #000';
            el.style.fontSize = '2.7em';
            el.style.fontWeight = '900';
            el.style.animationDuration = '1.1s';
        }
        const angle = Math.random() * 2 * Math.PI;
        const radius = 120 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        el.style.left = `calc(50% + ${x}px)`;
        el.style.top = `calc(50% + ${y}px)`;
        this.content.style.position = 'relative';
        this.content.appendChild(el);
        setTimeout(() => el.remove(), isCrit ? 1100 : 800);
    }
}

class ClickerWS {
    constructor(onUpdate) {
        this.ws = null;
        this.onUpdate = onUpdate;
        this.lastCount = 0;
        this.goal = 0;
        this.connect();
    }
    connect() {
        this.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
        this.ws.onmessage = (e) => {
            try {
                let data = JSON.parse(e.data);
                if (data.count !== undefined) {
                    if (data.count > this.lastCount) {
                        this.onUpdate(data.count, this.goal, data.count - this.lastCount);
                    } else {
                        this.onUpdate(data.count, this.goal, 0);
                    }
                    this.lastCount = data.count;
                    if (data.goal !== undefined) {
                        this.goal = data.goal;
                    }
                }
                if (data.goal !== undefined && data.count === undefined) {
                    this.goal = data.goal;
                    this.onUpdate(this.lastCount, this.goal, 0);
                }
            } catch {}
        };
        this.ws.onclose = () => setTimeout(() => this.connect(), 1000);
    }
    sendClick(count) {
        if (this.ws && this.ws.readyState === 1) {
            if (count && count > 1) {
                this.ws.send(JSON.stringify({action: 'click', count: count}));
            } else {
                this.ws.send(JSON.stringify({action: 'click'}));
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.container > .content > p').forEach(function(p, index) {
        p.animate([
            { opacity: 0, transform: 'translateY(-20px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            delay: index * 500,
            duration: 300,
            fill: 'both',
        });
    });

    const img = document.querySelector('.container > .content > img');
    const content = document.querySelector('.container .content');
    const goalBarFill = document.getElementById('goal-bar-fill');
    const goalBarText = document.getElementById('goal-bar-text');

    const goalBar = new ClickGoalBar(goalBarFill, goalBarText);
    const floating = new FloatingCount(content, img);
    const animateImg = () => {
        let initialRotate = Math.floor(Math.random() * 70 - 35);
        img.animate([
            { opacity: 0, transform: `scale(1.5) rotate(${initialRotate}deg)`, filter: 'drop-shadow(0 0 40px #00ff80) brightness(1.3) saturate(2)' },
            { opacity: 1, transform: 'scale(1) rotate(0deg)', filter: 'none' }
        ], {
            duration: 300,
            fill: 'both',
        });
        img.style.filter = 'drop-shadow(0 0 40px #00ff80) brightness(1.3) saturate(2)';
        setTimeout(() => { img.style.filter = ''; }, 320);
    };

    const ws = new ClickerWS((count, goal, diff) => {
        goalBar.setGoal(goal);
        goalBar.setCount(count);
        if (diff > 0) {
            floating.show(diff, diff > 1);
            animateImg();
        }
    });

    img.addEventListener('click', function() { 
        animateImg();
        // 20% шанс на крит (5-10)
        if (Math.random() < 0.2) {
            const crit = 5 + Math.floor(Math.random() * 6); // 5-10
            ws.sendClick(crit);
        } else {
            ws.sendClick();
        }
    });
});