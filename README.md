# DCSTheWay
Imports waypoints right into the plane navigation system, like a Data Transfer Cartridge.
[DCS Forums thread here](https://forum.dcs.world/topic/272110-transfer-steerpoints-from-the-f10-map-into-the-aircraft-dcs-the-way/)

This is **SpicedWeasel**'s fork of [jonsky752/DCSTheWay](https://github.com/jonsky752/DCSTheWay) (currently **v2.7.3**), which is itself a fork of the original [aronCiucu/DCSTheWay](https://github.com/aronCiucu/DCSTheWay). Release **v2.7.4** adds Heatblur **F-14B(U)** RIO CDNU flight-plan transfer on top of jonsky's 2.7.3 line.

## What does it do?
You choose points on the DCS F10 map, press a button, and those points will be entered as steerpoints into your plane automatically. 
You can also share those waypoints with your friends, and you will all fly the same route, regardless of the module they choose.

## What is supported?
Supported modules:
* A-10C and A-10C2
* AH-64D Apache
* AV8BNA Harrier
* CH-47F Chinook
* C-130J-30
* F-14B(U) (RIO CDNU)
* F-15E
* F-16 (& All IDF Mods Project F16s)
* F/A-18C (& Superbug FA-18E/F/G) 
* Ka-50 Blackshark
* Mirage 2000
* Mirage F1EE
* OH-58D Kiowa Warrior
* SA342 Gazelle

* NS430 GPS

Supported Mod modules:
* Ah-6J/MH-6J LittleBird (patch for v1.1  https://forum.dcs.world/applications/core/interface/file/attachment.php?id=478352&key=dfe2cb0d24aed1c7a921883df4abde06 )
* Hercules - Mod Aircraft (Requires patch available at https://github.com/Summit60/DCS-Hercules-TheWay-patch)
* UH-60L (+DAP) Blackhawk


 
Multiplayer is supported as long as the server has Player Exports turned on (most servers do).

## How to install?
1. Download the latest zip file from the Releases section [found here](https://github.com/SpicedWeasel/DCSTheWay/releases), and extract it.
2. Copy the folder `TheWay` into `Users/[yourname]/Saved Games/DCS/Scripts`
   (The `DCS` folder name may be `DCS.openbeta` if you are on the openbeta version of the game).
3. Edit the `Export.lua` file inside the `Scripts` folder and append this line at the end of the file, and save it:
  ```lua
  pcall(function() local TheWayLfs=require('lfs');dofile(TheWayLfs.writedir()..'Scripts/TheWay/TheWay.lua'); end)
  ```
   If there is no `Export.lua` file already existing there, create it yourself, and it should include only the line above.

4. In the end, the folder structure should look like this:
 <img width="598" alt="folderStructure" src="https://github.com/aronCiucu/DCSTheWay/assets/45103765/567f33de-e6e5-4568-8026-30c3f39f62f7">
   
5. Run the installer from the zip you extracted.
6. After installation, the program will launch, and you can go fly. You can find a shortcut to TheWay on your desktop.
THE WAY WILL NOT CONNECT TO DCS UNTIL YOU ARE IN THE COCKPIT OF YOUR CHOSEN MODULE

If you are updating from an older version, download the newest release, run the installer again, and replace your existing `TheWay` folder in Saved Games with the new one.

## How to use? 
Video tutorial here:

[![DCSTheWayVideoThumbnail](https://img.youtube.com/vi/B2Q1VurZ8ms/default.jpg)](https://youtu.be/B2Q1VurZ8ms)

## FAQ
### I cannot find the installer
Make sure you downloaded the program from the Releases section, not the source code.
### How do I use this in VR?
You can use the DCS 2D mirror on your desktop to interact with TheWay and DCS.
You can also use the VR keybinds, which can be changed in Settings.
### I only see the "Enter cockpit to start" error
THE WAY WILL NOT CONNECT TO DCS UNTIL YOU ARE IN THE COCKPIT OF YOUR CHOSEN MODULE.
Make sure you have followed the installation instructions exactly, and that every file is where it should be.
Check that the server you are flying on has Player Exports turned on. If it doesn't, this won't work.
### Where is the app installed by default?
TheWay is installed at `C:\Users\USER\AppData\Local\Programs\theway`.
### How can I reset the module seat choice after I've ticked "Remember my choice"?
Go to `C:\Users\USER\AppData\Roaming\theway` and delete the `config.json` file. The dialogs will appear again.
Keep in mind this will also remove your other preferences.
### The buttons are not pressing correctly in DCS
If waypoint entry is not working correctly, try increasing the Button Delay slider in the settings menu.
If that still doesn't fix the issue, open a GitHub issue and attach a video so I can see what goes wrong.
### F-14B(U) waypoints are wrong or missing
Stay in the RIO seat and leave the CDNU alone during transfer. TheWay asks GROUND vs AIRBORNE, then inserts points last-to-first on LSK2 so crew IDs 51, 52, … match WP1, WP2, …. After updating, also replace `Saved Games/DCS/Scripts/TheWay/TheWay.lua`.
### My issue isn't listed here
Feel free to send a message on Discord (Doge4634) and we'll get it sorted.

## Credits
Special thanks to **aronCiucu** for creating the original app: https://github.com/aronCiucu/DCSTheWay  
Special thanks to **jonsky752** for maintaining and updating this line with newer modules and fixes: https://github.com/jonsky752/DCSTheWay  
F-14B(U) CDNU transfer in this fork is by **SpicedWeasel**.  
The ED Forums users for their suggestions and help. 

## For nerds
The application is built using React.js and Electron. 

If you'd like to contribute,   
* simply clone the repository 
* Open the folder in Visual Studio
* In a **New Terminal** run **`npm install`** *(first run only, downloads and install the required electron and react files)*,
* Open another **New Terminal** and run **`npm run dev`** to start the app in Developer mode,
* If you'd like to build/package the code for production, run **`npm run package`** and check the **`dist`** folder for the created installer. 

This is the way.
