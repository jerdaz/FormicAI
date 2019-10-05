
declare type Debug = import ('./debug');
declare type MainOp = import ('./main').MainOp;
declare type Operation = import('./00_operation')
declare type ChildOp = import('./01_childOp')
declare type ShardOp = import('./10_shardOp')
declare type ShardChildOp = import('./11_shardChildOp');
declare type MapOp = import('./12_mapOp');
declare type CreepOp = import('.creepOp');
declare type BaseOp = import('./20_baseOp');
declare type BaseChildOp = import('./21_baseChildOp');
declare type SpawningOp = import('./22_spawningOp');
declare type FillingOp = import('./22_fillingOp');
declare type UpgradingOp = import('./22_upgradingOp');
declare type BuildingOp = import('./22_buildingOp');
declare type TowerOp = import('./22_towerOp');
declare type ColonizingOp = import('./12_colonizingOp');

declare interface Base extends Room {controller: StructureController};
declare var _ = import('lodash');

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number}
interface Memory {[name: string]: any}

interface CreepMemory {operationType: number, baseName: string}
;