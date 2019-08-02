let U = require('./util');
let c = require('./constants');
let ChildOp = require('./operation').ChildOp;
let BaseOp = require('./baseOp').BaseOp;
let MapOp = require('./mapOp').MapOp;
let TeamColonizingOp = require('./teamColonizingOp')
let Operation = require('./operation').Operation;
/** @typedef {import('./main').Main} MainOp */


class ShardOp extends ChildOp {
    /**@param {MainOp} main */
    constructor(main) {
        super(main);
        this._parent = main;
        /**@type {MapOp} */
        this._map = new MapOp(this);
        this._addChildOp(this._map);
        /** @type {{[key:string]: BaseOp }} */
        this._baseOps = {};
        /**@type {number} */
        this._maxCPU = Memory.maxCPU;
        this._maxShardBases = Game.gcl.level
        this._teamShardColonizing = new TeamColonizingOp(undefined, this._map);
    }

    get type() {return c.OPERATION_SHARD}

    initTick(){
        this._maxCPU = Math.max(this._maxCPU, Game.cpu.bucket);
        Memory.maxCPU = this._maxCPU

        /**@type {{[baseName:string]:Creep[]}} */
        let creepsByBase = {};
        for (let creepName in Game.creeps) {
            let roomName = creepName.split('_')[0];
            if (creepsByBase[roomName] == undefined) creepsByBase[roomName] = [];
            let creep = U.getCreep(creepName);
            if (creep) {
                if (creep.hits > 0 && creep.spawning == false) creepsByBase[roomName].push (creep);
                else if (creep.memory) delete Memory.creeps[creep.name];
            }
        }

        let updateMap = false;
        /** @type {{[key:string]: BaseOp }} */
        let newBaseOps = {}
        for (let roomName in Game.rooms) {
            let room = this.getRoom(roomName);
            if (room.controller && room.controller.my) {
                if (!this._baseOps[room.name]) {
                    this._baseOps[room.name] = new BaseOp(this.getBase(room.name), creepsByBase[room.name], this);
                    updateMap = true;
                }
                this._baseOps[roomName].initTickBase(/**@type {Base} */ (room), creepsByBase[room.name]);
                newBaseOps[roomName] = this._baseOps[roomName];
                delete creepsByBase[room.name];
            }
        }
        if (_.size(this._baseOps) != _.size(newBaseOps)) updateMap = true;
        this._baseOps = newBaseOps;
        if (updateMap) this._map.updateBaseDistances(this._baseOps);

        //init shard colonization
        let creeps = []
        for (let baseName in creepsByBase) if (baseName.startsWith('shard')) {
            for(let creep of creepsByBase[baseName]) creeps.push(creep);
            delete creepsByBase[baseName]
        }
        this._teamShardColonizing.initTick(creeps);

        // kill all creeps of dead bases.
        for (let baseName in creepsByBase) {
            for (let creep of creepsByBase[baseName]) {
                creep.suicide();
            }
        }
        super.initTick();
    }

    /**@param {number} max */
    setDirectiveMaxBases(max){
        this._maxShardBases = max;
    }

    /**@param {String} roomName */
    requestBuilder(roomName){
        let donorRoom = this._map.findClosestBaseByPath(roomName, 3 , true);
        if (donorRoom) this._baseOps[donorRoom].requestBuilder(roomName);
    }

    /**@param {string} shard */
    /**@param {number} requestType} */
    requestShardColonization(shard, requestType) {
        for(let baseOp in this._baseOps) this._baseOps[baseOp].requestShardColonization(shard, requestType);
    }

    _support() {
        //garbage collection
        if (U.chance(1500)) {
            for (let creepName in Memory.creeps) {
                if (!Game.creeps[creepName]) delete Memory.creeps[creepName]
            }
        }
    }


    _strategy(){
        if (U.chance(100) || this._firstRun) {
            let directive = c.DIRECTIVE_NONE;
            if (Game.cpu.bucket >= this._maxCPU && this._maxShardBases > _.size(this._baseOps)) directive = c.DIRECTIVE_COLONIZE
            for (let baseName in this._baseOps) this._baseOps[baseName].setDirective(directive);

            if (_.isEmpty(this._baseOps)) this._parent.requestCreep(c.SHARDREQUEST_COLONIZER);
            else if (_.isEmpty(Game.spawns) && _.size(Game.creeps) < 10) this._parent.requestCreep(c.SHARDREQUEST_BUILDER)
            else this._parent.requestCreep(c.SHARDREQUEST_NONE);

            if (_.size(this._baseOps) > this._maxShardBases) {
                let bases = [];
                for (let baseOpName in this._baseOps) bases.push(this.getBase(baseOpName))
                bases.sort ((a,b) => {return a.controller.level - b.controller.level});
                
                for (let i = _.size(this._baseOps) - this._maxShardBases; i > 0 ; i--) bases[i].controller.unclaim();
            }
        }
    }

    run(){
        super.run();
        let cpuReserve = this._maxCPU / 20;
        let cpuRange = this._maxCPU - 2* cpuReserve
        /**@type {Base[]} */
        let bases = [];
        let maxBases = _.size(this._baseOps)
        for (let baseOpName in this._baseOps) bases.push(this.getBase(baseOpName))
        bases.sort ((a,b) => {return a.controller.level - b.controller.level});
        let baseCount = 0;
        while (bases.length > 0 && Game.cpu.bucket > cpuReserve + (maxBases - bases.length) / maxBases * cpuRange) {
            let base = /**@type {Base}*/ (bases.pop())
            if (++baseCount <= maxBases) this._baseOps[base.name].run();
        }

        this._teamShardColonizing.run();
    }

    

    getMap(){
        return this._map;
    }

    /**@param {string} roomName */
    /**@returns {Room} returns room with RoomName */
    getRoom(roomName) {
        let room = Game.rooms[roomName];
        if (!room) throw ('Error');
        return room;
    }

    /**@param {string} roomName */
    /**@returns {Base} returns base with RoomName */
    getBase(roomName) {
        let base = /**@type {Base} */ (Game.rooms[roomName]);
        if (!base) throw ('Error');
        if (base.controller === undefined) throw ('Error');
        return base;
    }

    /**@param {string} roomName */
    /**@returns {BaseOp} */
    getBaseOp(roomName) {
        return this._baseOps[roomName];
    }

    /**@returns {Number} */
    getBaseCount() {
        return _.size(this._baseOps);
    }
}

class ShardChildOp extends ChildOp {
    /**@param {ShardOp}  shardOp */
    /**@param {Operation}  parent */
    constructor(parent, shardOp) {
        super(parent);
        this._shardOp = shardOp;
        this._map = shardOp._map;
    }

    get shardOp() {return this._shardOp};
}

module.exports.ShardOp = ShardOp;
module.exports.ShardChildOp = ShardChildOp;
