const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');


module.exports = class TransportOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {String[]} */
        this._sourceLinkIds = [];
        /**@type {String[]} */
        this._controllerLinkIds = [];
        /**@type {String[]} */
        this._baseLinkIds = [];
        /**@type {StructureLink[]} */
        this._sourceLinks = [];
        /**@type {StructureLink[]} */
        this._baseLinks = [];
        /**@type {StructureLink[]} */
        this._controllerLinks = [];
    }

    get type() {return c.OPERATION_TRANSPORT}
    get baseLinks() {return this._baseLinks}
    get sourceLinks() {return this._sourceLinks};
    get controllerLinks() {return this._controllerLinks};

    initTick() {
        super.initTick();
        let newSourceLinks = [];
        let newControllerLinks = [];
        let newBaseLinks = [];
        for (let linkId of this._sourceLinkIds) {
            let link = Game.getObjectById(linkId);
            if (link) newSourceLinks.push(link);
        }
        for (let linkId of this._controllerLinkIds) {
            let link = Game.getObjectById(linkId);
            if (link) newControllerLinks.push(link);
        }
        for (let linkId of this._baseLinkIds) {
            let link = Game.getObjectById(linkId);
            if (link) newBaseLinks.push(link);
        }
    
        this._sourceLinks = newSourceLinks;
        this._controllerLinks = newControllerLinks;
        this._baseLinks = newBaseLinks;
    }

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let links = this._baseOp.links;
        let newSourceLinkIds = [];
        let newControllerLinkIds = [];
        for (let link of links) {
            if (link.pos.findInRange(FIND_SOURCES,2).length > 0) newSourceLinkIds.push(link.id);
            if (link.pos.findInRange(FIND_STRUCTURES, 4,{filter: {structureType: STRUCTURE_CONTROLLER}}).length > 0) newControllerLinkIds.push(link.id);
        }
        this._sourceLinkIds = newSourceLinkIds;
        this._controllerLinkIds = newControllerLinkIds;

        let newBaseLink = this._baseOp.centerPos.findInRange(FIND_MY_STRUCTURES, 1, {filter: {structureType: STRUCTURE_LINK}})[0];
        if (newBaseLink) this._baseLinkIds = [newBaseLink.id];
        this.initTick();

        let creepCount = 0;
        if (this._baseLinkIds.length>0) creepCount = 1;
        //if (this.baseOp.labs.length>0) creepCount++;
        this.baseOp.spawningOp.ltRequestSpawn(this, {body:[CARRY], maxLength: 1 }, creepCount)
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
        let controllerLink = this._controllerLinks[0];
        let baseLink = this._baseLinks[0];
        let targetLink = controllerLink;
        if (targetLink == undefined || (targetLink.store.getFreeCapacity(RESOURCE_ENERGY)||0) < CARRY_CAPACITY) targetLink = this._baseLinks[0];
        for(let sourceLink of this._sourceLinks) {
            //if source and controller share link, keep a larger reserve in the link for the upgrader
            if (sourceLink == targetLink && targetLink == controllerLink && sourceLink.energy > sourceLink.energyCapacity / 8 * 5 ) {
                sourceLink.transferEnergy(baseLink, SOURCE_ENERGY_CAPACITY/ENERGY_REGEN_TIME * 10);
            }
            else if (sourceLink.energyCapacity / 8 <= sourceLink.energy) {
                sourceLink.transferEnergy(targetLink);
            }
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
            if (storage) sourceStructure = storage;
            if (terminal && terminal.store.getFreeCapacity() <= 0) sourceStructure = terminal;
            if (baseLink && baseLink.store.energy >= CARRY_CAPACITY) sourceStructure = baseLink;
            if (sourceStructure) {
                /**@type {Structure |null} */
                let targetStructure = null;
                if (storage) targetStructure = storage;
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
                }
            }
        }
    }
}