const U = require('./util');
const c = require('./constants');
const FillingOp = require('./base_fillingOp');
const UpgradingOp = require('./base_upgradingOp');
const SpawningOp = require ('./base_spawningOp');
const TowerOp = require('./base_defenseOp');
const ShardChildOp = require('./shard_childOp');
const ColonizingOp = require('./base_colonizingOp');
const BasePlanOp = require('./base_basePlanOp');
const TransportOp = require('./base_transportOp');
const MiningOp = require('./base_miningOp');
const MarketOp = require('./base_marketOp');
const ScoutOp = require('./base_scoutOp');
const RoomOp = require('./room_roomOp');

const UNCLAIM_TIME = 20000;

module.exports = class BaseOp extends ShardChildOp{
    /** 
     * @param {Base} base 
     * @param {ShardOp} shardOp */
    constructor (base, shardOp) {
        super(shardOp, shardOp);
        

        /**@type {Base} */
        this._base = base;
        this._name = base.name;
        this._directive = c.DIRECTIVE_NONE;

        this.addChildOp(new SpawningOp(this));
        this.addChildOp(new TowerOp(this));
        this.addChildOp(new FillingOp(this));
        this.addChildOp(new UpgradingOp(this));
        this.addChildOp(new ColonizingOp(this));
        this.addChildOp(new BasePlanOp(this));
        this.addChildOp(new TransportOp(this));
        //this.addChildOp(new MiningOp(this));
        this.addChildOp(new MarketOp(this));
        this.addChildOp(new ScoutOp(this));
        this._myRoomOp = new RoomOp(this, this._name, 0);
        this.addChildOp(this._myRoomOp);

        this._phase = c.BASE_PHASE_BIRTH;
        this._fillerEmergency = false;

        /**@type {{[index:string]:Structure[]}} */
        this._structures = {};
    }

    get type() {return c.OPERATION_BASE}
    get roomOps() {return /**@type {RoomOp[]}*/( this._childOps[c.OPERATION_ROOM])}
    get mainRoomOp() {return this._myRoomOp}
    get fillingOp() {return /**@type {FillingOp} */(this._childOps[c.OPERATION_FILLING][0]) };
    get spawningOp() {return /**@type {SpawningOp} */(this._childOps[c.OPERATION_SPAWNING][0]) };  
    get basePlanOp() {return /**@type {BasePlanOp} */ (this._childOps[c.OPERATION_BASEPLAN][0])};
    get buildingOp() {return this._myRoomOp.buildingOp}
    get upgradingOp() {return /**@type {UpgradingOp} */ (this._childOps[c.OPERATION_UPGRADING][0])};
    get transportOp() {return /**@type {TransportOp} */ (this._childOps[c.OPERATION_TRANSPORT][0])}
    get myStructures() {return this._structures};  
    get spawns() {return /**@type {StructureSpawn[]}*/ (this._structures[STRUCTURE_SPAWN]) || []}
    get extensions() {return /**@type {StructureExtension[]}*/ (this._structures[STRUCTURE_EXTENSION]) || []}
    get links() {return /**@type {StructureLink[]} */ (this._structures[STRUCTURE_LINK]) || [] }
    get storage() {return /**@type {StructureStorage | null}*/ ((this._structures[STRUCTURE_STORAGE]||[])[0])}
    get terminal() {return /**@type {StructureTerminal | null}*/((this._structures[STRUCTURE_TERMINAL]||[])[0])}
    get towers() {return /**@type {StructureTower[]}*/ (this._structures[STRUCTURE_TOWER])||[]}
    get labs() {return /**@type {StructureLab[]} */ (this._structures[STRUCTURE_LAB])||[]}
    get containers() {return /**@type {StructureContainer[]} */ (this._structures[STRUCTURE_CONTAINER])||[]}
    get deathContainer() {
        for (let container of this.containers) {
            if (container.pos.x == this.centerPos.x-1 && container.pos.y == this.centerPos.y+1) return container;
        }
    }
    get name() {return this._name}
    get phase() {return this._phase}
    get centerPos() { return this.basePlanOp.baseCenter;}
    get directive(){ return this._directive;}
    get base() {return this._base;}
    get credits() {return this._shardOp.bank.getCredits(this._name)}
    get events() {return this._base.getEventLog()};
    get level() { return this._base.controller.level};

    initTick() {
        super.initTick();
        this._base = /**@type {Base} */ (Game.rooms[this._name])
        // add op to room for easy access in debug console
        this._base.baseOp = this;
        this._structures = {spawn:[], extension:[], rampart:[], link:[], storage:[], observer:[], powerBank:[], extractor:[], lab:[], terminal:[], nuker:[], factory:[]};
        let structures = this._base.find(FIND_MY_STRUCTURES);
        for (let structure of structures) {
            if (this._structures[structure.structureType] == undefined) this._structures[structure.structureType] = [];
            this._structures[structure.structureType].push(structure);
        }
    }

    /**@param {number} directive */
    setDirective(directive) {
        if (this._directive != c.DIRECTIVE_FORTIFY) this._directive = directive;
    }

    /**@param {string} roomName */
    requestBuilder(roomName) {
        this.spawningOp.requestBuilder(roomName);
    }

    /**
     * @param {string} shard
     * @param {number} requestType} */
    requestShardColonization(shard, requestType) {
        this.spawningOp.requestShardColonizers(shard, requestType);
    }

    activateSafemode() {
        this._base.controller.activateSafeMode();
    }

    /**
     * add a subroom to the base
     * @param {string} roomName 
     */
    addRoom(roomName) {
        this.addChildOp(new RoomOp(this,roomName, 1));
    }

    /** remove a subroom from the base
     * @param {string} roomName
    */
    removeRoom(roomName) {
       for (let roomOp of this.roomOps) {
           if (roomOp.roomName == roomName ) this.removeChildOp(roomOp, true);
       }
    }

    //unclaim this base
    //clean up structures
    unclaim(){
        let base = this.base;
        for(let structure of base.find(FIND_MY_STRUCTURES)) structure.destroy()
        base.controller.unclaim();
        this.base.memory.unclaimTimer = 0;
    }

    _firstRun() {
        this._strategy();
    }

    _support() {
        // remember this room has been colonized
        Memory.colonizations[this.name] = Game.time;
    }

    _tactics() {
        if (this.spawns.length == 0 && this.buildingOp.creepCount < 3) {
            let hostileCreeps = this._base.find(FIND_HOSTILE_CREEPS);
            hostileCreeps = _.filter(hostileCreeps, o => {return o.getActiveBodyparts(ATTACK) > 0 || o.getActiveBodyparts(RANGED_ATTACK) > 0 || o.getActiveBodyparts(WORK) > 0})
            if (hostileCreeps.length == 0 || this._base.controller.safeMode) this._shardOp.requestBuilder(this.name);
        }
    }

    _strategy() {
        let level = this.base.controller.level;

        this._setPhase()

        // give up base if the spawn is gone and rebuilding fails within a UNCLAIM_TIME
        // reset
        if (this.spawns.length == 0 && (this.base.memory.unclaimTimer||0) == 0 ) this.base.memory.unclaimTimer = Game.time;
        else if (this.spawns.length == 0 && Game.time - (this.base.memory.unclaimTimer||0) > UNCLAIM_TIME) {
            this.unclaim();
        }
        else if (this.spawns.length>0 && this.towers.length>0) this.base.memory.unclaimTimer = 0;

        //check for nukes & safe mode for fortifications
        let nukes = this.base.find(FIND_NUKES);
        if (nukes.length > 0 && level >= 5) this._directive = c.DIRECTIVE_FORTIFY; //fortifying for nukes is useful after level 5 (not enough rampart hits before that)
        if (this.base.controller.safeMode && level >=4) this._directive = c.DIRECTIVE_FORTIFY; //first get to level 4 for a cannon+storage before fortifying
        else if (this._directive == c.DIRECTIVE_FORTIFY && nukes.length == 0 && !this.base.controller.safeMode) this._directive = c.DIRECTIVE_NONE;
    }

    _setPhase() {
        this._phase = c.BASE_PHASE_BIRTH;
        // start harvesting when there is a storage.
        if (this.storage && this.storage.isActive()) this._phase=c.BASE_PHASE_HARVESTER
        else return;
        // stored energy phase if thre is energy in the store -or- harvesters are busy filling the store.
        if( this.storage.store.energy > 0) this._phase = c.BASE_PHASE_STORED_ENERGY;
        else {
            for (let harvestingOp of this.mainRoomOp.harvestingOps) {
                if (harvestingOp.creepCount > 0) {
                    this._phase = c.BASE_PHASE_STORED_ENERGY
                    break;
                }
            }
            if (this._phase < c.BASE_PHASE_STORED_ENERGY) return;
        }
        
        this.transportOp.updateLinks(); // updatelinks. In first tick baseOp runs before transportop, links will not be up to date.
        if (this.transportOp.baseLink) this._phase = c.BASE_PHASE_SOURCE_LINKS;
        else return;
        if (CONTROLLER_STRUCTURES[STRUCTURE_LINK][this.level] > this._base.find(FIND_SOURCES).length + 1) this._phase = c.BASE_PHASE_CONTROLLER_LINK;
        else return;
        if (this._base.controller.level >= 8 ) this._phase = c.BASE_PHASE_EOL
        return;
    }

}
