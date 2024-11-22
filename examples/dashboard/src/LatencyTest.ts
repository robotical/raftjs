import { mean, standardDeviation } from 'simple-statistics';
import { DeviceAttributeState } from '../../../src/RaftDeviceStates';

class LatencyTest {
  private static instance: LatencyTest;

  private lastWhiteTime: number | null = null;
  private lastBlackTime: number | null = null;
  private lastAmb0Value: number | null = null;

  private latencyRecords: { type: 'white' | 'black'; latency: number }[] = [];
  private lastTriggerIndex: number = -10;
  private sampleCounter: number = 0;

  private constructor(private abruptChangeThreshold = 100) { }

  // Singleton access
  static getInstance(): LatencyTest {
    if (!LatencyTest.instance) {
      LatencyTest.instance = new LatencyTest();
    }
    return LatencyTest.instance;
  }

  // Record color change time
  recordColorChange(color: 'white' | 'black', timestamp: number): void {
    if (color === 'white') {
      this.lastWhiteTime = timestamp;
    } else if (color === 'black') {
      this.lastBlackTime = timestamp;
    }
    // console.log(`Color change recorded: ${color} at ${timestamp}`);
  }

  // Process values
  processAttrValues(attribute: DeviceAttributeState, timestamp: number): void {
    for (let i = 0; i < attribute.numNewValues; i++) {

      // console.log(`New value: ${newValue} prev value: ${this.lastAmb0Value}`);
      const newValue = attribute.values[attribute.values.length - attribute.numNewValues + i];
      if (this.lastAmb0Value === null) {
        this.lastAmb0Value = newValue;
        return;
      }
      this.sampleCounter++;

      const change = newValue - this.lastAmb0Value;

      console.log(
        `[${new Date().toISOString()}] ${newValue} ${this.lastAmb0Value} ${change} ${Math.abs(change)} ${this.abruptChangeThreshold} ${Math.abs(change) >= this.abruptChangeThreshold} ${this.sampleCounter} ${this.lastTriggerIndex}`
      );

      // Detect abrupt change with threshold
      if (
        Math.abs(change) >= this.abruptChangeThreshold &&
        this.sampleCounter - this.lastTriggerIndex >= 4
      ) {
        const eventType = change > 0 ? 'white' : 'black';
        const relatedTime =
          eventType === 'white' ? this.lastWhiteTime : this.lastBlackTime;

        if (relatedTime !== null) {
          const latency = timestamp - relatedTime;
          this.latencyRecords.push({ type: eventType, latency });
          this.lastTriggerIndex = this.sampleCounter; // Update the last trigger index

          console.log(
            `[${new Date().toISOString()}] Triggered: ${eventType} change ${change} detected. Latency = ${latency} ms`
          );

        }
      }

      // // Detect abrupt rise or fall
      // if (Math.abs(change) >= this.abruptChangeThreshold) {
      //   const eventType = change > 0 ? 'white' : 'black';
      //   const relatedTime = eventType === 'white' ? this.lastWhiteTime : this.lastBlackTime;

      //   if (relatedTime !== null) {
      //     const latency = timestamp - relatedTime;
      //     this.latencyRecords.push({ type: eventType, latency });
      //     console.log(
      //       `[${new Date().toISOString()}] ${newValue} ${this.lastAmb0Value} Latency recorded: ${eventType} change ${change} detected, latency = ${latency} ms`
      //     );
      //   }
      // }

      // Update last value
      this.lastAmb0Value = newValue;
    }
  }

  // Get latency stats
  getLatencyStats(): {
    meanLatency: number | null;
    stdDevLatency: number | null;
    records: { type: 'white' | 'black'; latency: number }[];
  } {
    if (this.latencyRecords.length === 0) {
      return {
        meanLatency: null,
        stdDevLatency: null,
        records: [],
      };
    }

    const latencies = this.latencyRecords.map((record) => record.latency);
    const meanLatency = mean(latencies);
    const stdDevLatency = standardDeviation(latencies);

    return {
      meanLatency,
      stdDevLatency,
      records: this.latencyRecords,
    };
  }
}

export default LatencyTest;
