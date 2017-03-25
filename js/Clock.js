
const REF_BPM = 60;

class Clock {

    constructor() {
        this.bpm = 60;
        this.offset = 0;
    }

    toLocal(time) {
        return (time - this.offset) * this.bpm / REF_BPM;
    }

    toGlobal(time) {
        return time * REF_BPM / this.bpm + this.offset;
    }

    now() {
        return this.toLocal(performance.now());
    }

    reset(time) {
        this.offset = this.toGlobal(time);
    }
}
