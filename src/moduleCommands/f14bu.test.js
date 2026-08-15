import f14bu from "./f14bu";
import f14buTransfer, {
  requestAbortF14BUTransfer,
} from "../moduleTransfers/f14buTransfer";

const wp = (lat, latHem, long, longHem, name) => ({
  lat,
  latHem,
  long,
  longHem,
  name,
});

const activePresses = (commands) =>
  commands.filter((c) => c.activate === 1).map((c) => c.code);

const fourWaypoints = [
  wp("0000.000", "N", "00000.000", "E", "A"),
  wp("0001.000", "N", "00000.000", "E", "B"),
  wp("0002.000", "N", "00000.000", "E", "C"),
  wp("0003.000", "N", "00000.000", "E", "D"),
];

const sixWaypoints = [
  ...fourWaypoints,
  wp("0004.000", "N", "00000.000", "E", "E"),
  wp("0005.000", "N", "00000.000", "E", "F"),
];

describe("f14bu DMM scratchpad", () => {
  test("joins hemisphere + ddmm.mmm + hemisphere + dddmm.mmm with no separators", () => {
    expect(
      f14bu.coordinateOf(wp("4358.257", "N", "10700.347", "W")),
    ).toBe("N4358.257W10700.347");
  });
});

describe("f14bu CDNU insert-before-active (LSK2)", () => {
  test("opens FPLN, holds CLR, types DMM, then LSK2", () => {
    const commands = f14bu.createButtonCommands([
      wp("4358.257", "N", "10700.347", "W", "A"),
    ]);
    const presses = activePresses(commands);

    expect(presses[0]).toBe(3056); // FPLN
    expect(presses[1]).toBe(3054); // CLR
    expect(presses.slice(2, 21)).toEqual([
      3024, 3005, 3004, 3006, 3009, 3049, 3003, 3006, 3008, 3033, 3002, 3001,
      3008, 3001, 3001, 3049, 3004, 3005, 3008,
    ]);
    expect(presses[21]).toBe(3061); // LSK2 — active waypoint / End, not CRS or OFFSET
    expect(presses).not.toContain(3058);
    expect(presses).not.toContain(3063);
  });

  test("CLR hold is longer than a character key so the scratchpad clears", () => {
    const clr = f14bu.buildCoordinateEntryCommands(
      wp("4358.257", "N", "10700.347", "W"),
    )[0];
    expect(clr.code).toBe(3054);
    expect(clr.activate).toBe(1);
    expect(clr.delay).toBe(250);
  });

  test("inserts last TheWay point first so LSK2 prepends into 51, 52, … order", () => {
    const presses = activePresses(
      f14bu.createButtonCommands([
        wp("4358.257", "N", "10700.347", "W"),
        wp("2939.977", "N", "05324.062", "E"),
      ]),
    );
    const lskPresses = presses.filter((c) => c >= 3060 && c <= 3063);
    expect(lskPresses).toEqual([3061, 3061]);
    expect(presses.filter((c) => c === 3056).length).toBe(2);
    expect(presses).not.toContain(3046);
    // First typed coordinate is the second TheWay point (N2939.977…)
    const firstN = presses.indexOf(3024);
    expect(presses.slice(firstN, firstN + 9)).toEqual([
      3024, 3003, 3010, 3004, 3010, 3049, 3010, 3008, 3008,
    ]);
  });

  test("never uses ↓, LSK4, or Compact keys", () => {
    const presses = activePresses(f14bu.createButtonCommands(fourWaypoints));
    const lskPresses = presses.filter((c) => c >= 3060 && c <= 3063);
    expect(lskPresses).toEqual([3061, 3061, 3061, 3061]);
    expect(presses).not.toContain(3046);
    expect(presses).not.toContain(3063);
    expect(presses.filter((c) => c === 3056).length).toBe(4);
    expect(presses.some((c) => c >= 3064 && c <= 3067)).toBe(false);
  });

  test("six waypoints each get an LSK2 insert", () => {
    const presses = activePresses(f14bu.createButtonCommands(sixWaypoints));
    const lskPresses = presses.filter((c) => c >= 3060 && c <= 3063);
    expect(lskPresses).toEqual([3061, 3061, 3061, 3061, 3061, 3061]);
    expect(presses).not.toContain(3046);
  });
});

