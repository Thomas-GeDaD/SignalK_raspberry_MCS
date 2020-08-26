const { exec } = require("child_process");
const fs = require('fs')
var Gpio = require('onoff').Gpio;
var  ttyinterfaces = [];
var sensors = [];

module.exports = function (app) {
  let plugin = {}
  let timer = null
  var data = ""

  plugin.id = 'SignalK_raspberry_MCS'
  plugin.name = 'Raspberry_MCS Plugin'
  plugin.description = 'SignalK Plugin to provide MCS functionality to SignalK'

    //os config
    function sudoInstall(){
        data = fs.readFileSync('/boot/config.txt', 'utf8');
        var error = "no errors"
        function execconfig(entry){
            exec('{entry}', (error, stdout, stderr) => 
            {
            if (error) {
                console.log(`MCS -> error: ${error.message}`);
                error = `error ${error.message}`
            }
            if (stderr) {
                console.log(`MCS -> stderr: ${stderr}`);
                error= `error ${stderr}`
            }
            console.log(`MCS -> Added: ${entry} to system`);
            })};
        
        //install 1 sc16is752 overlay
        if (data.indexOf("dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600")==-1){
            execconfig(`sudo sh -c \"echo 'dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600' >> /boot/config.txt\"`)
        }
        //install 2 sc16is752 overlay
        if (data.indexOf("dtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600")==-1){
            execconfig(`sudo sh -c \"echo 'dtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600' >> /boot/config.txt\"`)
        }
        //install 3 sc16is752 overlay
        if (data.indexOf("dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600")==-1){
            execconfig(`sudo sh -c \"echo 'dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600' >> /boot/config.txt\"`)
        }
        //install mcp2515 overlay
        if (data.indexOf("dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25")==-1){
            execconfig(`sudo sh -c \"echo 'dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25' >> /boot/config.txt\"`)
        }
        //install spi-bcm2835
        if (data.indexOf("dtoverlay=spi-bcm2835-overlay")==-1){
            execconfig(`sudo sh -c \"dtoverlay=spi-bcm2835-overlay' >> /boot/config.txt\"`)
        }
        //add CAN0 device
        var can0 = fs.readdirSync('/etc/network/interfaces.d/')
        if (can0.includes("can0")==false) {
            execconfig(`sudo sh -c \"echo '#physical can interfaces\\nallow-hotplug can0\\niface can0 can static\\nbitrate 250000\\ndown /sbin/ip link set $IFACE down\\nup /sbin/ifconfig $IFACE txqueuelen 10000' >> /etc/network/interfaces.d/can0\"`)
    
        }
        return error
    }
    //read tty interfaces
    var files = fs.readdirSync('/dev/');
    files.forEach(check_ttydev);

    function check_ttydev(item){
      if (item.includes("ttySC")){
          ttyinterfaces.push(item)
      }
    }

    //read 1-wire sensors
    var sensorx = fs.readdirSync('/sys/bus/w1/devices/'); ///sys/bus/w1/devices/
    sensorx.forEach(checkid);
    function checkid(item){
        if (item.slice(0,2)==28){
            sensors.push(item)
        }
    }


  plugin.schema =  () => (
    {
        "title": "Enable autoshutdown.",
        "description": "If you enable the autoshutdown, The Pi automaticly shuts down after \"+12V enable\" switch to low.",
        "type": "object",
        "required": ["oneWireId"],
        "properties": {
          "active": {
            "type": "boolean",
            "title": "Active"
            },
        "setup":{
          "title": "Setup information",
          "type": "object",
          "properties":{
            "information1":{
                "title": "Availible tty (nmea0183) interfaces of the MCS-Board:",
                "description":`${ttyinterfaces}`,
                "type": "null"
            },
            "information2":{
                "title": "If there is an error: (see also Server log):",
                "description": `${sudoInstall()}`,
                "type": "null"
            }}},
        
        "devices": {
            
            "type": "array",
            "title": "1-Wire Sensors (DS18B20)",
            "items": {
              "type": "object",
              "properties": {
                "oneWireId": {
                  "type": "string",
                  "title": "Sensor Id",
                  "enum": sensors
                },
                "locationName": {
                  "type": "string",
                  "title": "Location name",
                  "default": "Engine room"
                },
                "key": {
                  "type": "string",
                  "title": "Signal K Key",
                  "description": "This is used to build the path in Signal K. It will be appended to environment",
                  "enum": ["inside.engineroom.temperature"]
                }
              }
            }
        }
        
       
    
    
       }
    }
  )



  plugin.start = function (options) {

    var asdstate = new Gpio(5, 'in');
    //script for autoshutdown
    function checkasd(){
        var asd = asdstate.readSync()
        if (asd==0 && options.active){
         console.log("MCSshutdown") //add code for shutdown
         }}
    
    if (asdstate.readSync()==1 && options.active){
    timer = setInterval(checkasd, 3000);
    }
    }

  plugin.stop = function () {
    if(timer){
        clearInterval(timer)}
    try {
        asdstate.unexport()}
    catch { console.log("Info: no asdstate working")}
  
  }

  return plugin
}
