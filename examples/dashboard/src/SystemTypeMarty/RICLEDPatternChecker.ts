/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RICJS
// Communications Library
//
// Rob Dobson & Chris Greening 2020-2022
// (C) 2020-2022
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { RaftConnEvent, RaftConnEventFn } from '../../../../src/RaftConnEvents';
import RaftLog from '../../../../src/RaftLog';
import RaftMsgHandler from '../../../../src/RaftMsgHandler';
import { RaftOKFail } from '../../../../src/RaftTypes';
import { RICLEDPatternCheckerColour, RICLedLcdColours } from './RICTypes';

export default class RICLEDPatternChecker {

  // LED pattern refresh
  private _ledPatternTimeoutMs = 10000;
  private _ledPatternRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Verification of correct device
  private _ledColours: Array<string> = new Array<string>();
  private _lcdColours: Array<string> = new Array<string>();
  private _bleVerifActive = false;

  // Message handler, etc
  private _msgHandler: RaftMsgHandler | null = null;
  private _onConnEvent: RaftConnEventFn | null = null;
  private _isConnectedFn: () => boolean = () => false;

  /**
   * Start checking correct RIC using LED pattern
   *
   *  @param {RICLedLcdColours} ricLedLcdColours - available colours
   *  @param {RaftMsgHandler} msgHandler - message handler
   *  @param {RaftConnEventFn} onConnEvent - connection event handler
   *  @param {() => boolean} isConnectedFn - function to check if connected
   *  @return boolean - true if started ok
   *
   */
  async checkCorrectRICStart(ricLedLcdColours: RICLedLcdColours, 
          msgHandler: RaftMsgHandler, 
          onConnEvent: RaftConnEventFn,
          isConnectedFn: () => boolean): Promise<boolean> {

    // Store the onConnEvent, etc
    this._msgHandler = msgHandler;
    this._onConnEvent = onConnEvent;
    this._isConnectedFn = isConnectedFn;

    // Set colour pattern checker colours
    const randomColours = this.setupColours(ricLedLcdColours);

    // Start timer to repeat checking LED pattern
    RaftLog.debug(`checkCorrectRICStart: starting LED pattern checker`);
    if (!await this._checkCorrectRICRefreshLEDs()) {
      return false;
    }

    // Event
    onConnEvent(RaftConnEvent.CONN_VERIFYING_CORRECT, randomColours);

    // Start timer to repeat sending of LED pattern
    // This is because RIC's LED pattern override times out after a while
    // so has to be refreshed periodically
    this._ledPatternRefreshTimer = setInterval(async () => {
      RaftLog.verbose(`checkCorrectRICStart: loop`);
      if (!this._checkCorrectRICRefreshLEDs()) {
        RaftLog.debug('checkCorrectRICStart no longer active - clearing timer');
        this._clearLedPatternRefreshTimer();
      }
    }, this._ledPatternTimeoutMs / 2.1);
    return true;
  }

  /**
   *  Stop checking correct RIC
   *  @param {boolean} confirmCorrectRIC - true if user confirmed correct RIC
   *  @return void
   *
   */
  async checkCorrectRICStop(confirmCorrectRIC: boolean): Promise<boolean> {

    // Stop refreshing LED pattern on RIC
    this._clearLedPatternRefreshTimer();

    // Stop the LED pattern checker if connected
    if (this._isConnectedFn()) {
      await this.clearRICColors();
    }

    // Check correct
    if (!confirmCorrectRIC) {
      // Event
      if (this._onConnEvent)
        this._onConnEvent(RaftConnEvent.CONN_REJECTED);
      // Indicate as rejected if we're not connected or if user didn't confirm
      return false;
    }
    // Event
    if (this._onConnEvent)
      this._onConnEvent(RaftConnEvent.CONN_VERIFIED_CORRECT);
    return true;
  }

  /**
   * Refresh LED pattern on RIC
   *
   *  @return boolean - true if checking still active
   *
   */
  async _checkCorrectRICRefreshLEDs(): Promise<boolean> {
    // Check LED pattern is active
    if (!this.isActive()) {
      return false;
    }

    // Check connected
    RaftLog.debug(`_verificationRepeat getting isConnected`);
    if (!this._isConnectedFn()) {
      console.warn('_verificationRepeat not connected');
      return false;
    }

    // Repeat the LED pattern (RIC times out the LED override after ~10 seconds)
    RaftLog.debug(`_verificationRepeat setting pattern`);
    return await this.setRICColors();
  }

  _clearLedPatternRefreshTimer(): void {
    if (this._ledPatternRefreshTimer) {
      clearInterval(this._ledPatternRefreshTimer);
      this._ledPatternRefreshTimer = null;
    }
  }

  isActive(): boolean {
    return this._bleVerifActive;
  }

  clear(): void {
    this._bleVerifActive = false;
  }

  setupColours(availableColors: RICLEDPatternCheckerColour[]): string[] {

    // Check length of available colours
    if (availableColors.length == 0) {
      RaftLog.warn('start no available colours');
    }

    // Random colour selection
    const LED_1 =
      availableColors[Math.floor(Math.random() * availableColors.length)];
    const LED_2 =
      availableColors[Math.floor(Math.random() * availableColors.length)];
    const LED_3 =
      availableColors[Math.floor(Math.random() * availableColors.length)];

    // LED and LCD colours are different to attempt to be visually similar
    this._ledColours = [LED_1.led, LED_2.led, LED_3.led];
    this._lcdColours = [LED_1.lcd, LED_2.lcd, LED_3.lcd];

    // Set the colours to display on LEDs
    this._bleVerifActive = true;

    // Return LCD colours to display
    return this._lcdColours;
  }

  async setRICColors(): Promise<boolean> {
    // Set bonding colours
    let colourSetStr = '';
    for (let i = 0; i < this._ledColours.length; i++) {
      if (i != 0) {
        colourSetStr += '&';
      }
      let colr = this._ledColours[i];
      if (colr.startsWith('#')) colr = colr.slice(1);
      colourSetStr += `c${i}=${colr}`;
    }
    try {
      RaftLog.debug('setRICColors setting colours');
      if (this._msgHandler) {
        await this._msgHandler.sendRICRESTURL<RaftOKFail>(`indicator/set?${colourSetStr}&ms=${this._ledPatternTimeoutMs}`);
      }
    } catch (error) {
      RaftLog.debug(`setRICColors failed to send ${error}`);
      return false;
    }
    return true;
  }

  async clearRICColors(): Promise<void> {
    // Clear the LED colours
    RaftLog.debug('clearRICColors');
    try {
      if (this._msgHandler) {
        await this._msgHandler.sendRICRESTURL<RaftOKFail>(`indicator/resume`);
      }
    } catch (error) {
      RaftLog.debug(`clearRICColors failed to send ${error}`);
    }
  }
}
