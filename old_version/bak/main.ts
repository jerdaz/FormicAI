import { ErrorMapper } from "utils/ErrorMapper";
import * as profiler from 'screeps-profiler';
profiler.enable();
//import * as sources from 'source';
import 'room';
import 'terminal';
//import 'beta/room'
import * as logger from 'logger';
import * as consts from 'consts';
import Atlas from 'atlas';

import Base from 'base';
//declare var Memory: Memory;


const cpuWindow = 300;

const OWNER_ME = 'Jerdaz';
const BETA_ROOMS = ['W7S48'];
const FULLROOMDIVIDER = 2;

let atlas = new Atlas();

function initGlobal() {
    if (!Memory.transportLoad) Memory.transportLoad = {};
    RawMemory.setActiveSegments([0,1,2,3,4,5,6,7,8,9]);
}
initGlobal();

function myMain () {
    if (!Game.cpu.bucket) Game.cpu.bucket = 10000;
    //Memory = JSON.parse(RawMemory.get());
    let rooms = Memory.rooms;
    let startCPU = Game.cpu.getUsed();
    if (!Memory.avgCpuUsed) Memory.avgCpuUsed = 0;
    Memory.avgCpuUsed = Memory.avgCpuUsed / cpuWindow * (cpuWindow - 1) + Memory.lastCpuUsed / cpuWindow;
    let cSites = _.size(Game.constructionSites)
    console.log ('===== TICK ' + Game.time + ' (AVGCPU: ' + Math.round(Memory.avgCpuUsed/Game.cpu.limit*1000)/10 + '% CPUBUCKET: '+ Game.cpu.bucket + ') CSITE: ' + cSites +  '  MEMCPU: ' + startCPU + '=====' );
    if (Game.time % 1500 == 0 && cSites >= MAX_CONSTRUCTION_SITES) removeAllConstructionSites(); // indien te veel onbeheerde construction sites alle verwijderen.

    Game.atlas = atlas;
    //notificeren als er een CPU probleem is
/*    if (Game.cpu.bucket < 7500) {
        Game.notify('Warning CPU bucket low: ' + Game.cpu.bucket, 60);
        //if (!Game.profiler.isProfiling()) Game.profiler.email(1000);
    }*/



    //debug


    //removeAllConstructionSites();
    //removeAllFlags();
    //Game.rooms['W12N52'].getSpawn().buildPath(new RoomPosition (34, 16, 'W14N51'), true);


    for(let name in Memory.creeps) {
        if(!Game.creeps[name]) {
            // indien assigned aan room, deleten
            for (let roomName in Memory.rooms) if (Memory.rooms[roomName].workerAssignedName == name) delete Memory.rooms[roomName].workerAssignedName;
            delete Memory.creeps[name];
            //console.log('Clearing non-existing creep memory:', name);
        }
    }

    //object met per room een array van creeps
    let roomCreeps:any = {};
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        let roomName = creep.memory.HomeRoomName;
        if (!roomCreeps[roomName]) roomCreeps[roomName] = [];
        roomCreeps[roomName].push(creep)
    }

    //rooms doorlopen en runnen
    let lastErr;
    let myBases = [];
    let myLeveledRooms = 0;
    for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            if (room.controller.level > 1) myLeveledRooms++;
            myBases.push(new Base(room));
        }
        try {
            Game.rooms[roomName].run();
        } catch(err) {
            console.log ('Error while running room ' + roomName );
            console.log (err.stack)
            lastErr = err;
        }
}


    // basissen runnen
    for (let base of myBases) {
        try {
            base.run(myBases, roomCreeps[base.room.name]);
        }
        catch(err) {
            console.log ('Error while running base ' + base );
            console.log (err.stack)
            lastErr = err;
        }

    }
    // basissen unclaimen
    if (Game.time % 10000 == 0 && myBases.length == Game.gcl.level) unclaimBases(myBases);


    //clean memory (do it after unclaiming bases to remove its source distance)
    if (Game.time % 10000 == 1) {
        // cleanMemory(myBases);
        // LAST RESORTif memory is too large, purge it completely
        if (RawMemory.get().length > 2000 * 1024) {
            Memory.rooms = {};
            Game.notify('WARNING: Deleting room memory because memory is full')
        }
    }

    // save room history from time to time
    if (Game.time % 100 == 51) {
        Game.atlas.saveRoomCache();
    }

    // nieuwe colonisation target vaststellen
    if (myBases.length < Game.gcl.level) colonize(myBases);
    //DEBUG: if (Memory.debugcolonize) colonize(myBases);

    //stats verzamelen energie per basis
    saveEnergyStats();


    if (lastErr) throw lastErr;
    Memory.lastCpuUsed = Game.cpu.getUsed();
}

