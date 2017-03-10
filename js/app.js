(function () {
    var data = {
        midi: {
            error: null,
            access: null,
            accuracy: 10 /*ms*/
        }
    };

    var app = new Vue({
        el: '#app',
        data: data,

        created: function () {
            navigator.requestMIDIAccess().then(
                function (midiAccess) {
                    app.$data.midi.access = midiAccess;
                },
                function (msg) {
                    app.$data.midi.error = msg;
                }
            );
        }
    });


})();
