let U = require('./util');
let c = require('./constants');
let Operation = require('./operation');
let ShardOp = require('./shardOp');
let Debug = require('./debug');

/**@typedef {{timeStamp: Date, shards: {request: number}[]}} ShardMem */

class Main extends Operation {
    constructor() {
        super();
        U.l('INIT MAIN');
        for (let memObj in Memory) {
            // @ts-ignore
            delete Memory[memObj];
        }
        InterShardMemory.setLocal("");
        this._shardOp = new ShardOp(this);

        // populate shard names (by trial and error!!)
        /**@type {String[]} */
        this._shards = [];
        this._shardNum = parseInt(Game.shard.name.slice(-1));

        try {
            let i=0;
            for(let i=0; i<1000;i++) {
                let shardName = 'shard'+i;
                InterShardMemory.getRemote(shardName)
                this._shards.push (shardName);
            }
        }
        catch (err) {}
    }

    initTick() {
        this._shardOp.initTick();
    }

    _strategy() {
        // run cross shard strategy about once every 10.000 ticks
        if(U.chance(10000) || this._firstRun) {
            // divide cpu evenly between shards
            let totalCPU = 0;
            /**@type {{[key:string]:number}} */
            let shardLimits = {};
            Object.assign(shardLimits, Game.cpu.shardLimits);
            for (let shard in shardLimits) {
                totalCPU += shardLimits[shard]
            }
            let dividedCPU = totalCPU / this._shards.length;
            for (let shard of this._shards) {
                shardLimits[shard] = dividedCPU;
            }
            //Game.cpu.setShardLimits(shardLimits);


            //set max bases
            let nBases = Game.gcl.level
            let cpuPerBase = totalCPU / nBases;
            Object.assign(shardLimits, Game.cpu.shardLimits);
            /**@type {{[index:string] : Number}} */
            let maxShardBases = {};
            while (nBases > 0) {
                for (let shard of this._shards) {
                    if (shardLimits[shard] > 0 ) {
                        shardLimits[shard] -= cpuPerBase;
                        maxShardBases[shard] =  (maxShardBases[shard] | 0) + 1
                        if (--nBases <= 0 ) break;
                    }
                }
            }
           // let maxShardBases = Math.floor(Game.gcl.level / totalCPU * shardLimits[Game.shard.name]) | 0
            this._shardOp.setDirectiveMaxBases(maxShardBases[Game.shard.name])
        }

        // check for shard requests
        if((U.chance(100) || this._firstRun) && Game.gcl.level >= 3 && (this._shardOp.getBaseCount() >= 2)) {
            let interShardMem = this._loadInterShardMem();
            for (let i=0; i < interShardMem.shards.length; i++) {
                if (i + 1 == this._shardNum || i - 1 == this._shardNum) {
                    let shardRequest = interShardMem.shards[i];
                    if (shardRequest.request >= c.SHARDREQUEST_NONE) {
                        this._shardOp.requestShardColonization('shard' + i, shardRequest.request)
                        shardRequest.request = c.SHARDREQUEST_NONE;
                        this._writeInterShardMem(interShardMem);
                        break;
                    }
                }
            }
        }
    }

    _command() {
        this._shardOp.run();
    };

    /**@param {ShardMem} shardMem */
    _writeInterShardMem(shardMem){
        if(shardMem == undefined) throw Error()
        shardMem.timeStamp = new Date();
        InterShardMemory.setLocal(JSON.stringify(shardMem))
    }

    /**@returns {ShardMem} */
    _loadInterShardMem(){
        let interShardMem = undefined;
        for (let shard of this._shards) {
            let shardMem = /**@type {ShardMem}*/(JSON.parse(InterShardMemory.getRemote(shard) || '{}'));
            if ((interShardMem==undefined) || shardMem.timeStamp > interShardMem.timeStamp) interShardMem = shardMem
        }
        if(!interShardMem) throw Error();
        if (_.isEmpty(interShardMem)) interShardMem = {timeStamp: new Date(), shards:[]}
        for (let shard of this._shards) {
            let shardNum = parseInt(shard.slice(-1))
            if (_.isEmpty(interShardMem.shards[shardNum])) {
                if (shard == Game.shard.name) interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_NONE};
                else interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_COLONIZER};
            }
        }
        return interShardMem;
    }

    /**@param {number} shardRequest */
    requestCreep(shardRequest) {
        let interShardMem = this._loadInterShardMem();
        interShardMem.shards[this._shardNum].request = shardRequest
        this._writeInterShardMem(interShardMem);
    }
}

let debug = new Debug;
/**@type {any}*/(Game).debug = debug;
let main = new Main;
module.exports.Main = Main;

module.exports.loop = function() {
    /**@type {any}*/(Game).debug = debug;
    /**@type {any}*/(Game).main = main;
    main.initTick();
    main.run();
    if (debug.verbose) {
        debug.printVerboseLog();
        debug.verbose = false;
    }
    debug.throwErrors();
}
