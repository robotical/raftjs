/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftChannel
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { RaftConnEventFn } from "./RaftConnEvents";
import RaftMsgHandler from "./RaftMsgHandler";
import { ConnectorOptions } from "./RaftSystemType";

export default interface RaftChannel
{
    isConnected(): boolean;
    connect(locator: string | object, connectorOptions: ConnectorOptions): Promise<boolean>;
    disconnect(): Promise<void>;
    getConnectedLocator(): string | object;
    setOnConnEvent(connEventFn: RaftConnEventFn): void;
    setMsgHandler(raftMsgHandler: RaftMsgHandler): void;
    sendTxMsg(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    sendTxMsgNoAwait(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    sendTxMsgRaw(msg: string): boolean;
    sendTxMsgRawAndWaitForReply<T>(msgPayload: Uint8Array): T;
    requiresSubscription(): boolean;
    ricRestCmdBeforeDisconnect(): string | null;
    fhBatchAckSize(): number;
    fhFileBlockSize(): number;
    pauseConnection(pause: boolean): void;
}