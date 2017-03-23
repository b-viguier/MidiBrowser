(function () {

    var inputDispatcher = new Dispatcher();

    var data = {
        midi: {
            error: null,
            access: null,
            input: null,
            output: null,
            channelMap: -1
        },
        recorder: new Recorder(inputDispatcher),
        player: new Player(10, function(event, time) {})
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
                if (oldInput instanceof MIDIInput) {
                    oldInput.onmidimessage = null;
                }
                newInput.onmidimessage = inputDispatcher.getCallback();
            },
            "midi.output": function (newOutput, oldOutput) {
                if (newOutput instanceof MIDIOutput) {
                    this.$data.player.output = newOutput.send.bind(newOutput);
                } else {
                    this.$data.player.output = function(event, timestamp) {};
                }
            },
            "midi.channelMap": function (newChan) {
                if (newChan >= 0) {
                    inputDispatcher.push(channelMapCallback, 1000);
                } else {
                    inputDispatcher.remove(channelMapCallback);
                }
            }
        },
        methods: {
            onRecordClicked: function () {
                this.$data.recorder.toggle();
                if (this.$data.recorder.isEnabled()) {
                    if (!this.$data.player.isEnabled()) {
                        inputDispatcher.push(delayedPlayCallback);
                    }
                    this.$data.player.setInputTrack(this.$data.recorder.track);
                } else {
                    inputDispatcher.remove(delayedPlayCallback);
                    this.$data.player.setInputTrack(null);
                }
            },
            onPlayClicked: function () {
                this.$data.player.toggle();
                if (!this.$data.player.isEnabled()) {
                    this.$data.recorder.disable();
                    this.allNotesOff();
                }
            },
            onThruClicked: function (isEnabled) {
                if (isEnabled) {
                    inputDispatcher.push(midiThruCallback);
                } else {
                    inputDispatcher.remove(midiThruCallback);
                }
            },
            allNotesOff: function() {
                for(var channel = 0; channel < 16; ++channel) {
                    this.$data.player.output(
                        [ 0xB0 + channel, 0x7B, 0x00 ], // All notes off
                        0   // Now
                    );
                }

            }
        },
        computed: {
            isValidInput: function () {
                return this.$data.midi.input instanceof MIDIInput;
            },
            isValidOutput: function () {
                return this.$data.midi.output instanceof MIDIOutput;
            }
        }
    });

    function delayedPlayCallback(event) {
        if (Recorder.isIgnored(event)) return;

        app.$data.player.enable(event.timeStamp);
        inputDispatcher.remove(delayedPlayCallback);
    }

    function midiThruCallback(event) {
        if(Recorder.isIgnored(event)) return;

        app.$data.midi.output.send(event.data);
    }

    function channelMapCallback(event) {
        if(Recorder.isIgnored(event)) return;

        event.data[0] &= 0xf0;
        event.data[0] |= app.$data.midi.channelMap;
    }

})();
