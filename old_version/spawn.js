"use strict";

/*
 * Module code goes here. Use 'module.exports' to export things:
 * module.exports.thing = 'a thing';
 *
 * You can import it from another modules like this:
 * var mod = require('spawn');
 * mod.thing == 'a thing'; // true
 */

 var logger = require('logger');
 var myFlags = require('myflags');
 var consts = require('consts');

 const STORE_RESERVE_ENERGY = 50000 // energie vanaf wanneer er een upgrader wordt gemaakt
 const ATTACK_RESERVE_ENERGY = 10000;
 const INITIALIZER_ENERGY = 1200000;
 const SPAWN_UPGRADER_RATIO = 1; // hoeveel upgraders er gemaakt moeten worden per blok 'store_reserver_energy'.
 const BODY_SORT = {'tough': 1, 'move': 2, 'carry': 3, 'work': 4 , 'claim': 5, 'attack': 6, 'ranged_attack': 7, 'heal': 8};
 const GCL_NEW_COLONY = 10;

 //const BODY_SORT[TOUGH] =  {TOUGH: 1, MOVE: 2, CARRY: 3, WORK: 4 , CLAIM: 5, ATTACK: 6, RANGED_ATTACK: 7, HEAL: 8};

 /*Spawn.prototype.maxSpawnEnergy = function () {
    return this.room.getEnergyCapacityAvailable();
}

Spawn.prototype.availableSpawnEnergy = function () {
    return this.room.energyAvailable;
}*/



function findHarvestFlags (){
    var flags=[];
    for(var flagname in Game.flags) {
        var flag = Game.flags[flagname];
        if (flag.color == COLOR_GREEN) {
            flags.push(flag);
        }
    }
    return flags;
}


Spawn.prototype.getCreepCost = function (body) {
    var cost = 0;
    for (var i=0; i<body.length;i++) cost += BODYPART_COST[body[i]];
    return cost;
}

//body van een creep repeteren tot beschikbare energy
Spawn.prototype.expandCreep = function(body, minLength = 3, maxLength = MAX_CREEP_SIZE, emergencySpawn = false) {
    logger.log('spawn.expandcreep', `${body}, ${minLength}, ${maxLength}` )
    var result = [];
    var i=0;
    var maxEnergy = this.room.getEnergyCapacityAvailable();
    if (emergencySpawn && !this.room.hasWorker() || this.room.getStoredEnergy().result < 50) maxEnergy = this.room.energyAvailable; // emergency respawn als alle creeps dood zijn;
    while (this.getCreepCost(result) <= maxEnergy && result.length < Math.min(maxLength + 1, MAX_CREEP_SIZE + 1)) {
        result.push(body[i++]);
        i = i % body.length;
    }
    result.pop(); // de laatste er altijd uitgooien omdat die energie overschrijdt
    result.sort((partA, partB) => {
        logger.log('spawn.expandcreep', partA + partB + BODY_SORT[partA] +' '+BODY_SORT[partB] + BODY_SORT.carry)
        if (BODY_SORT[partA] < BODY_SORT[partB]) return -1;
        if (BODY_SORT[partA] > BODY_SORT[partB]) return 1;
        return 0;
    });

    logger.log('spawn.expandcreep', result)
    if (result.length>= minLength) return result;
}

Spawn.prototype.recycleCreeps = function () {
    var creeps = this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) => {return creep.memory.recycle == true}});
    logger.log ('spawn.recyclecreeps', creeps)
    for (var creep of creeps) this.recycleCreep(creep);
}

