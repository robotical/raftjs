/// <reference types="node" />
import { DeviceTypePollRespMetadata } from "./RaftDeviceInfo";
export default class CustomAttrHandler {
    handleAttr(pollRespMetadata: DeviceTypePollRespMetadata, msgBuffer: Buffer, msgBufIdx: number): number[][];
}
