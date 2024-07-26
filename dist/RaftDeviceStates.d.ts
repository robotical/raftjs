import { DeviceTypeInfo } from "./RaftDeviceInfo";
export declare function deviceAttrGetLatestFormatted(attrState: DeviceAttributeState): string;
export interface DeviceAttributeState {
    name: string;
    newAttribute: boolean;
    newData: boolean;
    values: number[];
    units: string;
    range: number[];
    format: string;
    visibleSeries: boolean;
    visibleForm: boolean;
}
export interface DeviceAttributesState {
    [attributeName: string]: DeviceAttributeState;
}
export interface DeviceTimeline {
    timestampsUs: number[];
    lastReportTimestampUs: number;
    reportTimestampOffsetUs: number;
}
export interface DeviceState {
    deviceTypeInfo: DeviceTypeInfo;
    deviceTimeline: DeviceTimeline;
    deviceAttributes: DeviceAttributesState;
    deviceIsNew: boolean;
    stateChanged: boolean;
    isOnline: boolean;
}
export declare class DevicesState {
    [deviceKey: string]: DeviceState;
}
export declare function getDeviceKey(busName: string, devAddr: string): string;
