//compat fix:
const PIXEL_CPU_COST = 5000;
//end compat fix

module.exports = {
    MY_SIGN: '🐜🐜 FormicAI 🐜🐜 - Fully autonomous open source bot https://github.com/jerdaz/FormicAI',
    CREEP_EMOTES: false,
    COMMAND_NONE: 0,
    COMMAND_TRANSFER: 1,
    COMMAND_MOVETO: 2,
    COMMAND_CLAIMCONTROLLER: 3,
    COMMAND_FILL: 4,
    COMMAND_HARVEST: 5,
    COMMAND_BUILD: 6,
    COMMAND_UPGRADE: 7,
    COMMAND_RESERVE: 8,
    COMMAND_ATTACK: 9,

    STATE_NONE: 0,
    STATE_RETRIEVING: 1,
    STATE_DELIVERING: 2,
    STATE_MOVING: 3,
    STATE_CLAIMING: 4,
    STATE_FINDENERGY: 5,
    STATE_DROPENERGY: 6,
    STATE_FILLING: 7,
    STATE_BUILDING: 8,
    STATE_RESERVING: 9,
    STATE_ATTACKING: 10,

    OPERATION_NONE: 0,
    OPERATION_MAIN: 1,
    OPERATION_SHARD: 2,
    OPERATION_BASE: 3,
    OPERATION_SPAWNING: 4,
    OPERATION_FILLING: 5,
    OPERATION_UPGRADING: 6,
    OPERATION_BUILDING: 7,
    OPERATION_CREEP: 8,
    OPERATION_COLONIZING: 9,
    OPERATION_SHARDCOLONIZING: 10,
    OPERATION_MAP: 11,
    OPERATION_TOWER: 12,
    OPERATION_HARVESTING: 13,
    OPERATION_BASEPLAN: 14,
    OPERATION_LINK: 15,
    OPERATION_MINING: 16,
    OPERATION_MARKET: 17,
    OPERATION_BANK: 18,
    OPERATION_SCOUTING: 19,
    OPERATION_ROOM: 20,
    OPERATION_ROAD: 21,
    OPERATION_RESERVATION: 22,
    OPERATION_SHARDSPAWNING: 23,
    OPERATION_SHARDDEFENSE: 24,
    OPERATION_MAX: 24,

    BASE_PHASE_BIRTH: 0,
    BASE_PHASE_HARVESTER: 1,
    BASE_PHASE_STORED_ENERGY: 2,
    BASE_PHASE_SOURCE_LINKS: 3,
    BASE_PHASE_CONTROLLER_LINK: 4,
    BASE_PHASE_EOL: 5,

    ROLE_NONE:  0,
    ROLE_FILLER: 1,
    ROLE_UPGRADER: 2,
    ROLE_BUILDER: 3,

    DIRECTIVE_NONE: 0,
    DIRECTIVE_COLONIZE: 1,

    SUPPORT_INTERVAL: 1000,
    STRATEGY_INTERVAL: 100,
    TACTICS_INTERVAL: 10,
    
    TICKS_HOUR: 1000,
    TICKS_DAY: 1000 * 24,
    TICKS_WEEK: 1000 * 24 * 7,
    TICKS_MONTH: 1000 * 24 * 30,
    TICKS_YEAR:  1000 * 24 * 365,

    MOVE_ALLOW_HOSTILE_ROOM : 1,

    MAX_TRANSACTION: TERMINAL_CAPACITY / 10,
    MAX_CONSTRUCTION_SITES: 4,
    
    SHARDREQUEST_NONE: 0,
    SHARDREQUEST_COLONIZER: 1,
    SHARDREQUEST_BUILDER: 2,

    MAX_ROOM_SIZE : 50,
    MAX_BUCKET : 10000 - 5000 - 300,

    INVADER_USERNAME : 'Invader',

    MAX_WALL_HEIGHT : 0.01,
    ROAD_IDLE_REPAIR_TIME : 100,
    ROAD_FACTOR: 0.5,
    ENERGY_RESERVE : 0.1 * STORAGE_CAPACITY,


}
