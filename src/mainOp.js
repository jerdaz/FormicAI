let U = require('./util');
let c = require('./constants');
let Operation = require('./meta_operation');
let ShardOp = require('./shard_shardOp');

// @ts-ignore
if (!global.InterShardMemory) global.InterShardMemory = null;

/**@typedef {{timeStamp: Date, shards: {request: number, baseCount: number}[]}} ShardMem */

module.exports = class Main extends Operation {
    constructor() {
        super();
        U.l('INIT MAIN');
        for (let memObj in Memory) {
            switch (memObj) {
                case 'maxCPU':
                case 'bank':
                case 'colonizations':
                case 'lastConstructionSiteCleanTick':
                    break;
                default:
                    delete Memory[memObj];
                    break;
            }
        }
        Memory.creeps = {};
        Memory.rooms = {};
        Memory.flags = {};
        Memory.spawns = {};
        Memory.powerCreeps = {};
        if (Memory.bank == undefined) Memory.bank = {};
        
        if (InterShardMemory) InterShardMemory.setLocal("");
        this._shardOp = new ShardOp(this);
        this.addChildOp(this._shardOp);

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
        if(this._shards.length == 0) this._shards = [Game.shard.name];
    }

    get type() { return c.OPERATION_MAIN; }

    // Request a helper creep from another shard of one of the SHARDREQUEST constnant types (builder, colonizer etc)
    /**@param {number} shardRequest */
    requestCreep(shardRequest) { this._requestCreep(shardRequest); }

    _firstRun() {
        this._strategy();
    }

    _support() {
        //if (Game.shard.name == 'shard3' && Game.cpu.getHeapStatistics) Game.notify(JSON.stringify(Game.cpu.getHeapStatistics(),undefined,3))
    }

    _strategy() {
        // // divide cpu evenly between shards
        // let totalCPU = 0;
        // /**@type {{[key:string]:number}} */
        // let shardLimits = {};
        // Object.assign(shardLimits, Game.cpu.shardLimits);
        // for (let shard in shardLimits) {
        //     totalCPU += shardLimits[shard]
        // }
        // let dividedCPU = Math.floor(totalCPU / this._shards.length);
        // for (let shard of this._shards) {
        //     shardLimits[shard] = dividedCPU;
        // }
        // //Game.cpu.setShardLimits(shardLimits);

        // //set max bases
        // let nBases = Game.gcl.level
        // let cpuPerBase = totalCPU / nBases;
        // Object.assign(shardLimits, Game.cpu.shardLimits);
        // /**@type {{[index:string] : Number}} */
        // let maxShardBases = {};
        // while (nBases > 0) {
        //     for (let shard of this._shards) {
        //         if (shardLimits[shard] > 0 ) {
        //             shardLimits[shard] -= cpuPerBase;
        //             maxShardBases[shard] =  (maxShardBases[shard] | 0) + 1
        //             if (--nBases <= 0 ) break;
        //         }
        //     }
        // }
        // // let maxShardBases = Math.floor(Game.gcl.level / totalCPU * shardLimits[Game.shard.name]) | 0
        // // this._shardOp.setDirectiveMaxBases(maxShardBases[Game.shard.name])

        // check for shard requests
        let myBasesCount = this._shardOp.baseCount;
        let interShardMem = this._loadInterShardMem();
        let totalBases = 0;
        for (let i=0; i < interShardMem.shards.length; i++) {
            if (interShardMem.shards[i] && interShardMem.shards[i].baseCount) totalBases += interShardMem.shards[i].baseCount
            if (i + 1 == this._shardNum || i - 1 == this._shardNum) {
                let shardRequest = interShardMem.shards[i];
                if (shardRequest && shardRequest.request == c.SHARDREQUEST_BUILDER) {
                    this._shardOp.requestShardColonization('shard' + i, shardRequest.request)
                    shardRequest.request = c.SHARDREQUEST_NONE;
                    this._writeInterShardMem(interShardMem);
                    break;
                }
            }
        }
        if (totalBases == 0) totalBases = myBasesCount;
        if (totalBases < Game.gcl.level) this._shardOp.setDirectiveMaxBases(myBasesCount + 1)
        else this._shardOp.setDirectiveMaxBases(myBasesCount);
        if (interShardMem.shards[this._shardNum].baseCount != myBasesCount) {
            interShardMem.shards[this._shardNum].baseCount = myBasesCount;
            this._writeInterShardMem(interShardMem);
        }
    }

    _command() {
        //if (Game.cpu.bucket >= c.MAX_BUCKET + PIXEL_CPU_COST) Game.cpu.generatePixel();
    }

    /**@param {ShardMem} shardMem */
    _writeInterShardMem(shardMem){
        if(!InterShardMemory) return;
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
            let shardMem = InterShardMemory?/**@type {ShardMem}*/(JSON.parse(InterShardMemory.getRemote(shard) || '{}')):/**@type {ShardMem}*/({});
            if (!_.isEmpty(shardMem)) interShardMem.shards[shardId] = shardMem.shards[shardId];
        }
        if(!interShardMem) throw Error();
        if (_.isEmpty(interShardMem)) interShardMem = {timeStamp: new Date(), shards:[]}
        for (let shard of this._shards) {
            let shardNum = U.getShardID(shard);
            if (_.isEmpty(interShardMem.shards[shardNum])) {
                if (shard == Game.shard.name) interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_NONE, baseCount: this._shardOp.baseCount};
                else interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_COLONIZER, baseCount: this._shardOp.baseCount};
            }
        }
        return interShardMem;
    }

    /**@param {number} shardRequest */
    _requestCreep(shardRequest) {
        let interShardMem = this._loadInterShardMem();
        if (interShardMem && interShardMem.shards[this._shardNum]) {
            interShardMem.shards[this._shardNum].request = shardRequest
            this._writeInterShardMem(interShardMem);
        }
    }
}
