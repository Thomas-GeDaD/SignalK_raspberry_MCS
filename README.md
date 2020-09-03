# SignalK_raspberry_MCS
SignalK Plugin to provide MCS functionality to SignalK  
Attention: the postinstall.js scripts need sudo privilegs!

## Overview:  
This package install all dependencies, modules and dt-overlays to provide the fully avalability of the MCS board in SignalK.  
This package only works on a Raspberry Pi with a wired GeDaD MCS (Marine Controll Server).  
Be careful. The postinstallationscript works with sudo acess! 

## How to install:
Install the SignalK_raspberry_MCS Plugin in the Signalk Appstore.  
After the Installation:
1. Run the postinstallscript:  
```sh
sudo $HOME/.signalk/node_modules/SignalK_raspberry_MCS/postinstall.js
```  
(This script add the dt-overlays for CAN and NMEA0183 to the config.txt, adds the modules and installs and enable the 1-wire service and the autoshutdown service)  

2. Restart your Pi!!!

=> After this steps you can use the signalK Plugin.

## How to use (Plugin)
Plugin overview:  

![GitHub Logo](/Picture_MCS_Plugin.png)

After this all should work.. ;-)  

## How to use serial interfaces (NMEA0183)
All 6 serial interfaces should now be availible in the connection tab. You find the unter "Input Type" NMEA0183 , "MMEA0183Source" Serial.  
You can use each interface as "Input" or "Output"  

![GitHub Logo](/Picture_MCS_Serial.png)

## How to use CAN (NMEA2000) interface