function unclaimBases(myBases:Base[]) {
    console.log('unclaimbases')
    logger.log('unclaimbases', 'unclaiming bases');
    let fullBases = _.filter(myBases, o => {return o.room.controller && o.room.controller.level == 8});
    let upgradeBaseCount = _.filter(myBases, o => {return o.room.controller && o.room.controller.level >= 6 && o.room.controller.level < 8}).length;
    if (fullBases.length / upgradeBaseCount > FULLROOMDIVIDER) {
        fullBases.sort( (a,b) => {
            let aVal = a.room.memory.energyHistory[0];
            let bVal = b.room.memory.energyHistory[0];
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        })
        // controleren of basis al lang genoeg output levert (min 2 dagen)
        let i;
        for (i=0; i<fullBases.length; i++) {
            if (fullBases[i].room.memory.energyHistory[2] > 0) break;
        }
        if (i < fullBases.length) {
            console.log('UNCLAIMING BASE ' + fullBases[i].room.name);
            fullBases[i].controller.unclaim();
        }
    }
}

/*
function cleanMemory(myBases:Base[]) {
    //  clean source distances from rooms
    logger.log('cleanmemory', 'cleaning memory')
    for (let roomName in Memory.rooms) {
        let scoutInfo = Memory.rooms[roomName].scoutInfo;
        if (scoutInfo && scoutInfo.sources) {
            logger.log('cleanmemory', 'checking room ' + roomName)
            for (let sourceID in scoutInfo.sources) {
                logger.log('cleanmemory', 'checking source ' + sourceID)
                let sourceMemory = scoutInfo.sources[sourceID];
                for (let baseRoomName in sourceMemory.roomDistance) {
                    if (_.filter(myBases, o => {return o.room.name == baseRoomName}).length == 0) {
                        logger.log('cleanmemory', 'cleaning base ' + baseRoomName)
                        delete sourceMemory.roomDistance[baseRoomName];
                    }
                }
            }
        }
    }
}*/

function saveEnergyStats() {
    let maxProcessTime = 0;
    for (let transaction of Game.market.incomingTransactions) {
        if (transaction.time > maxProcessTime) maxProcessTime = transaction.time;
        if (transaction.time <= Memory.lastEnergyStat) {
            Memory.lastEnergyStat = maxProcessTime;
            break;
        }
        let room = Game.rooms[transaction.from]
        if (room && room.controller && room.controller.my && transaction.resourceType == RESOURCE_ENERGY) {
            let roomMemory = room.memory
            if (!roomMemory.curEnergyStat) roomMemory.curEnergyStat = 0;
            roomMemory.curEnergyStat += transaction.amount;
        }
    }
}


function colonize(myBases:Base[]) {
    logger.log('colonize', 'Checking for colonisation')
    if (Memory.colRoomAge == undefined) Memory.colRoomAge = 0;
    if (Memory.colRoom == undefined || Game.time - Memory.colRoomAge > consts.COLONISATION_TARGET_RECYCLE_TIME) {
        let colOffsetRoom = myBases[Math.floor((Math.random() * myBases.length))]
        let maxDistance = Math.ceil (Math.random() * consts.COLONISATION_DIST)
        let targetRoomName = colOffsetRoom.room.name
        let distance = -1;
        let scoutInfo = Game.atlas.getScoutInfo(targetRoomName)
        while (
            maxDistance >= distance
            &&
            !( scoutInfo
            && scoutInfo.hasController
            && scoutInfo.ownerUserName == undefined
            && scoutInfo.hasEnemyCreeps
            && Game.map.isRoomAvailable(targetRoomName)
            )
        ) {
            logger.log ('colonize', 'roomname selecation: ' + targetRoomName)
            let exits:any = Game.map.describeExits(targetRoomName);
            var keys = Object.keys (exits);
            let exitKey = keys[Math.floor(keys.length * Math.random())];
            let exitRoomName = exits[exitKey];
            let result = Game.map.findRoute(colOffsetRoom.room.name, targetRoomName);
            if (result instanceof Array) distance = result.length
            else distance = -1;

            logger.log ('colonize', exits)
            logger.log ('colonize', exitKey)
            logger.log ('colonize', exitRoomName)
            targetRoomName = exitRoomName;
            scoutInfo = Game.atlas.getScoutInfo(targetRoomName);
        }
        let spawnX ;
        let spawnY ;
        let validSpot;
        do {
            validSpot = true;
            spawnX = _.random(6, 44);
            spawnY = _.random(6, 44);
            for (let nx=-3;nx<=3;nx++) {
                for (let ny=-3;ny<=3;ny++) {
                    var terrain = Game.map.getTerrainAt(spawnX + nx, spawnY + ny, targetRoomName);
                    if (terrain == 'wall' )  validSpot = false;
                }
            }
        }
        while (validSpot == false )
        Memory.colRoom = targetRoomName;
        Memory.colX = spawnX;
        Memory.colY = spawnY;
        Memory.colRoomAge = Game.time;
    }
}


function removeAllFlags() {
    for (let flagName in Game.flags) {
        Game.flags[flagName].remove();
    }
}


function removeAllConstructionSites() {
    for (let constructionSiteId in Game.constructionSites) {
        let cSite = Game.constructionSites[constructionSiteId];
        if (cSite.progress == 0 ) cSite.remove();
    }
}


// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
export const loop = ErrorMapper.wrapLoop(() => {
    profiler.wrap(function() {myMain()});
});

