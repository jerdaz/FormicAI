const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');
const Version = require('./version')


let version = new Version;
const SIGN = c.MY_SIGN.replace('[VERSION]', version.version)

module.exports = class CreepOp extends ChildOp {
    /**
     * @param {ShardOp} shardOp
     * @param {ShardChildOp} parent
     * @param {BaseOp} [baseOp] 
     * @param {MapOp} mapOp
     * @param {Creep} creep
     * */
    constructor(parent, shardOp, baseOp, mapOp, creep) {
        super(parent);
        this._parent = parent;
        this._state = c.STATE_NONE;
        this._instruct = c.COMMAND_NONE;
        this._sourceId = '';
        this._destId = '';
        this._destPos = null;
        /**@type {ResourceConstant} */
        this._resourceType = RESOURCE_ENERGY;
        this._baseOp = baseOp;
        this._creep = creep;
        this._mapOp = mapOp;
        /**@type {RoomPosition | null} */
        this._lastMoveToDest = null
        /**@type {RoomPosition | null} */
        this._lastMoveToInterimDest = null
        this._lastPos = creep.pos
        this._isBoosted = false;
        /**@type {number | null} */
        this._cost = null;
    }
    get type() {return c.OPERATION_CREEP}
    get source() {return Game.getObjectById(this._sourceId)}
    get dest() {
        return U.getRoomObject(this._destId);
    }

    get isBoosted() {return this._isBoosted}
    /**@param {boolean} bool */
    set isBoosted(bool) {this._isBoosted = bool}

    get creep() {return this._creep};

    get name() {return this._creep.name};

    get pos() {
        if (this._creep == undefined ) throw Error('creep undefined');

        return this._creep.pos;
    }

    get age() {
        return CREEP_LIFE_TIME - (this._creep.ticksToLive||0);
    }

    get creepCost() {
        if (this._cost) return this._cost;
        else {
            let cost = 0;
            for (let bodypart of this._creep.body) {
                cost += BODYPART_COST[bodypart.type]
            }
            this._cost = cost;
            return cost;
        }
    }


    get room() {
        if (this._creep == undefined ) throw Error('creep undefined');

        return this._creep.room;
    }

    get instruction() {
        return this._instruct;
    }

    get state() {
        return this._state;
    }

    /**@param {Creep} creep */
    initTickCreep(creep) {
        this._creep = creep;
    }

    /**@param {ShardChildOp} newParent */
    newParent(newParent) {
        super.newParent(newParent);
        this._creep.memory.operationType = newParent.type;
        this._creep.memory.operationInstance = newParent.instance;
    }

    /**@param {Structure | ConstructionSite} dest */
    instructFill(dest) {
        this._sourceId = ''
        this._destId = dest.id;
        this._instruct = c.COMMAND_FILL
        this._resourceType = RESOURCE_ENERGY;
    }

    /**
     * @param {Source | Structure} source
     * @param {Structure | ConstructionSite} dest 
     * @param {ResourceConstant | undefined} [resourceType] */
    instructTransfer(source, dest, resourceType) {
        this._sourceId = source.id;
        this._destId = dest.id;
        this._instruct = c.COMMAND_TRANSFER;
        this._resourceType = resourceType||RESOURCE_ENERGY;
    }
    
    /**@param {RoomPosition} dest */
    instructMoveTo(dest) {
        this._destPos = dest;
        this._instruct = c.COMMAND_MOVETO
    }

    /**@param {StructureController} controller */
    instructClaimController(controller) {
        this._destId = controller.id
        this._instruct = c.COMMAND_CLAIMCONTROLLER
    }

    instructStop() {
        this._instruct = c.COMMAND_NONE;
    }

    /**
     * @param {Source} source
     * */
    instructHarvest(source) {
        this._instruct = c.COMMAND_HARVEST;
        this._sourceId = source.id;
        this._resourceType = RESOURCE_ENERGY;
    }


    // /**@param {Number} opType */
    // setOperation(opType) {
    //     if (this._creep == undefined ) throw Error('creep undefined');

    //     this._creep.memory.operationType = opType;
    // }
    
    _firstRun() {
        this._creep.notifyWhenAttacked(false);
    }


    _tactics() {
        switch (this._instruct) {
            case c.COMMAND_NONE:
                if (this._baseOp) {
                    if (this._creep.pos.roomName != this._baseOp.name) {
                        this.instructMoveTo(this._baseOp.centerPos);
                    }
                }
                break;
        }      
    }
    
    _command() {
        let creep = this._creep;
        switch (this._instruct) {
            case c.COMMAND_HARVEST:
                if (creep.store.getUsedCapacity() == 0) {
                    this._state = c.STATE_RETRIEVING;
                }
                if (creep.store.getFreeCapacity() == 0) {
                    this._state = c.STATE_DROPENERGY;
                }
                if (this._state == c.STATE_NONE) this._state = c.STATE_RETRIEVING;
                break;
            case c.COMMAND_FILL:
                if (creep.store.getUsedCapacity()  == 0) this._state = c.STATE_FINDENERGY;
                if (creep.store.getFreeCapacity() == 0) {
                    this._state = c.STATE_DELIVERING;
                }
                if (this._state == c.STATE_NONE) this._state = c.STATE_FINDENERGY;
                break;
            case c.COMMAND_TRANSFER:
                if (creep.store.getUsedCapacity()  == 0) this._state = c.STATE_RETRIEVING;
                if (creep.store.getFreeCapacity() == 0) this._state = c.STATE_DELIVERING;
                if (this._state == c.STATE_NONE) this._state = c.STATE_RETRIEVING;
                break;
            case c.COMMAND_MOVETO:
                this._state=c.STATE_MOVING;
                break;
            case c.COMMAND_CLAIMCONTROLLER:
                this._state=c.STATE_CLAIMING
                break;
            case c.COMMAND_NONE:
                this._state = c.STATE_NONE;
                break;
        }

        /**@type {RoomObjectEx | null} */
        let sourceObj = U.getRoomObject(this._sourceId);
        /**@type {RoomObjectEx | null} */
        let destObj = U.getRoomObject(this._destId);
        let resourceType = this._resourceType;
        switch (this._state) {
            case c.STATE_FINDENERGY:
                if (sourceObj && sourceObj.store && sourceObj.store[resourceType] == 0) sourceObj = null;
                if(sourceObj == undefined) {
                    sourceObj = this._findEnergySource();
                    if (sourceObj && sourceObj.id) this._sourceId = sourceObj.id;
                    else this._sourceId = '';
                }
                //deliberate fallthrough to retrieving
            case c.STATE_RETRIEVING:
                if (sourceObj == null){
                        this._instruct = c.COMMAND_NONE; 
                        break;
                    }
                this._moveTo(sourceObj.pos, {range:1});

                // also pick up stuff on the way
                let tombstone = creep.pos.findInRange(FIND_TOMBSTONES, 1)[0];
                if (tombstone) {
                    let res = creep.withdraw(tombstone, resourceType);
                    // also withdraw other stuff & bring to terminal if that is destination
                    if (res == ERR_NOT_ENOUGH_RESOURCES && destObj instanceof StructureTerminal) creep.withdraw(tombstone, U.getLargestStoreResource(creep.store))
                }
                else {
                    let dropped_resource = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1)[0];
                    if (dropped_resource) {
                        if (dropped_resource.resourceType == resourceType) creep.pickup(dropped_resource);
                        // also withdraw other stuff & bring to terminal if that is destination
                        else if (destObj instanceof StructureTerminal) creep.pickup(dropped_resource)
                    }
                }

                if      (sourceObj instanceof Source)    creep.harvest(sourceObj);
                else if (sourceObj instanceof Structure) creep.withdraw(sourceObj,resourceType);
                else if (sourceObj instanceof Ruin) creep.withdraw(sourceObj, resourceType);
                else if (sourceObj instanceof Tombstone) creep.withdraw(sourceObj, resourceType);
                else if (sourceObj instanceof Resource) creep.pickup(sourceObj);
                else if (sourceObj instanceof Mineral) creep.harvest(sourceObj);
                else throw Error('Cannot retrieve from object ' + sourceObj + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                if (c.CREEP_EMOTES) creep.say('➤🚚')
                break;

            case c.STATE_DROPENERGY:
                if (destObj && destObj.store && destObj.store.getFreeCapacity[resourceType] <= 0) destObj = null;
                if (destObj == null) {
                    destObj = this._findEnergySink();
                    if (destObj && destObj.id) this._destId = destObj.id;
                    else this._destId = ''
                }
                //deliberate fallthrough to delivering
            case c.STATE_DELIVERING:
                if(!destObj) this._instruct = c.COMMAND_NONE;
                else {
                    let result = -1000;
                    if      (destObj instanceof Structure) {
                        /**@type {number} */
                        if (destObj.hits < destObj.hitsMax) result = creep.repair(destObj);
                        if (result != OK && result != ERR_NOT_IN_RANGE) result = creep.transfer(destObj, U.getLargestStoreResource(creep.store));
                        if (result == OK && destObj instanceof StructureController && (destObj.sign == null || destObj.sign.text != SIGN)) creep.signController(destObj, SIGN);
                    }
                    else if (destObj instanceof ConstructionSite) result = creep.build(destObj);
                    else throw Error('Cannot deliver to object ' + destObj + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                    if (result == ERR_NOT_IN_RANGE) this._moveTo(destObj.pos, {range:1});
                    if (c.CREEP_EMOTES) creep.say('🚚➤' + ' '+ destObj.pos.x + ' ' + destObj.pos.y )
                }
                break;
        
            case c.STATE_MOVING:
                if (this._destPos) this._moveTo(this._destPos);
                if (c.CREEP_EMOTES) creep.say('🦶')
                break;
            case c.STATE_CLAIMING:
                if (destObj) {
                    this._moveTo(destObj.pos, {range:1});
                    if (destObj instanceof StructureController) creep.claimController(destObj);
                }
                this._lastPos = this._creep.pos;
                if (c.CREEP_EMOTES) creep.say('Claiming')
                break;
            case c.STATE_NONE:
                if (c.CREEP_EMOTES) creep.say('💤')
                break;
        }    
        if (this._instruct== c.COMMAND_NONE) this._parent.lastIdle = Game.time;
        if (!creep.pos.isEqualTo(this._lastPos)) this._mapOp.registerCreepStep(creep.pos);
    }

    _findEnergySource() {
        let room = this._creep.room;
        /**@type {RoomObject[]} */
        let roomObjects = [];
        /**@type RoomObject|null */
        let result;
        roomObjects = room.find(FIND_DROPPED_RESOURCES, {filter: {resourceType: RESOURCE_ENERGY}})
        roomObjects = roomObjects.concat(room.find(FIND_TOMBSTONES, {filter: (o) => {return o.store.energy > 0}}), roomObjects)
        roomObjects = roomObjects.concat(room.find(FIND_RUINS, {filter: (o) => {return o.store.energy > 0}}), roomObjects)
        roomObjects = roomObjects.concat(room.find(FIND_MY_STRUCTURES, {filter: (o) => {return (o.structureType == STRUCTURE_STORAGE 
                                                                                                ) && o.store.energy > 0
                                                                                            || o.structureType == STRUCTURE_LINK && o.energy > 0;   
                                                                                        }   
                                                                        }))
        roomObjects = roomObjects.concat(room.find(FIND_STRUCTURES, {filter: (o) => {return o.structureType == STRUCTURE_CONTAINER && o.store.energy > 0
                                                                                        || o.structureType == STRUCTURE_TERMINAL && o.store.energy > c.MAX_TRANSACTION * 2    
                                                                                        }}));        
        result = this._creep.pos.findClosestByPath(roomObjects)
        if (result == null) {
            result = this._creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        return result
    }

    _findEnergySink() {
        let room = this._creep.room;
        /**@type {RoomObject[]} */
        let roomObjects = [];
        /**@type RoomObject|null */
        let result;
        if (this._baseOp) {
            roomObjects = roomObjects.concat(_.filter(this._baseOp.links, o => {return o.energy < o.energyCapacity} ));
            let storage = this._baseOp.storage
            if (storage && _.size(storage.store) < storage.storeCapacity) roomObjects.push (storage);
        }
        result = this._creep.pos.findClosestByPath(roomObjects, {ignoreCreeps:true});
        return result;        
    }

    /**
     * @arg {RoomPosition} pos 
     * @arg {MoveToOpts} [opts]
    */
    _moveTo(pos, opts) {
        let creep = this._creep;
        let range = 0;
        if (opts && opts.range) range = opts.range;
        if (creep.pos.inRangeTo(pos,range)) return OK;
        let optsCopy = Object.assign(opts||{});
        /**@type {RoomPosition | null} */
        let dest = pos;
        let myPos = creep.pos;
        if (myPos.roomName != dest.roomName) {
            if (!_.isEqual(dest,this._lastMoveToDest)) this._lastMoveToInterimDest = null;
            if (_.isEqual(dest,this._lastMoveToDest) && myPos.roomName == this._lastPos.roomName && this._lastMoveToInterimDest) dest = this._lastMoveToInterimDest;
            else {
                let route = Game.map.findRoute(creep.pos.roomName, pos.roomName, {routeCallback: (roomName, fromRoomName) => 
                    {   let roomInfo = this._mapOp.getRoomInfo(roomName);
                        if(roomInfo && roomInfo.hostileOwner) return Infinity; }
                });
                if (route instanceof Array && route.length > 2) {
                    optsCopy.range = 20;
                    dest = new RoomPosition(25,25,route[1].room)
                    this._lastMoveToInterimDest = dest;
                }
            }
        }

        //mark hostile rooms unwalkable
        // optsCopy.costCallback = function (/**@type {string}*/roomName, /**@type {CostMatrix} */ costMatrix) {
        //     let roomInfo = this._mapop.getRoomInfo(roomName);
        //     if (roomInfo && roomInfo.hostileOwner) {
        //         for (let x =0; x<50;x++) {
        //             for (let y = 0; y<50; y++){
        //                 costMatrix.set(x,y,255);
        //             }
        //         }
        //     }
        // }

        let result = creep.moveTo(dest, optsCopy);
        // if fatigued, save opportunity cost to map, for road building
        if (result == ERR_TIRED) {
            this._mapOp.registerFatigue(creep.pos, this.creepCost / CREEP_LIFE_TIME)
        } else if (result == ERR_NO_PATH) {
            this._instruct = c.COMMAND_NONE;
        }
        this._lastMoveToDest = pos;
        return result;
    }
}

