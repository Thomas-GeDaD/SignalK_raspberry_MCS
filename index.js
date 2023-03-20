/*
 * Copyright 2020 Thomas Gersmann - GeDaD <t.gersmann@gedad.de>
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

const fs = require("fs")
const { spawn } = require('child_process')

var ttyinterfaces = []
var sensors = ["no sensor conected"]
let child1

//availible signalk-deltas
var speckeys_owire = [
  "environment.inside.engineRoom.temperature",
  "environment.inside.freezer.temperature",
  "environment.inside.heating.temperature",
  "environment.inside.mainCabin.temperature",
  "environment.inside.refrigerator.temperature",
  "environment.inside.temperature",
  "environment.outside.apparentWindChillTemperature",
  "environment.outside.dewPointTemperature",
  "environment.outside.heatIndexTemperature",
  "environment.outside.temperature",
  "environment.outside.theoreticalWindChillTemperature",
  "environment.water.baitWell.temperature",
  "environment.water.liveWell.temperature",
  "environment.water.temperature",
  "propulsion.1.coolantTemperature",
  "propulsion.1.exhaustTemperature",
  "propulsion.1.oilTemperature",
  "propulsion.1.temperature",
  "propulsion.1.transmission.oilTemperature",
  "propulsion.2.coolantTemperature",
  "propulsion.2.exhaustTemperature",
  "propulsion.2.oilTemperature",
  "propulsion.2.temperature",
  "propulsion.2.transmission.oilTemperature",
]
var speckeys_Input = [
    "propulsion.0.revolutions",
    "propulsion.1.revolutions",
    "electrical.alternators.0.revolutions",
    "electrical.alternators.1.revolutions",
    "navigation.lights",
    "navigation.speedThroughWater",
    "propulsion.0.state",
    "propulsion.1.state",
    "propulsion.0.fuel.rate",
    "propulsion.1.fuel.rate",
]


var error = []
let plugin = {}
let timerreadds18b20 = null
let timercheckds18b20 = null
var printerrors = "no errors or warnings"
var infoinstall1 = ""
var infoinstall2 =  "=> postinstall is done"

module.exports = function (app) {
  //check os entrys:
  function check_entrys() {
    var data = fs.readFileSync("/boot/config.txt", "utf8")
    if (
      data.indexOf(
        "dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600"
      ) == -1
    ) {
      error.push("error dt-overlay sc16is752 0x4c")
    }
    if (
      data.indexOf(
        "dtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600"
      ) == -1
    ) {
      error.push("error dt-overlay sc16is752 0x49")
    }
    if (
      data.indexOf(
        "dtoverlay=sc16is752-i2c,int_pin=6,addr=0x48,xtal=14745600"
      ) == -1
    ) {
      error.push("error dt-overlay sc16is752 0x48")
    }
    if (
      data.indexOf("dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25"
      ) == -1
    ) {
      error.push("error dt-overlay mcp2515")
    }
    var can0 = fs.readdirSync("/etc/network/interfaces.d/")
    if (can0.includes("can0") == false) {
      error.push("error interfaces.d can0")
    }
    var modules = fs.readFileSync("/etc/modules", "utf8")
    if (modules.includes("i2c_dev") == false) {
      error.push("error i2c_dev in modules")
    }
    if (modules.includes("ds2482") == false) {
      error.push("error ds2482 in modules")
    }
    if (modules.includes("wire") == false) {
      error.push("error wire in modules")
    }
    return error
  }
  //handle error
  var errorentrys = check_entrys()
  if (errorentrys != ""){
      app.error(errorentrys)
      printerrors = "There are errors and warnings. See Server Log"
      infoinstall1 = "Before you can start, execute the folowing command in a terminal! This installs all system config on your pi."
      infoinstall2 =  "sudo node $HOME/.signalk/node_modules/signalk-raspberry-mcs/postinstall.js"
  }

  //Plugin settings
  plugin.id = "SignalK_raspberry_MCS"
  plugin.name = "Raspberry_MCS Plugin"
  plugin.description = "SignalK Plugin to provide MCS functionality to SignalK"

  //read tty interfaces
  fs.readdirSync("/dev/").forEach((item) => {
    if (item.includes("ttySC")) {
      ttyinterfaces.push("  /dev/"+item +" ")
    }
  })

  //read 1-wire sensors
  
  function checkds18b20(){
   try {
      sensors=[]
      fs.readdirSync("/sys/bus/w1/devices/").forEach((item) => {
        if (item.slice(0, 2) == 28 || item.slice(0, 2) == 10 || item.slice(0, 2) == 22) {
         sensors.push(item)
        }
      })
    } catch {
      app.error("1-wire devices are not reachable")
    }
  }
  timercheckds18b20 = setInterval(checkds18b20, 30000) //check in interval for new connected Sensors

  //Plugin shema
  plugin.schema = () => ({
    title: "Enable autoshutdown.",
    description: `${infoinstall1}`,
    type: "object",
    required: ["oneWireId"],
    properties: {
      active: {
        type: "null",
        title: `${infoinstall2}`,
      },
      setup: {
        title: "Setup information",
        type: "object",
        properties: {
          information1: {
            title: "Available tty (nmea0183) interfaces of the MCS-Board:",
            description: `${ttyinterfaces}`,
            type: "null",
          },
          information2: {
            title: "If there is an error: (see also Server log):",
            description: `${printerrors}`,
            type: "null",
          },
        },
      },
      rate: {
        title: "Sample Rate 1-wire Sensor (in seconds)",
        description: "should be >1s each sensor!, min 10s",
        type: "number",
        default: 30,
      },
      devices: {
        type: "array",
        title: "1-Wire Temperature Sensors (DS18B20, DS1820, DS18S20, DS1822)",
        items: {
          type: "object",
          properties: {
            oneWireId: {
              type: "string",
              title: "Sensor Id",
              enum: sensors,
            },
            locationName: {
              type: "string",
              title: "Location name",
              default: "Engine room",
            },
            key: {
              type: "string",
              title: "Signal K Key",
              description:
                "This is used to build the path in Signal K.",
              enum: speckeys_owire,
            },
            offset: {
                type: "string",
                title: "Temp offset",
                default: "0",
              },
          },
        },
      },
      inputs: {
        type: "array",
        title: "Input configurations",
        required: ["inputID","key"],
        items: {
          type: "object",
          properties: {
            inputID: {
              type: "string",
              title: "Input",
              enum: ["In1","In2","In3","In4"],
            },
            locationName: {
              type: "string",
              title: "Input Name",
              default: "Motor Speed",
            },
            multiplier: {
              type: "string",
              title: "multiplier",
              default: "1",
            },
            key: {
              type: "string",
              title: "Signal K Key",
              description:
                "This is used to build the path in Signal K.",
              enum: speckeys_Input,
            },
          },
        },
      },
    },
  })
  //Plugin start
  plugin.start = function (options) {

    //child process for inputs
    child1 = spawn('python3', ['readinputs.py'], { cwd: __dirname })
    
    child1.stdout.on('data', data => {


        try {
            data.toString().split(/\r?\n/).forEach(line => {
                if (line.length > 0) {
                  app.handleMessage(undefined, JSON.parse(line))
                  app.debug(data.toString())
                  // console.log(JSON.stringify(line))
                }
              })
        } catch (e) {
          console.error(e.message)
        }
      })
      child1.stderr.on('data', fromChild => {
        console.error(fromChild.toString())
      })

      child1.on('error', err => {
        console.error(err)
      })

      child1.stdin.write (JSON.stringify(options))
      child1.stdin.write('\n')

    //1-wire Sensors send data
    function readds18b20() {
      Array.isArray(options.devices) &&
        options.devices.forEach((getsensor) => {
          try {
            var temp = fs.readFileSync(
              "/sys/bus/w1/devices/" + getsensor["oneWireId"] + "/w1_slave",
              "utf8"
            )
            indext = temp.indexOf("t=")
            temp = temp.slice(temp.indexOf("t=") + 2, -1) / 1000 + 273.15 + parseFloat(getsensor["offset"])
            app.debug(
              "signalKKey: " +
                getsensor["key"] +
                "    SensorID: " +
                getsensor["oneWireId"] +
                "    Value: " +
                temp
            )
            var delta = createDeltaMessage(getsensor["key"], temp)
            app.handleMessage(plugin.id, delta)
          } catch {
            app.error(
              "Configured Sensor is not reachable:" +
                getsensor["oneWireId"]
            )
          }
        })
    }
    var rate = options.rate
    if (rate < 6) {
      rate = 6
    }

    timerreadds18b20 = setInterval(readds18b20, rate * 1000)

  }
  //Plugin stop
 
  plugin.stop = function () {
    if (timerreadds18b20) {
      clearInterval(timerreadds18b20)
    }
     if (timercheckds18b20) {
      clearInterval(timercheckds18b20)
    }
    if (child1) {
      process.kill(child1.pid)
      child1 = undefined
    }
  }

  //create the delta message
  function createDeltaMessage(path, value) {
    return {
      context: "vessels." + app.selfId,
      updates: [
        {
          source: {
            label: plugin.id,
          },
          values: [
            {
              path,
              value,
            },
          ],
        },
      ],
    }
  }
  return plugin
}
