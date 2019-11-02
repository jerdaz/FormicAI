"use strict";
//require ('room');
require ('roomobject');
require ('structure');
var Traveler = require('Traveler');
var logger = require ('logger');
var myFlags = require('myflags');

const emergencyUpgradeMin = 3100;
const emergencyUpgradeMax = 5000;
const WORKER_IDLE_UPGRADE = 30000;
const TERMINAL_FILL = 75000;
const MY_SIGN = 'JDAZ: Autonomous AI 🐺'
const CREEP_DEFENSE_DISTANCE = 4;
const CONSTRUCTION_MIN_STORED_ENERGY = 4000; // minimum amount of stored energy for new construction to start. If less then this, workers will not construct. This prevents workers from eating
                            // up all the energy that is needed for creep construction

function matrix_AvoidKeeper (roomName, costMatrix) {
    logger.log('matrix_avoidkeeper', roomName)
    if (Game.rooms[roomName]) {
        for(var invader of Game.rooms[roomName].find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username == 'Source Keeper'}})) {
            for (var x=-3; x <=3; x++) {
                for (var y=-3; y <=3; y++) {
                    costMatrix.set(invader.pos.x + x,invader.pos.y + y,255) // set square 3x3 around invader nonwalkable
                }
            }
        }
    }
    return costMatrix;
}

Creep.prototype._say = Creep.prototype.say;

Creep.prototype.say = function(message) {
    //this._say(message);
    return;
}


Creep.prototype.visualize = function(){
    this.room.visual.text (this.memory.role.charAt(0).toUpperCase(), this.pos, {stroke: '#000000', font: '0.4', strokeWidth: 0.1})
}

Creep.prototype.run = function() {
    this.visualize()
    if (this.memory.recycle) {
        this.recycle();
        return;
    }
    if (this.memory.sleep) {
        this.say('ZzZz')
        return;
    }

    //ga naar ingeprogrammeerde bestemming;
    if (this.memory.destination && this.memory.role != 'worker' && this.memory.role != 'scout' && this.room.name != this.memory.destination.roomName) {
        this.say ('dest')
        let destination = new RoomPosition(this.memory.destination.x, this.memory.destination.y, this.memory.destination.roomName)
        this.travelTo (destination);
        if (this.pos.isNearTo(destination)) delete this.memory.destination;
        return;
    }

    switch (this.memory.role) {
    case 'worker':
        this.runWorker();
        return;
    case 'harvester':
        this.runHarvester();
        return;
    case 'transporter':
        this.runTransporter();
        return;
    case 'reserver':
        this.runReserver();
        return;
    case 'upgrader':
        this.runUpgrader();
        return;
    case 'filler':
        this.runFiller();
        return;
    case 'scout':
        this.runScout();
        return;
    case 'defender':
        this.runDefender();
        return;
    case 'attacker':
        this.runAttacker();
        return;
    case 'colonist':
        this.runColonist();
        return;
    case 'reserver':
        this.runReserver();
        return;
    case 'initializer':
        this.runInitializer();
        return;
    case 'keeperkiller':
        this.runKeeperKiller();
        return;
    }
}

Creep.prototype.runKeeperKiller = function() {
    this.doHeal();
    if (this.memory.targetRoomName != this.room.name) {
        if (this.memory.birthTime == undefined) this.memory.birthTime = Game.time
        this.travelTo(Game.atlas.getRoomCenter(this.memory.targetRoomName));
        this.memory.travelTime = Game.time - this.memory.birthTime
        return;
    } else {
        let hostile = this.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
        if (hostile) {
            logger.log('runkeeperkiller', 'attacking ' + hostile.name)
            let range = this.pos.getRangeTo(hostile.pos)
            if (range == 5 && this.hits < this.hitsMax) return //
            let options = {};
            if (this.rangedAttack(hostile) == ERR_NOT_IN_RANGE) this.travelTo(hostile.pos, {avoidKeeper: false});
            if (range < 3) this.fleeFrom(hostile);
            //if (this.attack(hostile) == ERR_NOT_IN_RANGE) this.travelTo(hostile.pos, {avoidKeeper: false});
        } else {
            let lairs = this.room.find(FIND_STRUCTURES, {filter: o => {return o.structureType == STRUCTURE_KEEPER_LAIR}})
            lairs.sort( (a,b) => {
                if (a.ticksToSpawn < b.ticksToSpawn) return -1
                if (a.ticksToSpawn > b.ticksToSpawn) return 1
                return 0;
            })
            let dest = lairs[0].pos;
            if (!this.pos.inRangeTo(dest,3)) this.travelTo(dest);
        }
    }
    if (this.memory.travelTime + 150 + 50 <= this.ticksToLive) this.replace = true;
    return;
}

