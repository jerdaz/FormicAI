const U = require('./util')
const c = require('./constants');

const SUPPORT_INTERVAL = 1000
const STRATEGY_INTERVAL = 100
const TACTICS_INTERVAL = 10

//unique id of Operation
let idIndex = 0;

module.exports = class Operation {
    constructor() {
        this._id = idIndex++;
        this._bFirstRun = true;
        /**@type {ChildOp[][]} */
        this._childOps = []
        /**@type {Debug} */
        this._debug = /** @type {any}*/(Game).debug;
        this._tickOffset = _.random(0,SUPPORT_INTERVAL - 1)
    }

    get type() {
        return c.OPERATION_NONE;
    }

    get childOps() {
        return this._childOps;
    }

    get id() {return this._id}


    initTick() {
        if (this._childOps.length > 0) {
            for(let childOps of this._childOps) {
                if (childOps) for(let childOp of childOps) childOp.initTick();
            }
        }
    }

    run() {
        //last resort cpu overflow prevention.
        if (Game.cpu.bucket < Game.cpu.getUsed() + Game.cpu.limit) throw Error('Out of CPU');

        if (this._bFirstRun) {
            if(this._debug.verbose) this._debug.logState('firstRun', this)
            try {
                this._firstRun();
                this._bFirstRun = false;
            } catch(err) {this._debug.logError(err)};
        }

        if (this._runSupport || Game.time % SUPPORT_INTERVAL == this._tickOffset) {
            if(this._debug.verbose) this._debug.logState('support', this)
            try {
                this._support();
                if (this._runSupport) this._runSupport = false;
            } catch(err) {this._debug.logError(err)};
        }
        if (this._runStrategy || Game.time % STRATEGY_INTERVAL == this._tickOffset % STRATEGY_INTERVAL) {
            if(this._debug.verbose) this._debug.logState('strategy', this)
            try {
                this._strategy();
                if (this._runStrategy) this._runStrategy = false;
            } catch(err) {this._debug.logError(err)};
        }
        if (this._runTactics || Game.time % TACTICS_INTERVAL == this._tickOffset % TACTICS_INTERVAL) {
            if(this._debug.verbose) this._debug.logState('tactics', this)
            try {
                this._tactics();
                if (this._runTactics) this._runTactics = false;
            } catch(err) {this._debug.logError(err)};
        }
        if(this._debug.verbose) this._debug.logState('command', this)
        try {
            this._command();
        } catch(err) {this._debug.logError(err)};
        for (let childOps of this._childOps) if(childOps) for (let childOp of childOps) {
            try {
                childOp.run();
            } catch(err) {this._debug.logError(err)}
        }
        if(this._debug.verbose) this._debug.logState('end', this)
    }

    /**@param {ChildOp} childOp */
    _addChildOp(childOp) {
        if (this._childOps[childOp.type] == undefined) this._childOps[childOp.type] = [];
        this._childOps[childOp.type].push(childOp);
    }

    /**@param {ChildOp} childOp */
    _removeChildOp(childOp) {
        this._childOps[childOp.type] = _.pull(this._childOps[childOp.type], childOp)
    }

    _firstRun() {}
    _support() {}
    _strategy() {}
    _tactics() {}
    _command() {}
}


