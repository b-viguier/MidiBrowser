class Track {

    constructor(name) {
        this.clear();
        this.name = name || '';
    }

    rewind() {
        this.index = 0;
        this.sort();
    }

    clear() {
        this.events = [];
        this.index = 0;
        this.isSorted = true;
    }

    isEmpty() {
        return this.events.length === 0;
    }

    playTo(time, callback) {
        for (; this.index < this.events.length && this.events[this.index].timeStamp <= time; ++this.index) {
            callback(this.events[this.index].data, this.events[this.index].timeStamp);
        }
    }

    push(event) {
        this.events.push(event);
        this.isSorted = false;
    }

    sort() {
        if (this.isSorted) {
            return;
        }

        this.events.sort(function (event1, event2) {
            return event1.timeStamp === event2.timeStamp ? 0
                : (event1.timeStamp < event2.timeStamp ? -1 : 1);
        });
        this.isSorted = true;
    }

    merge(track) {
        this.events = this.events.concat(track.events);
        this.isSorted = false;
    }

    loopify(duration) {
        this.events.forEach(
            e => e.timeStamp = e.timeStamp % duration
        );
    }
}
