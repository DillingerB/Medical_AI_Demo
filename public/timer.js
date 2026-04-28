class TimerManager {
    //the very construction of time itself, scary right?
    constructor() {
        this.intervalId = null;
    }

    //starts the timer.
    start() {
        if (this.intervalId) return;
        this.intervalId = setInterval(() => this.tick(), 1000);
    }

    //stops the timer
    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    //The actual timer
    tick() {
        let remainingTimes = [];

        //for each timer on patients card system.
        prescriptions.items.forEach(m => {
            document.querySelectorAll(`[id="t-${m.id}"]`).forEach(el => {
            
            //if the take pills button has not been pressed yet, timer says "Not Started"
            if (!m.last_taken) {
                el.innerText = "Not started";
                return;
            }

            //limit starts as an hour (3600 seconds in an hour)
            const limit = m.value * 3600;
            //remaining is what is left on the timer, time it started minus time current / 1000 (for mimicing seconds)
            const remaining = Math.max(0, limit - (Date.now() - new Date(m.last_taken).getTime()) / 1000);

            //each hour is the remaining time divided by hour (seconds hour)
            const h = Math.floor(remaining / 3600);
            //minutes - remainder of remaining and 3600 divided by 60
            const m2 = Math.floor((remaining % 3600) / 60);
            // remaining number from minutes is the seconds.
            const s = Math.floor(remaining % 60);

            //prints as hours : minutes : seconds
            el.innerText = `${h}:${this.pad(m2)}:${this.pad(s)}`;

            //if the remaining time is 0 (00:00:00), then we push the remaining times
            if (remaining > 0) remainingTimes.push(remaining);
        });
    });

    //timer for closest prescription to take
        const closestEl = document.getElementById("closestTimer");
        if(!closestEl) return;

        //if their is no time (all timers are 0, or false) then closest timer reads "none"
        if (remainingTimes.length === 0) {
            closestEl.innerText = "None";

            //else, we sort the timers
        } else {

            //compare timers, if timer a is shorter than timer b, then print timer a
            remainingTimes.sort((a,b) => a - b);
            //closest timer currently set to 0
            const closest = remainingTimes[0];
            //same timer as before
            const h = Math.floor(closest / 3600);
            const m = Math.floor((closest % 3600) / 60);
            const s = Math.floor(closest % 60);
            //same print method as before
            closestEl.innerText = `${h}:${this.pad(m)}:${this.pad(s)}`;
        }
    }

    //have timer as 00:00:00
    pad(n) {
        return String(n).padStart(2, "0");
    }
}

//new timer data.
const timer = new TimerManager();