export type RICLEDPatternCheckerColour = {
    led: string;
    lcd: string;
  }

  export type RICLedLcdColours = Array<RICLEDPatternCheckerColour>;

  export type RICServoFaultFlags = {
    intermittentConnection: boolean,
    noConnection: boolean,
    faultyConnection: boolean,
    servoHornPositionError: boolean
  };

  export class RICCalibInfo {
    rslt = '';
    calDone = 0;
    validMs?= 0;
  }
  