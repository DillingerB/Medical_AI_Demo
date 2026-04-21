class TimerManager {
    //the very construction of time itself, scary right?
    constructor() {
        this.intervalId = null;
    }

    //GO
    start() {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.tick(), 1000);
    }

    //basically stays no time
    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    //The actual timer
    tick() {
        let remainingTimes = [];

        prescriptions.items.forEach(m => {
            document.querySelectorAll(`[id="t-${m.id}"]`).forEach(el => {
            if (!m.last_taken) {
                el.innerText = "Not started";
                return;
            }

            const limit = m.value * 3600;
            const remaining = Math.max(0, limit - (Date.now() - new Date(m.last_taken).getTime()) / 1000);

            const h = Math.floor(remaining / 3600);
            const m2 = Math.floor((remaining % 3600) / 60);
            const s = Math.floor(remaining % 60);

            el.innerText = `${h}:${this.pad(m2)}:${this.pad(s)}`;

            if (remaining > 0) remainingTimes.push(remaining);
        });
    });

        const closestEl = document.getElementById("closestTimer");
        if(!closestEl) return;

        if (remainingTimes.length === 0) {
            closestEl.innerText = "None";
        } else {
            remainingTimes.sort((a,b) => a - b);
            const closest = remainingTimes[0];
            const h = Math.floor(closest / 3600);
            const m = Math.floor((closest % 3600) / 60);
            const s = Math.floor(closest % 60);
            closestEl.innerText = `${h}:${this.pad(m)}:${this.pad(s)}`;
        }
    }

    pad(n) {
        return String(n).padStart(2, "0");
    }
}
const timer = new TimerManager();