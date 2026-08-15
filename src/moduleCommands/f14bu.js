class f14bu {
  static extraDelay = 0;

  static #device = 81; // Heatblur F-14B(U) devices.CDNU (C-12284/A)

  static #keys = {
    0: 3001,
    1: 3002,
    2: 3003,
    3: 3004,
    4: 3005,
    5: 3006,
    6: 3007,
    7: 3008,
    8: 3009,
    9: 3010,
    e: 3015,
    n: 3024,
    s: 3029,
    w: 3033,
    ".": 3049,
  };

  static #CLR = 3054;
  static #FPLN = 3056;
  static #LSK = [3060, 3061, 3062, 3063]; // left LSK1..LSK4 only

  // FPLN active page (Heatblur): LSK1=CRS, LSK2=active waypoint,
  // LSK3=altitude/PTA, LSK4=OFFSET. Never press LSK4 on this page.
  // Empty plan: LSK1 or LSK2 both insert as active.
  // Non-empty: LSK beside a waypoint inserts BEFORE it (new active).
  // Insert TheWay points last→first on LSK2 so IDs 51,52,… match WP1,WP2,…
  static INSERT_LSK_NUMBER = 2;
  static INSERT_LSK_CODE = 3061;

  // TheWay Lua: delay = how long the key is HELD, not a gap after release.
  static #KEY_HOLD_MS = 50;
  static #KEY_SETTLE_MS = 50;
  static #PAGE_SETTLE_MS = 120;
  // Heatblur: momentary CLR deletes one character; hold clears the scratchpad.
  static #CLR_HOLD_MS = 250;

  static POST_COORDINATE_DELAY_MS = 150;
  static POST_INSERT_DELAY_MS = 450;

  static FLIGHT_GROUND = "GROUND";
  static FLIGHT_AIRBORNE = "AIRBORNE";

  static #codesPayload = [];
  static #logLines = [];

  static #press(code, holdMs, settleMs) {
    this.#codesPayload.push({
      device: this.#device,
      code,
      delay: holdMs,
      activate: 1,
      addDepress: "true",
    });
    this.#codesPayload.push({
      device: this.#device,
      code,
      delay: settleMs,
      activate: 0,
      addDepress: "false",
    });
  }

  static #pause(ms) {
    this.#codesPayload.push({
      device: this.#device,
      code: this.#CLR,
      delay: ms,
      activate: 0,
      addDepress: "false",
    });
  }

  static log(message) {
    const line = `[F14BU] ${message}`;
    this.#logLines.push(line);
    if (typeof console !== "undefined" && console.log) console.log(line);
  }

  static resetLog() {
    this.#logLines = [];
  }

  static getLastTransferLog() {
    return [...this.#logLines];
  }

  /**
   * Heatblur DMM scratchpad: Nddmm.mmmWdddmm.mmm — no spaces, no /.
   */
  static coordinateOf(waypoint) {
    return waypoint.latHem + waypoint.lat + waypoint.longHem + waypoint.long;
  }

  static #type(text) {
    for (const character of text) {
      const code = this.#keys[character.toLowerCase()];
      if (code === undefined) {
        throw new Error(`Unsupported F-14B(U) CDNU character: ${character}`);
      }
      this.#press(code, this.#KEY_HOLD_MS, this.#KEY_SETTLE_MS);
    }
  }

  static #collect(build) {
    this.#codesPayload = [];
    build();
    return this.#codesPayload;
  }

  static buildFplnPageCommands() {
    return this.#collect(() => {
      this.#press(this.#FPLN, this.#KEY_HOLD_MS, this.#PAGE_SETTLE_MS);
    });
  }

  static buildCoordinateEntryCommands(waypoint) {
    return this.#collect(() => {
      this.#press(this.#CLR, this.#CLR_HOLD_MS, this.#KEY_SETTLE_MS);
      this.#type(this.coordinateOf(waypoint));
      this.#pause(this.POST_COORDINATE_DELAY_MS);
    });
  }

  static buildInsertCommands() {
    return this.#collect(() => {
      this.#press(
        this.INSERT_LSK_CODE,
        this.#KEY_HOLD_MS,
        this.POST_INSERT_DELAY_MS,
      );
    });
  }

  static buildConfirmationCommands() {
    return this.buildInsertCommands();
  }

  static createButtonCommands(waypoints) {
    this.resetLog();
    const received = waypoints?.length ?? 0;
    this.log(`RECEIVED WAYPOINTS = ${received}`);

    const payload = [];
    if (!received) {
      this.log("Transfer complete: 0/0");
      return payload;
    }

    for (let i = received - 1; i >= 0; i--) {
      const n = i + 1;
      this.log(`WP${n} START`);
      payload.push(...this.buildFplnPageCommands());
      payload.push(...this.buildCoordinateEntryCommands(waypoints[i]));
      this.log(`WP${n} COORDINATE COMPLETE`);
      this.log(`WP${n} INSERT LSK = ${this.INSERT_LSK_NUMBER}`);
      payload.push(...this.buildInsertCommands());
      this.log(`WP${n} COMPLETE`);
    }

    this.log(`Transfer complete: ${received}/${received}`);
    return payload;
  }
}

export default f14bu;
