const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./21_baseChildOp');

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
        } else if (links.length >=1) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], maxLength:HARVESTER_SIZE_SMALL}, 1)
        } else if (this.baseOp.storage) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], maxLength:HARVESTER_SIZE_BIG}, 1)
        }

        if (this.baseOp.phase >= c.BASE_PHASE_LINKS) {
            let base = this.baseOp.getBase();
            if(links.length == 0) {
                let result = PathFinder.search(source.pos, this.baseOp.getBaseCenter())
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
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let source = Game.getObjectById(this._sourceId);
            creepOp.instructHarvest(source)
        }
    }
}