Spawn.prototype.spawnCreepByRole = function (role, targetRoomName, targetSourceId = undefined) {
    // return true indien spawn succesvol
    var newName = role + this.room.name + '_' + targetRoomName + '_' + Game.time % 10000;
    var body;
    var source = Game.getObjectById(targetSourceId)
    logger.log('spawn.spawncreepbyrole', 'Trying to spawn ' + role + ' for room ' + targetRoomName )
    let room = Game.rooms[targetRoomName];
    switch(role) {
        case 'scout':
            body = [MOVE];
            break;
        case 'reserver':
            body = [MOVE];
            var ticksToEnd;
            if (room && room.controller && room.controller.reservation) ticksToEnd = room.controller.reservation.ticksToEnd
            if (!ticksToEnd) ticksToEnd = 0;
            if (room && room.controller && this.room.getEnergyCapacityAvailable() >= BODYPART_COST[MOVE] + BODYPART_COST[CLAIM] && room.find(FIND_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER}}).length > 0) {
                if (ticksToEnd < 3900 && this.room.getEnergyCapacityAvailable() >= BODYPART_COST[MOVE]*2 + BODYPART_COST[CLAIM] * 2) body = [MOVE, MOVE, CLAIM, CLAIM];
                else body = [MOVE, CLAIM];
            } else if (room && room.controller && room.controller.level > 0 && !room.controller.my) body = this.expandCreep([MOVE,CLAIM]);
            break;
        case 'harvester':
            body = [WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE];
            let source = Game.getObjectById(targetSourceId);
            if (source.energyCapacity >= 4000) {
                body = [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE,MOVE];
            }

            break;
        case 'transporter':
            let bodyTemplate = [MOVE,CARRY,CARRY];
            var requiredSize = 1.05 * Math.ceil(Memory.transportLoad[targetSourceId] / 100) //transporter moet minimaal de actuele load  kunnen dragen.
//            let energyDivider = Math.ceil((requiredSize * this.getCreepCost(bodyTemplate)) / this.room.getEnergyCapacityAvailable()) // indien niet genoeg energy, dan halve creeps maken zodat er dubbele tranporters komen
//            let bodySizeDivider = Math.ceil(3*requiredSize / MAX_CREEP_SIZE) // indien te klein voor maximum size, kleiner maken zodat er meer gespawned worden
//            let divider = Math.max(energyDivider,bodySizeDivider)
            let maxLength = (3*requiredSize)// / divider
            if (!maxLength) maxLength = MAX_CREEP_SIZE;
//            logger.log('spawn.spawncreepbyrole', `maxLength: ${maxLength} requiredsize: ${requiredSize} energyDivider: ${energyDivider} bodysizeDivider: ${bodySizeDivider}`)
            body = this.expandCreep(bodyTemplate, 2, maxLength)
            break;
        case 'attacker':
            let spawnFodder;
            if (room) {
                spawnFodder = false;
                let towers = room.find(FIND_HOSTILE_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_TOWER}});
                logger.log('spawn.spawncreepbyrole', 'room  visible towers: ' + towers.length)
                for (let tower of towers) if (tower.energy >= 100) spawnFodder = true;
                if (room.find(FIND_MY_CREEPS).length > 10) spawnFodder = false;
            } else {
                let scoutInfo = Game.atlas.getScoutInfo(targetRoomName);
                if (scoutInfo && scoutInfo.towerCount > 0) spawnFodder = true;
            }
            if (spawnFodder) {
                body = [MOVE];
            } else {
                body = this.expandCreep([MOVE, ATTACK], 2);
            }
            break;
        case 'upgrader':
            if (this.room.controller && this.room.controller.level >= 8) {
                body = this.expandCreep([MOVE,CARRY,WORK,WORK,WORK,MOVE,WORK,WORK,WORK,WORK], 23, 23 )
            }
            else if (this.room.getLinks().length >= 2 ) {
                body = this.expandCreep([MOVE,CARRY,WORK,WORK,WORK,MOVE,WORK,WORK,WORK,WORK]);
            } else {
                body = this.expandCreep([MOVE,CARRY,WORK]);
            }
            break;
        case 'initializer':
            body = [MOVE,CLAIM];
            break;
        case 'keeperkiller':
            body = _.fill(Array(25), MOVE);
            body = body.concat(_.fill(Array(20), RANGED_ATTACK));
            body = body.concat(_.fill(Array(5), HEAL));
            //body = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,HEAL,HEAL,HEAL,HEAL,HEAL];
            break;
    }
    logger.log('spawn.spawncreepbyrole', 'body: '+ body)
    if(this.spawnCreep(body, newName, {memory: {role: role, targetSourceId: targetSourceId, targetRoomName: targetRoomName, HomeRoomName: this.room.name}}) == OK) {
        //console.log ('Spawned ' + role + ': ' + newName);
        if (role == 'harvester' && source) this.buildPath(source.pos, false);
        return true;
    }
    return false;
}

Spawn.prototype.replaceCreeps = function() {
    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        if (creep.memory.replace && !creep.memory.replaced && creep.memory.HomeRoomName == this.room.name) {
            if (this.spawnCreepByRole(creep.memory.role, creep.memory.targetRoomName, creep.memory.targetSourceId)) {
                logger.log('spawn.replacecreeps', 'replacing creep: ' + creep.name)
                creep.memory.replaced = true
            }
            return true;
        }
    }
}


