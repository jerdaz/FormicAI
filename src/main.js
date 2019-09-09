let U = require('./util');
let c = require('./constants');
let Operation = require('./operation');
let ShardOp = require('./shardOp');
let Debug = require('./debug');

/**@typedef {{timeStamp: Date, shards: {request: number, baseCount: number}[]}} ShardMem */

class Main extends Operation {
    constructor() {
        super();
        U.l('INIT MAIN');
        for (let memObj in Memory) {
            // @ts-ignore
            if (memObj != 'maxCPU') delete Memory[memObj];
        }
        Memory.creeps = {};
        Memory.rooms = {};
        Memory.flags = {};
        Memory.spawns = {};
        Memory.powerCreeps = {};
        
        InterShardMemory.setLocal("");
        this._shardOp = new ShardOp(this);
        this._addChildOp(this._shardOp);

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

    get type() { return c.OPERATION_MAIN; }

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
            U.l(shardLimits);

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
            // this._shardOp.setDirectiveMaxBases(maxShardBases[Game.shard.name])
        }

        // check for shard requests
        let myBasesCount = this._shardOp.getBaseCount();
        if((U.chance(10) || this._firstRun) && Game.gcl.level >= 3 && (myBasesCount >= 2)) {
            let interShardMem = this._loadInterShardMem();
            let totalBases = 0;
            for (let i=0; i < interShardMem.shards.length; i++) {
                if (interShardMem.shards[i].baseCount) totalBases += interShardMem.shards[i].baseCount
                if (i + 1 == this._shardNum || i - 1 == this._shardNum) {
                    let shardRequest = interShardMem.shards[i];
                    if (shardRequest.request == c.SHARDREQUEST_BUILDER) {
                        this._shardOp.requestShardColonization('shard' + i, shardRequest.request)
                        shardRequest.request = c.SHARDREQUEST_NONE;
                        this._writeInterShardMem(interShardMem);
                        break;
                    }
                }
            }
            if (totalBases < Game.gcl.level) this._shardOp.setDirectiveMaxBases(myBasesCount + 1)
            else this._shardOp.setDirectiveMaxBases(myBasesCount);
            if (interShardMem.shards[this._shardNum].baseCount != myBasesCount) {
                interShardMem.shards[this._shardNum].baseCount = myBasesCount;
                this._writeInterShardMem(interShardMem);
            }
        }
    }

    /**@param {ShardMem} shardMem */
    _writeInterShardMem(shardMem){
        if(shardMem == undefined) throw Error()
        shardMem.timeStamp = new Date();
        InterShardMemory.setLocal(JSON.stringify(shardMem))
    }

    /**@returns {ShardMem} */
    _loadInterShardMem(){
        /**@type {ShardMem} */
        let interShardMem = {timeStamp: new Date(), shards:[]};
        for (let shard of this._shards) {
            let shardId = U.getShardID(shard)
            let shardMem = /**@type {ShardMem}*/(JSON.parse(InterShardMemory.getRemote(shard) || '{}'));
            if (!_.isEmpty(shardMem)) interShardMem.shards[shardId] = shardMem.shards[shardId];
        }
        if(!interShardMem) throw Error();
        if (_.isEmpty(interShardMem)) interShardMem = {timeStamp: new Date(), shards:[]}
        for (let shard of this._shards) {
            let shardNum = U.getShardID(shard);
            if (_.isEmpty(interShardMem.shards[shardNum])) {
                if (shard == Game.shard.name) interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_NONE, baseCount: this._shardOp.getBaseCount()};
                else interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_COLONIZER, baseCount: this._shardOp.getBaseCount()};
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

module.exports.mainOp = Main;
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
