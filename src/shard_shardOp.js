const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');
const BaseOp = require('./base_baseOp');
const MapOp = require('./shard_mapOp');
const BankOp = require('./shard_bankOp')
const ColonizingOp = require('./shard_colonizingOp');
const ShardSpawningOp = require('./shard_spawningOp');
const ShardDefenseOp = require('./shard_defenseOp')
const ShardChildOp = require('./shard_childOp')

const CONSTRUCTION_SITE_CLEAN_INTERVAL = 1000000

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
        this.addChildOp(new ShardDefenseOp(this))
        this._teamShardColonizing = new ColonizingOp(this, this);
        this._userName = Game.spawns[Object.keys(Game.spawns)[0]].owner.username
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
        let donorRoom = this._map.findClosestBaseByPath(roomName, 3 , true);
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

        //iterate through all rooms and update / add new room objects to baseOps
        // and init them
        for (let roomName in Game.rooms) {
            let room = this.getRoom(roomName);
            if (room.controller && room.controller.my) {
                let baseOp = this._baseOpsMap.get(room.name);
                if (!baseOp) {
                    baseOp = new BaseOp(this.getBase(room.name), this)
                    this._baseOpsMap.set(room.name, baseOp);
                    updateMap = true;
                } 
                baseOp.initTick();
            }
        }
        if (updateMap) this._map.updateBaseDistances(this._baseOpsMap);


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
            else delete Memory.creeps[creepName];
        }


        super.initTick()
    }

    run() {
        // run all standard child operations
        super.run();

        // now run all nonstandard child operations

        // run the base operations in order of priority
        // if bucket is low, low priority bases are skipped 
        let maxCPU = c.MAX_BUCKET
        const cpuReserve = maxCPU / 20;
        const cpuRange = maxCPU - 2 * cpuReserve
        const maxBasesToRun = Math.floor(this._baseOpsMap.size * (Game.cpu.bucket - cpuReserve) / cpuRange);
        let baseCount = 0;
        for (let baseOpKey of this._baseOpsMap) {
            if (++baseCount > maxBasesToRun) break;
            let baseOp = baseOpKey[1];
            baseOp.run();
        }

        //run colonizing operation;
        this._teamShardColonizing.run();
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

        //sort bases in order of importance
        this._baseOpsMap = new Map([...this._baseOpsMap].sort((a,b) => 
            {return b[1].base.controller.level - a[1].base.controller.level})
        );
        
        let iterator = this._baseOpsMap.keys();
        U.l({sortedbases:iterator.next().value}) 
        U.l({sortedbases:iterator.next().value}) 
        U.l({sortedbases:iterator.next().value}) 
        U.l({sortedbases:iterator.next().value}) 
        U.l({sortedbases:iterator.next().value}) 
        U.l({sortedbases:iterator.next().value}) 
        U.l({sortedbases:iterator.next().value}) 

        //periodically remove all constructionsites
        let lastConstructionSiteCleanTick = /**@type {number}*/ ( Memory.lastConstructionSiteCleanTick || 0);
        if (Game.time - lastConstructionSiteCleanTick > CONSTRUCTION_SITE_CLEAN_INTERVAL) {
            for (let siteId in Game.constructionSites) {
                let site =  /**@type {ConstructionSite} */ (Game.getObjectById(siteId));
                site.remove();
            }
            Memory.lastConstructionSiteCleanTick = Game.time;
        }

        //allocate rooms for remote mining
        this._allocateSubRooms();
    }


    _strategy(){
        // check if we need to colonize
        let directive = c.DIRECTIVE_NONE;
        if (Game.cpu.bucket >= c.MAX_BUCKET && this._maxShardBases && this._maxShardBases > this._baseOpsMap.size) directive = c.DIRECTIVE_COLONIZE
        for (let baseOpKey of this._baseOpsMap) baseOpKey[1].setDirective(directive);

        // check if we need to request a colonizer
        if (_.isEmpty(this._baseOpsMap)) this._parent.requestCreep(c.SHARDREQUEST_COLONIZER);
        else if (_.isEmpty(Game.spawns) && _.size(Game.creeps) < 10) this._parent.requestCreep(c.SHARDREQUEST_BUILDER)
        else this._parent.requestCreep(c.SHARDREQUEST_NONE);

        //check if we need to unclaim bases
        if (this._maxShardBases && this._baseOpsMap.size > this._maxShardBases) {
            let bases = [];
            for (let baseOpKey of this._baseOpsMap) bases.push(this.getBase(baseOpKey[0]))
            bases.sort ((a,b) => {return a.controller.level - b.controller.level});
            
            for (let i = this._baseOpsMap.size - this._maxShardBases; i > 0 ; i--) bases[i].controller.unclaim();
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

            //remove subroom if it is the main room of a baseOp
            if (this._subRooms[baseOpName]) {
                let baseOp = this.getBaseOp(this._subRooms[baseOpName]);
                if (!baseOp) throw Error();
                baseOp.removeRoom(baseOpName);
                delete this._subRooms[baseOpName]
            }
        }
    }
}

