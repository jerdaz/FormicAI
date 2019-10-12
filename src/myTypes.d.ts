
declare type Debug = import ('./debug');
declare type MainOp = import ('./main_mainOp').MainOp;
declare type Operation = import('./main_operation')
declare type ChildOp = import('./main_childOp')
declare type ShardOp = import('./shard_shardOp')
declare type ShardChildOp = import('./shard_shardChildOp');
declare type MapOp = import('./shard_child_mapOp');
declare type CreepOp = import('.creepOp');
declare type BaseOp = import('./base_baseOp');
declare type BaseChildOp = import('./base_baseChildOp');
declare type SpawningOp = import('./base_child_spawningOp');
declare type FillingOp = import('./base_child_fillingOp');
declare type UpgradingOp = import('./base_child_upgradingOp');
declare type BuildingOp = import('./base_child_buildingOp');
declare type TowerOp = import('./base_child_towerOp');
declare type ColonizingOp = import('./shard_child_colonizingOp');

declare interface Base extends Room {controller: StructureController};
declare var _ = import('lodash');

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number}
interface Memory {[name: string]: any}

interface CreepMemory {operationType: number, baseName: string}
;