Spawn.prototype.calculateAvgWorkers = function(roomCreeps) {
    //idle workers uitrekeningen
    var workerCreeps=_.filter(roomCreeps, (creep) => {return creep.memory.role == 'worker'});
    // dode en vertrokken en nieuwe worker creeps meenemen in running avg
    if (this.memory.lastWorkerCount == undefined) this.memory.lastWorkerCount = 0;
    var lastWorkerCount = this.memory.lastWorkerCount;
    if (lastWorkerCount != workerCreeps.length) {
        for ( var i=0; i< this.room.memory.avgIdleWorkers.length;i++) this.room.memory.avgIdleWorkers[i]-= lastWorkerCount - workerCreeps.length; // dode creep meenemen in verwachte idle berekening
    }
    this.memory.lastWorkerCount = workerCreeps.length
    var idleWorkers=0;
    if (this.memory.idleWorkerCounter == null) this.memory.idleWorkerCounter = 0;
    for (var i=0; i<workerCreeps.length;i++) if (workerCreeps[i].idle == true) idleWorkers++;
    this.room.memory.avgIdleWorkers[Game.time % this.room.memory.avgIdleWorkers.length] = idleWorkers;
    var runningAvgIdleWorkers = 0;
    for(var i=0;i<this.room.memory.avgIdleWorkers.length;i++) runningAvgIdleWorkers += this.room.memory.avgIdleWorkers[i] / this.room.memory.avgIdleWorkers.length;

    if (this.memory.idlePerc == undefined) this.memory.idlePerc = 0.5;
    if (this.spawning) this.memory.idlePerc = this.memory.idlePerc / 1500 * 1499;
    else  this.memory.idlePerc = this.memory.idlePerc / 1500 * 1499 + 1 / 1500;
    logger.log('spawn.calculateavgworkers', `RUNNING SPAWN ${this.room.name}: Idle: ${Math.round(this.memory.idlePerc * 100)}% Workers: ` + workerCreeps.length + ' idleworkercounter: ' + idleWorkers + ' Running avg: ' + runningAvgIdleWorkers);
    return runningAvgIdleWorkers;
}

