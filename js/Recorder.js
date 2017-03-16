class Recorder {

    constructor(inputDispatcher) {
        this.track = new Track();
        this.input = inputDispatcher;
        this.enabled = false;
    }

    toggle() {
        return this.isEnabled() ? this.disable() : this.enable();
    }

    isEnabled() {
        return this.enabled;
    }

    enable() {
        this.track.clear();
        this.input.push(this.inputCallback());
        this.enabled = true;
        return true;
    }

    disable() {
        this.input.remove(this.inputCallback());
        this.enabled = false;
        return true;
    }

    inputCallback() {
        return this.callback || (this.callback = (function (event) {
                if (this.ignoreMidiEvent(event)) {
                    return;
                }
                this.track.push({
                    data: event.data,
                    timeStamp: event.timeStamp
                });
            }).bind(this));
    }

    ignoreMidiEvent(event) {
        switch (event.data[0] & 0xf0) {
            case 0x90:  // Note On
            case 0x80:  // Note Off
                return false;
        }
        return true;
    }

    flushTrack() {
        var track = this.track;
        this.track = new Track();
        return track;
    }
}
