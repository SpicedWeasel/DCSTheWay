import f14bu from "../moduleCommands/f14bu";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let abortRequested = false;

function applyExtraDelay(commands, buttonExtraDelay) {
  return (commands || []).map((cmd) => ({
    ...cmd,
    delay: (cmd.delay ?? 0) + buttonExtraDelay,
  }));
}

function sendCommands(ipcRenderer, commands) {
  ipcRenderer.send("messageToDcs", {
    type: "waypoints",
    payload: commands,
  });
}

export function requestAbortF14BUTransfer() {
  abortRequested = true;
}

export function clearAbortF14BUTransfer() {
  abortRequested = false;
}

function throwIfAborted() {
  if (abortRequested) {
    throw new Error("F14BU_TRANSFER_ABORTED");
  }
}

function getBusy() {
  return window.__thewayBusy === true;
}

async function waitForBusyCycle({
  appearTimeout = 5000,
  clearTimeout = 60000,
  settleMs = 80,
  pollMs = 50,
} = {}) {
  const appearStart = Date.now();

  while (!getBusy()) {
    throwIfAborted();
    if (Date.now() - appearStart > appearTimeout) {
      throw new Error("F14BU_BUSY_DID_NOT_GO_TRUE");
    }
    await sleep(pollMs);
  }

  const clearStart = Date.now();

  while (getBusy()) {
    throwIfAborted();
    if (Date.now() - clearStart > clearTimeout) {
      throw new Error("F14BU_BUSY_DID_NOT_CLEAR");
    }
    await sleep(pollMs);
  }

  await sleep(settleMs);
  throwIfAborted();
}

async function sendAndWait(ipcRenderer, commands) {
  if (!commands?.length) return;
  sendCommands(ipcRenderer, commands);
  await waitForBusyCycle();
}

function isAirborneModule(module) {
  return module === "F-14BU_AIRBORNE";
}

export default async function f14buTransfer({
  module,
  moduleWaypoints,
  buttonExtraDelay,
  ipcRenderer,
  setRunning,
}) {
  clearAbortF14BUTransfer();
  setRunning(true);
  f14bu.resetLog();

  const received = moduleWaypoints?.length ?? 0;
  const airborne = isAirborneModule(module);
  const flightState = airborne
    ? f14bu.FLIGHT_AIRBORNE
    : f14bu.FLIGHT_GROUND;

  f14bu.log(`RECEIVED WAYPOINTS = ${received}`);
  f14bu.log(`Flight state = ${flightState}`);
  f14bu.log(airborne ? "Mode = F14BU_AIRBORNE" : "Mode = F14BU_GROUND");
  f14bu.log(`Button Delay = +${buttonExtraDelay ?? 0}ms`);

  for (let i = 0; i < received; i++) {
    f14bu.log(`WP${i + 1} = ${f14bu.coordinateOf(moduleWaypoints[i])}`);
  }

  let inserted = 0;

  try {
    if (!received) {
      f14bu.log("Transfer complete: 0 == 0 == 0");
      return;
    }

    // Last TheWay point first: each LSK2 insert becomes the new active waypoint.
    for (let i = received - 1; i >= 0; i--) {
      throwIfAborted();
      const n = i + 1;
      const waypoint = moduleWaypoints[i];

      f14bu.log(`WP${n} START`);

      await sendAndWait(
        ipcRenderer,
        applyExtraDelay(f14bu.buildFplnPageCommands(), buttonExtraDelay),
      );

      f14bu.log(`WP${n} COORDINATE_START`);
      await sendAndWait(
        ipcRenderer,
        applyExtraDelay(
          f14bu.buildCoordinateEntryCommands(waypoint),
          buttonExtraDelay,
        ),
      );
      f14bu.log(`WP${n} COORDINATE COMPLETE`);
      f14bu.log(`WP${n} INSERT LSK = ${f14bu.INSERT_LSK_NUMBER}`);

      await sendAndWait(
        ipcRenderer,
        applyExtraDelay(f14bu.buildInsertCommands(), buttonExtraDelay),
      );
      f14bu.log(`WP${n} LSK SENT`);

      f14bu.log(
        `Confirmation required = ${airborne ? "TRUE" : "FALSE"}`,
      );
      if (airborne) {
        await sendAndWait(
          ipcRenderer,
          applyExtraDelay(f14bu.buildConfirmationCommands(), buttonExtraDelay),
        );
        f14bu.log("Confirmation sent");
      }

      inserted += 1;
      f14bu.log(`WP${n} COMPLETE`);
    }

    f14bu.log(`Transfer complete: ${received} == ${inserted} == ${inserted}`);
    if (inserted !== received) {
      throw new Error(
        `F14BU transfer incomplete: received ${received} inserted ${inserted}`,
      );
    }
  } catch (err) {
    f14bu.log(`FAILED after ${inserted}/${received}: ${err?.message || err}`);
    if (err?.message !== "F14BU_TRANSFER_ABORTED") {
      throw err;
    }
  } finally {
    clearAbortF14BUTransfer();
    setRunning(false);
  }
}