Creep.prototype.runScout = function() {
    logger.log('creep.runscout', 'Running scout ', this.name)
    if (!this.firstRun) {
        this.notifyWhenAttacked(false);
        this.firstRun = false;
    }
    //this.room.memory.lastSeenByScout = Game.time;
    let exits = Game.map.describeExits(this.room.name);
    let destRoomName = this.memory.destRoomName;
    if (destRoomName == this.room.name) destRoomName = undefined
    if (destRoomName == undefined) {
        logger.log ('creep.runscout', 'Checking new rooms', this.name)
        let destRoomLastVisit = Game.time;
        for (let exitKey in exits) {
            let roomName = exits[exitKey]
            logger.log ('creep.runscout', 'Checking ' + roomName, this.name)
            //logger.log ('creep.runscout', Memory.rooms[roomName], this.name)
            let scoutInfo = Game.atlas.getScoutInfo(roomName)
            if (Game.map.isRoomAvailable(roomName) && scoutInfo) {
                let lastSeenByScout = scoutInfo.lastSeen;
                logger.log ('creep.runscout', 'room lastseen' + roomName + ' ' + lastSeenByScout, this.name)
                if (lastSeenByScout == undefined) lastSeenByScout = 0;
                if (lastSeenByScout < destRoomLastVisit) {
                    destRoomName = roomName;
                    destRoomLastVisit = lastSeenByScout;
                }
            } else if (Game.map.isRoomAvailable(roomName)  && Game.map.getRoomLinearDistance(roomName, this.memory.HomeRoomName)<=10) {//) { // never visited, max 10 rooms away
                logger.log ('creep.runscout', 'No room memory new destination! ' + roomName, this.name)
                destRoomName = roomName;
                break;
            }
        }
        if (destRoomName == undefined) {
            logger.log ('creep.runscout', 'no room found, picking random', this.name)
            let keys = Object.keys (exits);
            let exitKey = keys[Math.floor(keys.length * Math.random())];
            destRoomName = exits[exitKey];
        }
    }
    this.memory.destRoomName = destRoomName;
    logger.log ('creep.runscout', 'Moving to room ' + destRoomName, this.name)
    //let nearInvader = (this.pos.findInRange(FIND_HOSTILE_CREEPS, 4).length > 0)?1:0;
    //let exitArray = this.room.find(this.room.findExitTo(destRoomName));
    //let dest = exitArray[Math.floor(exitArray.length/2)]
    let dest = Game.atlas.getRoomCenter(destRoomName);
    logger.log('creep.runscout', 'dest: ' + dest, this.name)
    this.travelTo (dest);
}

Creep.prototype.runAttacker = function() {
    /*
    if (!this.memory.startAttack) {
        if (this.pos.findInRange(FIND_MY_CREEPS,4,{filter: (creep) =>{return creep.memory.role == 'attacker' && creep.name != this.name}}).length > 0) {
            this.memory.startAttack = true;
            this.say('Go');
        } else {
            this.say('Wait');
            return;
        }
    }*/

    this.doHeal();


    let attackFlags = myFlags.getAttackFlags();
    let targetRoomName = this.memory.targetRoomName;



    let hostileCreeps = this.pos.findInRange(FIND_HOSTILE_CREEPS,3);
    if (hostileCreeps.length > 0) {
        logger.log('creep.runattacker', 'hostile creeps, enganging')
        let hostileCreep = this.pos.findClosestByPath(hostileCreeps);
        if (this.pos.isNearTo(hostileCreep)) {
            this.attack (hostileCreep);
            return;
        } else if (hostileCreep) {
            this.travelTo (hostileCreep);
            return;
        }
    }

    // fodder niet te dicht bij laten komne
    if( this.body.length == 1 && attackFlags.length > 0) {
        if (this.room.name == targetRoomName){

            // zelfmoord plegen als hij in de weg staat voor dikke creep
             if(this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) =>{return creep.memory.role == 'attacker' && creep.body.length > 1}}).length>0) {
                 this.suicide();
             } else { // anders vijandelijke creeps verstikken
                this.doAttack();
             }
             return;
        }
    }

    // towers aanvullen
    let tower = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter: (structure) => {return structure.structureType == STRUCTURE_TOWER}});
    if (tower) {
        if (this.pos.isNearTo(tower)) {
            this.attack(tower);
            return;
        } else {
            this.travelTo(tower);
            return;
        }
    }


    // target aanvallen
    if (this.pos.isNearTo(attackFlags[0])) {
        let structure = attackFlags[0].pos.getStructure();
        if (structure) {
            this.attack(structure);
            return;
        } else {
            attackFlags[0].remove();
            return;
        }
    }

    if (!this.memory.attackWP) this.memory.attackWP = 0
    let wpFlags = myFlags.getAttackWPFlags(this.memory.HomeRoomName);
    if (this.memory.attackWP < wpFlags.length) {
        if (this.pos.isNearTo(wpFlags[this.memory.attackWP])) this.memory.attackWP++;
    }
    if (this.memory.attackWP < wpFlags.length) {
        logger.log('creep.runattacker', 'moving to attackWPflag ' +wpFlags[this.memory.attackWP].pos);
        this.travelTo(wpFlags[this.memory.attackWP], {range: 1,costCallback: matrix_AvoidKeeper});
        return;
    }

    if (attackFlags[0]) {
        logger.log('creep.runattacker', this.name + ' moving to attackflag ' + attackFlags[0].pos);
        this.travelTo(attackFlags[0],{range: 1, costCallback: matrix_AvoidKeeper});
    }    else {
        logger.log ('doing generic attack')
        this.doAttack();
    }

    //indien geen attackflag, dan naar target room gaan
    if (attackFlags == undefined) {
        if (this.doAttack()) {
            return;
        } else {
            this.travelTo (Game.atlas.getRoomCenter(targetRoomName))
        }
    }

    return;
}