Spawn.prototype.run = function(roomCreeps, runningAvgIdleWorkers) {
    logger.log ('spawn.run', 'Running spawn in room ' + this.room)

    //this.recycleCreeps();

    // attack
    let attacking = false;
    let attackFlags = myFlags.getAttackFlags();
    if (this.room.getStoredEnergy().result > ATTACK_RESERVE_ENERGY) {
        if (attackFlags.length > 0) {
            attacking = true;
        }
    }


    //attacker maken als er al een staat te wachten
    /*
    if (this.pos.findInRange(FIND_MY_CREEPS,1,{filter: (creep) => {return creep.memory.role=='attacker' && !creep.memory.startAttack}}).length == 1) {
        this.spawnCreepByRole('attacker');
        return;
    }*/

    //workers spawnen
    var harvestRooms = this.room.findHarvestRooms();
   //6 goto (skipdefender);

   //defenders maken (max 2 per room)

   if (_.filter(roomCreeps, o => {return o.memory.role == 'defender'}).length < 2 ) {
        for(var i=0;i<harvestRooms.length;i++) {


            var roomName = harvestRooms[i];

            // if room is in the center of a sector it spawns very strong defenders. it is a waste of resources
            // to defend from it.
            var roomXY = Game.atlas.getRoomCoordinates(roomName);
            if (roomXY.x % 10 == 5 && roomXY.y % 10 == 5) continue;

            var room = Game.rooms[roomName]

            // defenders maken indien aangevallen
            let hostileCreeps;
            if (room) hostileCreeps = room.find(FIND_HOSTILE_CREEPS, {filter: o => {return o.owner.username != 'Source Keeper'}})
            if (room && hostileCreeps.length>0) {
                //let maxBodySize = 0;
                //for (creep of hostileCreeps) if (creep.body.length > maxBodySize) maxBodySize = creep.body.length;
                var newName = 'Defender' + Game.time;
                //console.log('SPAWNING DEFENDER (invader in room: ' + room )
                if(this.spawnCreep(this.expandCreep([MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,HEAL],4), newName, {memory: {role: 'defender', HomeRoomName: this.room.name}})==OK) console.log('SPAWNED DEFENDER')
                return;
            }
        }
    }


    // initialiser voor als level 8 met upgrade beperking en storage / terminal is vol
    if (this.room.controller.level >= 8 && this.room.getStoredEnergy().result > INITIALIZER_ENERGY) {
        // eerst veel upgraders spawnen
        if (_.filter(roomCreeps, o => {return o.memory.role == 'upgrader'}).length < 9) {
            this.spawnCreepByRole('upgrader');
            return;
        } else if(_.filter(roomCreeps, o => {return o.memory.role == 'initializer'}).length < 1) {
            this.spawnCreepByRole('initializer');
            return;
        }
    }


    // worker spawnen zelf spawenen
    // indien de room een storage heeft, workers maximeren op 3 (upgraders nemen dan de rol over)
        if (!attacking && runningAvgIdleWorkers < 0.5 && (!this.room.hasFiller() || _.filter(roomCreeps, o => {return o.memory.role == 'worker'}).length <= 3) ) {
            var newName = 'Worker' + Game.time;
            //console.log('SPAWNING WORKER')
            if (this.spawnCreep(this.expandCreep([MOVE,WORK,CARRY], 3, MAX_CREEP_SIZE, true), newName,
                {memory: {role: 'worker', HomeRoomName: this.room.name}}) == OK) {
                //console.log('Spawned new worker: ' + newName);
            }
            return;
        }
//    }


    //console.log('harvestrooms: ' + harvestRooms)

    if (this.room.controller && this.room.controller.level < 3) return ; // pas bij level 3 geavanceerde creeps maken



    //filler maken
    if (_.filter(roomCreeps, o => {return o.memory.role == 'filler'}).length < 2 && _.find(roomCreeps, o => {return o.memory.role == 'harvester'})) {
        var newName = 'Filler' +Game.time;
        var size = Math.ceil(this.room.getEnergyCapacityAvailable() / 100 / 2) * 3
        let result = this.spawnCreep(this.expandCreep([MOVE,CARRY,CARRY], 3, size), 'Filler' + Game.time, {memory: {role: 'filler', HomeRoomName: this.room.name}});
        console.log('SPAWNING FILLER ' + result)
            if(result == OK) {
                console.log ('Spawned Filler: ' + newName);
            }
            return;
        }

    // attack
    if (attacking) {
        this.spawnCreepByRole('attacker', attackFlags[0].pos.roomName);
        return;
    }

    //scout spawnen
    let scoutCreepFound = false;
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        if (creep.memory.role == 'scout' && creep.memory.HomeRoomName == this.room.name) {
            scoutCreepFound = true;
            break;
        }
    }
    if (!scoutCreepFound) {
        this.spawnCreepByRole('scout');
        return;
    }

    //colonizer spawnen

