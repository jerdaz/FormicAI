let U = require('./util')

const c = require('./constants');

//unique id of Operation
let idIndex = 0;

module.exports = class Operation {
    constructor() {
        this._id = idIndex++;
        this._firstRun = true;
    }

    run() {
        try {
            this._strategy();
        } catch(err) {Game.debug.log_error(err)};
        try {
            this._command();
        } catch(err) {Game.debug.log_error(err)};
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
