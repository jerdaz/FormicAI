let U = require('./util')
const c = require('./constants');
/** @typedef {import('./debug')} Debug */

//unique id of Operation
let idIndex = 0;


module.exports = class Operation {
    constructor() {
        this._id = idIndex++;
        this._firstRun = true;
        /**@type {Operation[]} */
        this._subOps = []
        /**@type {Debug} */
        this._debug = /** @type {any}*/(Game).debug;
    }

    run() {
        //last resort cpu overflow prevention.
        if (Game.cpu.bucket < Game.cpu.getUsed() + Game.cpu.limit) throw Error('Out of CPU');

        if(this._debug.verbose) this._debug.logState('support', this)
        try {
            this._support();
        } catch(err) {this._debug.logError(err)};
        if(this._debug.verbose) this._debug.logState('strategy', this)
        try {
            this._strategy();
        } catch(err) {this._debug.logError(err)};
        if(this._debug.verbose) this._debug.logState('command', this)
        try {
            this._command();
        } catch(err) {this._debug.logError(err)};
        for (let subOp of this._subOps) {
            try {
                subOp.run();
            } catch(err) {this._debug.logError(err)}
        }
        if (this._firstRun) this._firstRun = false;
        if(this._debug.verbose) this._debug.logState('end', this)
    }

    /**@param {Operation} subOp */
    _addSubOp(subOp) {
        this._subOps.push(subOp);
    }

    _support() {}
    _strategy() {}
    _command() {}
}
