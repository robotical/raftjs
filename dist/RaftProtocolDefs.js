"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Raft Protocol Definitions
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftCommsMsgProtocol = exports.RaftCommsMsgTypeCode = exports.RICRESTElemCode = exports.RICREST_BRIDGE_PAYLOAD_POS = exports.RICREST_BRIDGE_ID_POS = exports.RICREST_FILEBLOCK_PAYLOAD_POS = exports.RICREST_FILEBLOCK_FILEPOS_POS_BYTES = exports.RICREST_FILEBLOCK_FILEPOS_POS = exports.RICREST_FILEBLOCK_CHANNEL_POS = exports.RICREST_HEADER_PAYLOAD_POS = exports.RICREST_REST_ELEM_CODE_POS = exports.RICSERIAL_PAYLOAD_POS = exports.RICSERIAL_PROTOCOL_POS = exports.RICSERIAL_MSG_NUM_POS = void 0;
// RIC Protocols
exports.RICSERIAL_MSG_NUM_POS = 0;
exports.RICSERIAL_PROTOCOL_POS = 1;
exports.RICSERIAL_PAYLOAD_POS = 2;
exports.RICREST_REST_ELEM_CODE_POS = 0;
exports.RICREST_HEADER_PAYLOAD_POS = 1;
exports.RICREST_FILEBLOCK_CHANNEL_POS = 0;
exports.RICREST_FILEBLOCK_FILEPOS_POS = 0;
exports.RICREST_FILEBLOCK_FILEPOS_POS_BYTES = 4;
exports.RICREST_FILEBLOCK_PAYLOAD_POS = 4;
exports.RICREST_BRIDGE_ID_POS = 2;
exports.RICREST_BRIDGE_PAYLOAD_POS = 3;
// Protocol enums
var RICRESTElemCode;
(function (RICRESTElemCode) {
    RICRESTElemCode[RICRESTElemCode["RICREST_ELEM_CODE_URL"] = 0] = "RICREST_ELEM_CODE_URL";
    RICRESTElemCode[RICRESTElemCode["RICREST_ELEM_CODE_CMDRESPJSON"] = 1] = "RICREST_ELEM_CODE_CMDRESPJSON";
    RICRESTElemCode[RICRESTElemCode["RICREST_ELEM_CODE_BODY"] = 2] = "RICREST_ELEM_CODE_BODY";
    RICRESTElemCode[RICRESTElemCode["RICREST_ELEM_CODE_COMMAND_FRAME"] = 3] = "RICREST_ELEM_CODE_COMMAND_FRAME";
    RICRESTElemCode[RICRESTElemCode["RICREST_ELEM_CODE_FILEBLOCK"] = 4] = "RICREST_ELEM_CODE_FILEBLOCK";
})(RICRESTElemCode || (exports.RICRESTElemCode = RICRESTElemCode = {}));
var RaftCommsMsgTypeCode;
(function (RaftCommsMsgTypeCode) {
    RaftCommsMsgTypeCode[RaftCommsMsgTypeCode["MSG_TYPE_COMMAND"] = 0] = "MSG_TYPE_COMMAND";
    RaftCommsMsgTypeCode[RaftCommsMsgTypeCode["MSG_TYPE_RESPONSE"] = 1] = "MSG_TYPE_RESPONSE";
    RaftCommsMsgTypeCode[RaftCommsMsgTypeCode["MSG_TYPE_PUBLISH"] = 2] = "MSG_TYPE_PUBLISH";
    RaftCommsMsgTypeCode[RaftCommsMsgTypeCode["MSG_TYPE_REPORT"] = 3] = "MSG_TYPE_REPORT";
})(RaftCommsMsgTypeCode || (exports.RaftCommsMsgTypeCode = RaftCommsMsgTypeCode = {}));
var RaftCommsMsgProtocol;
(function (RaftCommsMsgProtocol) {
    RaftCommsMsgProtocol[RaftCommsMsgProtocol["MSG_PROTOCOL_ROSSERIAL"] = 0] = "MSG_PROTOCOL_ROSSERIAL";
    RaftCommsMsgProtocol[RaftCommsMsgProtocol["MSG_PROTOCOL_RESERVED_1"] = 1] = "MSG_PROTOCOL_RESERVED_1";
    RaftCommsMsgProtocol[RaftCommsMsgProtocol["MSG_PROTOCOL_RICREST"] = 2] = "MSG_PROTOCOL_RICREST";
    RaftCommsMsgProtocol[RaftCommsMsgProtocol["MSG_PROTOCOL_BRIDGE_RICREST"] = 3] = "MSG_PROTOCOL_BRIDGE_RICREST";
})(RaftCommsMsgProtocol || (exports.RaftCommsMsgProtocol = RaftCommsMsgProtocol = {}));
//# sourceMappingURL=RaftProtocolDefs.js.map