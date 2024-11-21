import { DeviceTypePollRespMetadata } from "./RaftDeviceInfo";
import { DeviceAttributesState, DeviceTimeline } from "./RaftDeviceStates";
export default class AttributeHandler {
    private _customAttrHandler;
    private POLL_RESULT_TIMESTAMP_SIZE;
    private POLL_RESULT_WRAP_VALUE;
    private POLL_RESULT_RESOLUTION_US;
    processMsgAttrGroup(msgBuffer: Uint8Array, msgBufIdx: number, deviceTimeline: DeviceTimeline, pollRespMetadata: DeviceTypePollRespMetadata, devAttrsState: DeviceAttributesState, maxDataPoints: number): number;
    private processMsgAttribute;
    private signExtend;
    private extractTimestampAndAdvanceIdx;
}
