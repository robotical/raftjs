export declare class RaftMsgTrackInfo {
    static readonly MAX_MSG_NUM = 255;
    static readonly MSG_RESPONSE_TIMEOUT_MS = 2000;
    static readonly MSG_RETRY_COUNT = 5;
    msgOutstanding: boolean;
    msgFrame: Uint8Array;
    msgSentMs: number;
    retryCount: number;
    withResponse: boolean;
    bridgeID: number | undefined;
    msgHandle: number;
    msgTimeoutMs: number | undefined;
    resolve: unknown;
    reject: unknown;
    constructor();
    set(msgOutstanding: boolean, msgFrame: Uint8Array, withResponse: boolean, bridgeID: number | undefined, msgHandle: number, msgTimeoutMs: number | undefined, resolve: unknown, reject: unknown): void;
}
