(function () {

    var inputDispatcher = new Dispatcher();

    var data = {
        midi: {
            error: null,
            access: null,
            input: null,
            output: null,
            thru: false
        },
        recorder: {
            buffer: null
        },
        player: {
            tracks: [],
            startTime: null,
            trackDuration: 999999999,
            timeAccuracy: 10,
            intervalId: null
        }
    };

    var app = new Vue({
        el: '#app',
        data: data,

        created: function () {
            navigator.requestMIDIAccess().then(
                function (midiAccess) {
                    app.$data.midi.access = midiAccess;
                    app.$data.midi.access.onstatechange = function () {
                        app.$forceUpdate();
                    };
                },
                function (msg) {
                    app.$data.midi.error = msg;
                }
            );
        },
        watch: {
            "midi.input": function (newInput, oldInput) {

                if (oldInput) {
                    oldInput.onmidimessage = null;
                }
                newInput.onmidimessage = inputDispatcher.getCallback();
            }
        },
        methods: {
            onRecordClicked: function () {
                if (this.isRecording) {
                    flushRecordBuffer();
                    inputDispatcher.remove(recordCallback);
                    inputDispatcher.remove(pendingRecordCallback);
                    this.$data.recorder.buffer = null;
                    // When stopping record for first time, init a play session
                    if (this.$data.player.trackDuration === 999999999) {
                        this.$data.player.trackDuration = performance.now() - this.$data.player.startTime;
                    }
                } else if (this.isValidInput) {
                    if (!this.isPlaying) {
                        inputDispatcher.push(pendingRecordCallback);
                    }
                    inputDispatcher.push(recordCallback);

                    this.$data.recorder.buffer = [];

                    this.$data.player.tracks.push({
                        index: 0,
                        events: []
                    });
                }
            },
            onPlayClicked: function (now) {
                if (this.isPlaying) {
                    this.$data.player.startTime = null;
                    clearInterval(this.$data.player.intervalId);
                    this.$data.player.intervalId = null;
                    //TODO: send all note off
                } else if (this.isValidOutput) {
                    this.$data.player.intervalId = setInterval(playCallback, this.$data.player.timeAccuracy);
                    playInit(now || performance.now())
                }
            }
        },
        computed: {
            isValidInput: function () {
                return this.$data.midi.input instanceof MIDIInput;
            },
            isValidOutput: function () {
                return this.$data.midi.output instanceof MIDIOutput;
            },
            isRecording: function () {
                return this.$data.recorder.buffer !== null;
            },
            isPlaying: function () {
                return this.$data.player.intervalId !== null;
            }
        }
    });

    function discardMidiEvent(event) {
        switch (event.data[0] & 0xf0) {
            case 0x90:  // Note On
            case 0x80:  // Note Off
                return false;
        }
        return true;
    }

    function pendingRecordCallback(event) {
        if (discardMidiEvent(event)) return;

        app.onPlayClicked(event.timeStamp);
        inputDispatcher.remove(pendingRecordCallback);
    }

    function recordCallback(event) {
        if (discardMidiEvent(event)) return;

        app.$data.recorder.buffer.push({
            data: event.data,
            timeStamp: event.timeStamp - app.$data.player.startTime
        });

        if (app.$data.midi.thru) {
            app.$data.midi.output.send(event.data);
        }
    }

    function playCallback() {
        var timeLimit = (performance.now() - app.$data.player.startTime) % app.$data.player.trackDuration + app.$data.player.timeAccuracy;
        playTracks(timeLimit);
        // Loop
        if (timeLimit > app.$data.player.trackDuration) {
            playInit(app.$data.player.startTime + app.$data.player.trackDuration)
            playTracks(timeLimit - app.$data.player.trackDuration);

            // If non empty record buffer, merge it
            if (app.isRecording && app.$data.recorder.buffer.length) {
                flushRecordBuffer();
            }
        }
    }

    function playInit(now) {
        app.$data.player.startTime = now;
        for (var i = 0; i < app.$data.player.tracks.length; ++i) {
            app.$data.player.tracks[i].index = 0;
        }
    }

    function playTracks(timeLimit) {
        for (var i = 0; i < app.$data.player.tracks.length; ++i) {
            playTrack(app.$data.player.tracks[i], timeLimit);
        }
    }

    function playTrack(track, timeLimit) {
        for (; track.index < track.events.length && track.events[track.index].timeStamp <= timeLimit; ++track.index) {
            app.$data.midi.output.send(track.events[track.index].data, track.events[track.index].timeStamp + app.$data.player.startTime);
        }
    }

    function flushRecordBuffer() {
        app.$data.player.tracks[app.$data.player.tracks.length - 1] =
            mergeTracks(
                app.$data.player.tracks[app.$data.player.tracks.length - 1],
                app.$data.recorder.buffer.map(function (event) {
                    event.timeStamp = event.timeStamp % app.$data.player.trackDuration;
                    return event;
                })
            );
    }

    function mergeTracks(track, events) {
        track.events = track.events.concat(events);
        track.events.sort(function (event1, event2) {
            return event1.timeStamp === event2.timeStamp
                ? 0
                : (event1.timeStamp < event2.timeStamp ? -1 : 1);
        });
        return track;
    }

})();
