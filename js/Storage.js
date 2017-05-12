class Storage {
    constructor(storage) {
        this.storage = storage;
        this.components = [];
        this.configs = new Map(JSON.parse(this.storage.getItem('midi-configs')));

        this.current = 'New Song';
        this.refreshList();
    }

    addComponent(key, saveCallback, loadCallback) {
        this.components.push({
            key: key,
            save: saveCallback,
            load: loadCallback
        });
        return this;
    }

    refreshList() {
        this.list = Array.from(this.configs.keys());
    }

    isModified() {
        console.log('isModified');
        return JSON.stringify(this.currentState()) !== JSON.stringify(this.configs.get(this.current) || {});
    }

    currentState() {
        var state = {};
        this.components.forEach(function (component) {
            state[component.key] = component.save();
        });
        return state;
    }

    load(e) {
        console.log(e);
        var state = this.configs.get(this.current);
        if (state === undefined) {
            return;
        }
        this.components.forEach(function (component) {
            component.load(state[component.key]);
        });
    }

    save() {
        var state = this.currentState();
        this.configs.set(this.current, state);

        this.storage.setItem('midi-configs', JSON.stringify([...this.configs]));
        this.refreshList();
    }

    remove() {
        // TODO
    }
}
