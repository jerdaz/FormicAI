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
        if(this._debug.verbose) {
            U.l('Strategy: ' + this.constructor.name + ', state:')
            U.l(this);
        }
        try {
            this._strategy();
        } catch(err) {this._debug.logError(err)};
        if(this._debug.verbose) {
            U.l('Command: ' + this.constructor.name + ', state:')
            U.l(this);
        }
        try {
            this._command();
        } catch(err) {this._debug.logError(err)};
        if (this._firstRun) this._firstRun = false;
        if(this._debug.verbose) {
            U.l('End: ' + this.constructor.name + ', state:')
            U.l(this);
            this._debug.printErrors();
        }
    }

    _support() {}
    _strategy() {}
    _command() {}
}
