
const BME280 = require('bme280-sensor')

module.exports = function (app) {
  let timer = null
  let plugin = {}

  plugin.id = 'SignalK_raspberry_MCS'
  plugin.name = 'Raspberry_MCS Plugin'
  plugin.description = 'SignalK Plugin to provide MCS functionality to SignalK'

  plugin.schema = {
    type: 'object',
    properties: {
      rate: {
        title: "Reading Rate",
        type: 'number',
        default: 60
      },
      path: {
        type: 'string',
        title: 'SignalK Path',
        description: 'This is used to build the path in Signal K. It will be appended to \'environment\'',
        default: 'test.string'
      },
      i2c_bus: {
        type: 'integer',
        title: 'I2C bus number',
        default: 1,
      },
      i2c_address: {
        type: 'string',
        title: 'I2C address',
        default: '0x77',
      },
    }
  }

  plugin.start = function (options) {
    
    function createDeltaMessage (temperature, humidity, pressure) {
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
                'path': 'environment.' + options.path + '.temperature',
                'value': temperature
              }, {
                'path': 'environment.' + options.path + '.humidity',
                'value': humidity
              }, {
                'path': 'environment.' + options.path + '.pressure',
                'value': pressure
              }
            ]
          }
        ]
      }
    }

    // The BME280 constructor options are optional.
    //
    const bmeoptions = {
      i2cBusNo   : options.i2c_bus || 1, // defaults to 1
      i2cAddress : Number(options.i2c_address || '0x77'), // defaults to 0x77
    };

    const bme280 = new BME280(bmeoptions);

    // Read BME280 sensor data
    function readSensorData() {
  	  bme280.readSensorData()
          .then((data) => {
        // temperature_C, pressure_hPa, and humidity are returned by default.
        temperature = data.temperature_C + 273.15;
        pressure = data.pressure_hPa * 100;
        humidity = data.humidity;

        //console.log(`data = ${JSON.stringify(data, null, 2)}`);

        // create message
        var delta = createDeltaMessage(temperature, humidity, pressure)

        // send temperature
        app.handleMessage(plugin.id, delta)

      })
      .catch((err) => {
        console.log(`BME280 read error: ${err}`);
      });
    }

    bme280.init()
        .then(() => {
      console.log('BME280 initialization succeeded');
      readSensorData();
    })
    .catch((err) => console.error(`BME280 initialization failed: ${err} `));

    timer = setInterval(readSensorData, options.rate * 1000);
  }

  plugin.stop = function () {
    if(timer){
      clearInterval(timer);
      timeout = null;
    }
  }

  return plugin
}
