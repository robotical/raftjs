export default class RaftMiniHDLC {
    private rxState;
    private rxBuffer;
    private onRxFrame;
    private frameCRC;
    private readonly FRAME_BOUNDARY_OCTET;
    private readonly CONTROL_ESCAPE_OCTET;
    private readonly INVERT_OCTET;
    private frameStartTimeMs;
    constructor();
    setOnRxFrame(onRxFrame: (rxFrame: Uint8Array, frameTimeMs: number) => void): void;
    addRxByte(rxByte: number): void;
    addRxBytes(rxBytes: Uint8Array): void;
    _checkCRC(): boolean;
    static crc16(buf: Array<number> | Uint8Array): number;
    encode(content: Uint8Array): Uint8Array;
    _setData(destBuf: Uint8Array, dataVal: number, pos: number): number;
}
