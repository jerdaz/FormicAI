const U = require('./util')
const c = require('./constants');
const Debug = require('./debug');

const MAX_OPERATION_CPU = Game.cpu.tickLimit;

//unique id of Operation
let idIndex = 0;

module.exports = class Operation {
    constructor() {
        this._id = idIndex++;
        this._bFirstRun = true;
        /**@type {ChildOp[][]} */
        this._childOps = []
        // @ts-ignore
        this._debug = Debug;
        this._tickOffset = _.random(0,c.SUPPORT_INTERVAL - 1)
        this._verbose = false;
        this._verboseAll = false // if true, log all running operations
        this._tickFirstLog = true;
    }

    get type() {
        return c.OPERATION_NONE;
    }

    get name() {
        return '';
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
        let cpuStart = Game.cpu.getUsed();
        // if (cpuStart < 0) cpuStart = 0; //workaround for strange bug with negative cpu counter;
        // if (Game.cpu.bucket < cpuStart + Game.cpu.limit) {
        //     U.l('Warning out of CPU in operation ' + this.name);
        //     return;
        // }
        if (this._verboseAll) (U.l({RUNNING: this.constructor.name, name: this.name}))

        if (this._bFirstRun) {
            try {
                this._firstRun();
                this._bFirstRun = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }

        if (this._runStrategy || Game.time % c.STRATEGY_INTERVAL == this._tickOffset % c.STRATEGY_INTERVAL) {
            try {
                this._strategy();
                if (this._runStrategy) this._runStrategy = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }
        if (this._runTactics || Game.time % c.TACTICS_INTERVAL == this._tickOffset % c.TACTICS_INTERVAL) {
            try {
                this._tactics();
                if (this._runTactics) this._runTactics = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }
        try {
            this._command();
        } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        for (let childOps of this._childOps) if(childOps) for (let childOp of childOps) {
            try {
                childOp.run();
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)}
        }
        if (this._runSupport || Game.time % c.SUPPORT_INTERVAL == this._tickOffset) {
            try {
                this._support();
                if (this._runSupport) this._runSupport = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }
        if (Game.cpu.getUsed() - cpuStart > MAX_OPERATION_CPU) {
            Game.notify(JSON.stringify({CPUWARNING: this.name, OPERATIONTYPE: this.constructor.name, cpuStart: cpuStart, cpuUsed: Game.cpu.getUsed() - cpuStart}));
        }
    }

    /**@param {ChildOp} childOp */
    addChildOp(childOp) {
        if (this._childOps[childOp.type] == undefined) this._childOps[childOp.type] = [];
        this._childOps[childOp.type].push(childOp);
    }

    /**@param {ChildOp} childOp 
     * @param {boolean} [recursive]
    */
    removeChildOp(childOp, recursive) {
        this._childOps[childOp.type] = _.pull(this._childOps[childOp.type], childOp)
        if (recursive) {
            let parent = childOp
            for (let childOps of parent.childOps) {
                if (childOps && childOps.length>0) {
                    for (let childOp of childOps) {
                        if (childOp) parent.removeChildOp(childOp, recursive)
                    }
                }
            }
        }
    }

    _firstRun() {}
    _support() {}
    _strategy() {}
    _tactics() {}
    _command() {}

    /**
     * @param {any} message 
     */
    _log(message) {
        if (this._verbose && this._tickFirstLog) {
            U.l('== RUN OP: ' + this.constructor.name + ' ' + this.name + ' ==')
            this._tickFirstLog = false;
        } 
        if (this._verbose) U.l(message)
    }
}


