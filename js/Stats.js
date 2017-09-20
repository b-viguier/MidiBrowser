class Stats {
    constructor() {
        this.max_peak = 0;
        this.msg_per_second = 0;

        this.message_counter = 0;
        this.last_refresh = 0;
    }

    getWatchedOutput(outputCallback) {
        var stats = this;
        return function(data, timestamp) {
            ++stats.message_counter;
            return outputCallback(data, timestamp);
        }
    }
    
    refresh() {
        const now = performance.now();
        this.msg_per_second = Math.floor(1000*this.message_counter / (now - this.last_refresh));
        this.max_peak = Math.max(this.max_peak, this.msg_per_second);
        this.message_counter = 0;
        this.last_refresh = now;
    }
}