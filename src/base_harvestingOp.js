const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const HARVESTER_SIZE_BIG = 48
const HARVESTER_SIZE_SMALL = 6*3

module.exports = class HarvestingOp extends BaseChildOp {
    /** 
     * @param {BaseOp} baseOp
     * @param {String} sourceId 
     * @param {number} instance*/
    constructor (baseOp, sourceId, instance) {
        super(baseOp, instance);
        this._sourceId = sourceId;
        /**@type {Number|null} 
         * null for fixed harverster count
         * numbered for dynamic harvester count
        */
        this._harvesterCount = null;
    }

    get type() {return c.OPERATION_HARVESTING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        /**@type {Source | null} */
        let source = Game.getObjectById(this._sourceId);
        if (!source) throw Error('Source not found')
        let links = source.pos.findInRange(FIND_MY_STRUCTURES, 2, {filter: {structureType: STRUCTURE_LINK}});
        
        if (this.baseOp.phase < c.BASE_PHASE_HARVESTER) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 0)
            this._harvesterCount = null;
        } else if (this.baseOp.phase >= c.BASE_PHASE_SOURCE_LINKS && links.length >=1) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], maxLength:HARVESTER_SIZE_SMALL}, 1)
            this._harvesterCount = null;
        } else if (this.baseOp.storage) {
            if (!this._harvesterCount) this._harvesterCount = 1;
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], maxLength:HARVESTER_SIZE_BIG}, Math.round(this._harvesterCount))
        }

        if (this.baseOp.phase >= c.BASE_PHASE_SOURCE_LINKS) {
            let base = this.baseOp.base;
            if(links.length == 0) {
                let result = PathFinder.search(source.pos, this.baseOp.centerPos)
                let pos = result.path[1];
                let structures = pos.lookFor(LOOK_STRUCTURES)
                for(let structure of structures) structure.destroy();
                pos.createConstructionSite(STRUCTURE_LINK);
            }
            else if (links.length > 1) {
                for(let i = 1;i<links.length;i++ ) links[i].destroy();
            }
        }
    }

    _tactics() {
        if (!this.baseOp.storage) return;
        let source = Game.getObjectById(this._sourceId);
        if (this._harvesterCount) {
            if (source.energy > source.energyCapacity/ENERGY_REGEN_TIME * c.TACTICS_INTERVAL) this._harvesterCount+=0.2;
            else this._harvesterCount -= 0.001;
            if (this._harvesterCount > 2) this._harvesterCount = 2;
        } ;

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            creepOp.instructHarvest(source)
        }
    }
}
