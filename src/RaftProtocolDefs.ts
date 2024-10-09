/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// Raft Protocol Definitions
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// RIC Protocols
export const RICSERIAL_MSG_NUM_POS = 0;
export const RICSERIAL_PROTOCOL_POS = 1;
export const RICSERIAL_PAYLOAD_POS = 2;
export const RICREST_REST_ELEM_CODE_POS = 0;
export const RICREST_HEADER_PAYLOAD_POS = 1;
export const RICREST_FILEBLOCK_CHANNEL_POS = 0;
export const RICREST_FILEBLOCK_FILEPOS_POS = 0;
export const RICREST_FILEBLOCK_FILEPOS_POS_BYTES = 4;
export const RICREST_FILEBLOCK_PAYLOAD_POS = 4;
export const RICREST_BRIDGE_ID_POS = 2;
export const RICREST_BRIDGE_PAYLOAD_POS = 3;

// Protocol enums
export enum RICRESTElemCode {
  RICREST_ELEM_CODE_URL,
  RICREST_ELEM_CODE_CMDRESPJSON,
  RICREST_ELEM_CODE_BODY,
  RICREST_ELEM_CODE_COMMAND_FRAME,
  RICREST_ELEM_CODE_FILEBLOCK,
}

export enum RaftCommsMsgTypeCode {
  MSG_TYPE_COMMAND,
  MSG_TYPE_RESPONSE,
  MSG_TYPE_PUBLISH,
  MSG_TYPE_REPORT,
}

export enum RaftCommsMsgProtocol {
  MSG_PROTOCOL_ROSSERIAL = 0,
  MSG_PROTOCOL_RESERVED_1 = 1,
  MSG_PROTOCOL_RICREST = 2,
  MSG_PROTOCOL_BRIDGE_RICREST = 3,
}

