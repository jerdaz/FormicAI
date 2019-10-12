const U = require('./util');
const c = require('./constants');
const ChildOp = require('./main_childOp');
const BaseOp = require('./base_baseOp');
const MapOp = require('./shard_child_mapOp');
const ColonizingOp = require('./shard_child_colonizingOp');

module.exports = class ShardOp extends ChildOp {
    /**@param {MainOp} main */
    constructor(main) {
        super(main);
        this._parent = main;
        /**@type {{[baseName:string] : ShardChildOp[][]}} */
        this._OperationIdByRoomByOpType = {};
        ///** @type {{[key:string]: BaseOp }} */
        //this._baseOpsMap = {};
        /**@type {Map<String, BaseOp>}*/
        this._baseOpsMap = new Map;
        /**@type {number} */
        this._maxCPU = Memory.maxCPU;
        this._maxShardBases = undefined;
        /**@type {MapOp} */
        this._map = new MapOp(this);
        this._addChildOp(this._map);
        this._teamShardColonizing = new ColonizingOp(this, this);
    }

    get type() {return c.OPERATION_SHARD}

    get name() {return Game.shard.name};

    initTick(){

        this._maxCPU = Math.max(this._maxCPU, Game.cpu.bucket);
        Memory.maxCPU = this._maxCPU

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
        //do not yet do this based on memory. Shardchildops remember their creeps. Reassigning a creep needs to update the creep, creepOp and shardchildop
        for (let creepName in Game.creeps) {
            let creep = U.getCreep(creepName);
            let split = creepName.split('_');
            let roomName = /*creep.memory.baseName ||*/ split[0];
            let opType = /*creep.memory.operationType ||*/ parseInt(split[1]);
            let opInstance = parseInt(split[2])||0;
            if (creep.hits> 0 && this._OperationIdByRoomByOpType[roomName]) {
                let subOp = this._OperationIdByRoomByOpType[roomName][opType][opInstance]
                if (subOp) subOp.initCreep(creep) 
            }
            else delete Memory.creeps[creepName];
        }


        super.initTick()
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

    _firstRun() {
        this._support();
    }
    _support() {
        //garbage collection for dead creep memory
        for (let creepName in Memory.creeps) {
            if (!Game.creeps[creepName]) delete Memory.creeps[creepName]
        }

        //sort bases in order of importance
        this._baseOpsMap = new Map(_.values(this._baseOpsMap).sort((a,b) => 
            {return a[1].getBase().controller.level - b[1].getBase().controller.level})
        );
    }


    _strategy(){
        // check if we need to colonize
        let directive = c.DIRECTIVE_NONE;
        if (Game.cpu.bucket >= this._maxCPU && this._maxShardBases && this._maxShardBases > _.size(this._baseOpsMap)) directive = c.DIRECTIVE_COLONIZE
        for (let baseOpKey of this._baseOpsMap) baseOpKey[1].setDirective(directive);

        // check if we need to request a colonizer
        if (_.isEmpty(this._baseOpsMap)) this._parent.requestCreep(c.SHARDREQUEST_COLONIZER);
        else if (_.isEmpty(Game.spawns) && _.size(Game.creeps) < 10) this._parent.requestCreep(c.SHARDREQUEST_BUILDER)
        else this._parent.requestCreep(c.SHARDREQUEST_NONE);

        //check if we need to unclaim bases
        if (this._maxShardBases && _.size(this._baseOpsMap) > this._maxShardBases) {
            let bases = [];
            for (let baseOpName in this._baseOpsMap) bases.push(this.getBase(baseOpName))
            bases.sort ((a,b) => {return a.controller.level - b.controller.level});
            
            for (let i = _.size(this._baseOpsMap) - this._maxShardBases; i > 0 ; i--) bases[i].controller.unclaim();
        }
    }

    run(){
        // run all standard child operations
        super.run();

        // now run all nonstandard child operations

        // run the base operations in order of priority
        // if bucket is low, low priority bases are skipped 
        const cpuReserve = this._maxCPU / 20;
        const cpuRange = this._maxCPU - 2 * cpuReserve
        const maxBasesToRun = Math.floor((Game.cpu.bucket - cpuReserve) / cpuRange);
        let baseCount = 0;
        for (let baseOpKey of this._baseOpsMap) {
            if (++baseCount > maxBasesToRun) break;
            let baseOp = baseOpKey[1];
            baseOp.run();
        }

        //run colonizing operation;
        this._teamShardColonizing.run();
    }

    

    getMap(){
        return this._map;
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

    /**
     * @param {string} roomName
     * @returns {BaseOp} */
    getBaseOp(roomName) {
        let result = this._baseOpsMap.get(roomName);
        if (!result) throw Error('baseop does not exist')
        return result;
    }

    /**@returns {Number} */
    getBaseCount() {
        return _.size(this._baseOpsMap);
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
}