Creep.prototype.runColonist = function() {
    //console.log ('creep.colonist', 'RUNNING COLONIST ' +this.name + ' at ' +this.pos)
//    var redFlags = []; // attack flags
//    var yellowFlags = []; // colonize flag
//    var curFlag = this.memory.curFlag;
    var hasClaimPart = false;
    var hasAttackPart = false;
    for (var i=0; i < this.body.length;i++) {
        if (this.body[i].type == CLAIM) hasClaimPart = true;
        if (this.body[i].type == ATTACK) hasAttackPart = true;
    }
/*    if (curFlag == undefined) curFlag = 0;
    for (var flagname in Game.flags) {
        var flag = Game.flags[flagname]
        if (flag.color==COLOR_YELLOW && flag.name.startsWith( this.memory.HomeRoomName)) yellowFlags.push(flag);
        if (flag.color==COLOR_RED) redFlags.push(flag);
    }
*/
    if (Memory.colRoom == undefined ) return;
    logger.log('creep.runcolonist', 'running colonist ' + this.name)



    var targetRoomName = Memory.colRoom;
    let targetRoom = Game.rooms[targetRoomName];

    //indien room niet zichtbaar, er naar toe moven
    if (targetRoom != this.room) {
        this.say('C');
        this.travelTo(new RoomPosition(Memory.colX, Memory.colY, Memory.colRoom));
        return;
    }

    //console.log ( hasClaimPart)
    // indien room van ander, attacken
    //console.log (targetRoom.controller.me)
    if (hasClaimPart && !targetRoom.controller.my && targetRoom.controller.owner) {
        //console.log ('attacking controller')
        if (this.attackController(targetRoom.controller) == ERR_NOT_IN_RANGE) this.travelTo(targetRoom.controller);
        return;
    }

    // indien room niet van mij, claimen
    if (hasClaimPart && !targetRoom.controller.my) {
        //console.log ('claiming controller')
        if (this.claimController(targetRoom.controller)== ERR_NOT_IN_RANGE) {
            this.travelTo(targetRoom.controller);
            this.say ('controller')
        }
        return;
    }

    if (targetRoom.controller.my && this.room.name == targetRoomName) {
        // controller is van mij. yellow flag verwijderen, spawn building site plaatsen en een worker worden.
        this.travelTo(targetRoom.controller);
        targetRoom.createConstructionSite(Memory.colX, Memory.colY,STRUCTURE_SPAWN);
        this.memory.role = 'worker';
        this.memory.HomeRoomName = targetRoomName;
        return;
    } else {
        // move naar controller
        //console.log ('moving to controller')
        this.travelTo(targetRoom.controller);
        this.say('zz')
        return;
    }
}

Creep.prototype.runFiller = function () {
    this.idle = false;
    if (this.carry.energy == 0)
        this.memory.state = 'findEnergy';
    if (this.carry.energy == this.carryCapacity)
        this.memory.state = 'doWork';

    switch(this.memory.state) {
        case 'findEnergy':
            this.doFindEnergy(this);
            return;
        case 'doWork':
            if (this.doFill()) return;
            this.memory.state = 'findEnergy'
            return;
    }
}

Creep.prototype.doFill = function () {
    //returns true als hij kan fillen, anders false als er niets te vullen valt.


    var creep = this;
    var target;

    //energie naar toren indien er een invader is
    if (this.room.getInvader() !== undefined) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => {
                return ((    structure.structureType == STRUCTURE_TOWER
                            ) && structure.energy  < structure.energyCapacity)
                }
            });
    }

    //energie brengen naar spawn en link
    if (target == undefined) {
        let targets = this.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return ((    structure.structureType == STRUCTURE_EXTENSION
                    || structure.structureType == STRUCTURE_SPAWN
                        ) && structure.energy  < structure.energyCapacity)
            }
        });
        if (this.room.storage && this.memory.role == 'filler') {
            let link = this.room.storage.pos.getNearestLink()
            if (link && link.energy < link.energyCapacity) targets.push(link);
        }
        target = this.pos.findClosestByPath(targets);
    };

    //energie brengen naar toren
    if (target == undefined) {
        target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return ((    structure.structureType == STRUCTURE_TOWER
                                    ) && structure.energy < structure.energyCapacity)
                        }
                    });
    }


    //energie brengen naar terminal
    if (target == undefined && this.room.controller && this.room.controller.level >= 8) {
        target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
                    filter: (structure) => {
                        return ((    structure.structureType == STRUCTURE_TERMINAL
                                    ) && _.sum(structure.store) < TERMINAL_FILL)
                        }
                    });
    }

    // indien er een grote stapel losse energie is, de storage gaan vullen
    if (target == undefined) {
        let largeDroppedEnergy = creep.room.find(FIND_DROPPED_RESOURCES, {filter: (dropped) => {return dropped.amount > 2000
            && dropped.resourceType == RESOURCE_ENERGY
            }});
        if (largeDroppedEnergy.length>0) {
            target = creep.room.storage;
        }
    }

    if (target) {
    //console.log ('target: ' + target + ' energy: ' +target.energy + ' reserved: ' + target.reservedEnergy + ' capacity: ' + target.energyCapacity);
        if (creep.transfer(target, RESOURCE_ENERGY)==ERR_NOT_IN_RANGE) {
            creep.travelTo(target,{visualizePathStyle: {stroke: '#ffffff'}});
        }
            //            creep.say('W');
        return true;
    }
    return false;

}

Creep.prototype.doAttack = function(){
    var hostilecreep = this.pos.getInvader();
    if (hostilecreep == undefined) hostilecreep = this.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter: (structure) => {structure.structureType != STRUCTURE_CONTROLLER}});
    if (hostilecreep) {
        //console.log ('creep '+ this.name + ' attacking ' + hostilecreep)
        this.rangedAttack(hostilecreep);
        this.attack(hostilecreep);
        if (!this.pos.isNearTo(hostilecreep)) this.travelTo(hostilecreep);
        this.say('A')
        return true;
    } else
    {
        return false;
    }
}

