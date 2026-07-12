# Fail-safe / recovery setup

The app is designed to recover automatically from power cuts, crashes, and
network outages. Some of this is code (already built in); some requires a
one-time machine setup that software cannot do for you.

## What recovers automatically (already in the code)

**Network outage**

- The map view reconnects its live data stream (SSE) on its own, falls back to
  polling while the backend is unreachable, and reconnects instantly when the
  OS reports the network is back.
- Satellite map tiles that failed to load while offline are re-requested when
  the connection returns (they no longer stay grey).
- Weather requests fail quietly and retry on their normal interval.

**Crashes**

- The backend restarts itself if a network/port error occurs and keeps running
  through unexpected errors instead of dying.
- The hardware jump-run controller (serial device) is re-detected and
  reconnected automatically after a power blip or being unplugged.
- The Electron app retries loading the page if the backend isn't up yet and
  reloads itself if the display (renderer) crashes or hangs.
- The Electron app registers itself to launch at login after an update/reboot.

## One-time machine setup (required for power-cut recovery)

Software can't turn the computer back on or log the user in. Do these once on
the display machine:

1. **BIOS/UEFI — power on after power loss.** Enter BIOS setup and set
   *Restore on AC Power Loss* / *AC Power Recovery* to **Power On** (wording
   varies by vendor). Without this the machine stays off after a power cut.

2. **Windows — auto-login.** So it reaches the desktop unattended:
   run `netplwiz`, uncheck *Users must enter a user name and password*, and
   enter the account password. (Or use Sysinternals `Autologon`.)

3. **Auto-start the app.** Pick the one matching how you run it:

   - **Node backend + browser:** register the supervised backend as a startup
     task (restarts it if it ever exits):

     ```powershell
     pwsh -ExecutionPolicy Bypass -File scripts\install-autostart.ps1
     Start-ScheduledTask -TaskName 'SF JumpRun'
     ```

     Then point a browser at `http://localhost:3008` — ideally Chrome/Edge in
     kiosk mode from the same startup folder, e.g.:
     `chrome.exe --kiosk --app=http://localhost:3008`

   - **Electron packaged app:** it already sets itself to open at login, so
     just launch it once after installing. Auto-login (step 2) does the rest.

After setup, pull the plug to test: the machine should power on, log in, and
show the map with live data — end to end, unattended.
