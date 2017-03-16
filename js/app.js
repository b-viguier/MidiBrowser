(function () {

    var inputDispatcher = new Dispatcher();

    var data = {
        midi: {
            error: null,
            access: null,
            input: null,
            output: null
        },
        recorder: new Recorder(inputDispatcher),
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
                this.$data.recorder.toggle();
                if (!this.isRecording) {
                    inputDispatcher.remove(pendingRecordCallback);
                    // When stopping record for first time, init a play session
                    if (this.$data.player.trackDuration === 999999999) {
                        this.$data.player.trackDuration = performance.now() - this.$data.player.startTime;
                    }
                } else {
                    if (!this.isPlaying) {
                        inputDispatcher.push(pendingRecordCallback);
                    }

                    this.$data.player.tracks.push(new Track());
                }
            },
            onPlayClicked: function (now) {
                if (this.isPlaying) {
                    flushRecordBuffer();
                    this.$data.player.startTime = null;
                    clearInterval(this.$data.player.intervalId);
                    this.$data.player.intervalId = null;
                    //TODO: send all note off
                } else if (this.isValidOutput) {
                    this.$data.player.intervalId = setInterval(playCallback, this.$data.player.timeAccuracy);
                    playInit(now || performance.now())
                }
            },
            onThruClicked: function (isEnabled) {
                if (isEnabled) {
                    inputDispatcher.push(midiThruCallback);
                } else {
                    inputDispatcher.remove(midiThruCallback);
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
                return this.$data.recorder.isEnabled();
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

    function midiThruCallback(event) {
        app.$data.midi.output.send(event.data);
    }

    function playCallback() {
        var now = performance.now();
        var timeLimit = now - app.$data.player.startTime + app.$data.player.timeAccuracy;
        playTracks(timeLimit);
        // Loop
        if (timeLimit > app.$data.player.trackDuration) {
            flushRecordBuffer();
            playInit(now);
            playTracks(timeLimit - app.$data.player.trackDuration);
        }
    }

    function playInit(now) {
        app.$data.player.startTime = now;
        app.$data.player.tracks.forEach(t => t.rewind());
    }

    function playTracks(timeLimit) {
        app.$data.player.tracks.forEach(function(track) {
            track.playTo(timeLimit, function(event, timestamp) {
                app.$data.midi.output.send(event, timestamp + app.$data.player.startTime);
            })
        });
    }

    function flushRecordBuffer() {
        var newTrack = app.$data.recorder.flushTrack();
        if(!newTrack.isEmpty()) {
            newTrack.fit(-app.$data.player.startTime, app.$data.player.trackDuration);
            app.$data.player.tracks[app.$data.player.tracks.length - 1].merge(newTrack);
        }
    }

})();
