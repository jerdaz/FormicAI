const U = require('./util');
const c = require('./constants');
const FillingOp = require('./base_fillingOp');
const UpgradingOp = require('./base_upgradingOp');
const BuildingOp = require('./base_buildingOp');
const SpawningOp = require ('./base_spawningOp');
const TowerOp = require('./base_defenseOp');
const ShardChildOp = require('./shard_childOp');
const ColonizingOp = require('./shard_colonizingOp');
const HarvestingOp = require('./base_harvestingOp');
const BasePlanOp = require('./base_basePlanOp');
const LinkOp = require('./base_transportOp');
const MiningOp = require('./base_miningOp');
const MarketOp = require('./base_marketOp');
const ScoutOp = require('./base_scoutOp')

const UNCLAIM_TIME = 3000;

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
        this.addChildOp(new BuildingOp(this));
        this.addChildOp(new UpgradingOp(this));
        this.addChildOp(new ColonizingOp(this,shardOp, this));
        this.addChildOp(new BasePlanOp(this));
        this.addChildOp(new LinkOp(this));
        //this.addChildOp(new MiningOp(this));
        this.addChildOp(new MarketOp(this));
        this.addChildOp(new ScoutOp(this));

        let i = 0;
        for (let source of base.find(FIND_SOURCES)) {
            let harvestingOp = new HarvestingOp(this, source.id, i++)
            this.addChildOp(harvestingOp);
        }

        this._phase = c.BASE_PHASE_BIRTH;
        this._fillerEmergency = false;

        /**@type {{[index:string]:Structure[]}} */
        this._structures = {};

        this._unclaimTimer = 0;
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
    get terminal() {return /**@type {StructureTerminal | null}*/((this._structures[STRUCTURE_TERMINAL]||[])[0])}
    get towers() {return /**@type {StructureTower[]}*/ (this._structures[STRUCTURE_TOWER])||[]}
    get labs() {return /**@type {StructureLab[]} */ (this._structures[STRUCTURE_LAB])||[]}
    get name() {return this._name}
    get phase() {return this._phase}
    get centerPos() { return this.basePlanOp.baseCenter;}
    get directive(){ return this._directive;}
    get base() {return this._base;}
    get credits() {return this._shardOp.bank.getCredits(this._name)}
    get events() {return this._base.getEventLog()};

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

    /**@param {number} directive */
    setDirective(directive) {
        this._directive = directive;
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

    _firstRun() {
        this._strategy();
    }

    _tactics() {
        if ((this.spawns.length == 0) && this.buildingOp.creepCount == 0) {
            this._shardOp.requestBuilder(this.name);
        }
    }

    _strategy() {
        let level = this.base.controller.level;

        this._phase = c.BASE_PHASE_BIRTH;
        if (this.storage) this._phase=c.BASE_PHASE_HARVESTER
        else return;
        if( this.storage.store.energy >= this._base.energyCapacityAvailable * 2) this._phase = c.BASE_PHASE_STORED_ENERGY;
        else return;
        if (this.links.length > 0) this._phase = c.BASE_PHASE_SOURCE_LINKS;
        else return;
        if (this.links.length > this._base.find(FIND_SOURCES).length) this._phase = c.BASE_PHASE_CONTROLLER_LINK;
        else return;
        if (this._base.controller.level >= 8 ) this._phase = c.BASE_PHASE_EOL
        return;

        if (this.spawns.length == 0 && this._unclaimTimer == 0 ) this._unclaimTimer = Game.time;
        else if (this.spawns.length == 0 && Game.time - this._unclaimTimer > UNCLAIM_TIME) this.base.controller.unclaim();
        else if (this.spawns.length>0) this._unclaimTimer = 0;
    }

}
