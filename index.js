const fs = require('fs')
var Gpio = require('onoff').Gpio;
var  ttyinterfaces = [];


var entry1= "dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600\\ndtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600\\ndtoverlay=sc16is752-i2c,int_pin=6,addr=0x48,xtal=14745600"
var entry1_1= "dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600\ndtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600\ndtoverlay=sc16is752-i2c,int_pin=6,addr=0x48,xtal=14745600"
var entry2= "dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25\\ndtoverlay=spi-bcm2835-overlay"
var entry2_2= "dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25\ndtoverlay=spi-bcm2835-overlay"
var entry3= "sudo sh -c \"echo '#physical can interfaces\\nallow-hotplug can0\\niface can0 can static\\nbitrate 250000\\ndown /sbin/ip link set $IFACE down\\nup /sbin/ifconfig $IFACE txqueuelen 10000' >> /etc/network/interfaces.d/can0\""

module.exports = function (app) {
  let plugin = {}
  let timer = null
  var data = ""

  plugin.id = 'SignalK_raspberry_MCS'
  plugin.name = 'Raspberry_MCS Plugin'
  plugin.description = 'SignalK Plugin to provide MCS functionality to SignalK'

  //read config.txt entrys
  data = fs.readFileSync('/boot/config.txt', 'utf8');
  
  //check sc16is752 config.txt entrys 
  function checksc16is752(){
    var sc16is752
  if (data.indexOf(entry1_1)==-1){
        sc16is752 = `sudo sh -c \"echo '${entry1}' >> /boot/config.txt\"`
    }else{
        sc16is752 = "entrys already created. You have nothing to do ;-)"
    }
    return sc16is752}

  //check mcp2515 config.txt entrys   
  function checkmcp2515(){
    if (data.indexOf(entry2_2)==-1){
      return  `sudo sh -c \"echo '${entry2}' >> /boot/config.txt\"`
    }else{
      return  "entrys already created. You have nothing to do ;-)"
    }
    } 
    //check can0 interface in interfaces.d
    function checkcan0if(){
        var can0 = fs.readdirSync('/etc/network/interfaces.d/')
        console.log(can0)
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
      console.log(item)
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
        "title":{
            "title": "Here you find information how you initial setup your MCS: ",
            "type":"null"
        },
        "information1":{
            "title": "Add the SC16ia752 to the config.txt:",
            "description":`${checksc16is752()}`,
            "type": "null"
        },
        "information2":{
            "title": "Add the mcp2515 to the config.txt: ",
            "description":`${checkmcp2515()}`,
            "type": "null"
        },
        "information3":{
            "title": "Load the can interface to interface.d: ",
            "description":`${checkcan0if()}`,
            "type": "null"
        },
        "information4":{
            "title": "Availible tty (nmea0183) interfaces of the MCS-Board:",
            "description":`${ttyinterfaces}`,
            "type": "null"
        },
        "information5":{
            "title": "after change something below, restart your pi to make changes work:",
            "description":"sudo reboot",
            "type": "null"
        }
      }}
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
