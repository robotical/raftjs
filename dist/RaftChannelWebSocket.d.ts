import RaftChannel from "./RaftChannel";
import RaftMsgHandler from "./RaftMsgHandler";
import { RaftConnEventFn } from "./RaftConnEvents";
import { ConnectorOptions } from "./RaftSystemType";
export default class RaftChannelWebSocket implements RaftChannel {
    private _raftMsgHandler;
    private _webSocket;
    private _isConnected;
    private _onConnEvent;
    private _requestedBatchAckSize;
    private _requestedFileBlockSize;
    fhBatchAckSize(): number;
    fhFileBlockSize(): number;
    isConnected(): boolean;
    setMsgHandler(raftMsgHandler: RaftMsgHandler): void;
    requiresSubscription(): boolean;
    ricRestCmdBeforeDisconnect(): string | null;
    setOnConnEvent(connEventFn: RaftConnEventFn): void;
    getConnectedLocator(): string | object;
    connect(locator: string | object, connectorOptions: ConnectorOptions): Promise<boolean>;
    disconnect(): Promise<void>;
    pauseConnection(pause: boolean): void;
    _onMsgRx(msg: Uint8Array | null): void;
    sendTxMsg(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    sendTxMsgNoAwait(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    _wsConnect(locator: string | object): Promise<boolean>;
    private _webSocketOpen;
}