/*    var yellowFlags = []; // colonize flag
    for (var flagname in Game.flags) {
        var flag = Game.flags[flagname];
        if (flag.color==COLOR_YELLOW && flag.name.startsWith(this.room.name)) yellowFlags.push(flag);
    }*/
    if (Memory.colRoom && this.room.getEnergyCapacityAvailable() > 700 && Game.map.findRoute(this.room.name, Memory.colRoom).length <= consts.COLONISATION_DIST) {
//        var flag = yellowFlags[0]
        var needCreep=1; // 5 creeps produceren
        var creepBody;
        var room = Game.rooms[Memory.colRoom];
        if (room) { // ik heb al zicht op de kamer
            if (room.controller.my && room.find(FIND_MY_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_SPAWN}}).length>0) {
                delete Memory.colRoom; // colonisatie voltooid!
                needCreep = false;
            } else if (!room.controller.my) {
                creepBody = [MOVE,MOVE,CLAIM]; // claimer colonist (leeft kort veel move)
                needCreep = 2; // beetje overbodig maar anders duur het te lang voor de sterke creep doodgaat.
            }
            else {
                creepBody = this.expandCreep ([MOVE,WORK,MOVE,CARRY,MOVE,ATTACK]) // externe worker tot spawn er staat
                needCreep = 7; // colonist verandert in worker als hij arriveert.
            }
        } else {
            creepBody = [MOVE] // sterke verkenner / padmaker
            needCreep = 1 // max 1 tegelijk
        };

        var creepcount = 0;
        for (var creepname in Game.creeps) {
            var creep=Game.creeps[creepname];
            if (creep.memory.birthRole == 'colonist') creepcount++;
        }
        if (creepcount>=needCreep) needCreep=false;

        if (needCreep) {
            var newName =  'Colonist' + Game.time;
            if(this.spawnCreep(creepBody, newName, {memory: {role: 'colonist', birthRole: 'colonist', HomeRoomName: this.room.name}}) == OK) {
                console.log ('Spawned Colonist: ' + newName);
            }
            return;
        }
    }



    //upgrader voor lokale controller
    //console.log ('SPAWN: Upgraders')
    let controllerContainer = this.room.controller.getContainer();
    let storedEnergy = this.room.getStoredEnergy().result;
    if ((storedEnergy > STORE_RESERVE_ENERGY) || (this.room.storage == undefined && this.room.find(FIND_STRUCTURES, {filter: (structure) => {return structure.structureType == STRUCTURE_CONTAINER && _.sum(structure.store) == structure.storeCapacity}}).length > 0)) {
        var needCreep
        if (this.room.controller && this.room.controller.level >= 8) needCreep = 1
        else if (this.room.storage) needCreep = (storedEnergy - STORE_RESERVE_ENERGY) / (STORE_RESERVE_ENERGY * SPAWN_UPGRADER_RATIO);
        else if (this.room.find(FIND_CONSTRUCTION_SITES).length>0) needCreep = 0;
        else needCreep = 50;
        var creepcount = 0;
        for (var creepname in Game.creeps) {
            var creep=Game.creeps[creepname];
            if (creep.memory.role == 'upgrader' && creep.memory.HomeRoomName == this.room.name) creepcount++;
        }
        if (creepcount>=needCreep) needCreep=false;

        if (needCreep) {
            this.spawnCreepByRole('upgrader');
            return;
        }
    }



    //harvester en transporter spawnen.
    //lokale sources
    var sources =[]; //= this.room.findSources();


//    sources in harvest areas erbij
    for(var i=0;i<harvestRooms.length;i++) {
        if (!Memory.rooms[harvestRooms[i]]) continue;
        let scoutInfo = Game.atlas.getScoutInfo(harvestRooms[i])
        if (scoutInfo == undefined) continue;
        for (let sourceId in scoutInfo.sources) {
            let smallestDistance = 999999;
            let sourceInfo = scoutInfo.sources[sourceId];
            for (let roomName in sourceInfo.roomDistance) {
                if (sourceInfo.roomDistance[roomName] < smallestDistance) smallestDistance = sourceInfo.roomDistance[roomName];
            }
            if (sourceInfo.roomDistance && sourceInfo.roomDistance[this.room.name] == smallestDistance) {
                //sources.push(Game.getObjectById(sourceId));
                sources.push({sourceId: sourceId, distance: smallestDistance, roomName: harvestRooms[i]});
            }
        }
    }
    sources.sort((a,b) => {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        else return 0;
    })
    logger.log('spawn.run', sources);

    for(var i=0;i< sources.length;i++) {

        // creeps replacen
        for (let creep of roomCreeps) {
            if (creep.memory.replace && !creep.memory.replaced && creep.memory.targetSourceId == sources[i].sourceId) {
                if (this.spawnCreepByRole(creep.memory.role, creep.memory.targetRoomName, creep.memory.targetSourceId)) {
                    logger.log('spawn.replacecreeps', 'replacing creep: ' + creep.name)
                    creep.memory.replaced = true
                }
                return true;
            }
        }
        let source = Game.getObjectById(sources[i].sourceId);

        // reserver maken indien nodig (geen zicht)
        if (this.room.name != sources[i].roomName) {
            let hasReserver = false;
            for (let creep of roomCreeps) {
                if (creep.memory.role == 'reserver' && creep.memory.targetRoomName == sources[i].roomName) {
                    hasReserver = true;
                    break;
                }
            }
            if (!hasReserver) {
                this.spawnCreepByRole('reserver', sources[i].roomName);
                return;
            }
        }

        if (source) {
            logger.log('spawn.run', 'spawning creeps for room ' + source.room.name + ' source: ' + source.id);
            if (Game.atlas.getScoutInfo(source.room.name).hasKeepers) {
                logger.log('spawn.run', 'checking if keeperkiller exists');
                let hasKeeperKiller = false;
                for (let creep of roomCreeps) {
                    if (creep.memory.role == 'keeperkiller' && creep.memory.targetRoomName == sources[i].roomName) {
                        hasKeeperKiller = true;
                        break;
                    }
                }
                if (!hasKeeperKiller) {
                    this.spawnCreepByRole('keeperkiller', sources[i].roomName);
                    return;
                }

                //continue; // tijdelijk overslaan totdat cleaner goed werkt nog geen harvesters maken;
            }

            let transportContainer = source.getContainer();
            var needHarvester=true;
            logger.log ('spawn.run', 'trying to spawn harvester for room ' + source.room.name + ' and source ' +source.id)
            for (var creepname in Game.creeps) {
                var creep=Game.creeps[creepname];
                if (creep.memory.role == 'harvester' && creep.memory.targetSourceId == source.id) {
                logger.log ('spawn.run', 'found harvester, stopping spawn ' +  creep.name)
                    needHarvester =false;
                }
            }

            if (needHarvester) {
                logger.log ('spawn.run', 'room needs harvester calling spawncreepbyrole ' + source.room.name)
                //console.log ('TRYING HARVESTER ' + source.room.name)
                this.spawnCreepByRole('harvester', source.room.name, source.id);
                return;
            }
            var needTransporter=true;
            if (Memory.lastSourceNewTransportSpawn == undefined) Memory.lastSourceNewTransportSpawn = {};

            let lastSpawnTime = Memory.lastSourceNewTransportSpawn[source.id];
            if (Game.time - lastSpawnTime < 750) needTransporter = false;

            //console.log ('SPAWN: Transporter ' + source.room.name)
            if (needTransporter) {
                for (var creepname in Game.creeps) {
                    var creep=Game.creeps[creepname];
                    if (creep.memory.role == 'transporter' && creep.memory.targetSourceId == source.id && transportContainer && transportContainer instanceof StructureContainer && transportContainer.store.energy < transportContainer.storeCapacity )
                        needTransporter =false;
                }
            }

            if (needTransporter && transportContainer && transportContainer instanceof StructureContainer) { // ook al is er een transporter nodig, alleen als de source een container heeft
                if (this.spawnCreepByRole('transporter', source.room.name, source.id)) {
                    Memory.lastSourceNewTransportSpawn[source.id] = Game.time;
                }
                return;
            }
//            else if (needTransporter) {
//                console.log ('Spawner idle: Need container in room ' + source.room)
//                return;
//            }
        }

    }
    //console.log ('SPAWN: Idle...Zz')

