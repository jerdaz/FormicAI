const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');
const Version = require('./version');
const { throttle } = require('lodash');
const { COMMAND_NONE } = require('./constants');

let version = new Version;
const SIGN = c.MY_SIGN.replace('[VERSION]', version.version).substr(0,96)
const MAX_MOVE_OPS = 4000;

module.exports = class CreepOp extends ChildOp {
    /**
     * @param {ShardOp} shardOp
     * @param {ShardChildOp} parent
     * @param {MapOp} mapOp
     * @param {Creep} creep
     * @param {BaseOp} [baseOp] 
     * */
    constructor(parent, shardOp, mapOp, creep, baseOp) {
        super(parent);
        this._parent = parent;
        /**@type {number} */
        this._state = c.STATE_NONE;
        this._instruct = c.COMMAND_NONE;
        this._sourceId = '';
        this._destId = '';
        this._carryPartUsed=false;
        this._destPos = null;
        this._destRoomName = '';
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
        this._shardOp = shardOp;
        this._idleTime = 0;
        this._travelDone = creep.spawning?false:true;
        this._retrieveOldResourcesDone = false;
        /**@type {boolean} */
        this._notifyWhenAttackedIntent = true;
        this._notifyWhenAttacked = true
        this._moveFlags = 0;
    }
    get type() {return c.OPERATION_CREEP}
    get source() {return U.getRoomObject(this._sourceId)}
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

    get notifyWhenAttacked() {
        return this._notifyWhenAttacked;
    }
    /**@param {boolean} value */
    set notifyWhenAttacked(value) {
        this._notifyWhenAttacked = value;
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
        if (newParent.baseOp) this._creep.memory.baseName = newParent.baseOp.name;
        if (newParent.roomOp) this._creep.memory.baseName = newParent.roomOp.name;
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
     * @param {Source | Structure | Mineral} source
     * @param {Structure | ConstructionSite} dest 
     * @param {ResourceConstant | undefined} [resourceType] */
     instructTransfer(source, dest, resourceType) {
        this._sourceId = source.id;
        this._destId = dest.id;
        this._instruct = c.COMMAND_TRANSFER;
        this._resourceType = resourceType||RESOURCE_ENERGY;
    }

    /**@param {RoomPosition | string} dest 
     * @param {number} [moveFlags]
    */
    instructMoveTo(dest, moveFlags) {
        if (dest instanceof RoomPosition) {
            this._destPos = dest;
            this._destRoomName = ''
        }
        else {
            this._destPos = null
            this._destRoomName = dest;
        }
        this._instruct = c.COMMAND_MOVETO
        this._moveFlags = moveFlags || 0;
    }

    /**@param {string} roomName */
    instructClaimController(roomName) {
        this._destId = roomName;
        this._instruct = c.COMMAND_CLAIMCONTROLLER
    }

    /**@param {string} roomName */
    instructReserve(roomName) {
        this._destId = roomName;
        this._instruct = c.COMMAND_RESERVE
    }

    /**@param {string} roomName */
    instructAttack(roomName) {
        this._destRoomName = roomName;
        this._instruct = c.COMMAND_ATTACK
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

    /**@param {string} roomName */
    instructUpgradeController(roomName) {
        this._instruct = c.COMMAND_UPGRADE;
        let room = Game.rooms[roomName]
        if (!room) throw Error()
        let controller = room.controller;
        if (!controller) throw Error();
        this._destId = controller.id;
        this._resourceType = RESOURCE_ENERGY;
    }

    instructRecycle() {
        this._instruct = c.COMMAND_RECYCLE;
        this._destId = '';
    }




    // /**@param {Number} opType */
    // setOperation(opType) {
    //     if (this._creep == undefined ) throw Error('creep undefined');

    //     this._creep.memory.operationType = opType;
    // }


    _tactics() {
        switch (this._instruct) {
            case c.COMMAND_NONE:
                    if (this._parent.ownerRoomName && this._parent.ownerRoomName != this._shardOp.name && this._creep.pos.roomName != this._parent.ownerRoomName) {
                            this.instructMoveTo(this._parent.ownerRoomName);
                    }
                break;
        }      

        //disable attack notification
        if (this._notifyWhenAttacked != this._notifyWhenAttackedIntent && !this._creep.spawning) {
            let result = this._creep.notifyWhenAttacked(this._notifyWhenAttacked)
            if (result == OK) this._notifyWhenAttackedIntent = this._notifyWhenAttacked;
        }
    }

    // process the turn
    // first input energy, then output energy, then move to target (source or destination)
    _processTurn() {
        /**@type {{[index:string]:number}} */
        let mutations = {}
        let creep = this._creep;
        /**@type {ScreepsReturnCode} */
        let result = OK;
        this._carryPartUsed = false;
        if (!this._state) this._state = c.STATE_INPUT;
        if (this._state == c.STATE_INPUT) result = this._inputResource(mutations);    // first input
        if (this._instruct == c.COMMAND_NONE) return;
        if (result == OK && this._state == c.STATE_OUTPUT) {
            result = this._outputResource(mutations);  // then output
            if (this._instruct == c.COMMAND_NONE) return;
            if (result == OK && this._state == c.STATE_INPUT) result = this._inputResource(mutations);    // then input again
            if (this._instruct == c.COMMAND_NONE) return;
            if ( this._state == c.STATE_OUTPUT) result = this._outputResource(mutations); // then output again
            if (this._instruct == c.COMMAND_NONE) return;
        }

        // then move to new target
        if (result == ERR_NOT_IN_RANGE) {
            let moveRange = 1;
            /**@type {RoomPosition|undefined} */
            let moveTarget = undefined;
            let nextStop = undefined;

            if (this._state == c.STATE_INPUT && this.source) {
                moveTarget = this.source.pos;
                if (this.dest) nextStop = this.dest.pos;
            }
            else if (this._state == c.STATE_OUTPUT && this.dest) {
                if (    this.dest instanceof StructureController
                    || this.dest instanceof ConstructionSite
                ) moveRange = 3
                moveTarget = this.dest.pos;
                if (this.source) nextStop = this.source.pos
            }
            if (moveTarget) {
                this._moveTo(moveTarget, {range:moveRange}, {nextStop:nextStop})

            }
        } else if (result == OK && !this._travelDone) {
            this._travelDone = true;
            this._parent.updateTravelTime(CREEP_LIFE_TIME - (creep.ticksToLive||0) + 2)
        }
    }

    //input the resources for the task
    /**@param {{[index:string]:number}} mutations */
    _inputResource(mutations) {
        // init vars
        let creep = this._creep;
        let amount = 0;
        /**@type {ScreepsReturnCode|null} */
        let result = ERR_NOT_IN_RANGE;

        // find the energy source
        let source = this.source;
        if (this._instruct == c.COMMAND_FILL) {
            if (source && source.store && source.store.getUsedCapacity(RESOURCE_ENERGY) == 0) source = null;
            if (source == null) source = this._findEnergySource();
            if (source && source.id) this._sourceId = source.id;
            else this.sourceId = '';
        }
        if (!source) {
            this._instruct=COMMAND_NONE;
            return ERR_INVALID_TARGET;
        }
        if (!source.id) throw Error('source id cannot be null')

        // retrieve energy from the source
        if (source.store && !this._carryPartUsed) {
            result = creep.withdraw(/**@type {Structure}*/ (source), RESOURCE_ENERGY);
            if (result == OK) {
                this._carryPartUsed=true;
                amount = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY) - (mutations[creep.id]||0), source.store.getUsedCapacity(RESOURCE_ENERGY) + (mutations[source.id]||0));
            }
        }
        else if (source instanceof Source) {
            result = creep.harvest(/**@type {Source} */ (source));
            if (result == OK) {
                amount = Math.min(source.energy, creep.getActiveBodyparts(WORK) * HARVEST_POWER)

                // pickup predecessor resources;
                this._retrieveOldResources()
            }
        }
        else if (source instanceof Resource) {
            result = creep.pickup(source)
            if (result == OK) {
                amount = amount = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY) - (mutations[creep.id]||0), source.amount + (mutations[source.id]||0));
            }
        }
        
        mutations[source.id] = (mutations[source.id]||0) -amount;
        mutations[creep.id] = (mutations[creep.id]||0) + amount;

        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) - (mutations[creep.id]||0) <= 0) {
            this._state = c.STATE_OUTPUT 
            if (this._instruct == c.COMMAND_FILL && !(source instanceof Source)) this._sourceId = '';
        }

        return result;
    }

    //output the resources for the task
    /**@param {{[index:string]:number}} mutations */
    _outputResource(mutations) {
        let creep = this._creep;
        /**@type {ScreepsReturnCode} */
        let result = ERR_NOT_IN_RANGE;
        
        //determine target
        let target = this.dest
        if (this._instruct == c.COMMAND_FILL) {
            if (target && target.id && target.store && target.store.getFreeCapacity(RESOURCE_ENERGY) - (mutations[target.id]||0) <= TOWER_ENERGY_COST) target = null;
            if (!target) target = this._findFillTarget(mutations);
            if (target && target.id) this._destId = target.id;
            else this._destId = '';
        }
        if (!target) {
            this._instruct = c.COMMAND_NONE;
            return ERR_INVALID_TARGET;
        }
        if (!target.id) throw Error ('target id cannot be null')
        let amount = 0;

        if (target instanceof StructureController) {
            let maxEnergyPerTick = creep.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER
            if (target.level >= 8) maxEnergyPerTick = Math.min(maxEnergyPerTick, CONTROLLER_MAX_UPGRADE_PER_TICK);
            let creepAmount = creep.store.getUsedCapacity(RESOURCE_ENERGY) + (mutations[creep.id]||0)

            result = creep.upgradeController(/**@type {StructureController}*/(this.dest))
            if (result == OK) {
                amount = Math.min(creepAmount, maxEnergyPerTick)
                this._retrieveOldResources()
            }
        }
        else if (target.store &&!this._carryPartUsed) {
            let store = target.store;
            result = creep.transfer(/**@type {Structure}*/ (target), RESOURCE_ENERGY)
            if (result == OK) {
                this._carryPartUsed=true;
                amount = Math.min(creep.store.getUsedCapacity(RESOURCE_ENERGY) + (mutations[creep.id]||0), 
                                  store.getFreeCapacity(RESOURCE_ENERGY) - (mutations[target.id]||0 )
                                 );
            }
        }

        mutations[target.id] = (mutations[target.id]||0) + amount;
        mutations[creep.id] = (mutations[creep.id]||0) - amount;

        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) + (mutations[creep.id]||0) <= 0) {
            this._state = c.STATE_INPUT;
            if (this._instruct == c.COMMAND_FILL) this._destId = '';
        }
        return result;
    }  


    _retrieveOldResources() {
        //pick up nearby resources of death predecessors
        let creep=this.creep;
        if ( creep.getActiveBodyparts(CARRY) == 0) return;
        if (!this._retrieveOldResourcesDone || (creep.ticksToLive||1500)>=CREEP_CLAIM_LIFE_TIME - 10 - this._parent.travelTicks) {
            if (!this._retrieveOldResourcesDone) {
                let workDone = false;
                let resources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: o => o.resourceType == RESOURCE_ENERGY})
                for (let resource of resources) {
                    if (creep.pickup(resource) == OK) workDone = true;
                }
                let tombstones = creep.pos.findInRange(FIND_TOMBSTONES, 1)
                for (let tombstone of tombstones) {
                    if (creep.withdraw(tombstone, RESOURCE_ENERGY) == OK) workDone = true;
                }
                if (!workDone) this._retrieveOldResourcesDone = false;
            }
        }        
    }

    _command() {
        // check if command uses old or new style
        let creep = this._creep;
        if (this._instruct == c.COMMAND_TRANSFER || this._instruct == c.COMMAND_FILL) {
            this._processTurn()
        }
        else {
            // continue with old style commands
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
                case c.COMMAND_RESERVE:
                    this._state=c.STATE_RESERVING
                    break;
                case c.COMMAND_BUILD:
                    if (creep.store.getUsedCapacity()  == 0) this._state = c.STATE_FINDENERGY;
                    else if (creep.store.getFreeCapacity() == 0) {
                        this._state = c.STATE_BUILDING;
                    }
                    else if (this._state != c.STATE_FINDENERGY && this._state != c.STATE_BUILDING) this._state = c.STATE_BUILDING;
                    break;
                case c.COMMAND_UPGRADE:
                    if (creep.store.getUsedCapacity()  == 0) {
                        if (this._state != c.STATE_FINDENERGY) {
                            this._sourceId = '';
                            this._state = c.STATE_FINDENERGY;
                        }
                    }
                    else if (creep.store.getFreeCapacity() == 0) {
                        this._state = c.STATE_DELIVERING;
                    }
                    else if (this._state != c.STATE_FINDENERGY && this._state != c.STATE_DELIVERING) this._state = c.STATE_DELIVERING;
                    break;
                case c.COMMAND_ATTACK:
                    if (this._lastPos.roomName != this._destRoomName) this._state = c.STATE_MOVING;
                    else this._state = c.STATE_ATTACKING;
                    if (creep.hits< creep.hitsMax) creep.heal(creep);
                    break;
                case c.COMMAND_RECYCLE:
                    this._state = c.STATE_RECYCLING
                    break;
                case c.COMMAND_NONE:
                    this._state = c.STATE_NONE;
                    this._travelDone = true;
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
                        if (res == ERR_NOT_ENOUGH_RESOURCES && destObj instanceof StructureTerminal) res = creep.withdraw(tombstone, U.getLargestStoreResource(creep.store));
                        if (res == OK) break;
                    }
                    else {
                        let dropped_resource = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1)[0];
                        if (dropped_resource) {
                            let result;
                            if (dropped_resource.resourceType == resourceType) result = creep.pickup(dropped_resource);
                            // also withdraw other stuff & bring to terminal if that is destination
                            else if (destObj instanceof StructureTerminal) result = creep.pickup(dropped_resource);
                            if (result == OK) break;
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
                    if (destObj && destObj.store && destObj.store.getFreeCapacity(resourceType) <= TOWER_ENERGY_COST) destObj = null;
                    if (destObj == null) {
                        switch (this._state) {
                            case c.STATE_DROPENERGY:
                                destObj = this._findEnergySink();
                                if (!destObj) {
                                    this._state = c.STATE_FILLING;
                                } else break;
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
                        let needRepair = destObj.hits < destObj.hitsMax; 
                        // only repair walls/ramparts if there are no structures to build        
                        if (needRepair && destObj.structureType == STRUCTURE_RAMPART || destObj.structureType == STRUCTURE_WALL
                                && creep.room.find(FIND_MY_CONSTRUCTION_SITES).length>0) needRepair = false; 
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
                    } else if (this._destRoomName) {
                        if (creep.pos.roomName != this._destRoomName || creep.pos.getRangeTo(new RoomPosition(25,25,this._destRoomName) ) > 20) {
                            this._moveTo(new RoomPosition(25,25,this._destRoomName), {range:20})

                        } else {
                            this._instruct = c.COMMAND_NONE;
                        }
                    } else this._instruct = c.COMMAND_NONE;
                    if (c.CREEP_EMOTES) creep.say('🦶')
                    break;

                case c.STATE_RESERVING:
                case c.STATE_CLAIMING:
                    let roomName = this._destId;
                    let room = Game.rooms[roomName]
                    if (room && room.controller) {
                        if (room.controller.my) creep.suicide();
                        else {
                            let result = -1000;
                            destObj = room.controller;
                            if (destObj instanceof StructureController) {
                                if (this.state == c.STATE_CLAIMING) {
                                    result = creep.claimController(destObj);
                                    if (result == OK) Memory.colonizations[roomName] = Game.time; // mark colonization time of the room.
                                }
                                if (this.state == c.STATE_RESERVING) result = creep.reserveController(destObj);
                            }
                            if (result == ERR_NOT_IN_RANGE) this._moveTo(room.controller.pos, {range:1});
                            else if (result == OK) {
                                if (room.controller.sign == undefined || room.controller.sign.text != c.MY_SIGN) creep.signController(room.controller,c.MY_SIGN);
                            }
                        }
                    } else {
                        this._moveTo(new RoomPosition(25,25, roomName));
                    }
                    if (c.CREEP_EMOTES) creep.say('Cl:' + roomName)
                    break;
                case c.STATE_ATTACKING:
                    let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
                    /**@type {Creep[]} */
                    let healHostiles = [];
                    for (let hostile of hostiles) {
                        for (let bodyPart of hostile.body) {
                            if (bodyPart.type == HEAL) {
                                healHostiles.push(hostile)
                                break;
                            }
                        }
                    }
                    if (healHostiles.length>0) hostiles = healHostiles;
                    /**@type {AnyStructure | AnyCreep | null} */
                    let hostile = creep.pos.findClosestByPath(hostiles)
                    let attackResult = -100;
                    let rangedAttackResult = -100
                    let dismantleResult = -100
                    if (!hostile || this._hasWorkParts) hostile = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {filter: o => {return o.structureType != STRUCTURE_CONTROLLER && o.structureType != STRUCTURE_RAMPART}})
                    if (!hostile) hostile = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES, {filter: o => {return o.structureType != STRUCTURE_CONTROLLER && o.hits > 0 }})
                    if (!hostile) hostile = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: o => {return o.structureType == STRUCTURE_WALL}})
                    if (hostile) {
                        let pos = creep.pos
                        let range = hostile.pos.getRangeTo(pos)
                        if (pos.x >= 49 || pos.x <= 0 || pos.y >=49 || pos.y <=0) this._moveTo(new RoomPosition(25,25, hostile.pos.roomName), {range:20}, {noEvade: true}) // prevent attacking from border
                        else if (range>1) this._moveTo (hostile.pos, {range:1}, {noEvade: true})
                        //else this._moveTo(hostile.pos, {range:3}, {noEvade:true, flee:true})
                        if (range == 1) rangedAttackResult = creep.rangedMassAttack();
                        else rangedAttackResult = creep.rangedAttack(hostile);
                        attackResult = creep.attack(hostile);
                        if (hostile instanceof Structure) dismantleResult = creep.dismantle(hostile)
                    } else {
                        let hostileCSite = creep.pos.findClosestByPath(FIND_HOSTILE_CONSTRUCTION_SITES);
                        if (hostileCSite) this._moveTo(hostileCSite.pos, {}, {noEvade:true})
                        else {
                            let scountInfo = this._mapOp.getRoomInfo(this._destRoomName);
                            if (scountInfo && scountInfo.hostileSource) this._moveTo(new RoomPosition(scountInfo.hostileSource.x, scountInfo.hostileSource.y, this._destRoomName), {range:3})
                        }
                    } 
                    if (attackResult != OK && creep.hits<creep.hitsMax) creep.heal(creep);
                    break;
                case c.STATE_RECYCLING: 
                    if (!this._baseOp) {
                        this._state = c.COMMAND_NONE;
                        break;
                    }
                    if (creep.room.name != this._baseOp.name) {
                        this._moveTo(new RoomPosition(25,25,this._baseOp.name), {range:20})
                    } else {
                        if (!destObj) {
                            destObj = this._baseOp.deathContainer||null;
                            if (!destObj) { 
                                this._state = c.COMMAND_NONE;
                                break;
                            }
                        }
                        if (!creep.pos.isEqualTo(destObj.pos)) this._moveTo(destObj.pos);
                        else {         
                            let spawn = /**@type {StructureSpawn} */(destObj.pos.findInRange(FIND_MY_STRUCTURES,1,{filter: o=> o.structureType==STRUCTURE_SPAWN})[0])
                            if (spawn) spawn.recycleCreep(creep);
                        }
                    }
                    break;
                    
                case c.STATE_NONE:
                    //flee from sources and spawns and construction sites
                    /**@type {RoomObject[]} */
                    let targets = creep.pos.findInRange(FIND_SOURCES_ACTIVE, 2);
                    targets = targets.concat(creep.pos.findInRange(FIND_MY_STRUCTURES, 2, {filter: {structureType: STRUCTURE_SPAWN}}));
                    targets = targets.concat(creep.pos.lookFor(LOOK_CONSTRUCTION_SITES));
                    if (targets.length>0) {
                        let poss = []
                        for (let target of targets) poss.push({pos: target.pos, range: 3})
                        let roomCallback = function(/**@type {string}*/ roomName) {

                            let room = Game.rooms[roomName];
                            if (!room) return false;
                            let costs = new PathFinder.CostMatrix;
                    
                            room.find(FIND_STRUCTURES).forEach(function(struct) {
                            if (struct.structureType === STRUCTURE_ROAD) {
                                // Favor roads over plain tiles
                                costs.set(struct.pos.x, struct.pos.y, 1);
                            } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                        (struct.structureType !== STRUCTURE_RAMPART ||
                                        !struct.my)) {
                                // Can't walk through non-walkable buildings
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
                            });
                    
                            // Avoid creeps in the room
                            room.find(FIND_CREEPS).forEach(function(creep) {
                            costs.set(creep.pos.x, creep.pos.y, 0xff);
                            });
                    
                            return costs;
                        }
                        let result = PathFinder.search(creep.pos, poss,{flee:true, roomCallback: roomCallback})
                        creep.moveByPath(result.path)
                    }
                    if (c.CREEP_EMOTES) creep.say('💤')
                    break;
            }    
            if (this._instruct== c.COMMAND_NONE) {
                this._parent.lastIdle = Game.time;
                this._idleTime++;
            } else this._idleTime = 0;
        }

        if (!creep.pos.isEqualTo(this._lastPos)) this._registerCreepStep();
        this._lastPos = this._creep.pos;
    }

    /**@param {RoomObjectEx | null} [destObj] */
    _deliver(destObj) {
        let creep = this._creep;
        // become idle if destination is invalid
        if(!destObj) this._instruct = c.COMMAND_NONE;
        else {
            let range = 1;
            let result = -1000;
            if      (destObj instanceof Structure) {
                /**@type {number} */
                if (this.hasWorkParts && destObj.hits < destObj.hitsMax) {result = creep.repair(destObj); range = 3;}
                if (destObj instanceof StructureController) range = 3;
                if (result != OK && result != ERR_NOT_IN_RANGE) result = creep.transfer(destObj, U.getLargestStoreResource(creep.store));
                if (destObj instanceof StructureController && (destObj.sign == null || destObj.sign.text != SIGN)) {result = creep.signController(destObj, SIGN);range =1};
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
            else if (result != OK) this._instruct = c.COMMAND_NONE
            else if (c.CREEP_EMOTES) creep.say('🚚➤' + ' '+ destObj.pos.x + ' ' + destObj.pos.y )
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
        if (result == null && this.hasWorkParts) {
            result = this._creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        }
        return result
    }

    _findEnergySink() {
        let room = this._creep.room;
        /**@type {RoomObject[]} */
        let roomObjects = [];
        /**@type RoomObject|null */
        let result = null;
        if (this._baseOp && room.name == this._baseOp.name) {
            roomObjects = roomObjects.concat(_.filter(this._baseOp.links, o => {return o.energy < o.energyCapacity} ));
            let storage = this._baseOp.storage
            if (storage && _.size(storage.store) < storage.storeCapacity) roomObjects.push (storage);
            result = this._creep.pos.findClosestByPath(roomObjects, {ignoreCreeps:true});
        } else if (this._baseOp && this._baseOp.storage) result = this._baseOp.storage;
        return result;        
    }

    /**@param {{[index:string]:number}} [p_mutations] */
    _findFillTarget(p_mutations) {
        /**@type {{[index:string]:number}} */
        let mutations = {};
        if (p_mutations) mutations = p_mutations

        let creep = this._creep;
        let dest = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (/**@type {Structure}*/ o) => {
            let store = /**@type {any} */ (o).store;
            if (store == undefined) return false
            return  (store[RESOURCE_ENERGY] + (mutations[o.id]||0) < store.getCapacity(RESOURCE_ENERGY) )
                    && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION || o.structureType == STRUCTURE_TOWER || o.structureType == STRUCTURE_LAB 
                        );
            }})
        // if nothing found, start filling the terminal if storage has more then reserve energy
        if (!dest && this._baseOp && this._baseOp.storage && this._baseOp.storage.store.energy >= c.ENERGY_RESERVE) {
            dest = creep.room.find(FIND_MY_STRUCTURES, {filter: (/**@type {Structure}*/ o) => {
                let store = /**@type {any} */ (o).store;
                if (store == undefined) return false
                return o.structureType == STRUCTURE_TERMINAL && store[RESOURCE_ENERGY] + (mutations[o.id]||0) < c.MAX_TRANSACTION
            }})[0]
        }
        return dest;
    }

    _findBuildTarget() {
        let creep = this._creep;
        // find construction sites not blocked by creeps
        let cSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES,{filter:o => {return o.structureType == STRUCTURE_RAMPART || o.structureType == STRUCTURE_CONTAINER || o.pos.lookFor(LOOK_CREEPS).length == 0}})
        /**@type {Structure|ConstructionSite|null}  */
        let dest = creep.pos.findClosestByRange(cSites)
        if (!dest) { //repair normal structures
            let structures = creep.room.find(FIND_MY_STRUCTURES, {filter: o => { return o.structureType != STRUCTURE_RAMPART && o.hits < o.hitsMax }})
            dest = creep.pos.findClosestByRange(structures);
        }
        if (!dest) { // repair roads, containers
            let roads = creep.room.find(FIND_STRUCTURES, {filter: o => {
                if (o.structureType != STRUCTURE_ROAD && o.structureType != STRUCTURE_CONTAINER) return false;
                let needRepair = o.hits < o.hitsMax * c.REPAIR_FACTOR;
                if (!needRepair) return false;

                if (o.structureType == STRUCTURE_ROAD) {
                    this._log({roadrepair: o.pos})
                    let terrainArray = this._mapOp.getBreadCrumbs(creep.room.name);
                    if (!terrainArray) return false;
                    this._log({roadrepair: o.pos, terrain:terrainArray[o.pos.x][o.pos.y] })
                    if (terrainArray[o.pos.x][o.pos.y].fatigueCost <= 0) return false;
                    this._log('canrepair');
                }
                return true;
            }});
            dest = creep.pos.findClosestByRange(roads);
        }
        if (!dest) { //repair ramparts
            let baseOp = this._shardOp.getBaseOpNoNullCheck(creep.room.name);
            if (baseOp) {
                let structures = creep.room.find(FIND_MY_STRUCTURES, {filter: o => {
                    if (o.structureType != STRUCTURE_RAMPART) return false;

                    //only repair ramparts protecting structures
                    if (!baseOp) return false;
                    let structures = o.pos.lookFor(LOOK_STRUCTURES);
                    _.remove(structures,{structureType:STRUCTURE_ROAD});
                    if (structures.length <=1 && !o.pos.isEqualTo(baseOp.centerPos)) return;
                    let needRepair = o.hits < o.hitsMax * c.REPAIR_FACTOR && o.hits < baseOp.basePlanOp.maxWallHeight;                    
                    if (!needRepair) return false;
                    else return true;
                }
                });
                dest = creep.pos.findClosestByRange(structures);
            }
        }
        return dest;
    }

    /**
     * @arg {RoomPosition} endDest 
     * @arg {MoveToOpts} [opts]
     * @arg {{noEvade?:boolean, nextStop?:RoomPosition}} [myOpts]
    */
    _moveTo(endDest, opts, myOpts) {
        let creep = this._creep;
        let range = 0;
        if (opts && opts.range) range = opts.range;
        if (creep.pos.inRangeTo(endDest,range)) return OK;
        let optsCopy = Object.assign(opts||{});
        /**@type {RoomPosition } */
        let dest = new RoomPosition(endDest.x, endDest.y, endDest.roomName);
        let nextStop = (myOpts?myOpts.nextStop:null);
        let myPos = creep.pos;
        let mapOp = this._mapOp
        let moveFlags = this._moveFlags;
        let evade = (myOpts && myOpts.noEvade)?false:true;


        //Try to find iterim destinations 
        // * when walking between rooms, find an interim destination using room pathfinding
        // * when knowing the next Stop and range>=1 choose the best pos to walk to the location en route to the next stop
        if (this._lastMoveToDest == null || !endDest.isEqualTo(this._lastMoveToDest)) this._lastMoveToInterimDest = null;
        if (this._lastMoveToDest && dest.isEqualTo(this._lastMoveToDest) && myPos.roomName == this._lastPos.roomName && this._lastMoveToInterimDest) {
            dest = this._lastMoveToInterimDest;
            if (nextStop && dest.roomName == endDest.roomName) range-=1;
        }
        else if (myPos.roomName != endDest.roomName) {
            let callBack = function (/**@type {string}*/ toRoomName, /**@type {string}*/ fromRoomName) {
                if (!(moveFlags & c.MOVE_ALLOW_HOSTILE_ROOM) && toRoomName != endDest.roomName) {
                    let roomInfo = mapOp.getRoomInfo(toRoomName)
                    if (roomInfo && roomInfo.activeTowers >=1 ) return Infinity
                }
                return 0;
            }
            let route = Game.map.findRoute(creep.pos.roomName, endDest.roomName, {routeCallback: callBack});
            if (route instanceof Array && route.length > 2) {
                range = 20;
                dest = new RoomPosition(25,25,route[1].room)
                this._lastMoveToInterimDest = dest;
            } else this._lastMoveToInterimDest = null;
        }
        else if (range > 0 && nextStop ) {
                    if (creep.name == 'E1N36_13_0_834206') U.l('finding optimum path')
                //choose optimum position next to goal for next stop
                    let roomCallback = function(/**@type {string}*/roomName) {
                
                        let room = Game.rooms[roomName];
                        // In this example `room` will always exist, but since 
                        // PathFinder supports searches which span multiple rooms 
                        // you should be careful!
                        if (!room) return false;
                        let costs = new PathFinder.CostMatrix;
                
                        room.find(FIND_STRUCTURES).forEach(function(struct) {
                            if (struct.structureType === STRUCTURE_ROAD) {
                            // Favor roads over plain tiles
                            costs.set(struct.pos.x, struct.pos.y, 1);
                            } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                                        (struct.structureType !== STRUCTURE_RAMPART ||
                                        !struct.my)) {
                            // Can't walk through non-walkable buildings
                            costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
                        });
                
                        // Avoid creeps in the room
                        room.find(FIND_CREEPS).forEach(function(creep) {
                            costs.set(creep.pos.x, creep.pos.y, 0xff);
                        });
                
                        return costs;
                        }
                let path = PathFinder.search(endDest, {pos:nextStop, range:1}, {roomCallback:roomCallback} )
                if (path.path.length>0) {
                    dest = path.path[range-1]
                    this._lastMoveToInterimDest = dest;
                    range = 0;
                } else {
                    dest = endDest;
                    this._lastMoveToInterimDest = null;
                }
        } else {
            dest = endDest;
            this._lastMoveToInterimDest = null;
        }


        //mark hostile rooms unwalkable
        optsCopy.costCallback = function (/**@type {string}*/roomName, /**@type {CostMatrix} */ costMatrix) {
            if (!(moveFlags & c.MOVE_ALLOW_HOSTILE_ROOM) && roomName != endDest.roomName && roomName != creep.pos.roomName) {
                let roomInfo = mapOp.getRoomInfo(roomName);
                if (roomInfo && (/*roomInfo.lastSeenHostile + CREEP_LIFE_TIME >= Game.time ||*/ roomInfo.activeTowers >= 1)) {
                    for (let x =0; x<50;x++) {
                        for (let y = 0; y<50; y++){
                            costMatrix.set(x,y,255);
                        }
                    }
                }
            }
            let room = Game.rooms[roomName];
            if (evade && room && !(room.controller && room.controller.my && room.controller.safeMode)) {
                let hostileCreeps = room.find(FIND_HOSTILE_CREEPS);
                for (let creep of hostileCreeps) {
                    let flee_range = 0;
                    if (creep.owner.username == 'Source Keeper') flee_range = 4;
                    else if (creep.getActiveBodyparts(RANGED_ATTACK) >0) flee_range = 7
                    else if (creep.getActiveBodyparts(ATTACK) >0 ) flee_range = 4
                    if (flee_range>0) {
                        let pos = creep.pos;
                        for (let x = Math.max(pos.x - flee_range, 0); x <= Math.min(pos.x + flee_range, c.MAX_ROOM_SIZE-1); x++ ){
                            for (let y = Math.max(pos.y - flee_range, 0); y <= Math.min(pos.y + flee_range, c.MAX_ROOM_SIZE-1); y++) {
                                costMatrix.set(x,y,255);
                            }
                        }
                    }
                }
            }
        }

        optsCopy.maxOps = MAX_MOVE_OPS
        optsCopy.range = range;
        let result = creep.moveTo(dest, optsCopy);
        if (result == ERR_NO_PATH && !(myPos.x == 0 || myPos.x == 49 || myPos.y == 0 || myPos.y == 49)) {
            this._instruct = c.COMMAND_NONE;
            console.log('warning no path found for creep ' + creep.name + ' at pos ' + creep.pos + ' to dest ' + dest)
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
        let moveRate = 2; // moverate land
        if (Game.map.getRoomTerrain(creep.pos.roomName).get(creep.pos.x,creep.pos.y) == TERRAIN_MASK_SWAMP) moveRate = 10; //move rate swamp
        let stepTicks = Math.ceil(fatigue / (moveParts * 2 / moveRate) );
        let stepTicksRoad = Math.ceil(fatigue / (moveParts * 2));
        
        let opportunityCost = (stepTicks - stepTicksRoad) * this.creepCost / CREEP_LIFE_TIME * c.ROAD_FACTOR
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

