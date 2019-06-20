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
        } catch(error) {U.log_error(err)};
        try {
            this._strategy();
        } catch(error) {U.log_error(err)};
        try {
            this._command();
        } catch(error) {U.log_error(err)};
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
