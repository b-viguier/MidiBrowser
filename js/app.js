(function () {
    var data = {
        midi: {
            error: null,
            access: null,
            input: null,
            output: null
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
                if (newInput) {
                    newInput.onmidimessage = onMidiEvent;
                }
                if (oldInput) {
                    oldInput.onmidimessage = null;
                }
            }
        },
        methods: {}
    });

    function onMidiEvent(event) {
        // Mask off the lower nibble (MIDI channel, which we don't care about)
        switch (event.data[0] & 0xf0) {
            case 0x90:
                if (event.data[2] != 0) {  // if velocity != 0, this is a note-on message
                    console.log("noteOn", event.data[1], event.timeStamp);
                    return;
                }
            // if velocity == 0, fall thru: it's a note-off.
            case 0x80:
                console.log("noteOff", event.data[1], event.timeStamp);
                return;
        }
    }

})();
