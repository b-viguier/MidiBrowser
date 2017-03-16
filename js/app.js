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
                    this.$data.player.output = function(event, timestam) {};
                }
            }
        },
        methods: {
            onRecordClicked: function () {
                this.$data.recorder.toggle();
                if (this.isRecording) {
                    if (!this.isPlaying) {
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
                if (!this.isPlaying) {
                    this.$data.recorder.disable();
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
                return this.$data.player.isEnabled();
            }
        }
    });

    function delayedPlayCallback(event) {
        if (Recorder.isIgnored(event)) return;

        app.$data.player.enable(event.timeStamp);
        inputDispatcher.remove(delayedPlayCallback);
    }

    function midiThruCallback(event) {
        app.$data.midi.output.send(event.data);
    }

})();