/*    //transporters spawnen
    var idleTransporters=0;
    var creeps=this.room.find(FIND_MY_CREEPS,{filter: (creep) => {return creep.memory.role == 'transporter'}});
    if (this.memory.idleTransporterCounter == null) this.memory.idleTransporterCounter = 0;
    for (var i=0; i<creeps.length;i++) if (creeps[i].idle == true) idleTransporters++;
    this.room.memory.avgIdleTransporters[Game.time % this.room.memory.avgIdleTransporters.length] = idleTransporters;
    var runningAvgIdleTransporters = 0;
    for(var i=0;i<this.room.memory.avgIdleTransporters.length;i++) runningAvgIdleTransporters += this.room.memory.avgIdleTransporters[i] / this.room.memory.avgIdleTransporters.length;
    console.log('RUNNING SPAWN: Transporters: ' + creeps.length + ' idle: ' + idleTransporters + ' idleTransporterscounter: ' + idleTransporters + ' Running avg: ' + runningAvgIdleTransporters);
    if ((this.memory.creephasdied == true && runningAvgIdleTransporters < 1.5) || runningAvgIdleTransporters < 0.5) {
        var newName = 'Transporter' + Game.time;
        if (this.spawnCreep([CARRY,CARRY,MOVE, CARRY,CARRY,MOVE, CARRY,CARRY,MOVE], newName,
            {memory: {role: 'transporter'}}) == OK);
            console.log('Spawned new transporter: ' + newName);
            //meenemen in verwachte idle berekening
            for ( var i=0; i< this.room.memory.avgIdleTransporters.length;i++) this.room.memory.avgIdleTransporters[i]+=1;
        return;

    } else if (this.memory.creephasdied == true) for ( var i=0; i< this.room.memory.avgIdleTransporters.length;i++) this.room.memory.avgIdleTransporters[i]-=1; // dode creep meenemen in verwachte idle berekening
*/
}

module.exports = {

};
