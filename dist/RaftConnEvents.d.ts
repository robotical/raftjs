export declare enum RaftConnEvent {
    CONN_CONNECTING = 0,
    CONN_CONNECTED = 1,
    CONN_CONNECTION_FAILED = 2,
    CONN_DISCONNECTED = 3,
    CONN_REJECTED = 4,
    CONN_ISSUE_DETECTED = 5,
    CONN_ISSUE_RESOLVED = 6,
    CONN_VERIFYING_CORRECT = 7,
    CONN_VERIFIED_CORRECT = 8,
    CONN_GETTING_INFO = 9,
    CONN_GOT_INFO = 10,
    CONN_BLUETOOTH_STATE = 11,
    CONN_STREAMING_ISSUE = 12
}
export declare const RaftConnEventNames: {
    0: string;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
    12: string;
};
export type RaftConnEventFn = (eventType: RaftConnEvent, data?: string[] | string | null) => void;
