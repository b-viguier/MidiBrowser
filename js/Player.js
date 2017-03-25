class Player {

    constructor(clock, accuracy, outputCallback) {
        this.tracks = [];
        this.accuracy = accuracy;
        this.output = outputCallback;
        this.duration = Number.MAX_SAFE_INTEGER;
        this.inputTrack = null;
        this.clock = clock;
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
        this.rewind(now || this.clock.now());
    }

    disable() {
        this.flushInputTrack();
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    setInputTrack(track) {
        if (track) {
            this.tracks.push(new Track(track.name || 'Track ' + ++this.trackNameCounter));
        } else if (this.inputTrack) {
            this.flushInputTrack();
            if (this.duration === Number.MAX_SAFE_INTEGER) {
                this.duration = this.clock.now();
            }
        }

        this.inputTrack = track;
    }

    rewind(now) {
        this.clock.reset(now);
        this.tracks.forEach(t => t.rewind());
    }

    playCallback() {
        var now = this.clock.now();
        var timeLimit = now + this.accuracy;
        this.playTracks(timeLimit);
        // Loop
        if (timeLimit > this.duration) {
            this.flushInputTrack();
            this.rewind(this.duration);
            this.playTracks(timeLimit - this.duration);
        }
    }

    playTracks(timeLimit) {
        this.tracks.forEach(track =>
            track.playTo(
                timeLimit,
                (data, timestamp) => this.output(data, this.clock.toGlobal(timestamp))
            )
        );
    }

    flushInputTrack() {
        if (!this.inputTrack || this.inputTrack.isEmpty()) {
            return;
        }
        this.inputTrack.loopify(this.duration);
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
