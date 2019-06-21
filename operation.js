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
        // @ts-ignore
        if(Game.debug.verbose) U.l (this);
        let err;
        try {
            this._strategy();
        } catch(error) {U.log_error(error)};
        try {
            this._command();
        } catch(error) {U.log_error(error)};
        if (this._firstRun) this._firstRun = false;
    }

    _support() {}
    _strategy() {}
    _command() {}
}