Creep.prototype.doHeal = function() {
    let hasHeal=false;
    for (let bodypart of this.body) if (bodypart.type == HEAL) hasHeal = true;
    if (hasHeal){
        let woundedCreeps = this.pos.findInRange(FIND_MY_CREEPS, 3, {filter: (creep) => {return creep.hits < creep.hitsMax}});
        if (woundedCreeps.length > 0) this.heal( this.pos.findClosestByRange(woundedCreeps));
    }
}

Creep.prototype.autoBuild = function() {
//    console.log('CREEP AUTOBUILD')
    //if (this.room.find(FIND_MY_CONSTRUCTION_SITES).length > 0) return //niet autobouwen als er nog iets te bouwen is;
    var role = this.memory.role;
    if (role == 'transporter' || role == 'courier') {
        if (this.pos.lookFor(LOOK_STRUCTURES).length == 0) {
//            this.room.createConstructionSite(this.pos,STRUCTURE_ROAD);
        }
    }

    if (role == 'harvester' && this.pos.findInRange(FIND_SOURCES,1).length>0 ) {
        if (this.pos.findInRange(FIND_STRUCTURES, 2, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER}}).length == 0)
            if (this.pos.findInRange(FIND_CONSTRUCTION_SITES,2, {filter: (csite) => {return csite.structureType == STRUCTURE_CONTAINER}}).length == 0) {
//                this.room.createConstructionSite(this.pos,STRUCTURE_CONTAINER);
            }
    }

}

Creep.prototype.runUpgrader = function() {
     this.idle = false;
    if (this.carry.energy == 0)
        this.memory.state = 'findEnergy';
    if (this.carry.energy == this.carryCapacity)
        this.memory.state = 'doWork';

    switch(this.memory.state) {
        case 'findEnergy':
            this.doFindEnergy(this);
            return;
        case 'doWork':
            this.doUpgrade(this);
            return;
    }

}



Creep.prototype.doUpgrade = function() {
    switch (this.upgradeController(this.room.controller)) {
        case ERR_NOT_IN_RANGE:
            this.travelTo(this.room.controller);
            return;
    }
}

Creep.prototype.runReserver = function() {
//    console.log ('running scout' + this.name + 'in room ' +this.room)
    var roomName = this.memory.targetRoomName;
    var room = Game.rooms[roomName]
    if (this.room.controller && (!this.room.controller.sign || this.room.controller.sign.text != MY_SIGN ) && this.body.length > 1) {
        logger.log('creep.runreserver', this.room.controller.sign);
        if (this.signController(this.room.controller, MY_SIGN) == ERR_NOT_IN_RANGE ) {
            this.travelTo(this.room.controller.pos)
            return;
        }
    }


    if (room && room.controller) {
        if (this.body.length == 1 && room.controller && !this.pos.isNearTo(room.controller.pos)) {
            this.travelTo(room.controller.pos);
        }
        if (room.controller && room.controller.owner && !room.controller.my) {
            if (this.attackController(room.controller) == ERR_NOT_IN_RANGE) {
                this.travelTo(room.controller.pos);
            }
        } else if (this.reserveController(room.controller) == ERR_NOT_IN_RANGE) {
            this.travelTo(room.controller.pos);
            //console.log('going to controller')
        } else if(room.controller == undefined) {
            if (this.travelTo(Game.atlas.getRoomCenter(roomName))!= OK) this.memory.sleep = true;
        }
    }
    else {
        if (roomName) {
            this.travelTo(Game.atlas.getRoomCenter(roomName), );
        }
    };

};

Creep.prototype.runDefender = function() {
    logger.log ('creep.rundefender', this.name)
    this.doHeal();
    var room = this.room;
    // defend this room
    if(this.room.find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username != 'Source Keeper'}}).length>0) {
//        console.log ('defending this room')
        this.doAttack();
        return;
    } else {
        //defend other harvest rooms
        var harvestRooms = Game.rooms[this.memory.HomeRoomName].findHarvestRooms();
        for(var i=0; i<harvestRooms.length;i++) {
            var room = Game.rooms[harvestRooms[i]];
            var hostileCreeps = [];
            if (room) hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {filter: (creep) => {return creep.owner.username != 'Source Keeper'}});
            if (hostileCreeps.length>0){
                this.memory.attackRoom = room.name;
                this.travelTo(hostileCreeps[0]);
                return;
            }
        }
        if (this.memory.attackRoom) {
            this.travelTo(Game.atlas.getRoomCenter(this.memory.attackRoom));
            if (this.room.name == this.memory.attackRoom) delete this.memory.attackRoom;
            return;
        } else {
            //niks meer te doen, recyclen. prevent recycling
            this.recycle();
            /*
            //destroyflags kapot maken
            logger.log('creep.rundefender', myFlags.getDestroyFlags())

            for(var flag of myFlags.getDestroyFlags()) {
                logger.log('creep.rundefender', 'checking destroy flag '+flag.name + flag.pos.roomName + this.room.name)
                logger.log('creep.rundefender', Game.map.findRoute(this.room.name, flag.pos.roomName))
                if (Game.map.findRoute(this.room.name, flag.pos.roomName).length <= CREEP_DEFENSE_DISTANCE) {
                    if(!this.pos.isNearTo(flag.pos)) {
                        this.travelTo(flag);
                    }
                    if (flag.room) {
                        var structure = flag.pos.getStructure();
                        if (structure) {
                            this.attack(structure);
                            this.rangedAttack(structure);
                            return;
                        } else {
                            flag.remove();
                        }
                    }
                }
            } */

        }
    }
}



