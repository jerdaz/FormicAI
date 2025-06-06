const U = require('./util')
const c = require('./constants');
const Debug = require('./debug');

const MAX_OPERATION_CPU = Game.cpu.tickLimit;
const AVG_FACTOR = 0.1;

//unique id of Operation
let idIndex = 0;

module.exports = class Operation {
    /** aggregated cpu statistics */
    static cpuStats = {};
    /** set of all instantiated operations */
    static allOps = new Set();

    /** reset aggregated cpu stats */
    static resetCpuStats() { this.cpuStats = {}; }
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

        this._cpuLast = 0;
        this._cpuAvg = 0;

        Operation.allOps.add(this);
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

    get cpuLast() {return this._cpuLast}
    get cpuAvg() {return this._cpuAvg}

    getCpuRecursive() {
        let cpu = this._cpuAvg;
        for (let childOps of this._childOps) {
            if (childOps) for (let childOp of childOps) cpu += childOp.getCpuRecursive();
        }
        return cpu;
    }


    initTick() {
        if (this._childOps.length > 0) {
            for(let childOps of this._childOps) {
                if (childOps) for(let childOp of childOps) childOp.initTick();
            }
        }
    }

    run() {

        let cpuStart = Game.cpu.getUsed();
        let prev = cpuStart;
        let selfCpu = 0;

        if (this._verboseAll) (U.l({RUNNING: this.constructor.name, name: this.name}))

        if (this._bFirstRun) {
            try {
                this._firstRun();
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
            this._bFirstRun = false;
        }
        selfCpu += Game.cpu.getUsed() - prev; prev = Game.cpu.getUsed();

        if (this._runStrategy || Game.time % c.STRATEGY_INTERVAL == this._tickOffset % c.STRATEGY_INTERVAL) {
            try {
                this._strategy();
                if (this._runStrategy) this._runStrategy = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }
        selfCpu += Game.cpu.getUsed() - prev; prev = Game.cpu.getUsed();

        if (this._runTactics || Game.time % c.TACTICS_INTERVAL == this._tickOffset % c.TACTICS_INTERVAL) {
            try {
                this._tactics();
                if (this._runTactics) this._runTactics = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }
        selfCpu += Game.cpu.getUsed() - prev; prev = Game.cpu.getUsed();

        try {
            this._command();
        } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        selfCpu += Game.cpu.getUsed() - prev; prev = Game.cpu.getUsed();

        for (let childOps of this._childOps) if(childOps) for (let childOp of childOps) {
            try {
                childOp.run();
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)}
        }
        prev = Game.cpu.getUsed();
        if (this._runSupport || Game.time % c.SUPPORT_INTERVAL == this._tickOffset) {
            try {
                this._support();
                if (this._runSupport) this._runSupport = false;
            } catch(err) {Debug.logError(/**@type {Error}*/ (err), this.name)};
        }
        selfCpu += Game.cpu.getUsed() - prev;

        this._cpuLast = selfCpu;
        this._cpuAvg = this._cpuAvg * (1 - AVG_FACTOR) + selfCpu * AVG_FACTOR;

        let key = this.constructor.name;
        if (!Operation.cpuStats[key]) Operation.cpuStats[key] = {last:0, avg:0};
        Operation.cpuStats[key].last += selfCpu;
        Operation.cpuStats[key].avg = Operation.cpuStats[key].avg * (1 - AVG_FACTOR) + selfCpu * AVG_FACTOR;

        if (Game.cpu.getUsed() - cpuStart > MAX_OPERATION_CPU) {
            Game.notify(JSON.stringify({CPUWARNING: this.name, OPERATIONTYPE: this.constructor.name, cpuStart: cpuStart, cpuUsed: Game.cpu.getUsed() - cpuStart}));
        }
    }

    /**@param {ChildOp} childOp */
    addChildOp(childOp) {
        if (this._childOps[childOp.type] == undefined) this._childOps[childOp.type] = [];
        this._childOps[childOp.type].push(childOp);
        Operation.allOps.add(childOp);
    }

    /**@param {ChildOp} childOp 
     * @param {boolean} [recursive]
    */
    removeChildOp(childOp, recursive) {
        this._childOps[childOp.type] = _.pull(this._childOps[childOp.type], childOp)
        Operation.allOps.delete(childOp);
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


