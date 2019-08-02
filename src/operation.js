let U = require('./util')
const c = require('./constants');
/** @typedef {import('./debug')} Debug */

//unique id of Operation
let idIndex = 0;


class Operation {
    constructor() {
        this._id = idIndex++;
        this._firstRun = true;
        /**@type {ChildOp[][]} */
        this._childOps = []
        /**@type {Debug} */
        this._debug = /** @type {any}*/(Game).debug;
    }

    get type() {
        return c.OPERATION_NONE;
    }

    get childOps() {
        return this._childOps;
    }

    get id() {return this._id}


    initTick() {
        for(let childOps of this._childOps) for(let childOp of childOps) childOp.initTick();
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
        for (let childOps of this._childOps) for (let childOp of childOps) {
            try {
                childOp.run();
            } catch(err) {this._debug.logError(err)}
        }
        if (this._firstRun) this._firstRun = false;
        if(this._debug.verbose) this._debug.logState('end', this)
    }

    /**@param {ChildOp} childOp */
    _addChildOp(childOp) {
        if (this._childOps[childOp.type] == undefined) this._childOps[childOp.type] = [];
        this._childOps[childOp.type].push(childOp);
    }

    _support() {}
    _strategy() {}
    _command() {}
}

class ChildOp extends Operation{
    /**@param {Operation} parent */
    constructor(parent) {
        super()
        this._parent = parent;
    }
}


module.exports.Operation = Operation;
module.exports.ChildOp = ChildOp;