Creep.prototype.recycle = function() {
    this.memory.recycle = true;
    var spawn = Game.rooms[this.memory.HomeRoomName].getSpawn()
    var target = spawn.getContainer();
    if (!target) target = spawn;
    if (spawn.recycleCreep(this) == ERR_NOT_IN_RANGE) this.travelTo(target);
}

Creep.prototype.runTransporter = function() {
    if (this.memory.timeStartTransport == undefined) this.memory.timeStartTransport = Game.time;

    // vluchten van keepers
    if (this.room.isSKLair()) {
        if (this.fleeFromKeeper()) return true;
    }


    var source =  Game.getObjectById(this.memory.targetSourceId);
    var container = source?source.getContainer():undefined;
    if (!(container instanceof StructureContainer)) container = undefined

    if (_.sum(this.carry) == 0 || _.sum(this.carry) < this.carryCapacity && container && container.pos.isNearTo(this.pos) ) { // leeg, energy ophalen
        //logger.log('creep.runstransporter', 'going to source ' + source)
        if (source && container) {
            //wachten indien je naast een transporter staat die aan het loaden is
 //           if (this.pos.findInRange(FIND_MY_CREEPS, 1, {filter: (creep) => {   let carry = _.sum(creep.carry);
//                                                                            return creep.name != this.name && creep.memory.role == 'transporter' && carry > 0 && carry < creep.carryCapacity && creep.memory.targetSourceId == this.memory.targetSourceId
//                                                                        }}).length > 0 ) return;
            let energy = container.pos.lookFor(LOOK_ENERGY)[0];
            if (!this.pos.isNearTo(container.pos)) this.travelTo(container.pos);
            else {
                let energyPickedUp = 0;
                if (energy && energy.amount) {
                    this.pickup(energy);
                    energyPickedUp = energy.amount;
                }
                let withDrawAmount = Math.max (Math.min(this.carryCapacity - _.sum(this.carry) - energyPickedUp, container.store.energy), 0);
                if (withDrawAmount > 0 ) this.withdraw(container, RESOURCE_ENERGY, withDrawAmount);
                if (_.sum(this.carry) == 0){
                    logger.log('creep.runstransporter', this.name + ' picking up energy in ' +this.room.name);
                    logger.log('creep.runstransporter', 'withdrawamount: ' + withDrawAmount);
                    let newLoad = container.store?(container.store.energy||0):0;
                    if (energy) newLoad += energy.amount;
                    logger.log('creep.runstransporter', 'energy?energy.amount:0: ' + (energy==undefined?0:energy.amount) );

                    logger.log('creep.runstransporter', 'newload: ' + newLoad);
                    if (!Memory.transportLoad[this.memory.targetSourceId]) Memory.transportLoad[this.memory.targetSourceId] =  newLoad;
                    Memory.transportLoad[this.memory.targetSourceId] = Memory.transportLoad[this.memory.targetSourceId] /100 * 99 + newLoad/100;
                    logger.log('creep.runstransporter', 'newtransportload: ' + Memory.transportLoad[this.memory.targetSourceId])
                }
            }
        } else {
            if (this.memory.sourceRoomName) this.travelTo (Game.atlas.getRoomCenter(this.memory.sourceRoomName))
        }
    }
    else { // vol energie droppen
/*        //energie pakken die naast hem ligt
        if (_.sum(this.carry) < this.carryCapacity) {
            let energy = this.pos.findInRange(FIND_DROPPED_RESOURCES,{filter: (resource) => {return resource.resourceType == RESOURCE_ENERGY}}, 1)[0];
            if (energy) {
                this.withdraw(energy);
                return;
            }
        }
*/
        //energie brengen naar worker in sourcekeeper lair
        if (Game.rooms[this.memory.HomeRoomName].controller.level < 7 && this.room.isSKLair() && this.room.find(FIND_CONSTRUCTION_SITES).length>0 ) {
            let workerCreep = this.pos.findClosestByPath(FIND_MY_CREEPS, {filter: (creep) => {return creep.memory.role == 'worker'}})
            if (workerCreep) {
                if (this.pos.isNearTo(workerCreep)) {
                    this.drop(RESOURCE_ENERGY);
                } else {
                    this.travelTo(workerCreep);
                }
                return;
            }
        }

        if (Memory.transportLoad == undefined) Memory.transportLoad = new Object;
        var homeroom = Game.rooms[this.memory.HomeRoomName];

        let container;
        if (this.memory.dropPointID) {
            container = Game.getObjectById (this.memory.dropPointID);
        } else {
            if (this.room.name != this.memory.HomeRoomName ){
                this.travelTo(Game.rooms[this.memory.HomeRoomName].getSpawn());
            } else {
                container = this.pos.findClosestByPath(homeroom.findEnergyDropPoints(this.carry.energy));
                if (container == undefined) container = homeroom.storage;
                if (container) this.memory.dropPointID = container.id;
            }
        }

        // uitrekenen of hij vervangen moet worden
        var lastTransportTime = this.memory.timeLastTransport;
        var transportTime = Game.time - this.memory.timeStartTransport;
        if (this.memory.replace == undefined && this.carry.energy / this.carryCapacity > 0.7 && lastTransportTime * 1.05 + (lastTransportTime - transportTime) + this.getSpawnTime() > this.ticksToLive
            && this.carryCapacity * 1.5 > Game.rooms[this.memory.HomeRoomName].getEnergyCapacityAvailable())
        {
            this.memory.replace = true;
            for (let creepName in Game.creeps) {
                let creep = Game.creeps[creepName];
                if (creep.name != this.name && creep.memory.targetSourceId == this.memory.targetSourceId && this.memory.role == 'transporter') this.memory.replace = false;
            }
        }

        switch (this.transfer(container, RESOURCE_ENERGY)) {
            case OK:
                delete this.memory.dropPointID;
                if (transportTime * 1.05 > this.ticksToLive) {
                    this.recycle();
                } else {
                    this.memory.timeLastTransport = transportTime;
                    this.memory.timeStartTransport = Game.time;
                }
                return;
            case ERR_NOT_IN_RANGE:
                this.travelTo(container.pos, {reusePath: 5, ignoreCreeps: false});
                return;
            case ERR_FULL:
                //this.drop(RESOURCE_ENERGY);
                this.say ('FULL');
                delete this.memory.dropPointID;
                return;
        }
    }
}

