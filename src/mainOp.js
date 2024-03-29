let U = require('./util');
let c = require('./constants');
let Operation = require('./meta_operation');
let ShardOp = require('./shard_shardOp');
const { max } = require('lodash');


/**@typedef {{timeStamp: Date, shards: {request: number, baseCount: number, bases: BaseInformation[], avgGclRate:number, bucket:number}[]}} ShardMem */

const CPULIMITS = [300, 300, 300, 20]

module.exports = class MainOp extends Operation {
    constructor() {
        super();
        U.l('INIT MAIN');


        for (let memObj in Memory) {
            switch (memObj) {
                case 'rooms' :
                case 'maxCPU':
                case 'bank':
                case 'colonizations':
                case 'lastConstructionSiteCleanTick':
                case 'roomInfo':
                    break;
                default:
                    delete Memory[memObj];
                    break;
            }
        }
        Memory.creeps = {};
        Memory.flags = {};
        Memory.spawns = {};
        Memory.powerCreeps = {};
        if (Memory.bank == undefined) Memory.bank = {};
        if (Memory.rooms == undefined) Memory.rooms = {};
        if (Memory.roomInfo == undefined) Memory.roomInfo = {};
        
        if (InterShardMemory) InterShardMemory.setLocal("");
        this._shardOp = new ShardOp(this);
        this.addChildOp(this._shardOp);

        // populate shard names (by trial and error!!)
        /**@type {String[]} */
        this._shards = [];
        this._shardNum = parseInt(Game.shard.name.slice(-1));
        this._baseGracePeriod = 0;

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

    get baseGracePeriod() { return this._baseGracePeriod}


    // Request a helper creep from another shard of one of the SHARDREQUEST constnant types (builder, colonizer etc)
    /**@param {number} shardRequest */
    requestCreep(shardRequest) { this._requestCreep(shardRequest); }

    _firstRun() {
        this._support();
        this._strategy();
    }

    _support() {


        
        // divide cpu evenly between shards based on number of bases, taking max cpu into account
        let totalCPU = 0;
        /**@type {{[key:string]:number}} */
        let shardLimits = {};
        Object.assign(shardLimits, Game.cpu.shardLimits);
        for (let shard in shardLimits) {
            totalCPU += shardLimits[shard]
        }
        let totalCpuAssert = totalCPU;
        let interShardMem = this._loadInterShardMem();
        let shards = interShardMem.shards;
        /**@type {Number[]} */
        let shardBaseCounter = [];
        /**@type {Number[]} */
        let shardCPULimit = [];
        let skipCount = 0;
        let curShard = 0;
        let loopCount = 0;
        for (let i = 0; i < shards.length; i++ ) {
            shardBaseCounter[i] = 0;
            shardCPULimit[i] = 5;
            totalCPU-=5;
        }
        while (totalCPU > 0) {
            if (curShard ==0) skipCount = 0;
            if (shardBaseCounter[curShard] < shards[curShard].baseCount && shardCPULimit[curShard] < CPULIMITS[curShard]) {
                shardCPULimit[curShard]++;
                shardBaseCounter[curShard]++;
                totalCPU--;
            } else skipCount++
            curShard++;
            if (curShard>=this._shards.length) curShard=0;
            if (skipCount >=this._shards.length) {
                for (let i = 0; i < shards.length; i++ ) {
                    shardBaseCounter[i] = 0;
                }
                skipCount = 0;
            }
            if (loopCount++ > 10000) throw Error('Infinite loop detected')
        }

        for(let i = 0; i < shards.length; i++) {
            shardLimits['shard' + i] = shardCPULimit[i]
        }

        for (let shard in shardLimits) {
            totalCPU += shardLimits[shard]
        }
        if (totalCPU != totalCpuAssert) throw Error ('Error in CPU calculation')

        Game.cpu.setShardLimits(shardLimits);



        // update grace period
        let baseCount = 0;
        let totalEndLvlBaseTime = 0;
        for (let i = 0; i< interShardMem.shards.length;i++ ) {
            let shardInfo = interShardMem.shards[i];
            let baseInfos = shardInfo.bases;
            for (let baseInfo of baseInfos) {
                if (baseInfo.level == 8 && baseInfo.endLvlTime) {
                    baseCount++
                    totalEndLvlBaseTime+= baseInfo.endLvlTime;
                }
            }
        }
        let avgEndLvlTime = totalEndLvlBaseTime / baseCount;
        this._baseGracePeriod = avgEndLvlTime * 1.1
    }

    _strategy() {


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

        // read and process the intershard memory of other shards
        let myBasesCount = this._shardOp.baseCount; //this is the total number of bases on this shard.
        let interShardMem = this._loadInterShardMem();


        //update intershard memory with base stats from this shard
        interShardMem.shards[this._shardNum].baseCount = myBasesCount;
        interShardMem.shards[this._shardNum].bases = this._shardOp.getBaseInfo();
        interShardMem.shards[this._shardNum].avgGclRate = this._shardOp.getAvgGclRate();
        interShardMem.shards[this._shardNum].bucket = Game.cpu.bucket;
        this._writeInterShardMem(interShardMem);


        // Count total number of bases and check for a colonization request from other shards
        let totalBases = 0; // this will contain the total number of cross shard bases
        for (let i=0; i < interShardMem.shards.length; i++) {
            if (interShardMem.shards[i] && interShardMem.shards[i].baseCount) totalBases += interShardMem.shards[i].baseCount
            // if the shard is a neighbour, check for colonization requests and help colonizing the shard.
            if (i + 1 == this._shardNum || i - 1 == this._shardNum) {
                let shardRequest = interShardMem.shards[i];
                if (shardRequest && shardRequest.request != c.SHARDREQUEST_NONE) {
                    this._shardOp.requestShardColonization('shard' + i, shardRequest.request)
                    shardRequest.request = c.SHARDREQUEST_NONE;
                    this._writeInterShardMem(interShardMem);
                }
            }
        }


        
        if (totalBases == 0) totalBases = myBasesCount; // can this be removed...???

        // if there are less total bases then possible, allow colonization of new bases on this shard.
        let maxGclRate = 0;
        for (let shardMem of interShardMem.shards) {
            if (shardMem.avgGclRate > maxGclRate && shardMem.bucket >= c.MAX_BUCKET * 0.95) maxGclRate = shardMem.avgGclRate;
        }
        if ((totalBases + 1 == Game.gcl.level && interShardMem.shards[this._shardNum].avgGclRate == maxGclRate) || (totalBases <= Game.gcl.level - 2) ) {
            Game.notify('doing colonization of shard ' + this._shardNum + ' ' + JSON.stringify({maxGclRate: maxGclRate, myBasesCount:myBasesCount, gcl:Game.gcl.level, totalBases:totalBases, interShardMem:interShardMem}))
            this._shardOp.setDirectiveMaxBases(myBasesCount + Game.gcl.level - totalBases)
        }
        else this._shardOp.setDirectiveMaxBases(myBasesCount);

        
        // if we are at maximum bases, find the lowest level single source room and abandon it
        if (myBasesCount > 1 && totalBases == Game.gcl.level) {
            let shard = 0;
            let room = '';
            let lowestLevel = 100;
            let lowestProgress = 0;
            let foundLowLvlBase = false;
            for (let i = 0; i< interShardMem.shards.length;i++ ) {
                let shardInfo = interShardMem.shards[i];
                let baseInfos = shardInfo.bases;
                for (let baseInfo of baseInfos) {
                    // first check if we find a base without spawn. we don't want to abondon any base if we have one.
                    if (!baseInfo.hasSpawn || baseInfo.level < 4) {
                        foundLowLvlBase = true;
                        break;
                    }
                    // check if the base is single source and lower developed then we found
                    if (baseInfo.sources == 1 &&
                        (baseInfo.level < lowestLevel || (baseInfo.level == lowestLevel && baseInfo.progress < lowestProgress)) ) 
                    {   
                        shard = i;
                        room = baseInfo.name;
                        lowestLevel = baseInfo.level;
                        lowestProgress = baseInfo.progress;
                    }
                }
                if (foundLowLvlBase) break;
            }

 
            // Now try to find a below average room to despawn if we haven't found a single source room
            if (!foundLowLvlBase && !room) {
                let lowestGcl = Number.MAX_VALUE;
                let baseCount = 0;
                let totalEndLvlBaseTime = 0;
                let totalGclRate = 0;
                // calculate average time to end level
                for (let i = 0; i< interShardMem.shards.length;i++ ) {
                    let shardInfo = interShardMem.shards[i];
                    let baseInfos = shardInfo.bases;
                    for (let baseInfo of baseInfos) {
                        if (baseInfo.level == 8 && baseInfo.endLvlTime) {
                            baseCount++
                            totalEndLvlBaseTime+= baseInfo.endLvlTime;
                        }
                    }
                }
                let avgEndLvlTime = totalEndLvlBaseTime / baseCount;
                this._baseGracePeriod = avgEndLvlTime * 1.2
                baseCount = 0 // recount end level bases if they haven't lived long enough


                for (let i = 0; i< interShardMem.shards.length;i++ ) {
                    let shardInfo = interShardMem.shards[i];
                    let baseInfos = shardInfo.bases;
                    for (let baseInfo of baseInfos) {
                        if (baseInfo.age > this._baseGracePeriod) // base should be at least 1.2 times the age of average lvl 8 base grow time to be considered 
                        {   
                            baseCount++;
                            totalGclRate += baseInfo.gclRate;
                            if (baseInfo.gclRate<lowestGcl && shardInfo.baseCount>1) {
                                shard = i;
                                room = baseInfo.name;
                                lowestGcl = baseInfo.gclRate;
                            }
                        }
                    }
                }
                // check if lowest gcl rate is <90% of average. Otherwise don't despawn.
                let avgGCLRate = totalGclRate / baseCount;
                if (lowestGcl >= avgGCLRate * 0.9) room = '';
            }

            //unclaim the lowest found base if we haven't found base without spawn
            if (!foundLowLvlBase
                && shard == this._shardNum 
                && room) 
            {
                this._shardOp.unclaimBase(room)
                U.l('Despawning: ' + room)
            }
        }
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
                if (shard == Game.shard.name) {
                    interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_NONE, baseCount: this._shardOp.baseCount, bases:this._shardOp.getBaseInfo(), avgGclRate: this._shardOp.getAvgGclRate(), bucket: Game.cpu.bucket};
                }
                else interShardMem.shards[shardNum] = {request: c.SHARDREQUEST_COLONIZER, baseCount: 0, bases:[], avgGclRate:0, bucket:0};
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
