/*
 * Copyright 2020 Thomas Gersmann - GeDaD <t.gersmann@gedad.de>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { exec } = require("child_process");
const fs = require('fs');
var Gpio = require('onoff').Gpio;
var  ttyinterfaces = [];
var sensors = [];
var speckeys =["environment.inside.engineRoom.temperature","environment.inside.freezer.temperature","environment.inside.heating.temperature","environment.inside.mainCabin.temperature","environment.inside.refrigerator.temperature","environment.inside.temperature","environment.outside.apparentWindChillTemperature","environment.outside.dewPointTemperature","environment.outside.heatIndexTemperature","environment.outside.temperature","environment.outside.theoreticalWindChillTemperature","environment.water.baitWell.temperature","environment.water.liveWell.temperature","environment.water.temperature,propulsion.*.coolantTemperature","propulsion.*.exhaustTemperature","propulsion.*.oilTemperature","propulsion.*.temperature","propulsion.*.transmission.oilTemperature"]; 

module.exports = function (app) {
  let plugin = {}
  let timer = null
  var data = ""

  plugin.id = 'SignalK_raspberry_MCS'
  plugin.name = 'Raspberry_MCS Plugin'
  plugin.description = 'SignalK Plugin to provide MCS functionality to SignalK'

    //os config
    function sudoInstall(){
        
      var error = "no errors"
      function execconfig(entry){
          exec(entry, (error, stdout, stderr) => 
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
      var data = fs.readFileSync('/boot/config.txt', 'utf8');
      
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
          execconfig(`sudo sh -c \"echo 'dtoverlay=spi-bcm2835-overlay' >> /boot/config.txt\"`)
      }
      //add CAN0 device
      var can0 = fs.readdirSync('/etc/network/interfaces.d/')
      if (can0.includes("can0")==false) {
          execconfig(`sudo sh -c \"echo '#physical can interfaces\\nallow-hotplug can0\\niface can0 can static\\nbitrate 250000\\ndown /sbin/ip link set $IFACE down\\nup /sbin/ifconfig $IFACE txqueuelen 10000' >> /etc/network/interfaces.d/can0\"`)
      }
      //added i2c-dev to /etc/modules:
      var modules = fs.readFileSync('/etc/modules', 'utf8');
      if (modules.includes("i2c_dev")==false) {
        execconfig(`sudo sh -c \"echo 'i2c_dev' >> /etc/modules\"`)
      }
      //added ds2482 to /etc/modules:
      if (modules.includes("i2c_dev")==false) {
        execconfig(`sudo sh -c \"echo 'ds2482' >> /etc/modules\"`)
      }
      //added wire to /etc/modules:
      if (modules.includes("i2c_dev")==false) {
        execconfig(`sudo sh -c \"echo 'wire' >> /etc/modules\"`)
      }
      //loaded ds2482 device
      execconfig(`echo 'ds2482 0x18' | sudo tee /sys/class/i2c-adapter/i2c-1/new_device`)
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
            "rate": {
              "title": "Sample Rate 1-wire Sensor (in seconds)",
              "type": "number",
              "default": 30
            },
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
                  "enum": speckeys
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

    //1-wire Sensors send data
    function readds18b20(){
        var avdevices =options.devices
        avdevices.forEach(readsensor)
        function readsensor(getsensor){
            var temp = fs.readFileSync("/sys/bus/w1/devices/"+ getsensor["oneWireId"] +"/w1_slave", 'utf8');
            indext=temp.indexOf("t=")
            temp= temp.slice(temp.indexOf("t=")+2,-1) / 1000 +273
            console.log("signalKKey: "+getsensor["key"] + "    SensorID: "+getsensor["oneWireId"]+"    Value: "+temp)
            var delta = createDeltaMessage (getsensor["key"], temp)
            app.handleMessage(plugin.id, delta)
        }
    }
    timerreadds18b20 = setInterval(readds18b20,1000)
    }

  plugin.stop = function () {
    if(timer){
        clearInterval(timer)}
    try {
        asdstate.unexport()}
    catch { console.log("Info: no asdstate working")}
  
  }


  //create the delta message
  function createDeltaMessage (key, value) {
    return {
      'context': 'vessels.' + app.selfId,
      'updates': [
        {
          'source': {
            'label': plugin.id
          },
          'timestamp': (new Date()).toISOString(),
          'values': [
            {
              'path':  key,
              'value': value
            }
          ]
        }
      ]
    }
  }


  return plugin
}
