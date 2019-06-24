let U = require('./util')
const c = require('./constants');
/** @typedef {import('./debug')} Debug */

//unique id of Operation
let idIndex = 0;


module.exports = class Operation {
    constructor() {
        this._id = idIndex++;
        this._firstRun = true;
        /**@type {Debug} */
        this._debug = /** @type {any}*/(Game).debug;
    }

    run() {
        if(this._debug.verbose) this._debug.logState('strategy', this)
        try {
            this._strategy();
        } catch(err) {this._debug.logError(err)};
        if(this._debug.verbose) this._debug.logState('command', this)
        try {
            this._command();
        } catch(err) {this._debug.logError(err)};
        if (this._firstRun) this._firstRun = false;
        if(this._debug.verbose) this._debug.logState('end', this)
    }

    _support() {}
    _strategy() {}
    _command() {}
}
