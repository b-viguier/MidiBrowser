(function () {

    Vue.component('panel', {
        template: '#panel',
        props: ['title'],
        data: function () {
            return {
                visible: true
            }
        }
    });

    var inputDispatcher = new Dispatcher();
    var clock = new Clock();

    var doNothingCallback = function () {
    };

    const PRIORITY_FILTERING = 10000;
    const PRIORITY_MAPPING = 1000;
    const PRIORITY_THRU = 100;
    const PRIORITY_PENDING = 10;
    const PRIORITY_RECORDING = 0;

    // Midi Filtering
    inputDispatcher.add(
        function (event) {
            switch (event.data[0] & 0xf0) {
                case 0x90:  // Note On
                case 0x80:  // Note Off
                    return;
            }
            return inputDispatcher.STOP_PROPAGATION;
        },
        PRIORITY_FILTERING
    );

    var data = {
        midi: {
            error: null,
            access: null,
            input: null,
            output: null,
            channelMap: -1
        },
        clock: clock,
        recorder: new Recorder(clock, inputDispatcher, PRIORITY_RECORDING),
        player: new Player(clock, 10, doNothingCallback),
        storage: new Storage(window.localStorage)
    };

    data.storage
        .addComponent(
            'clock',
            data.clock.save.bind(data.clock),
            data.clock.load.bind(data.clock)
        );

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
                    this.$data.player.output = doNothingCallback;
                }
            },
            "midi.channelMap": function (newChan) {
                if (newChan >= 0) {
                    inputDispatcher.add(channelMapCallback, PRIORITY_MAPPING);
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
                        inputDispatcher.add(delayedPlayCallback, PRIORITY_PENDING);
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
                    inputDispatcher.add(midiThruCallback, PRIORITY_THRU);
                } else {
                    inputDispatcher.remove(midiThruCallback);
                }
            },
            allNotesOff: function () {
                for (var channel = 0; channel < 16; ++channel) {
                    this.$data.player.output(
                        [0xB0 + channel, 0x7B, 0x00], // All notes off
                        0   // Now
                    );
                }
            },
            createMetronomeTrack(nbBeats) {
                var track = new Track("Metronome");
                var duration = this.$data.clock.fillBpmTrack(track, nbBeats);
                this.$data.player.setInputTrack(track);
                this.$data.player.setInputTrack(null);
                this.$data.player.duration = duration;
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
        app.$data.player.enable(clock.toLocal(event.timeStamp));
        inputDispatcher.remove(delayedPlayCallback);
        return inputDispatcher.REMOVE_CALLBACK;
    }

    function midiThruCallback(event) {
        app.$data.midi.output.send(event.data);
    }

    function channelMapCallback(event) {
        event.data[0] &= 0xf0;
        event.data[0] |= app.$data.midi.channelMap;
    }

})();
