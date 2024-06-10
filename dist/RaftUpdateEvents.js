"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftUpdateEvents
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftUpdateEventNames = exports.RaftUpdateEvent = void 0;
var RaftUpdateEvent;
(function (RaftUpdateEvent) {
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_CANT_REACH_SERVER"] = 0] = "UPDATE_CANT_REACH_SERVER";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_APP_UPDATE_REQUIRED"] = 1] = "UPDATE_APP_UPDATE_REQUIRED";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_IS_AVAILABLE"] = 2] = "UPDATE_IS_AVAILABLE";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_NOT_AVAILABLE"] = 3] = "UPDATE_NOT_AVAILABLE";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_STARTED"] = 4] = "UPDATE_STARTED";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_PROGRESS"] = 5] = "UPDATE_PROGRESS";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_PROGRESS_FILESYSTEM"] = 6] = "UPDATE_PROGRESS_FILESYSTEM";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_FAILED"] = 7] = "UPDATE_FAILED";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_SUCCESS_ALL"] = 8] = "UPDATE_SUCCESS_ALL";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_SUCCESS_MAIN_ONLY"] = 9] = "UPDATE_SUCCESS_MAIN_ONLY";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_CANCELLING"] = 10] = "UPDATE_CANCELLING";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_NOT_CONFIGURED"] = 11] = "UPDATE_NOT_CONFIGURED";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_RECONNECTED"] = 12] = "UPDATE_RECONNECTED";
    RaftUpdateEvent[RaftUpdateEvent["UPDATE_DISCONNECTED"] = 13] = "UPDATE_DISCONNECTED";
})(RaftUpdateEvent || (exports.RaftUpdateEvent = RaftUpdateEvent = {}));
exports.RaftUpdateEventNames = {
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
//# sourceMappingURL=RaftUpdateEvents.js.map