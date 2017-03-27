class Dispatcher {

    constructor() {
        this.clear();
    }

    getCallback() {
        return this.call.bind(this);
    }

    call(...args) {
        var mustContinue = undefined;
        var i = 0;
        while(i < this.entries.length && mustContinue !== false) {
            mustContinue = this.entries[i++].callback(...args);
        }
    }

    add(callback, priority) {
        var entry = {
            callback: callback,
            priority: priority || 0
        };
        if (-1 === this.entries.indexOf(entry)) {
            this.entries.push(entry);
            this.sort();
        }
    }

    remove(callback) {
        this.entries = this.entries.filter(
            e => e.callback !== callback
        )
    }

    clear() {
        this.entries = [];
    }

    sort() {
        this.entries.sort(
            (a, b) => a.priority === b.priority ? 0 : (a.priority < b.priority ? 1 : -1)
        );
    }
}
