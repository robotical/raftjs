export declare enum RaftUpdateEvent {
    UPDATE_CANT_REACH_SERVER = 0,
    UPDATE_APP_UPDATE_REQUIRED = 1,
    UPDATE_IS_AVAILABLE = 2,
    UPDATE_NOT_AVAILABLE = 3,
    UPDATE_STARTED = 4,
    UPDATE_PROGRESS = 5,
    UPDATE_PROGRESS_FILESYSTEM = 6,
    UPDATE_FAILED = 7,
    UPDATE_SUCCESS_ALL = 8,
    UPDATE_SUCCESS_MAIN_ONLY = 9,
    UPDATE_CANCELLING = 10,
    UPDATE_NOT_CONFIGURED = 11,
    UPDATE_RECONNECTED = 12,
    UPDATE_DISCONNECTED = 13
}
export declare const RaftUpdateEventNames: {
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
    13: string;
};
export type RaftUpdateEventFn = (eventType: RaftUpdateEvent, data?: object | string | null) => void;
