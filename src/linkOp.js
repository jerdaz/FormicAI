const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./baseChildOp');

const RESERVED_AMOUNT = 6 * CARRY_CAPACITY

module.exports = class LinkOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._runStrategy = true;
        /**@type {String[]} */
        this._sourceLinkIds = [];
        /**@type {String[]} */
        this._baseLinkIds = [];
        /**@type {StructureLink[]} */
        this._sourceLinks = [];
        /**@type {StructureLink[]} */
        this._baseLinks = [];
    }

    get type() {return c.OPERATION_LINK}

    initTick() {
        let newSourceLinks = [];
        let newBaseLinks = [];
        for (let linkId of this._sourceLinkIds) newSourceLinks.push(Game.getObjectById(linkId));
        for (let linkId of this._baseLinkIds) newBaseLinks.push(Game.getObjectById(linkId));
        this._sourceLinks = newSourceLinks;
        this._baseLinks = newBaseLinks;
    }

    _command(){
        let targetLink = this._baseLinks[0];
        for(let sourceLink of this._sourceLinks) {
            if (sourceLink.energyCapacity - sourceLink.energy < RESERVED_AMOUNT ) {
                sourceLink.transferEnergy(targetLink);
            }
        }
    }
    
    _strategy() {
        let links = this._baseOp.links;
        let newSourceLinkIds = [];
        let newBaseLinkIds = []
        for (let link of links) {
            if (link.pos.findInRange(FIND_SOURCES,2).length > 0) newSourceLinkIds.push(link.id);
            else newBaseLinkIds.push(link.id);
        }
        this._sourceLinkIds = newSourceLinkIds;
        this._baseLinkIds = newBaseLinkIds;
        this.initTick();
    }
}