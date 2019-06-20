const c = require('./constants');

module.exports = class Operation {
    constructor() {
        this._firstRun = true;
    }

    run() {
        let err;
        try {
            this._support();
        } catch(error) {err = error};
        try {
            this._strategy();
        } catch(error) {err = error};
        try {
            this._command();
        } catch(error) {err = error};
        if (this._firstRun) this._firstRun = false;
        throw err;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