Creep.prototype.getSpawnTime = function() {
    return this.body.length * 3;
}

Creep.prototype.runWorker = function () {
    this.idle = false;

    if (!this.room.isSKLair() && this.memory.birthRole == 'colonist' && this.room.find(FIND_HOSTILE_CREEPS).length>0){
        var hasAttackPart = false;
        for (var i=0; i < this.body.length;i++) {
            if (this.body[i].type == ATTACK) hasAttackPart = true;
        }
        if (hasAttackPart) this.doAttack();
        return;
    }

    if (this.carry.energy == 0)
        this.memory.state = 'findEnergy';
    if (this.carry.energy == this.carryCapacity)
        this.memory.state = 'doWork';

    switch(this.memory.state) {
        case 'findEnergy':
            this.doFindEnergy(this);
            break;
        case 'doWork':
            this.doWork(this);
            break;
    }

}

Creep.prototype.fleeFromKeeper = function() {
    let keeper = this.pos.findInRange(FIND_HOSTILE_CREEPS, 5)[0];
    if (keeper == undefined) keeper = this.pos.findInRange(FIND_STRUCTURES, 5, {filter: o=> {return o.structureType == STRUCTURE_KEEPER_LAIR && o.ticksToSpawn <= 5}})[0];
    if (keeper && keeper.pos.inRangeTo(this.pos,4)) {
        this.fleeFrom(keeper);
    }
    if (keeper) return true;
}

Creep.prototype.runHarvester = function() {
    if (this.memory.timeStartTransport == undefined) this.memory.timeStartTransport = Game.time;

    // vluchten van keepers
    if (this.room.isSKLair()) {
        if (this.fleeFromKeeper()) return true;
    }


    //console.log ( 'running harvester ' +this.name)
    var sourceId = this.memory.targetSourceId;
//    if (sourceId === undefined) {
//        sourceId = this.findSource().id;
//        this.memory.sourceId = sourceId;
//    }


    var source = Game.getObjectById(sourceId);
    // move naar source of anders container bij source
    var container;
    if (source) container = source.getContainer();
    var pos;
    if (container) pos = container.pos;
    else if (source) pos = source.pos;
    if (pos == undefined && this.memory.targetRoomName) pos = Game.atlas.getRoomCenter(this.memory.targetRoomName)

    if (!this.pos.isEqualTo(pos)) this.travelTo(pos);

    if (this.memory.timeLastTransport == undefined) {
        this.memory.timeLastTransport = Game.time - this.memory.timeStartTransport;
    }

    // indien gearriveerd, harvesten
    if (this.harvest(source) == OK ) {
        if (!this.memory.timeLastTransport) this.memory.timeLastTransport = Game.time - this.memory.timeStartTransport;
        let scoutInfo = Game.atlas.getScoutInfo(this.room.name);
        scoutInfo.lastHarvest = Game.time;
        this.pos.createConstructionSite(STRUCTURE_CONTAINER);
    }
    let resource = this.pos.lookFor(LOOK_ENERGY)[0];
/*    if (resource){
        this.pickup(resource);
        this.drop(RESOURCE_ENERGY);
    }
*/
    //container bouwen / repairen indien nodig
    if (container && container.hits < container.hitsMax) this.repair(container)
    var constructionSite = this.pos.lookFor(LOOK_CONSTRUCTION_SITES)[0]
    if (constructionSite) this.build(constructionSite)



    // vervangen indien bijna dood
    if (this.memory.timeLastTransport + this.getSpawnTime() > this.ticksToLive) {
        this.memory.replace = true;
        if(this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) => {return creep.memory.role == 'harvester' && creep.memory.targetSourceId == this.memory.targetSourceId}}).length>1) this.suicide();
    }

    // room markeren met homeroom
    this.room.memory.HomeRoomName = this.memory.HomeRoomName;

}

Creep.prototype.fleeFrom = function(object) {
    logger.log ('creep.fleefrom' , this.name + ' fleeing')
    logger.log('creep.fleefrom', 'fleeing from' + object)
    let path = PathFinder.search(this.pos, {pos: object.pos, range: 5}, {flee:true})
    logger.log ('creep.fleefrom', path);
    let result = this.moveByPath(path.path, {flee:true});
    logger.log ('creep.fleefrom', result)
    this.say ('FLEE')
}

