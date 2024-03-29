const U = require('./util');
const c = require('./constants');
const RoomChildOp = require('./room_childOp');

const HARVESTER_SIZE_BIG = 48

module.exports = class HarvestingOp extends RoomChildOp {
    /** 
     * @param {RoomOp} roomOp
     * @param {Id<Source>} sourceId 
     * @param {number} instance*/
    constructor (roomOp, sourceId, instance) {
        super(roomOp, instance);
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
        if (!source) return //room is not visible
        let links = source.pos.findInRange(FIND_MY_STRUCTURES, 2, {filter: o => {return o.structureType == STRUCTURE_LINK && o.isActive() == true}});
        
        if (!this._roomOp.isSafe || this.baseOp.phase < c.BASE_PHASE_HARVESTER) {
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 0)
            this._harvesterCount = null;
        } else if (links.length >=1) {
            let body = [WORK,WORK,WORK,WORK,WORK,MOVE,MOVE,MOVE,CARRY]
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:body, minLength:body.length, maxLength:body.length}, 1)
            this._harvesterCount = null;
        } else if (this.baseOp.storage) {
            if (!this._harvesterCount) this._harvesterCount = 1;
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK], maxLength:HARVESTER_SIZE_BIG}, Math.round(this._harvesterCount))
        }

        //
        if (this._isMainRoom && links.length == 0 && this.baseOp.transportOp.controllerLink) {
            let base = this.baseOp.base;
            //create roomcallback to prevent building on room edges;
            let roomCallback = function(/**@type {string}*/ roomName) {
                let matrix = new PathFinder.CostMatrix;
                for (let i=0; i<c.MAX_ROOM_SIZE;i++) {
                    matrix.set(i,0,255);
                    matrix.set(i,1,255);
                    matrix.set(i,c.MAX_ROOM_SIZE-1,255);
                    matrix.set(i,c.MAX_ROOM_SIZE-2,255);
                    matrix.set(0,i,255);
                    matrix.set(1,i,255);
                    matrix.set(c.MAX_ROOM_SIZE-1,i,255);
                    matrix.set(c.MAX_ROOM_SIZE-2,i,255);
                    
                    
                }
                return matrix;

            } 
            let sources = base.find(FIND_SOURCES);
            /**@type {{pos:RoomPosition, range:number}[]} */
            let fleeTargets = []
            for (let source of sources) fleeTargets.push ({pos:source.pos, range:2})
            fleeTargets.push ({pos:this.baseOp.centerPos, range:3})
            let result = PathFinder.search(source.pos, fleeTargets,{roomCallback: roomCallback, flee:true} )
            let pos = result.path[1];
            if (pos) {
                let structures = pos.lookFor(LOOK_STRUCTURES)
                for(let structure of structures) if (structure.structureType != STRUCTURE_ROAD) structure.destroy();
                pos.createConstructionSite(STRUCTURE_LINK);
            }
        }
    }

    _tactics() {

        
        if (!this.baseOp.storage) return;
        /**@type {Source} */
        let source = /**@type {Source} */(Game.getObjectById(this._sourceId));
        if (this._harvesterCount) {
            if (source && source.ticksToRegeneration <= c.TACTICS_INTERVAL && source.energy > source.energyCapacity/ENERGY_REGEN_TIME * c.TACTICS_INTERVAL ) this._harvesterCount+=0.2;
            else this._harvesterCount -= 0.001;
            if (this._harvesterCount > 3) this._harvesterCount = 3;
            else if (this._harvesterCount < 1) this._harvesterCount = 1;
        } ;

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            if (creepOp.instruction == c.COMMAND_NONE) {
                if (source) {
                    let link = source.pos.findInRange(FIND_MY_STRUCTURES,2,{filter: {structureType: STRUCTURE_LINK}})[0];
                    if (link && link.isActive() && this.baseOp.transportOp.baseLink) creepOp.instructTransfer(source, link);
                    else creepOp.instructHarvest(source)
                }
                else creepOp.instructMoveTo(this.roomName)
            }
        }
    }
}
