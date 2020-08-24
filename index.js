const fs = require('fs')
var  ttyinterfaces = [];

var entry1= "dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600\ndtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600\ndtoverlay=sc16is752-i2c,int_pin=6,addr=0x48,xtal=14745600"
var entry2= "dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25\ndtoverlay=spi-bcm2835-overlay"
var entry3= "sudo sh -c \"echo '#physical can interfaces\nallow-hotplug can0\niface can0 can static\nbitrate 250000\ndown /sbin/ip link set $IFACE down\nup /sbin/ifconfig $IFACE txqueuelen 10000' >> /etc/network/interfaces.d/can0\""

module.exports = function (app) {
  let plugin = {}

  plugin.id = 'SignalK_raspberry_MCS'
  plugin.name = 'Raspberry_MCS Plugin'
  plugin.description = 'SignalK Plugin to provide MCS functionality to SignalK'

  //read config.txt entrys
  const data = fs.readFileSync('/boot/config.txt', 'utf8');
  
  //check sc16is752 config.txt entrys 
  function checksc16is752(){
    var sc16is752
  if (data.indexOf(entry1)==-1){
        sc16is752 = `sudo sh -c \"echo ${entry1} ' >> /boot/config.txt\"`
    }else{
        sc16is752 = "entrys already created. You have nothing to do ;-)"
    }
    return sc16is752}

  //check mcp2515 config.txt entrys   
  function checkmcp2515(){
    var mcp2515
    if (data.indexOf(entry2)==-1){
      return  `sudo sh -c \"echo ${entry2} ' >> /boot/config.txt\"`
    }else{
      return  "entrys already created. You have nothing to do ;-)"
    }
    } 
    //check can0 interface in interfaces.d
    function checkcan0if(){
        var can0 = fs.readdirSync('/etc/network/interfaces.d/')
        if (can0.includes("can0")) {
            return "can 0 is already loaded to /etc/network/interfaces.d/"
        }
        else {
            return  entry3
        }
    }

    //read tty interfaces
    var files = fs.readdirSync('/dev/');
    files.forEach(check_ttydev);

    function check_ttydev(item){
      if (item.includes("ttySC")){
      //console.log(item)
          ttyinterfaces.push(item)
      }
  }


  plugin.schema =  () => ({
    "title": "Enable autoshutdown.",
    "description": "If you enable the autoshutdown, The Pi automaticly shuts down after \"+12V enable\" switch to low.",
    "type": "object",
    "properties": {
      "active": {
        "type": "boolean",
        "title": "Active"
      },
  
        "information1":{
        "description":"load the tty overlays for use the serial (NMEA0183) inputs to config.txt:",
        "type": "string",
        "title": "How to setup (enter this comands to the comandline)",
        "default": `${checksc16is752()}`,
        "readOnly": true
      },
        "information2":{
        "description":"load the can interface (NMEA2000) to config.txt:",
        "type": "string",
        "title": " ",
        "default": `${checkmcp2515()}`,
        "readOnly": true
      },
        "information3":{
        "description":"load the can interface to interface.d:",
        "type": "string",
        "title": " ",
        "default": `${checkcan0if()}`,
        "readOnly": true
        },
        "information4":{
        "type": "string",
        "title": "Availible tty (nmea0183) interfaces of the MCS-Board:",
        "enum": ttyinterfaces
      }
      }}
  )



  plugin.start = function (options) {
   //script for autoshutdown
  plugin.stop = function () {

    }
  }

  return plugin
        }