Creep.prototype.doFindEnergy = function () {
    logger.log('creep.dofindenergy', 'findenergy', this.name);
    var creep = this;
    // beschikbare energie zoeken

    // if not a filler, prefer larger energy farther away.
    let largeDroppedEnergy;
    if (this.memory.role != 'filler') largeDroppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (dropped) => {return dropped.amount > 2000
                                                                                                                                        && dropped.resourceType == RESOURCE_ENERGY
                                                                                                                                        && !(dropped.pos.findInRange(FIND_HOSTILE_CREEPS,3).length>0)
                                                                                                                                        }});

    var droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {filter: (dropped) => {return dropped.amount  >= 50
                                                                                                && dropped.resourceType == RESOURCE_ENERGY
                                                                                                && !(dropped.pos.findInRange(FIND_HOSTILE_CREEPS,3).length>0)
                                                                                            }});
    var tombstone = creep.pos.findClosestByPath(FIND_TOMBSTONES, {filter: (tombstone) => {return tombstone.store.energy  >= 50}})
    var container = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (structure) => {
        return (structure.structureType == STRUCTURE_CONTAINER
        || structure.structureType == STRUCTURE_STORAGE
        || structure.structureType == STRUCTURE_TERMINAL// && (_.sum(structure.store) > TERMINAL_FILL || !structure.isActive() || this.controller.level < 8)
        || (structure.structureType == STRUCTURE_LINK && this.memory.role != 'filler')
        ) && (structure.store && structure.store.energy >= 100 || structure.energy && structure.energy >= 100)
        }});

    //valide targets in array stoppen
    var targets = []
    if (largeDroppedEnergy) targets = targets.concat(largeDroppedEnergy);
    else {
        if (droppedEnergy) targets = targets.concat(droppedEnergy);
        if (tombstone) targets = targets.concat(tombstone);
        if (container) targets = targets.concat(container);
    };

    var target = creep.pos.findClosestByPath(targets) // dichtbijzijne
    logger.log('creep.dofindenergy', target, this.name);

    if (target ) {

        if (target instanceof Resource) {
            if (creep.pickup(droppedEnergy) == ERR_NOT_IN_RANGE) {
                creep.travelTo(droppedEnergy.pos);
                creep.say ('🤜E' + droppedEnergy.pos.x +' '+ droppedEnergy.pos.y);
            };
            return;
        }

        // energie uit tombstone
        if (tombstone == target) {
            if (creep.withdraw(tombstone,RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                creep.travelTo(tombstone.pos);
                creep.say ('🤜T');
                logger.log ('creep.dofindenergy' , 'picking up endergy from ts ' +tombstone.name   )
            }
        return;
        }

        if (container == target) {
            if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE )
                this.say ('container')
                creep.travelTo(container.pos);
            return;
        }
    }


    /*
    //in source keeper lairs niet vullen
    if (this.room.isSKLair()) {
        creep.idle=true;
        creep.travelTo(Game.rooms[this.memory.HomeRoomName].controller.pos);
        creep.say('home')
        return;
    }*/

    // energie vinden bij source
    let source;
    if (this.room.isSKLair()) {
        source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE, {filter: o => { return o.pos.findInRange(FIND_HOSTILE_CREEPS,4).length == 0}});
    } else {
        source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    }

    if (source) {
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.travelTo(source.pos,{visualizePathStyle: {stroke: '#ffff00'}})
            creep.say ('F');
        }
        var container = source.getContainer();
        return;
    }

    // geen energie gevonden, creep is idle
    creep.say ('😴');
    if (this.room.name != this.memory.HomeRoomName) {
        creep.travelTo(Game.rooms[this.memory.HomeRoomName].controller.pos);
        creep.say('home')
    }
    creep.idle = true;
}

