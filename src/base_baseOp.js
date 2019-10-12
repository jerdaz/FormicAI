const U = require('./util');
const c = require('./constants');
const FillingOp = require('./base_child_fillingOp');
const UpgradingOp = require('./base_child_upgradingOp');
const BuildingOp = require('./base_child_buildingOp');
const SpawningOp = require ('./base_child_spawningOp');
const TowerOp = require('./base_child_towerOp');
const ShardChildOp = require('./shard_shardChildOp');
const ColonizingOp = require('./shard_child_colonizingOp');
const HarvestingOp = require('./base_child_harvestingOp');
const BasePlanOp = require('./base_basePlanOp');
const LinkOp = require('./base_child_linkOp');

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

        this._addChildOp(new SpawningOp(this));
        this._addChildOp(new TowerOp(this));
        this._addChildOp(new FillingOp(this));
        this._addChildOp(new BuildingOp(this));
        this._addChildOp(new UpgradingOp(this));
        this._addChildOp(new ColonizingOp(this,shardOp, this));
        this._addChildOp(new BasePlanOp(this));
        this._addChildOp(new LinkOp(this));

        let i = 0;
        for (let source of base.find(FIND_SOURCES)) {
            let harvestingOp = new HarvestingOp(this, source.id, i++)
            this._addChildOp(harvestingOp);
        }

        this._phase = c.BASE_PHASE_BIRTH;
        this._fillerEmergency = false;

        /**@type {{[index:string]:Structure[]}} */
        this._structures = {};
    }

    initTick() {
        super.initTick();
        this._base = /**@type {Base} */ (Game.rooms[this._name])
        this._structures = {};
        let structures = this._base.find(FIND_MY_STRUCTURES);
        for (let structure of structures) {
            if (this._structures[structure.structureType] == undefined) this._structures[structure.structureType] = [];
            this._structures[structure.structureType].push(structure);
        }
    }

    get type() {return c.OPERATION_BASE}
    get fillingOp() {return /**@type {FillingOp} */(this._childOps[c.OPERATION_FILLING][0]) };
    get buildingOp() {return /**@type {BuildingOp} */(this._childOps[c.OPERATION_BUILDING][0]) };
    get spawningOp() {return /**@type {SpawningOp} */(this._childOps[c.OPERATION_SPAWNING][0]) };  
    get basePlanOp() {return /**@type {BasePlanOp} */ (this._childOps[c.OPERATION_BASEPLAN][0])};
    get linkOp() {return /**@type {LinkOp} */ (this._childOps[c.OPERATION_LINK][0])}
    get myStructures() {return this._structures};  
    get spawns() {return /**@type {StructureSpawn[]}*/ (this._structures[STRUCTURE_SPAWN]) || []}
    get extensions() {return /**@type {StructureExtension[]}*/ (this._structures[STRUCTURE_EXTENSION]) || []}
    get links() {return /**@type {StructureLink[]} */ (this._structures[STRUCTURE_LINK]) || [] }
    get storage() {return /**@type {StructureStorage | null}*/ ((this._structures[STRUCTURE_STORAGE]||[])[0])}
    get name() {return this._name}
    get phase() {return this._phase}


    hasSpawn() {
        return this.getMyStructures(STRUCTURE_SPAWN).length > 0;
    }

    /**@param {number} directive */
    setDirective(directive) {
        this._directive = directive;
    }

    getDirective(){
        return this._directive;
    }

    getName() {
        return this._base.name;
    }

    /**
     * @param {string} structureType
     * @returns {Structure[]} */
    getMyStructures(structureType) {
        return this._base.find(FIND_MY_STRUCTURES, {filter: {structureType: structureType}})
    }

    getBase() {
        return this._base;
    }

    getLevel() {
        return this._base.controller.level;
    }

    getMaxSpawnEnergy() {
        if (this.fillingOp.getCreepCount() == 0) return this._base.energyAvailable;
        else return this._base.energyCapacityAvailable;
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

    _firstRun() {
        this._strategy();
    }

    _tactics() {
        if ((this.spawns.length == 0) && this.buildingOp.getCreepCount() == 0) {
            this._shardOp.requestBuilder(this.name);
        }
        if (this.hasSpawn() == false && this._base.find(FIND_HOSTILE_CREEPS).length > 0) this._base.controller.unclaim();
    }

    _strategy() {
        this._phase = c.BASE_PHASE_BIRTH;
        if (this.storage) this._phase=c.BASE_PHASE_HARVESTER
        else return;
        if( this.storage.store.energy >= this._base.energyCapacityAvailable) this._phase = c.BASE_PHASE_STORED_ENERGY;
        else return;
        if (this.links.length > 0) this._phase = c.BASE_PHASE_LINKS;
        else return;
        if (this._base.controller.level >= 8 ) this._phase = c.BASE_PHASE_EOL
        return;
    }

        
    getBaseCenter() {
        return this.basePlanOp.baseCenter;
    }
}
