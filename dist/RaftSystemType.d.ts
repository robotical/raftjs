import RaftSystemUtils from "./RaftSystemUtils";
import { RaftEventFn } from "./RaftTypes";
export type RaftSubscribeForUpdatesCBType = (systemUtils: RaftSystemUtils, enable: boolean) => Promise<void>;
export type RaftStateIsInvalidCBType = () => void;
export type RaftRxOtherMsgType = (payload: Uint8Array, _frameTimeMs: number) => void;
export interface ConnectorOptions {
    wsSuffix?: string;
}
export interface RaftSystemType {
    nameForDialogs: string;
    defaultWiFiHostname: string;
    firmwareDestName: string;
    normalFileDestName: string;
    connectorOptions: ConnectorOptions;
    setup: (systemUtils: RaftSystemUtils, onEvent: RaftEventFn | null) => void;
    subscribeForUpdates: RaftSubscribeForUpdatesCBType | null;
    stateIsInvalid: RaftStateIsInvalidCBType | null;
    rxOtherMsgType: RaftRxOtherMsgType | null;
}
export type RaftGetSystemTypeCBType = (systemUtils: RaftSystemUtils) => Promise<RaftSystemType | null>;