Creep.prototype.doWork = function() {
    var creep = this;


    //Emergency controller upgrade!
    target = creep.room.controller;
    if (target && target.ticksToDowngrade <= emergencyUpgradeMin && target.my) this.room.memory.emergencyUpgrade = true;
    if (target && target.ticksToDowngrade >= emergencyUpgradeMax && target.my) this.room.memory.emergencyUpgrade = false;

    if (this.room.memory.emergencyUpgrade) {
        //console.log ('emergency upgrade!')
        creep.upgradeController(target)
        if (!this.pos.isNearTo(target.pos)) creep.travelTo(target,{approach: 3});

        return;
    }


    //console.log('trying fill')
    if (this.room.name == this.memory.HomeRoomName && !this.room.hasFiller()) {
        logger.log ('creep.dowork','no filler, foing to fill',this.name)
        if (this.doFill()) return;
    }



    // repairen roads
    logger.log ('creep.dowork','trying road repairs',this.name)
    var target = undefined;
    target= creep.pos.findInRange(FIND_STRUCTURES, 0, {filter: (structure) => {
                    return (    structure.structureType == STRUCTURE_ROAD && structure.needsRepair())
                    }
                } )[0];
    if (target) {
        creep.repair(target)
        return;
    }



    //anders constructen
    //console.log ('trying constructions')

    logger.log ('creep.dowork','trying construct ',this.name)
    let res = this.room.getStoredEnergy()
    if ( this.room.controller == undefined  // construct if there is no controller (roads/containers)
        || (this.room.controller.level <=2  // construction always allowed if under level 3
            || this.room.getEnergyCapacityAvailable() < 800   // construction always allowed if harvesters cannot be spawned
            || res.capacity < CONSTRUCTION_MIN_STORED_ENERGY 
            || res.result >= CONSTRUCTION_MIN_STORED_ENERGY)) {
        target = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
        if (target == undefined) { // niet gevonden, flags zoeken
            target = creep.pos.findClosestByPath(FIND_FLAGS,  {filter: o => {return o.color = COLOR_BROWN && o.secondaryColor == COLOR_BROWN}}) ;
            if (target) {
                creep.travelTo(target);
                target.pos.createConstructionSite(STRUCTURE_ROAD);
                target.remove();
            }
        } else {
            //console.log ('going to construction site ' + target )
            if (creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.travelTo(target,{visualizePathStyle: {stroke: '#00ff00'}});
            }
            this.say('C')
            return;
        }
    }

    //doorgaan naar bestemming
    logger.log ('creep.dowork','trying traveling to interroom destination ',this.name)
    if (this.memory.destination && this.room.name != this.memory.destination.roomName) {
        this.say ('dest')
        this.travelTo (new RoomPosition(this.memory.destination.x, this.memory.destination.y, this.memory.destination.roomName));
        return;
    }

    //werk buiten room vinden (alleen indien level groter dan 2)
    let homeRoom = Game.rooms[this.memory.HomeRoomName]
    if (!this.memory.assignedRoomName && homeRoom.controller && homeRoom.controller.level > 2) {
        logger.log ('creep.runworker', 'worker finding room outside for creep ' + this.name)
        var roomNames=Game.rooms[this.memory.HomeRoomName].findHarvestRooms();
        logger.log ('creep.runworker', roomNames )
        for (var i=0; i < roomNames.length; i++) {
            var room = Game.rooms[roomNames[i]];
            logger.log ('creep.runworker', 'worker finding room, checking room ' + roomNames[i] )
            if (room && room.memory.workerAssignedName == undefined && this.memory.assignedRoomName == undefined && room.find(FIND_FLAGS, {filter: o => {return o.color = COLOR_BROWN && o.secondaryColor == COLOR_BROWN}}).length >0 ) {
                room.memory.workerAssignedName = this.name; //worker assignen
                this.memory.assignedRoomName = roomNames[i];
                i = roomNames.length;
            }
        }
    }

    //move naar construction in geassignde room
    //    console.log ('find construction')
    if (this.memory.assignedRoomName && this.memory.assignedRoomName != this.room.name){
        var target = null;
        var room = Game.rooms[this.memory.assignedRoomName];
    //        console.log ('assigned to room ' + room.name)
        if (room) {
            //gewone construction zoeken
            target=room.find(FIND_CONSTRUCTION_SITES)[0];
            // road flags zoeken
            if (!target) {
                target = room.find(FIND_FLAGS, {filter: o => {return o.color = COLOR_BROWN && o.secondaryColor == COLOR_BROWN}})[0];
            }
            if (!target) { // geen construction sites meer
                delete Memory.rooms[this.memory.assignedRoomName].workerAssignedName;
                delete this.memory.assignedRoomName; // hij kan weer aan een andere room assigned worden
            }
        } else {
            target = Game.atlas.getRoomCenter(this.memory.assignedRoomName);
        }
        //logger.log('creep.dowork', '' this.name)
        this.travelTo (target);
        return;
    }

    if (this.memory.assignedRoomName){
        delete Memory.rooms[this.memory.assignedRoomName].workerAssignedName;
        delete this.memory.assignedRoomName; // hij kan weer aan een andere room assigned worden
    }


    //anders naar huis
    //console.log ('trying home')
    if(this.room.name != this.memory.HomeRoomName && this.memory.HomeRoomName) {
        creep.travelTo(Game.rooms[this.memory.HomeRoomName].controller.pos);
        creep.say('home')
        return;
    }


    //anders upgraden
    // ALS:  level <=2 (nog geen containers)
    //    of er is nog geen storage, dan een minimum vasthouden voor fillen (constructionminstoredenergy)
    //    anders niet upgraden tenzij er ruim genoeg is (workeridleupgrade).
    logger.log ('creep.dowork',`trying upgrade. energyAvailable: ${this.room.energyAvailable}, capacity: ${this.room.getEnergyCapacityAvailable()}`,this.name)
    var target = creep.room.controller;
    if (target && ((!this.room.storage &&  this.room.getStoredEnergy().result > CONSTRUCTION_MIN_STORED_ENERGY ) || this.room.getStoredEnergy().result > WORKER_IDLE_UPGRADE || target.level <= 2)) {
        this.say('U')
        creep.upgradeController(target);
        if (!this.pos.isNearTo(target.pos)) creep.travelTo(target,{visualizePathStyle: {stroke: '#0000ff'}});
        if (this.room.storage) creep.idle = true; // creep is idle als hij gaat upgraden. behalve als er nog geen storage is
        return;
    } else {
        creep.idle = true;
        this.doFill();
        return;
    }
}

Creep.prototype.runInitializer = function() {
    //recyclen indien roomlevel niet 8 is.
    if (this.room.controller.my && this.room.controller.level < 8 ) {
        this.memory.recycle = true;
        return;
    }

    //anders bij roomcontroller unclaimen en opnieuw claimen
    if (this.pos.isNearTo(this.room.controller)) {
        if (this.room.controller.my && this.room.controller.level >= 8) {
            this.room.controller.unclaim();
            return;
        } else if (!this.room.controller.my) {
            this.claimController(this.room.controller);
            return;
        }
    } else this.travelTo (this.room.controller.pos);
    return;
}
