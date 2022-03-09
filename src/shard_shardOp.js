const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');
const BaseOp = require('./base_baseOp');
const MapOp = require('./shard_mapOp');
const BankOp = require('./shard_bankOp')
const ColonizingOp = require('./shard_colonizingOp');
const ShardSpawningOp = require('./shard_spawningOp');
const ShardDefenseOp = require('./shard_defenseOp')
const ShardChildOp = require('./shard_childOp');
const { stubString } = require('lodash');
const { OPERATION_SHARDCOLONIZING } = require('./constants');

const CONSTRUCTION_SITE_CLEAN_INTERVAL = 100000 // +-half a year


module.exports = class ShardOp extends ChildOp {
    /**@param {MainOp} main */
    constructor(main) {
        super(main);
        this._parent = main;
        /**@type {{[baseName:string] : ShardChildOp[][]}} */
        this._OperationIdByRoomByOpType = {};
        /** @type {{[key:string]: BaseOp }} */
        //this._baseOpsMap = {};

        // an object containing all operations by ID
        /**@type {{[opId:number]:ShardChildOp}} */
        this._operationIds = {};

        // a map with all the baseops
        /**@type {Map<String, BaseOp>}*/
        this._baseOpsMap = new Map;

        // an object with all the subrooms, containing the owning basename.
        /**@type {{[roomName:string]: string}} */
        this._subRooms = {};

        this._maxShardBases = undefined;
        /**@type {MapOp} */
        this._map = new MapOp(this);
        this.addChildOp(this._map);
        this._bank = new BankOp(this, this);
        this.addChildOp(this._bank);
        this.addChildOp(new ShardSpawningOp(this));
        this._safeModeAvailable = false;
        //this.addChildOp(new ShardDefenseOp(this))
        this._teamShardColonizing = new ColonizingOp(this, this);
        this._userName = ''
        if (Game.spawns[Object.keys(Game.spawns)[0]]) this._userName = Game.spawns[Object.keys(Game.spawns)[0]].owner.username
        this._pixelGeneratedLastTurn = false // has a pixel been generated last turn (used in run())
    }



    get type() {return c.OPERATION_SHARD}

    get name() {return Game.shard.name};

    get mainOp() {return this._parent}

    get spawningOp () {return /**@type {ShardSpawningOp}*/( this.childOps[c.OPERATION_SHARDSPAWNING][0])}

    get userName() {return this._userName}

    get bank() {return this._bank}

    /**@returns {Number} */
    get baseCount() {
        return this._baseOpsMap.size;
    }

    get baseOps() {
        return this._baseOpsMap;
    }

    get subRooms() {
        return this._subRooms;
    }

    get safeModeAvailable() {
        return this._safeModeAvailable;
    }

    
    /**@param {number} id */
    getOp(id) {
        return this._operationIds[id];
    }

    /**@param {ShardChildOp} op */
    removeOpId(op) {
        let id = op.id;
        if (this._operationIds[id]) {
            delete this._operationIds[id]
        } else throw Error();
    }

    /**@param {ShardChildOp} op */
    addOpId(op) {
        let id = op.id;
        this._operationIds[id] = op;
    }

    /**@param {ChildOp} childOp */
    addChildOp(childOp) {
        super.addChildOp(childOp);
        if (childOp instanceof ShardChildOp) {
            this.addOpId(childOp)
        }
    }


    /**
     * @param {string} roomName
     * @returns {Room} returns room with RoomName */
    getRoom(roomName) {
        let room = Game.rooms[roomName];
        if (!room) throw ('Error');
        return room;
    }

    /**
     * @param {string} roomName
     * @returns {Base} returns base with RoomName */
    getBase(roomName) {
        let base = /**@type {Base} */ (Game.rooms[roomName]);
        if (!base) throw ('Error');
        if (base.controller === undefined) throw ('Error');
        return base;
    }


    /**@param {number} max */
    setDirectiveMaxBases(max){
        this._maxShardBases = max;
    }

    /**@param {String} roomName */
    requestBuilder(roomName){
        let donorRoom = this._map.findClosestBaseByPath(roomName, 4 , true, 0, 20);
        if (!donorRoom) return;
        let baseOp = this._baseOpsMap.get(donorRoom);
        if (!baseOp) throw Error('donorroom not in basemap');
        baseOp.requestBuilder(roomName);
    }

    /**
     * @param {string} shard
     * @param {number} requestType} */
    requestShardColonization(shard, requestType) {
        for(let baseOpKey of this._baseOpsMap) baseOpKey[1].requestShardColonization(shard, requestType);
    }


    /**
     * @param {string} roomName
     * @returns {BaseOp} */
    getBaseOp(roomName) {
        let result = this._baseOpsMap.get(roomName);
        if (!result) throw Error();
        return result;
    }

    /**
     * @param {string} roomName
     * @returns {BaseOp|null} */
    getBaseOpNoNullCheck(roomName) {
        let result = this._baseOpsMap.get(roomName);
        if (!result) return null;
        return result;
    }

    getBaseInfo() {
        /**@type  {BaseInformation[]} */
        let result = []

        for(let baseOpKey of this._baseOpsMap) {
            let baseOp = baseOpKey[1];
            let baseInfo = baseOp.stats;
            result.push(baseInfo);
        }
        return result;
    }

    getAvgGclRate () {
        let baseInfos = this.getBaseInfo();

        let baseCount = 0;
        let totalGclRate = 0;
        for (let baseInfo of baseInfos) {
            if (baseInfo.gclRate && baseInfo.age > this._parent.baseGracePeriod ) {
                baseCount++
                totalGclRate += baseInfo.gclRate;
            }
        }
        return totalGclRate / baseCount;       
    }
    

    //add's an operation to the basename/optype to operation map.
    /**
     * @param {ShardChildOp} shardChildOp
     * @param {string} baseName */
    addOperation(shardChildOp, baseName) {
        let opType = shardChildOp.type
        let opInstance = shardChildOp.instance
        let x = this._OperationIdByRoomByOpType;
        if (x[baseName] == undefined) x[baseName] = [];
        if (x[baseName][opType] == undefined) x[baseName][opType] = [];
        x[baseName][opType][opInstance] = shardChildOp;
    }

    //unclaim a room
    /**
     * 
     * @param {string} baseName 
     */
    unclaimBase(baseName) {
        let baseOp = this.getBaseOp(baseName);
        baseOp.unclaim();
        this._baseOpsMap.delete(baseName);
        this._maxShardBases = this._maxShardBases - 1;
    }

    initTick(){
        //construct, init and delete base suboperations
        let updateMap = false;

        //iterate through baseopmap to find and delete bases that are lost
        for(let baseOpKey of this._baseOpsMap) {
            let room = Game.rooms[baseOpKey[0]];
            if (!room || !room.controller || !room.controller.my) {
                this._baseOpsMap.delete(baseOpKey[0]); 
                updateMap = true;
            }
        }

        // update safemode
        this._safeModeAvailable = true;
        //iterate through all rooms and update / add new room objects to baseOps
        // and init them
        for (let roomName in Game.rooms) {
            let room = this.getRoom(roomName);
            if (room.controller && room.controller.my) {
                if (room.controller.safeMode) this._safeModeAvailable = false;
                let baseOp = this._baseOpsMap.get(room.name);
                if (!baseOp) {
                    baseOp = new BaseOp(this.getBase(room.name), this)
                    this._baseOpsMap.set(room.name, baseOp);
                    updateMap = true;
                } 
                baseOp.initTick();
            }
        }
        if (updateMap) {
            // this._map.updateBaseDistances(this._baseOpsMap);
             //allocate rooms for remote mining
            this._allocateSubRooms();
        }



        //assign new creep objects to childshardops.
        for (let creepName in Game.creeps) {
            let creep = U.getCreep(creepName);
            let split = creepName.split('_');
            let roomName = creep.memory.baseName || split[0];
            let opType = creep.memory.operationType || parseInt(split[1]);
            if (opType > c.OPERATION_MAX) {
                creep.suicide();
                continue;
            }
            let opInstance = creep.memory.operationInstance || parseInt(split[2])||0;
            if (creep.hits> 0 && this._OperationIdByRoomByOpType[roomName] && this._OperationIdByRoomByOpType[roomName][opType]) {
                let subOp = this._OperationIdByRoomByOpType[roomName][opType][opInstance]
                if (subOp) subOp.initCreep(creep) 
            }
            else if (creep.hits >0 && opType == OPERATION_SHARDCOLONIZING) {
                // creep is a shard colonizer, have shard colonizer handle it.
                this._teamShardColonizing.initCreep(creep);
            }
            else delete Memory.creeps[creepName];
        }

        this._teamShardColonizing.initTick();
        super.initTick()
    }

    run() {
        // run all standard child operations
        super.run();

        // now run all nonstandard child operations
        //run colonizing operation;
        this._teamShardColonizing.run();

        // run the base operations in order of priority
        // if bucket is low, low priority bases are skipped 
        // bucket size is dynamic and grows. When a pixel is generated it is reset.
        // when cpu starved, cpu goes down, bases shut down in priority
        // when cpu is plentiful, bucket goes up, until a pixel is generated, both are reset and they go up again
        // all bases keep running unless the buckets decreases.

        
        let maxCPU = c.MAX_BUCKET;
        let maxBasesToRun = this._baseOpsMap.size
        if (!this._pixelGeneratedLastTurn) {
            let  cpuReserve = maxCPU / 20;
            let  cpuRange = maxCPU - 2 * cpuReserve
            maxBasesToRun = Math.floor(this._baseOpsMap.size * (Game.cpu.bucket - cpuReserve) / cpuRange);
        }
        let baseCount = 0;
        for (let baseOpKey of this._baseOpsMap) {
            if (Game.cpu.bucket < 500 && Game.cpu.getUsed() >= Game.cpu.bucket / maxBasesToRun * (maxBasesToRun-1)  //stop executing if not enough time
                 || (++baseCount > maxBasesToRun)) 
            {
                U.l('Warning not enough CPU time. Skipping base: ' + baseOpKey[0])
            } else {
                let baseOp = baseOpKey[1];
                baseOp.run();
            }
        }


        //generate pixels & reset maxBucket if successful
        this._pixelGeneratedLastTurn = false;
        if (c.GENERATE_PIXELS && Game.cpu.generatePixel && Game.cpu.bucket >= PIXEL_CPU_COST) {
            let result = Game.cpu.generatePixel();
            if (result == OK) {
                this._pixelGeneratedLastTurn = true;
                this._maxBucket = 0;
            }
        }
    }

    _firstRun() {
        this._support();
        this._strategy();
    }

    _support() {
        //garbage collection for dead creep memory
        for (let creepName in Memory.creeps) {
            if (!Game.creeps[creepName]) delete Memory.creeps[creepName]
        }

        //sort bases in order of importance (first level, then stored energy)
        this._baseOpsMap = new Map([...this._baseOpsMap].sort((a,b) => 
            {
                let levelA = a[1].base.controller.level;
                let levelB = b[1].base.controller.level
                if (levelA > levelB) return -1;
                if (levelB > levelA) return 1;
                let storageA = a[1].storage;
                let storageB = b[1].storage;
                return ((storageB?storageB.store.energy:-1) - (storageA?storageA.store.energy:-1))
            })
        )
        
        let iterator = this._baseOpsMap.keys();
        
        //periodically remove all constructionsites in unseenrooms
        let lastConstructionSiteCleanTick = /**@type {number}*/ ( Memory.lastConstructionSiteCleanTick || 0);
        if (Game.time - lastConstructionSiteCleanTick > CONSTRUCTION_SITE_CLEAN_INTERVAL) {
            for (let siteId in Game.constructionSites) {
                let site =  /**@type {ConstructionSite} */ (Game.getObjectById(siteId));
                if (!site.room) site.remove();
            }
            Memory.lastConstructionSiteCleanTick = Game.time;
        }

        //allocate rooms for remote mining
        this._allocateSubRooms();
    }


    _strategy(){
        // check if we need to colonize
        let directive = c.DIRECTIVE_NONE;
        if (Game.cpu.bucket >= c.MAX_BUCKET && this._maxShardBases) {
            if (this._maxShardBases == this._baseOpsMap.size + 1) directive = c.DIRECTIVE_COLONIZE_2SOURCE // colonize rooms with 2 sources
            else if (this._maxShardBases > this._baseOpsMap.size) directive = c.DIRECTIVE_COLONIZE         // colonize any room
        }
            
        for (let baseOpKey of this._baseOpsMap) baseOpKey[1].setDirective(directive);

        // check if we need to request a colonizer
        if (this._baseOpsMap.size == 0) this._parent.requestCreep(c.SHARDREQUEST_COLONIZER);
        else if (_.size (Game.spawns) && _.size(Game.creeps) < 1) this._parent.requestCreep(c.SHARDREQUEST_BUILDER)
        else this._parent.requestCreep(c.SHARDREQUEST_NONE);

        //check if we need to unclaim bases
        if (this._maxShardBases && this._baseOpsMap.size > this._maxShardBases) {
            let bases = [];
            for (let baseOpKey of this._baseOpsMap) bases.push(this.getBase(baseOpKey[0]))
            bases.sort ((a,b) => {return a.controller.level - b.controller.level});
            
            for (let i = this._baseOpsMap.size - this._maxShardBases; i > 0 ; i--) this.unclaimBase(bases[i].name)
        }
    }

    _allocateSubRooms() {
        for (let baseOpKey of this._baseOpsMap) { 
            let baseOpName = baseOpKey[0];
            // add all neighbours of a base as subrooms if available
            let neighbours = /**@type {{[index:string]:string}} */ (Game.map.describeExits(baseOpName));
            for ( let exit in neighbours) {
                let neighbourRoomName = neighbours[exit];
                if (!this._subRooms[neighbourRoomName] && !this._baseOpsMap.get(neighbourRoomName)) {
                    this._subRooms[neighbourRoomName] = baseOpName;
                    let baseOp = this.getBaseOp(baseOpName);
                    if (!baseOp) throw Error();
                    baseOp.addRoom(neighbourRoomName)
                }
            }

            //remove subrooms from a baseOp if it has become the main room of another (new) baseOp
            if (this._subRooms[baseOpName]) {
                let baseOp = this.getBaseOp(this._subRooms[baseOpName]);
                if (!baseOp) throw Error();
                baseOp.removeRoom(baseOpName);
                delete this._subRooms[baseOpName]
            }
        }
    }
}

