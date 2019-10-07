const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./21_baseChildOp');


module.exports = class LinkOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
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
    get baseLinks() {return this._baseLinks}
    get sourceLinks() {return this._sourceLinks};

    initTick() {
        super.initTick();
        let newSourceLinks = [];
        let newBaseLinks = [];
        for (let linkId of this._sourceLinkIds) {
            let link = Game.getObjectById(linkId);
            if (link) newSourceLinks.push(link);
        }
        for (let linkId of this._baseLinkIds) {
            let link = Game.getObjectById(linkId);
            if (link) newBaseLinks.push(link);
        }
    
        this._sourceLinks = newSourceLinks;
        this._baseLinks = newBaseLinks;
    }

    _firstRun() {
        this._strategy();
    }

    _command(){
        let targetLink = this._baseLinks[0];
        for(let sourceLink of this._sourceLinks) {
            if (sourceLink.energyCapacity <= sourceLink.energy * 2) {
                sourceLink.transferEnergy(targetLink);
            }
        }
    }

    _tactics() {
        if (!this.baseOp.storage) return;
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let source = this._baseLinks[0];
            creepOp.instructTransfer(source, this.baseOp.storage)
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

        if (this._baseOp.phase >= c.BASE_PHASE_LINKS) this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY], maxLength: Math.floor(LINK_CAPACITY / CARRY_CAPACITY) }, 1)
    }
}