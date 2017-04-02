class Dispatcher {

    constructor() {
        this.clear();
    }

    getCallback() {
        return this.call.bind(this);
    }

    call(...args) {
        var callbackStatus;
        for (var i = 0; i < this.entries.length; ++i) {
            callbackStatus = this.entries[i].callback(...args);
            if (callbackStatus === this.STOP_PROPAGATION) {
                break;
            }
            if (callbackStatus === this.REMOVE_CALLBACK) {
                this.remove(this.entries[i--]);
            }
        }
    }

    add(callback, priority) {
        var entry = {
            callback: callback,
            priority: priority
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

Dispatcher.prototype.STOP_PROPAGATION = 1;
Dispatcher.prototype.REMOVE_CALLBACK = 2;
