export declare function getAttrTypeBits(attrType: string): number;
export declare function isAttrTypeSigned(attrType: string): boolean;
export declare function decodeAttrUnitsEncoding(unitsEncoding: string): string;
export interface DeviceTypeAttribute {
    n: string;
    t: string;
    at?: number;
    u?: string;
    r?: number[];
    x?: number;
    m?: number | string;
    s?: number;
    sb?: number;
    ss?: number;
    d?: number;
    a?: number;
    f?: string;
    o?: string;
    v?: boolean | number;
    vs?: boolean | number;
    vf?: boolean | number;
}
export interface CustomFunctionDefinition {
    n: string;
    c: string;
}
export interface DeviceTypePollRespMetadata {
    b: number;
    a: DeviceTypeAttribute[];
    c?: CustomFunctionDefinition;
    us?: number;
}
export interface DeviceTypeAction {
    n: string;
    t?: string;
    w: string;
    r?: number[];
    f?: string;
    NX?: number;
    NY?: number;
    concat?: boolean;
    d?: number;
}
export interface DeviceTypeInfo {
    name: string;
    desc: string;
    manu: string;
    type: string;
    resp?: DeviceTypePollRespMetadata;
    actions?: DeviceTypeAction[];
}
export interface DeviceTypeInfoRecs {
    [devType: string]: DeviceTypeInfo;
}
export type RaftDevTypeInfoResponse = {
    req: string;
    rslt: string;
    devinfo: DeviceTypeInfo;
};
