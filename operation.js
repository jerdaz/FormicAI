const c = require('./constants');

module.exports = class Operation {
    constructor() {
        this._firstRun = true;
    }

    run() {
        try {
            this._support();
        } catch(error) {throw error};
        try {
            this._strategy();
        } catch(error) {throw error};
        try {
            this._command();
        } catch(error) {throw error};
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
