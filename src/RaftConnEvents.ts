/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftConnEvents
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export enum RaftConnEvent {
    CONN_CONNECTING,
    CONN_CONNECTED,
    CONN_CONNECTION_FAILED,
    CONN_DISCONNECTED,
    CONN_REJECTED,
    CONN_ISSUE_DETECTED,
    CONN_ISSUE_RESOLVED,
    CONN_VERIFYING_CORRECT,
    CONN_VERIFIED_CORRECT,
    CONN_GETTING_INFO,
    CONN_GOT_INFO,
    CONN_BLUETOOTH_STATE,
    CONN_STREAMING_ISSUE
}

export const RaftConnEventNames = {
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
  
export type RaftConnEventFn = (
  eventType: RaftConnEvent,
  data?: string[] | string | null,
) => void;
