let U = require('./util')
const c = require('./constants');

module.exports = class Operation {
    constructor() {
        this._firstRun = true;
    }

    run() {
        let err;
        try {
            this._support();
        } catch(error) {U.l(err)};
        try {
            this._strategy();
        } catch(error) {U.l(err)};
        try {
            this._command();
        } catch(error) {U.l(err)};
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
