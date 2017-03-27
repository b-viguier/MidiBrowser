class Recorder {

    constructor(clock, inputDispatcher) {
        this.track = new Track();
        this.input = inputDispatcher;
        this.enabled = false;
        this.clock = clock;
    }

    toggle() {
        return this.isEnabled() ? this.disable() : this.enable();
    }

    isEnabled() {
        return this.enabled;
    }

    enable() {
        this.track.clear();
        this.input.add(this.getInputCallback(), -10);
        this.enabled = true;
        return true;
    }

    disable() {
        this.input.remove(this.getInputCallback());
        this.enabled = false;
        return true;
    }

    getInputCallback() {
        return this.callback || (this.callback = (function (event) {
                this.track.push({
                    data: event.data,
                    timeStamp: this.clock.toLocal(event.timeStamp)
                });
            }).bind(this));
    }
}
