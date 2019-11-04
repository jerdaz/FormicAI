const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_baseChildOp');


module.exports = class LinkOp extends BaseChildOp {
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

    get type() {return c.OPERATION_LINK}
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

        if (this._baseOp.storage) {
            let newBaseLink = this._baseOp.storage.pos.findClosestByPath(FIND_STRUCTURES,{filter: {structureType: STRUCTURE_LINK}});
            if (newBaseLink) this._baseLinkIds = [newBaseLink.id];
        } else this._baseLinkIds = [];
        this.initTick();

        if (this._baseOp.phase >= c.BASE_PHASE_SOURCE_LINKS) this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY], maxLength: Math.floor(LINK_CAPACITY / CARRY_CAPACITY) }, 1)
    }

    _tactics() {
        if (!this.baseOp.storage) return;
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let source = this._baseLinks[0];
            creepOp.instructTransfer(source, this.baseOp.storage)
        }
    }    

    _command(){
        let controllerLink = this._controllerLinks[0];
        let baseLink = this._baseLinks[0];
        let targetLink = controllerLink;
        if (targetLink == undefined || targetLink.energy > targetLink.energyCapacity / 8 * 7) targetLink = this._baseLinks[0];
        for(let sourceLink of this._sourceLinks) {
            if (sourceLink == targetLink && targetLink == controllerLink && sourceLink.energy > sourceLink.energyCapacity / 8 * 5 ) {
                sourceLink.transferEnergy(baseLink, 100);
            }
            else if (sourceLink.energyCapacity / 8 <= sourceLink.energy) {
                sourceLink.transferEnergy(targetLink);
            }
        }
    }


}