describe("f14buTransfer serializes reverse LSK2 inserts", () => {
  const mockIpc = () => {
    const sent = [];
    let busy = false;
    Object.defineProperty(window, "__thewayBusy", {
      configurable: true,
      get: () => busy,
    });
    return {
      sent,
      ipcRenderer: {
        send: (_channel, msg) => {
          sent.push(msg.payload);
          busy = true;
          setTimeout(() => {
            busy = false;
          }, 5);
        },
      },
    };
  };

  test("ground inserts WP6 then WP1, always LSK2, never arrows", async () => {
    const { sent, ipcRenderer } = mockIpc();

    await f14buTransfer({
      module: "F-14BU_GROUND",
      moduleWaypoints: sixWaypoints,
      buttonExtraDelay: 0,
      ipcRenderer,
      setRunning: () => {},
    });

    expect(sent.length).toBe(18); // 6 × (FPLN + type + LSK2)
    const log = f14bu.getLastTransferLog().join("\n");
    expect(log).toContain("[F14BU] RECEIVED WAYPOINTS = 6");
    expect(log).toContain("[F14BU] Flight state = GROUND");
    expect(log).toContain("[F14BU] Mode = F14BU_GROUND");
    expect(log).toContain("[F14BU] Confirmation required = FALSE");
    expect(log).toContain("[F14BU] Transfer complete: 6 == 6 == 6");
    expect(log).not.toContain("Confirmation sent");
    expect(log.indexOf("WP6 START")).toBeLessThan(log.indexOf("WP1 START"));

    const lskCodes = sent
      .flatMap((batch) =>
        batch.filter((c) => c.activate === 1 && c.code >= 3060 && c.code <= 3063),
      )
      .map((c) => c.code);
    expect(lskCodes).toEqual([3061, 3061, 3061, 3061, 3061, 3061]);
    expect(sent.some((batch) => batch.some((c) => c.code === 3046))).toBe(
      false,
    );
  });

  test("airborne sends a second confirmation LSK2 after each insert", async () => {
    const { sent, ipcRenderer } = mockIpc();

    await f14buTransfer({
      module: "F-14BU_AIRBORNE",
      moduleWaypoints: fourWaypoints,
      buttonExtraDelay: 0,
      ipcRenderer,
      setRunning: () => {},
    });

    expect(sent.length).toBe(16); // 4 × (FPLN + type + LSK + confirm)
    const log = f14bu.getLastTransferLog().join("\n");
    expect(log).toContain("[F14BU] Mode = F14BU_AIRBORNE");
    expect(log).toContain("[F14BU] Confirmation required = TRUE");
    expect(log).toContain("[F14BU] Confirmation sent");
  });

  test("Button Delay is added to key holds", async () => {
    const { sent, ipcRenderer } = mockIpc();

    await f14buTransfer({
      module: "F-14BU_GROUND",
      moduleWaypoints: fourWaypoints,
      buttonExtraDelay: 40,
      ipcRenderer,
      setRunning: () => {},
    });

    expect(sent[0].every((c) => c.delay >= 40)).toBe(true);
    expect(sent[1][0].delay).toBe(250 + 40); // CLR hold + Button Delay
  });

  test("abort stops before later waypoints", async () => {
    let sends = 0;
    const ipcRenderer = {
      send: () => {
        sends += 1;
        requestAbortF14BUTransfer();
      },
    };
    await f14buTransfer({
      module: "F-14BU_GROUND",
      moduleWaypoints: fourWaypoints,
      buttonExtraDelay: 0,
      ipcRenderer,
      setRunning: () => {},
    });
    expect(sends).toBe(1);
  });
});
