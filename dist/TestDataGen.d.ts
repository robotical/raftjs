declare class TestDataGen {
    start(handleDeviceMsgJson: (msg: string) => void): void;
    private toHex;
    private randInt;
    private onlineFrom;
}
export default TestDataGen;
