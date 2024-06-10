"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftConnEvents
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftConnEventNames = exports.RaftConnEvent = void 0;
var RaftConnEvent;
(function (RaftConnEvent) {
    RaftConnEvent[RaftConnEvent["CONN_CONNECTING"] = 0] = "CONN_CONNECTING";
    RaftConnEvent[RaftConnEvent["CONN_CONNECTED"] = 1] = "CONN_CONNECTED";
    RaftConnEvent[RaftConnEvent["CONN_CONNECTION_FAILED"] = 2] = "CONN_CONNECTION_FAILED";
    RaftConnEvent[RaftConnEvent["CONN_DISCONNECTED"] = 3] = "CONN_DISCONNECTED";
    RaftConnEvent[RaftConnEvent["CONN_REJECTED"] = 4] = "CONN_REJECTED";
    RaftConnEvent[RaftConnEvent["CONN_ISSUE_DETECTED"] = 5] = "CONN_ISSUE_DETECTED";
    RaftConnEvent[RaftConnEvent["CONN_ISSUE_RESOLVED"] = 6] = "CONN_ISSUE_RESOLVED";
    RaftConnEvent[RaftConnEvent["CONN_VERIFYING_CORRECT"] = 7] = "CONN_VERIFYING_CORRECT";
    RaftConnEvent[RaftConnEvent["CONN_VERIFIED_CORRECT"] = 8] = "CONN_VERIFIED_CORRECT";
    RaftConnEvent[RaftConnEvent["CONN_GETTING_INFO"] = 9] = "CONN_GETTING_INFO";
    RaftConnEvent[RaftConnEvent["CONN_GOT_INFO"] = 10] = "CONN_GOT_INFO";
    RaftConnEvent[RaftConnEvent["CONN_BLUETOOTH_STATE"] = 11] = "CONN_BLUETOOTH_STATE";
    RaftConnEvent[RaftConnEvent["CONN_STREAMING_ISSUE"] = 12] = "CONN_STREAMING_ISSUE";
})(RaftConnEvent || (exports.RaftConnEvent = RaftConnEvent = {}));
exports.RaftConnEventNames = {
    [RaftConnEvent.CONN_CONNECTING]: 'CONNECTING',
    [RaftConnEvent.CONN_CONNECTED]: 'CONNECTED',
    [RaftConnEvent.CONN_CONNECTION_FAILED]: 'CONNECTION_FAILED',
    [RaftConnEvent.CONN_DISCONNECTED]: 'DISCONNECTED',
    [RaftConnEvent.CONN_REJECTED]: 'REJECTED',
    [RaftConnEvent.CONN_ISSUE_DETECTED]: 'ISSUE_DETECTED',
    [RaftConnEvent.CONN_ISSUE_RESOLVED]: 'ISSUE_RESOLVED',
    [RaftConnEvent.CONN_VERIFYING_CORRECT]: 'VERIFYING_CORRECT',
    [RaftConnEvent.CONN_VERIFIED_CORRECT]: 'VERIFIED_CORRECT',
    [RaftConnEvent.CONN_GETTING_INFO]: 'GETTING_INFO',
    [RaftConnEvent.CONN_GOT_INFO]: 'GOT_INFO',
    [RaftConnEvent.CONN_BLUETOOTH_STATE]: 'BLUETOOTH_STATE',
    [RaftConnEvent.CONN_STREAMING_ISSUE]: 'STREAMING_ISSUE',
};
//# sourceMappingURL=RaftConnEvents.js.map