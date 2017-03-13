(function () {
    var data = {
        midi: {
            error: null,
            access: null,
            input: null,
            output: null
        },
        recorder: {
            buffer: null
        },
        player: {
            tracks: [],
            startTime: null,
            trackDuration: 999999999,
            lastTime: 0,
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
                var currentCallback = null;
                if (oldInput) {
                    currentCallback = oldInput.onmidimessage;
                    oldInput.onmidimessage = null;
                }
                if (newInput && currentCallback) {
                    newInput.onmidimessage = currentCallback;
                }
            }
        },
        methods: {
            onRecordClicked: function () {
                if (this.isRecording) {
                    this.$data.midi.input.onmidimessage = null;
                    this.$data.recorder.buffer = null;
                    // When stopping record for first time, init a play session
                    if (this.$data.player.trackDuration === null) {
                        this.$data.player.trackDuration = this.$data.player.trackDuration - preformance.now();
                    }
                } else if (this.isValidInput) {
                    // TODO: Only if all is empty
                    this.$data.midi.input.onmidimessage = pendingRecordCallback;
                    this.$data.recorder.buffer = [];

                    this.$data.player.tracks.push([]);
                }
            },
            onPlayClicked: function (now) {
                if (this.isPlaying) {
                    this.$data.player.startTime = null;
                    clearInterval(this.$data.player.intervalId);
                } else if (this.isValidOutput) {
                    this.$data.player.intervalId = setInterval('playCallback', this.$data.player.timeAccuracy);
                    this.$data.player.startTime = now || performance.now();
                }
            }
        },
        computed: {
            isValidInput: function () {
                return this.$data.midi.input instanceof MIDIInput;
            },
            isValidOutput: function () {
                return this.$data.midi.output instanceof MIDIInput;
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
        app.$data.midi.input.onmidimessage = recordCallback;
        recordCallback(event);
    }

    function recordCallback(event) {
        if (discardMidiEvent(event)) return;

        app.$data.recorder.buffer.push({
            data: event.data,
            timeStamp: event.timeStamp - app.$data.player.startTime
        });
    }

    function playCallback() {
        var timeLimit = performance.now() - app.$data.player.startTime + app.$data.player.timeAccuracy;
        playTracks(timeLimit);
        // Loop
        if (timeLimit > app.$data.player.trackDuration) {
            this.$data.player.startTime += app.$data.player.trackDuration;
            for (var i = 0; i < this.$data.player.tracks.length; ++i) {
                this.$data.player.tracks[i].index = 0;
            }
            playTracks(track, timeLimit - app.$data.player.trackDuration);

            // If non empty record buffer, merge it
            if(this.$data.recorder.buffer.length) {
                this.$data.player.tracks[this.$data.player.tracks - 1] =
                    mergeTracks(
                        this.$data.player.tracks[this.$data.player.tracks - 1],
                        this.$data.recorder.buffer.map(function(event) {
                            event.timeStamp = event.timeStamp % app.$data.player.trackDuration;
                            return event;
                        })
                    );
            }
        }
    }

    function playTracks(timeLimit) {
        for (var i = 0; i < this.$data.player.tracks.length; ++i) {
            playTrack(this.$data.player.tracks[i], timeLimit);
        }
    }

    function playTrack(track, timeLimit) {
        for (var i = track.index; i < track.events.length && track.events[i].timeStamp <= timeLimit; ++i) {
            app.$data.midi.output.send(track.events[i].data, track.events[i].timeStamp + app.$data.player.startTime);
        }
    }

    function mergeTracks(track1, track2) {
        var track = {
            index: 0,
            data: track1.combine(track2)
        };
        track.data.sort(function (event1, event2) {
            return event1.timeStamp === event2.timeStamp
                ? 0
                : (event1.timeStamp < event2.timeStamp ? -1 : 1);
        });
    }

})();
