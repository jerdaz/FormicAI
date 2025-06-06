const U = require('./util');

module.exports = class Debug {
    constructor(){
        /**@type {Error[]} */
        this._errors = [];
        /**@type {Boolean} */
        this._verbose = false;
        /**@type {Object[]} */
        this._verboseLog = [];
    }

    //Print entire AI state as json.
    static dumpMain() {
        U.l(/**@type {any}) */(Game).main);
    }

    /**@returns {Boolean} */
    get verbose(){
        return this._verbose;
    }

    /**@param {Boolean} newVerbose*/
    set verbose(newVerbose) {
        this._verbose = newVerbose
    }

    //log an error
    /**@param {Error} err 
     * @param {string} opName
    */
    static logError(err, opName) {
        let message = 'Error in operation ' + opName + '\n'
        message += err.message;
        let stack = err.stack;
        if (stack) {
            message += '\n'
            message += stack;
        }
        for (let line of message.split('\n')) U.l(line)
        Game.notify(JSON.stringify(message));
    }

    //log state of an object in verbose log
    /**
     * @param {String} state
     * @param {Object} object */
    logState(state, object) {
        this._verboseLog.push(object.constructor.name + ' - ' + state);
        this._verboseLog.push(Object.assign({}, object));
        if (this._errors.length > 0) {
            this._verboseLog.push(this._errors);
            this._errors = [];
        }
    }

    printVerboseLog() {
        U.l(this._verboseLog);
    }

    //prints errors to console and deletes them
    printErrors() {
        for(let err of this._errors) {
            U.l(err);
        }
        this._errors = []
    }

    //throws all logged errors
    throwErrors() {
        for(let err of this._errors) throw err;
    }

    /** Print top cpu consuming operations */
    printCpuStats() {
        const Operation = require('./meta_operation');
        /**@type {{name:string,avg:number}[]}*/
        let arr = [];
        for (let name in Operation.cpuStats) {
            let stat = Operation.cpuStats[name];
            arr.push({name, avg: stat.avg});
        }
        arr.sort((a,b)=>b.avg-a.avg);
        let out = {};
        let n = Math.min(10, arr.length);
        for (let i=0;i<n;i++) out[arr[i].name] = arr[i].avg.toFixed(2);
        U.l(out);
    }

    /** Print top cpu consuming bases for a specific operation type */
    printTopBases(opName) {
        const Operation = require('./meta_operation');
        /**@type {{[base:string]:number}}*/
        let baseCpu = {};
        for (let op of Operation.allOps) {
            if (op.constructor.name !== opName) continue;
            let baseName = op.baseName || op._baseName || (op.name||'');
            if (!baseName) continue;
            baseCpu[baseName] = (baseCpu[baseName]||0) + op.getCpuRecursive();
        }
        let list = Object.keys(baseCpu).map(b=>({base:b,cpu:baseCpu[b]}));
        list.sort((a,b)=>b.cpu-a.cpu);
        let out = {};
        let n = Math.min(10, list.length);
        for (let i=0;i<n;i++) out[list[i].base] = list[i].cpu.toFixed(2);
        U.l(out);
    }
}
