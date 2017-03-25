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

    fillBpmTrack(track, nbBeats) {
        const BEAT_DURATION = 60000 /*milliseconds per minute*/ / REF_BPM;

        const NOTE_ON = 0b10010000;
        const NOTE_OFF = 0b10000000;
        const BEAT_NOTE = 0x25;
        const CHANNEL = 9;
        const VELOCITY = 60;

        for (var i = 0; i < nbBeats; ++i) {
            track.push({
                data: new Uint8Array([NOTE_ON + CHANNEL, BEAT_NOTE, VELOCITY]),
                timeStamp: i * BEAT_DURATION
            });
            track.push({
                data: new Uint8Array([NOTE_OFF + CHANNEL, BEAT_NOTE, 0]),
                timeStamp: (i + 0.5) * BEAT_DURATION
            });
        }

        return nbBeats * BEAT_DURATION;
    }
}
