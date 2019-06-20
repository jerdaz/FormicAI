const c = require('./constants');

module.exports = class Operation {
    constructor() {
        this._firstRun = true;
    }

    run() {
        this._support();
        this._strategy();
        this._command();
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
