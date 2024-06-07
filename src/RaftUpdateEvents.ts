/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftUpdateEvents
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export enum RaftUpdateEvent {
    UPDATE_CANT_REACH_SERVER,
    UPDATE_APP_UPDATE_REQUIRED,
    UPDATE_IS_AVAILABLE,
    UPDATE_NOT_AVAILABLE,
    UPDATE_STARTED,
    UPDATE_PROGRESS,
    UPDATE_PROGRESS_FILESYSTEM,
    UPDATE_FAILED,
    UPDATE_SUCCESS_ALL,
    UPDATE_SUCCESS_MAIN_ONLY,
    UPDATE_CANCELLING,
    UPDATE_NOT_CONFIGURED,
    UPDATE_RECONNECTED,
    UPDATE_DISCONNECTED
}

export const RaftUpdateEventNames = {
    [RaftUpdateEvent.UPDATE_CANT_REACH_SERVER]: 'CANT_REACH_SERVER',
    [RaftUpdateEvent.UPDATE_APP_UPDATE_REQUIRED]: 'APP_UPDATE_REQUIRED',
    [RaftUpdateEvent.UPDATE_IS_AVAILABLE]: 'IS_AVAILABLE',
    [RaftUpdateEvent.UPDATE_NOT_AVAILABLE]: 'NOT_AVAILABLE',
    [RaftUpdateEvent.UPDATE_STARTED]: 'STARTED',
    [RaftUpdateEvent.UPDATE_PROGRESS]: 'PROGRESS',
    [RaftUpdateEvent.UPDATE_PROGRESS_FILESYSTEM]: 'PROGRESS_FILESYSTEM',
    [RaftUpdateEvent.UPDATE_FAILED]: 'FAILED',
    [RaftUpdateEvent.UPDATE_SUCCESS_ALL]: 'SUCCESS_ALL',
    [RaftUpdateEvent.UPDATE_SUCCESS_MAIN_ONLY]: 'SUCCESS_MAIN_ONLY',
    [RaftUpdateEvent.UPDATE_CANCELLING]: 'CANCELLING',
    [RaftUpdateEvent.UPDATE_NOT_CONFIGURED]: 'NOT_CONFIGURED',
    [RaftUpdateEvent.UPDATE_RECONNECTED]: 'RECONNECTED',
    [RaftUpdateEvent.UPDATE_DISCONNECTED]: 'DISCONNECTED',
};

export type RaftUpdateEventFn = (
  eventType: RaftUpdateEvent,
  data?: object | string | null,
) => void;
