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

export default interface RaftChannel
{
    isConnected(): boolean;
    connect(locator: string | object): Promise<boolean>;
    disconnect(): Promise<void>;
    getConnectedLocator(): string | object;
    setOnConnEvent(connEventFn: RaftConnEventFn): void;
    setMsgHandler(raftMsgHandler: RaftMsgHandler): void;
    sendTxMsg(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    sendTxMsgNoAwait(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    requiresSubscription(): boolean;
    ricRestCmdBeforeDisconnect(): string | null;
    fhBatchAckSize(): number;
    fhFileBlockSize(): number;
    pauseConnection(pause: boolean): void;
}