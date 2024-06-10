export declare const RICSERIAL_MSG_NUM_POS = 0;
export declare const RICSERIAL_PROTOCOL_POS = 1;
export declare const RICSERIAL_PAYLOAD_POS = 2;
export declare const RICREST_REST_ELEM_CODE_POS = 0;
export declare const RICREST_HEADER_PAYLOAD_POS = 1;
export declare const RICREST_FILEBLOCK_CHANNEL_POS = 0;
export declare const RICREST_FILEBLOCK_FILEPOS_POS = 0;
export declare const RICREST_FILEBLOCK_FILEPOS_POS_BYTES = 4;
export declare const RICREST_FILEBLOCK_PAYLOAD_POS = 4;
export declare const RICREST_BRIDGE_ID_POS = 2;
export declare const RICREST_BRIDGE_PAYLOAD_POS = 3;
export declare enum RICRESTElemCode {
    RICREST_ELEM_CODE_URL = 0,
    RICREST_ELEM_CODE_CMDRESPJSON = 1,
    RICREST_ELEM_CODE_BODY = 2,
    RICREST_ELEM_CODE_COMMAND_FRAME = 3,
    RICREST_ELEM_CODE_FILEBLOCK = 4
}
export declare enum RaftCommsMsgTypeCode {
    MSG_TYPE_COMMAND = 0,
    MSG_TYPE_RESPONSE = 1,
    MSG_TYPE_PUBLISH = 2,
    MSG_TYPE_REPORT = 3
}
export declare enum RaftCommsMsgProtocol {
    MSG_PROTOCOL_ROSSERIAL = 0,
    MSG_PROTOCOL_RESERVED_1 = 1,
    MSG_PROTOCOL_RICREST = 2,
    MSG_PROTOCOL_BRIDGE_RICREST = 3
}
