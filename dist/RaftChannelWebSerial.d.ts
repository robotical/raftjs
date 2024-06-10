import RaftChannel from "./RaftChannel";
import RaftMsgHandler from "./RaftMsgHandler";
import { RaftConnEventFn } from "./RaftConnEvents";
import { ConnectorOptions } from "./RaftSystemType";
export default class RaftChannelWebSerial implements RaftChannel {
    private _raftMsgHandler;
    private _port;
    private _reader?;
    private _isConnected;
    private _connPaused;
    private _serialBuffer;
    private _escapeSeqCode;
    private _OVERASCII_ESCAPE_1;
    private _OVERASCII_ESCAPE_2;
    private _OVERASCII_ESCAPE_3;
    private _OVERASCII_MOD_CODE;
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
    connect(locator: string | object, _connectorOptions: ConnectorOptions): Promise<boolean>;
    disconnect(): Promise<void>;
    pauseConnection(pause: boolean): void;
    private _overasciiDecodeByte;
    private _overasciiEncode;
    _onMsgRx(msg: Uint8Array | null): void;
    sendTxMsg(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    sendTxMsgNoAwait(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    _readLoop(): Promise<void>;
}
