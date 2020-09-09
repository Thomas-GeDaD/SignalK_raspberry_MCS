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

//installation script for MCS dt overlay and Modul entrys. Runs in sudo mode!
const { exec } = require("child_process")
const fs = require("fs")

sudoInstall()
function sudoInstall() {
  run()
  function execconfig(entry) {
    exec(entry, (error, stdout, stderr) => {
      if (error) {
        console.log(`MCS -> error: ${error.message}`)
        error = `error ${error.message}`
      }
      if (stderr) {
        console.log(`MCS -> stderr: ${stderr}`)
        error = `error ${stderr}`
      }
      console.log(`MCS -> Added: ${entry} to system`)
    })
  }


  var data = fs.readFileSync("/boot/config.txt", "utf8")

  //install 1 sc16is752 overlay

  if (
    data.indexOf(
      "dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600"
    ) == -1
  ) {
    execconfig(
      `echo 'dtoverlay=sc16is752-i2c,int_pin=13,addr=0x4c,xtal=14745600' >> /boot/config.txt`
    )
  }
  //install 2 sc16is752 overlay
  if (
    data.indexOf(
      "dtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600"
    ) == -1
  ) {
    execconfig(
      `echo 'dtoverlay=sc16is752-i2c,int_pin=12,addr=0x49,xtal=14745600' >> /boot/config.txt`
    )
  }
  //install 3 sc16is752 overlay
  if (
    data.indexOf("dtoverlay=sc16is752-i2c,int_pin=6,addr=0x48,xtal=14745600") ==
    -1
  ) {
    execconfig(
      `echo 'dtoverlay=sc16is752-i2c,int_pin=6,addr=0x48,xtal=14745600' >> /boot/config.txt`
    )
  }
  //install mcp2515 overlay
  if (
    data.indexOf("dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25") ==
    -1
  ) {
    execconfig(
      `echo 'dtoverlay=mcp2515-can1,oscillator=16000000,interrupt=25' >> /boot/config.txt`
    )
  }
  //install spi-bcm2835
  if (data.indexOf("dtoverlay=spi-bcm2835-overlay") == -1) {
    execconfig(`echo 'dtoverlay=spi-bcm2835-overlay' >> /boot/config.txt`)
  }
  //add CAN0 device
  var can0 = fs.readdirSync("/etc/network/interfaces.d/")
  if (can0.includes("can0") == false) {
    execconfig(
      `echo '#physical can interfaces
allow-hotplug can0
iface can0 can static
bitrate 250000
down /sbin/ip link set $IFACE down
up /sbin/ifconfig $IFACE txqueuelen 10000' >> /etc/network/interfaces.d/can0`
    )
  }
  //added i2c-dev to /etc/modules:
  var modules = fs.readFileSync("/etc/modules", "utf8")
  if (modules.includes("i2c_dev") == false) {
    execconfig(`echo 'i2c_dev' >> /etc/modules`)
  }
  //added ds2482 to /etc/modules:
  if (modules.includes("ds2482") == false) {
    execconfig(`echo 'ds2482' >> /etc/modules`)
  }
  //added wire to /etc/modules:
  if (modules.includes("wire") == false) {
    execconfig(`echo 'wire' >> /etc/modules`)
  }
  //create ds2482 device service
  var service = fs.readdirSync("/etc/systemd/system/")
  if (service.includes("mcsowire.service") == false) {
    execconfig(
      `echo "[Unit]
Description=MCS owire start service
After=multi-user.target
[Service]
Type=simple
ExecStart=/bin/sh -c 'echo ds2482 0x18 > /sys/bus/i2c/devices/i2c-1/new_device'
[Install]
WantedBy=multi-user.target\" | tee /etc/systemd/system/mcsowire.service`
    )
    execconfig("systemctl enable mcsowire.service")
  }
  //create MCS autoshutdown
  if (service.includes("mcsasd.service") == false) {
    execconfig(
      `echo "[Unit]
Description=MCS autoshutdown start service
After=multi-user.target
[Service]
Type=simple
ExecStart=/usr/bin/python3 ${__dirname}/MCS-asd.py
[Install]
WantedBy=multi-user.target" | tee /etc/systemd/system/mcsasd.service`
    )
    execconfig("systemctl enable mcsasd.service")
  }

//install further dependencies: sudo apt-get install python3 idle3 pigpio python-pigpio python3-pigpio
execconfig(`apt-get install python3 idle3 pigpio python-pigpio python3-pigpio -y`)

// enable pigpio systemctl enable pigpiod && sudo systemctl restart  pigpiod
execconfig("systemctl enable pigpiod && sudo systemctl restart  pigpiod")

}
