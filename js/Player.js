class Player {

    constructor(accuracy, outputCallback) {
        this.tracks = [];
        this.accuracy = accuracy;
        this.output = outputCallback;
        this.duration = Number.MAX_SAFE_INTEGER;
        this.inputTrack = null;
        this.startTime = null;
        this.intervalId = null;
        this.trackNameCounter = 0;
    }

    toggle() {
        return this.isEnabled() ? this.disable() : this.enable(false);
    }

    isEnabled() {
        return this.intervalId !== null;
    }

    enable(now) {
        this.intervalId = setInterval(this.playCallback.bind(this), this.accuracy);
        this.rewind(now || performance.now());
    }

    disable() {
        this.flushInputTrack(); // Implicit ?
        clearInterval(this.intervalId);
        this.startTime = null;
        this.intervalId = null;
    }

    setInputTrack(track) {
        if (track) {
            this.tracks.push(new Track('Track ' + ++this.trackNameCounter));
        } else if (this.inputTrack) {
            this.flushInputTrack();
            if (this.duration === Number.MAX_SAFE_INTEGER) {
                this.duration = performance.now() - this.startTime;
            }
        }

        this.inputTrack = track;
    }

    rewind(now) {
        this.startTime = now;
        this.tracks.forEach(t => t.rewind());
    }

    playCallback() {
        var now = performance.now();
        var timeLimit = now - this.startTime + this.accuracy;
        this.playTracks(timeLimit);
        // Loop
        if (timeLimit > this.duration) {
            this.flushInputTrack();
            this.rewind(now);
            this.playTracks(timeLimit - this.duration);
        }
    }

    playTracks(timeLimit) {
        this.tracks.forEach(track =>
            track.playTo(timeLimit, (event, timestamp) => this.output(event, timestamp + this.startTime))
        );
    }

    flushInputTrack() {
        if (!this.inputTrack || this.inputTrack.isEmpty()) {
            return;
        }
        this.inputTrack.fit(-this.startTime, this.duration);
        this.tracks[this.tracks.length - 1].merge(this.inputTrack);
        this.inputTrack.clear();
    }

    removeTrack(track) {
        this.tracks = this.tracks.filter(t => t !== track);
        if (this.tracks.length === 0) {
            this.duration = Number.MAX_SAFE_INTEGER;
        }
    }
}
