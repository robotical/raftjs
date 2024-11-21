import { DeviceTypePollRespMetadata } from "./RaftDeviceInfo";
export default class CustomAttrHandler {
    handleAttr(pollRespMetadata: DeviceTypePollRespMetadata, msgBuffer: Uint8Array, msgBufIdx: number): number[][];
}
