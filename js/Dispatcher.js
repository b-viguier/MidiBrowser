class Dispatcher {

    constructor() {
        this.clear();
    }

    getCallback() {
        return this.call.bind(this);
    }

    call(...args) {
        this.callbacks.forEach(function (f) {
            f(...args);
        });
    }

    push(callback) {
        if (-1 === this.callbacks.indexOf(callback)) {
            this.callbacks.push(callback);
        }
    }

    remove(callback) {
        this.callbacks = this.callbacks.filter(function (f) {
            return f !== callback;
        })
    }

    clear() {
        this.callbacks = [];
    }
}
