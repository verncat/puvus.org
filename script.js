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

const ClickType = {
    NORMAL: 'normal',
    CRIT: 'crit',
    LEGENDARY: 'legendary',
};

class FloatingCount {
    constructor(contentEl, imgEl) {
        this.content = contentEl;
        this.img = imgEl;
    }
    show(value, type = ClickType.NORMAL) {
        const el = document.createElement('span');
        el.className = 'floating-count' + (type === ClickType.LEGENDARY ? ' legendary' : '') + (type === ClickType.CRIT ? ' crit' : '');
        el.textContent = type === ClickType.LEGENDARY ? `ЛЕГЕНДА! +${value}` : (type === ClickType.CRIT ? `КРИТ! +${value}` : `+${value}`);
        // Добавляем спрайт еды
        const foodImg = document.createElement('img');
        foodImg.className = 'floating-food';
        if (type === ClickType.LEGENDARY) {
            foodImg.src = 'img/food_legendary.png';
            el.style.animationDuration = '1.2s';
        } else if (type === ClickType.CRIT) {
            foodImg.src = 'img/food_crit.png';
            el.style.color = '#ff2a2a';
            el.style.textShadow = '0 0 8px #fff, 0 0 16px #ff2a2a, 0 2px 8px #000';
            el.style.fontSize = '2.7em';
            el.style.fontWeight = '900';
            el.style.animationDuration = '1.1s';
        } else {
            foodImg.src = 'img/food_normal.png';
        }
        foodImg.style.width = '38px';
        foodImg.style.height = '38px';
        foodImg.style.verticalAlign = 'middle';
        foodImg.style.marginLeft = '8px';
        el.appendChild(foodImg);
        const angle = Math.random() * 2 * Math.PI;
        const radius = 120 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        el.style.left = `calc(50% + ${x}px)`;
        el.style.top = `calc(50% + ${y}px)`;
        this.content.style.position = 'relative';
        this.content.appendChild(el);
        setTimeout(() => el.remove(), type === ClickType.LEGENDARY ? 1200 : (type === ClickType.CRIT ? 1100 : 800));
    }
}

class ClickerWS {
    constructor(onUpdate, onPong) {
        this.ws = null;
        this.onUpdate = onUpdate;
        this.onPong = onPong;
        this.lastCount = 0;
        this.goal = 0;
        this.connect();
    }
    connect() {
        this.ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws');
        startPing(this.ws);
        this.ws.onmessage = (e) => {
            try {
                let data = JSON.parse(e.data);
                if (data.pong) {
                    if (this.onPong) this.onPong(data);
                    return;
                }
                if (data.count !== undefined) {
                    if (data.count > this.lastCount) {
                        this.onUpdate(data.count, this.goal, data.count - this.lastCount, data);
                    } else {
                        this.onUpdate(data.count, this.goal, 0, data);
                    }
                    this.lastCount = data.count;
                    if (data.goal !== undefined) {
                        this.goal = data.goal;
                    }
                }
                if (data.online !== undefined) {
                    if (this.onPong) this.onPong(data);
                }
                if (data.goal !== undefined && data.count === undefined) {
                    this.goal = data.goal;
                    this.onUpdate(this.lastCount, this.goal, 0, data);
                }
            } catch {}
        };
        this.ws.onclose = () => {
            if (pingInterval) clearInterval(pingInterval);
            setTimeout(() => this.connect(), 1000);
        };
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

// ClickerWS: поддержка передачи online и ping/pong
function startPing(ws) {
    if (window.pingInterval) clearInterval(window.pingInterval);
    window.pingInterval = setInterval(() => {
        if (ws && ws.readyState === 1) {
            ws.send(JSON.stringify({action: 'ping'}));
        }
        if (window.lastPong && Date.now() - window.lastPong > 10000) {
            const onlineInfo = document.getElementById('online-info');
            if (onlineInfo) onlineInfo.textContent = 'Онлайн: —';
        }
    }, 4000);
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
    const onlineInfo = document.getElementById('online-info');

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

    // Скрываем прогрессбар до ws, но сразу обновляем его (будет пустой)
    goalBar.setGoal(0);
    goalBar.setCount(0);
    const goalBarContainer = document.querySelector('.goal-bar');
    if (goalBarContainer) goalBarContainer.style.visibility = 'hidden';

    let lastPong = Date.now();
    let pingInterval = null;
    function setOnline(val) {
        if (onlineInfo) {
            if (val === 1 || val === '1') {
                onlineInfo.textContent = 'Онлайн: только вы!';
            } else {
                onlineInfo.textContent = `Онлайн: ${val}`;
            }
        }
    }
    function startPing(ws) {
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws && ws.readyState === 1) {
                ws.send(JSON.stringify({action: 'ping'}));
            }
            // если долго нет pong — считаем оффлайн
            if (Date.now() - lastPong > 10000) setOnline('—');
        }, 4000);
    }
    // Генерируем userId для чата (на сессию)
    let userId = localStorage.getItem('chatUserId');
    if (!userId) {
        userId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
        localStorage.setItem('chatUserId', userId);
    }

    let clickTypeRange = {
        normal: [1, 1],
        crit: [5, 10],
        legendary: [11, 20],
    };

    const ws = new ClickerWS((count, goal, diff, extra) => {
        if (goalBarContainer) goalBarContainer.style.visibility = 'visible';
        goalBar.setGoal(goal);
        goalBar.setCount(count);
        if (extra && extra.online !== undefined) setOnline(extra.online);
        // Показываем анимацию только если есть clickType и clickValue
        if (extra && extra.clickType && extra.clickValue > 0) {
            floating.show(extra.clickValue, extra.clickType);
            animateImg();
            if ((extra.clickType === ClickType.CRIT || extra.clickType === ClickType.LEGENDARY) && goalBarContainer) {
                goalBarContainer.classList.add('goal-bar-crit');
                setTimeout(() => goalBarContainer.classList.remove('goal-bar-crit'), extra.clickType === ClickType.LEGENDARY ? 900 : 600);
            }
        }
    }, (extra) => {
        if (extra && extra.online !== undefined) setOnline(extra.online);
        lastPong = Date.now();
    });

    img.addEventListener('click', function() { 
        animateImg();
        // Генерируем значение и тип клика на фронте, но отображаем только по данным с сервера
        let value = clickTypeRange.normal[0];
        const r = Math.random();
        if (r < 0.05) {
            const [min, max] = clickTypeRange.legendary;
            value = min + Math.floor(Math.random() * (max - min + 1));
        } else if (r < 0.25) {
            const [min, max] = clickTypeRange.crit;
            value = min + Math.floor(Math.random() * (max - min + 1));
        }
        ws.sendClick(value);
    });
});