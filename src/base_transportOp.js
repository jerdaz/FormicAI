const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');


module.exports = class TransportOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {Id<Structure>[]} */
        this._sourceLinkIds = [];
        /**@type {Id<Structure>|null} */
        this._controllerLinkId = null;
        /**@type {Id<Structure>|null} */
        this._baseLinkId = null;
        /**@type {StructureLink[]} */
        this._sourceLinks = [];
        /**@type {StructureLink|null} */
        this._baseLink = null;
        /**@type {StructureLink| null} */
        this._controllerLink = null;
    }

    get type() {return c.OPERATION_TRANSPORT}
    get baseLink() {return this._baseLink}
    get sourceLinks() {return this._sourceLinks};
    get controllerLink() {return this._controllerLink };

    // force update link allocations
    updateLinks() {
        let links = this._baseOp.links;
        let newSourceLinkIds = [];
        let newControllerLinkIds = [];
        for (let link of links) {
            if (link.pos.findInRange(FIND_SOURCES,2).length > 0) newSourceLinkIds.push(link.id);
            if (link.pos.findInRange(FIND_STRUCTURES, 4,{filter: {structureType: STRUCTURE_CONTROLLER}}).length > 0) newControllerLinkIds.push(link.id);
        }
        this._sourceLinkIds = newSourceLinkIds;
        let newBaseLink = this._baseOp.centerPos.findInRange(FIND_MY_STRUCTURES, 1, {filter: {structureType: STRUCTURE_LINK}})[0];
        if (newBaseLink) this._baseLinkId = newBaseLink.id;

        if (newControllerLinkIds.length == null) this._controllerLinkId = null
        else if (newControllerLinkIds.length == 1) this._controllerLinkId = newControllerLinkIds[0]
        else {
            /**@type {Id<Structure>[]} */
            let result = [];
            if (newBaseLink) _.intersection (newControllerLinkIds, [newBaseLink.id])
            if (!result)  result = _.intersection(newControllerLinkIds, newSourceLinkIds)
            if (!result) result = newControllerLinkIds;
            this._controllerLinkId = result[0]
        }

        this.initTick();
    }

    initTick() {
        super.initTick();
        let newSourceLinks = [];
        for (let linkId of this._sourceLinkIds) {
            let link = /**@type {StructureLink} */ (Game.getObjectById(linkId) );
            if (link) newSourceLinks.push(link);
        }
        this._sourceLinks = newSourceLinks;
        
        let linkId = this._controllerLinkId
        /**@type {StructureLink|null} */
        let link = null
        if (linkId) {
            link = /**@type {StructureLink}*/ (Game.getObjectById(linkId));
        }
        this._controllerLink = link;

        linkId = this._baseLinkId
        /**@type {StructureLink|null} */
        link = null
        if (linkId) {
            link = /**@type {StructureLink}*/ (Game.getObjectById(linkId));
        }
        this._baseLink = link;
    }

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        this.updateLinks();
        let creepCount = 0;
        if (this._baseLinkId) creepCount = 1;
        //if (this.baseOp.labs.length>0) creepCount++;
        this.baseOp.spawningOp.ltRequestSpawn(this, {body:[CARRY], maxLength: 2 }, creepCount)
    }

    // _tactics() {
    //     if (!this.baseOp.storage) return;
    //     let baseLink = this._baseLinks[0];
    //     if (baseLink == null) return;
    //     let creepNumber = 0;
    //     let storage = this._baseOp.storage
    //     if (!storage) return;
    //     let terminal = this._baseOp.terminal;
    //     let lab = this._baseOp.labs[0]
    //     for (let creepName in this._creepOps) {
    //         let creepOp = this._creepOps[creepName];
    //         if (creepNumber == 0) { //first creep transfers between storage and base link
    //             if (baseLink.store[RESOURCE_ENERGY] >= CARRY_CAPACITY) creepOp.instructTransfer(baseLink, storage);
    //             else if (terminal && terminal.store.getFreeCapacity() <= 0) creepOp.instructTransfer(terminal, storage); 
    //         }
    //         // else if (creepNumber == 1) { //second creep transfers between terminal and storage
    //         //     if (terminal && terminal.store[RESOURCE_CATALYZED_GHODIUM_ACID]>0 && lab && lab.store && lab.store.getFreeCapacity(RESOURCE_CATALYZED_GHODIUM_ACID) ) creepOp.instructTransfer(terminal, lab, RESOURCE_CATALYZED_GHODIUM_ALKALIDE)
    //         // }
    //         creepNumber++;
    //     }
    // }    

    _command(){
        let controllerLink = this._controllerLink;
        let baseLink = this._baseLink;
        let targetLink = controllerLink;
        if (targetLink == undefined || (targetLink.store.getFreeCapacity(RESOURCE_ENERGY)||0) < 200) targetLink = this._baseLink;
        if (baseLink && targetLink) {
            for(let sourceLink of this._sourceLinks) {
                //if source and controller share link, keep a larger reserve in the link for the upgrader
                if (sourceLink == targetLink && targetLink == controllerLink && sourceLink.store.energy > sourceLink.store.getCapacity(RESOURCE_ENERGY) / 8 * 5 ) {
                    sourceLink.transferEnergy(baseLink, SOURCE_ENERGY_CAPACITY/ENERGY_REGEN_TIME * 10);
                }
                else if (sourceLink.store.getCapacity(RESOURCE_ENERGY) / 8 <= sourceLink.store.energy) {
                    sourceLink.transferEnergy(targetLink);
                }
            }
        }

        // transfer energy from baselink to controller link if possible
        if (baseLink && controllerLink
            && controllerLink.store.energy <= baseLink.store.energy )
        {
            baseLink.transferEnergy(controllerLink);
        }    


        let creepOp = _.sample(this._creepOps);
        if (creepOp) {
            let storage = this._baseOp.storage;
            let terminal = this._baseOp.terminal;
            let pos = creepOp.creep.pos;
            let structures = pos.findInRange(FIND_STRUCTURES,1)
            /**@type {StructureSpawn | null} */
            let spawn = null;
            /**@type {StructureTerminal | null} */
            /**@type {StructureTower[]} */
            let towers = []
            for (let structure of structures) {
                switch (structure.structureType){
                    case STRUCTURE_SPAWN:
                        spawn = structure;
                        break;
                    case STRUCTURE_TOWER:
                        towers.push(structure);
                        break;
                }
            }
            /**@type {Structure |null} */
            let sourceStructure = null;
            let creepCapacity = creepOp.creep.body.filter(o => o.type == 'carry').length * CARRY_CAPACITY;
            let linkEquilibrium = creepCapacity / 2; //baseLink equilibrium minimum
            if (controllerLink) linkEquilibrium = Math.max(linkEquilibrium, controllerLink.store.getFreeCapacity(RESOURCE_ENERGY)); //if controller link needs energy equilibrium is equal to emptyness of controller link
            if (baseLink) linkEquilibrium = Math.min (linkEquilibrium, baseLink.store.getCapacity(RESOURCE_ENERGY) - creepCapacity/2) // equilibrium can't be higher then capacity - half of transport creep capacity
            if (storage) sourceStructure = storage;
            if (terminal && terminal.store.getFreeCapacity() <= 0) sourceStructure = terminal;
            if (baseLink && baseLink.store.energy > linkEquilibrium + creepCapacity/2) sourceStructure = baseLink;
            if (sourceStructure) {
                /**@type {Structure |null} */
                let targetStructure = null;
                if (storage) targetStructure = storage;
                if (baseLink && baseLink.store.energy <= linkEquilibrium - creepCapacity) targetStructure = baseLink;
                if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) targetStructure = spawn;
                else {
                    for (let tower of towers) {
                        if (tower.store.getFreeCapacity(RESOURCE_ENERGY) >= CARRY_CAPACITY ) {
                            targetStructure = tower;
                            break;
                        }
                    }
                }
                if (targetStructure && sourceStructure != targetStructure) {
                    creepOp.instructTransfer(sourceStructure, targetStructure);
                } else creepOp.instructStop();
            }
        }
    }
}