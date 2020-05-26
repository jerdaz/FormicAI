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
        /**@type {number} */
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
        /**@type {boolean | null} */
        this._hasWorkParts = null;
        this._idleTime = 0;
    }
    get type() {return c.OPERATION_CREEP}
    get source() {return Game.getObjectById(this._sourceId)}
    get dest() {
        return U.getRoomObject(this._destId);
    }

    get isBoosted() {return this._isBoosted}
    /**@param {boolean} bool */
    set isBoosted(bool) {this._isBoosted = bool}
    get hasWorkParts(){
        if (this._hasWorkParts == null) {
            this._hasWorkParts = this._creep.body.filter(o => {return o.type == WORK}).length > 0;
        }
        return this._hasWorkParts;
    }

    get idleTime() {return this._idleTime}

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

    /**@param {Structure | ConstructionSite} [dest] */
    instructFill(dest) {
        this._sourceId = ''
        if (dest) this._destId = dest.id;
        else this._destId = '';
        this._instruct = c.COMMAND_FILL
        this._resourceType = RESOURCE_ENERGY;
    }

    instructBuild() {
        this._sourceId = ''
        this._destId = '';
        this._instruct = c.COMMAND_BUILD;
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

    /**@param {string} roomName */
    instructClaimController(roomName) {
        this._destId = roomName;
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
                else if (creep.store.getFreeCapacity() == 0) {
                    this._state = c.STATE_DROPENERGY;
                }
                else if (this._state != c.STATE_RETRIEVING && this.state != c.STATE_DROPENERGY) this._state = c.STATE_DROPENERGY;
                break;
            case c.COMMAND_FILL:
                if (creep.store.getUsedCapacity()  == 0) this._state = c.STATE_FINDENERGY;
                else if (creep.store.getFreeCapacity() == 0) {
                    this._state = c.STATE_FILLING;
                }
                else if (this._state != c.STATE_FINDENERGY && this._state != c.STATE_FILLING) this._state = c.STATE_FILLING;
                break;
            case c.COMMAND_TRANSFER:
                if (creep.store.getUsedCapacity()  == 0) this._state = c.STATE_RETRIEVING;
                else if (creep.store.getFreeCapacity() == 0) this._state = c.STATE_DELIVERING;
                else if (this._state != c.STATE_RETRIEVING && this._state != c.STATE_DELIVERING) this._state = c.STATE_DELIVERING;
                break;
            case c.COMMAND_MOVETO:
                this._state=c.STATE_MOVING;
                break;
            case c.COMMAND_CLAIMCONTROLLER:
                this._state=c.STATE_CLAIMING
                break;
            case c.COMMAND_BUILD:
                if (creep.store.getUsedCapacity()  == 0) this._state = c.STATE_FINDENERGY;
                else if (creep.store.getFreeCapacity() == 0) {
                    this._state = c.STATE_BUILDING;
                }
                else if (this._state != c.STATE_FINDENERGY && this._state != c.STATE_BUILDING) this._state = c.STATE_BUILDING;
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

                let result = -1000
                if      (sourceObj instanceof Source)    result = creep.harvest(sourceObj);
                else if (sourceObj instanceof Structure) result = creep.withdraw(sourceObj,resourceType);
                else if (sourceObj instanceof Ruin) result = creep.withdraw(sourceObj, resourceType);
                else if (sourceObj instanceof Tombstone) result = creep.withdraw(sourceObj, resourceType);
                else if (sourceObj instanceof Resource) result = creep.pickup(sourceObj);
                else if (sourceObj instanceof Mineral) result = creep.harvest(sourceObj);
                else throw Error('Cannot retrieve from object ' + sourceObj + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
                if (result == OK && c.CREEP_EMOTES) creep.say('➤🚚')
                //if (result != ERR_NOT_IN_RANGE && result != OK) this._instruct = c.COMMAND_NONE;
                break;

            case c.STATE_DROPENERGY:
            case c.STATE_FILLING:
                if (destObj && destObj.store && destObj.store.getFreeCapacity(resourceType) <= 0) destObj = null;
                if (destObj == null) {
                    switch (this._state) {
                        case c.STATE_DROPENERGY:
                            destObj = this._findEnergySink();
                            break;
                        case c.STATE_FILLING:
                            destObj = this._findFillTarget();
                            break;
                    }
                    if (destObj && destObj.id) this._destId = destObj.id;
                    else this._destId = ''
                }
                this._deliver(destObj);
                break;

            case c.STATE_BUILDING:
                if (destObj instanceof Structure) {
                    let roomLevel = 1;
                    if (this._baseOp) roomLevel = this._baseOp.level
                    let needRepair = destObj.hits < destObj.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 && destObj.hits < c.MAX_WALL_HEIGHT * RAMPART_HITS_MAX[roomLevel] * 3;                    
                    if (!needRepair) destObj = null;
                } ;
                if (destObj == null) {
                    destObj = this._findBuildTarget();
                    if (destObj && destObj.id) this._destId = destObj.id;
                    else this._destId = ''
                }
                this._deliver(destObj);
                break;


            case c.STATE_DELIVERING:
                this._deliver(destObj);
                break;
        
            case c.STATE_MOVING:
                if (this._destPos) {
                    if (this._destPos.isEqualTo(creep.pos)) this._instruct = c.COMMAND_NONE
                    else this._moveTo(this._destPos);
                }
                if (c.CREEP_EMOTES) creep.say('🦶')
                break;
            case c.STATE_CLAIMING:
                let roomName = this._destId;
                let room = Game.rooms[roomName]
                if (room && room.controller) {
                    if (room.controller.my) creep.suicide();
                    else {
                        let result = -1000;
                        destObj = room.controller;
                        if (destObj instanceof StructureController) result = creep.claimController(destObj);
                        if (result == ERR_NOT_IN_RANGE) this._moveTo(room.controller.pos, {range:1});
                    }
                } else {
                    this._moveTo(new RoomPosition(25,25, roomName));
                }
                if (c.CREEP_EMOTES) creep.say('Cl:' + roomName)
                break;
            case c.STATE_NONE:
                //flee from sources and spawns
                /**@type {RoomObject[]} */
                let targets = creep.pos.findInRange(FIND_SOURCES_ACTIVE, 2);
                targets.concat(creep.pos.findInRange(FIND_MY_STRUCTURES, 2, {filter: {structureType: STRUCTURE_SPAWN}}));
                if (targets.length>0) {
                    let poss = []
                    for (let target of targets) poss.push(target.pos)
                    let result = PathFinder.search(creep.pos, poss,{flee:true})
                    creep.moveByPath(result.path)
                }
                if (c.CREEP_EMOTES) creep.say('💤')
                break;
        }    
        if (this._instruct== c.COMMAND_NONE) {
            this._parent.lastIdle = Game.time;
            this._idleTime++;
        } else this._idleTime = 0;
        if (!creep.pos.isEqualTo(this._lastPos)) this._registerCreepStep();
        this._lastPos = this._creep.pos;
    }

    /**@param {RoomObjectEx | null} [destObj] */
    _deliver(destObj) {
        let creep = this._creep;
        if(!destObj) this._instruct = c.COMMAND_NONE;
        else {
            let range = 1;
            let result = -1000;
            if      (destObj instanceof Structure) {
                /**@type {number} */
                if (this.hasWorkParts && destObj.hits < destObj.hitsMax) {result = creep.repair(destObj); range = 3;}
                if (destObj instanceof StructureController) range = 3;
                if (result != OK && result != ERR_NOT_IN_RANGE) result = creep.transfer(destObj, U.getLargestStoreResource(creep.store));
                if (result == OK && destObj instanceof StructureController && (destObj.sign == null || destObj.sign.text != SIGN)) {result = creep.signController(destObj, SIGN);range =1};
            }
            else if (destObj instanceof ConstructionSite) {result = creep.build(destObj); range = 3;}
            else throw Error('Cannot deliver to object ' + destObj + '(room: ' + creep.room.name + ' creep: ' + creep.name + ')');
            if (result == ERR_NOT_IN_RANGE) {
                let destPos = destObj.pos;
                if (destObj instanceof StructureLink) {
                    // go to spot between link and source
                    let source = destObj.pos.findInRange(FIND_SOURCES,2)[0];
                    if (source) {
                        let path = destObj.pos.findPathTo(source.pos)
                        if (path.length > 0) { 
                            destPos = new RoomPosition (path[0].x, path[0].y, destObj.pos.roomName);
                            range = 0;
                        }
                    }
                } 
                this._moveTo(destPos, {range:range});
            }
            if (c.CREEP_EMOTES) creep.say('🚚➤' + ' '+ destObj.pos.x + ' ' + destObj.pos.y )
        }
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

    _findFillTarget() {
        let creep = this._creep;
        let dest = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {Structure}*/ o) => {
            let store = /**@type {any} */ (o).store;
            if (store == undefined) return false
            return  (store[RESOURCE_ENERGY] < store.getCapacity(RESOURCE_ENERGY))
                    && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION || o.structureType == STRUCTURE_TOWER || o.structureType == STRUCTURE_LAB || 
                        (o.structureType == STRUCTURE_TERMINAL && store[RESOURCE_ENERGY] < c.MAX_TRANSACTION) 
                       // || (o.structureType == STRUCTURE_STORAGE && store[RESOURCE_ENERGY] < this._baseOp.base.energyCapacityAvailable)
                        );
            }})
        return dest;
    }

    _findBuildTarget() {
        let creep = this._creep;
        /**@type {Structure|ConstructionSite|null}  */
        let dest = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
        if (!dest) { //repair normal structures
            let structures = creep.room.find(FIND_MY_STRUCTURES, {filter: o => {
                let roomLevel = 1;
                if (this._baseOp) roomLevel = this._baseOp.level
                let needRepair = o.hits < o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 && o.hits < c.MAX_WALL_HEIGHT * RAMPART_HITS_MAX[roomLevel] * 3;                    
                if (!needRepair) return false;
                else return true;
            }});
            structures.sort((a,b) => {return a.hits - b.hits});
            dest = structures[0];
        }
        if (!dest) { // repair roads
            let roads = creep.room.find(FIND_STRUCTURES, {filter: o => {
                let needRepair = o.hits < o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3;
                if (!needRepair) return false;
                if (o.structureType == STRUCTURE_ROAD) {
                    this._log({roadrepair: o.pos})
                    let roomInfo = this._mapOp.getRoomInfo(creep.room.name);
                    if (!roomInfo) return false;
                    this._log({roadrepair: o.pos, terrain:roomInfo.terrainArray[o.pos.x][o.pos.y] })
                    if (roomInfo.terrainArray[o.pos.x][o.pos.y].fatigueCost <= 0) return false;
                    this._log('canrepair');
                    return true;
                }
                return false;
            }});
            dest = creep.pos.findClosestByPath(roads);
        }
        return dest;
    }

    /**
     * @arg {RoomPosition} endDest 
     * @arg {MoveToOpts} [opts]
    */
    _moveTo(endDest, opts) {
        let creep = this._creep;
        let range = 0;
        if (opts && opts.range) range = opts.range;
        if (creep.pos.inRangeTo(endDest,range)) return OK;
        let optsCopy = Object.assign(opts||{});
        /**@type {RoomPosition | null} */
        let dest = endDest;
        let myPos = creep.pos;
        if (myPos.roomName != endDest.roomName) {
            if (this._lastMoveToDest == null || !endDest.isEqualTo(this._lastMoveToDest)) this._lastMoveToInterimDest = null;
            if (this._lastMoveToDest && dest.isEqualTo(this._lastMoveToDest) && myPos.roomName == this._lastPos.roomName && this._lastMoveToInterimDest) dest = this._lastMoveToInterimDest;
            else {
                let route = Game.map.findRoute(creep.pos.roomName, endDest.roomName);
                if (route instanceof Array && route.length > 2) {
                    optsCopy.range = 20;
                    dest = new RoomPosition(25,25,route[1].room)
                    this._lastMoveToInterimDest = dest;
                } else {
                    dest = endDest;
                    this._lastMoveToInterimDest = null;
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
        if (result == ERR_NO_PATH) {
            this._instruct = c.COMMAND_NONE;
        }
        this._lastMoveToDest = endDest;
        return result;
    }

    _registerCreepStep() {


        let creep = this._creep;
        let roomInfo = this._mapOp.getRoomInfo(creep.pos.roomName);
        if (!roomInfo) return;
        let moveParts = 0;
        let otherParts = 0;
        for (let bodyPart of creep.body) {
            switch (bodyPart.type) {
                case MOVE:
                    moveParts++;
                    break;
                case CARRY:
                    break;
                default:
                    otherParts++;
            }
        }
        let fatigue = 0;
        fatigue = otherParts;
        this._log({f1: fatigue})
        fatigue += this._calcResourcesWeight();
        this._log({f2: fatigue})
        let moveRate = 2;
        if (Game.map.getRoomTerrain(creep.pos.roomName).get(creep.pos.x,creep.pos.y) == TERRAIN_MASK_SWAMP) moveRate = 5;
        let stepTicks = Math.ceil(fatigue / (moveParts / moveRate) );
        let stepTicksRoad = Math.ceil(fatigue / moveParts);
        
        let opportunityCost = (stepTicks - stepTicksRoad) * this.creepCost / CREEP_LIFE_TIME 
        this._log({stepTicks: stepTicks, stepTicksRoad: stepTicksRoad, cost: opportunityCost});
        if (opportunityCost > 0) {
            this._mapOp.registerFatigue(creep.pos, opportunityCost);
        }
    }

    _calcResourcesWeight() {
        let creep = this._creep;
        var totalCarry = creep.store.getUsedCapacity(), weight = 0;
        for(var i = creep.body.length-1; i >= 0; i--) {
            if(!totalCarry) {
                break;
            }
            var part = creep.body[i];
            if(part.type != CARRY || !part.hits) {
                continue;
            }
            var boost = 1;
            if(part.boost) {
                boost = BOOSTS[CARRY][part.boost].capacity || 1;
            }
            totalCarry -= Math.min(totalCarry, CARRY_CAPACITY * boost);
            weight++;
        }
        return weight;
    }

}

