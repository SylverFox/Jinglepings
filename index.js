const ping = require('net-ping')
const async = require('async')
const jimp = require('jimp')
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')

const optionDefinitions = [
  { name: 'help', alias: 'h', type: Boolean, description: 'You\'re looking at it' },
  { name: 'concurrency', alias: 'c', type: Number, description: 'Maximum simultaneous ping requests' },
  { name: 'timeout', alias: 't', type: Number, description: 'Timeout after a ping request' },
  { name: 'top', alias: 'y', type: Number, description: 'Position to place image from the top' },
  { name: 'left', alias: 'x', type: Number, description: 'Position to place image from the left' },
  { name: 'image', type: String, multiple: false, defaultOption: true, description: 'Image file to place' }
]

const { concurrency = 1000, timeout = 10, top = 0, left = 0, image, help} = commandLineArgs(optionDefinitions)
let targets = [];

if (help || !image) {
  console.log(commandLineUsage([
    {
      header: 'Usage',
      optionList: optionDefinitions
    },
    {
      header: 'Example',
      content: 'Example: node index -c 1000 -t 100 -y 750 -x 1550 logo-elnino.png'
    }
  ]))
  process.exit(0)
}

const session = ping.createSession({
  networkProtocol: ping.NetworkProtocol.IPv6,
  packetSize: 12,
  retries: 0,
  timeout
})

const queue = async.queue(
  (target, cb) => session.pingHost(target, () => cb()),
  concurrency
)

queue.drain(() => queue.push(targets))

jimp.read(image).then(img => {
  for(let y = 0; y < img.bitmap.height; y++) {
    for(let x = 0; x < img.bitmap.width; x++) {
      const _x = (x + left).toString(16).padStart(4, '0')
      const _y = (y + top).toString(16).padStart(4, '0')
      const [_r, _g, _b, _a] = img.getPixelColor(x, y).toString(16).padStart(8, '0').match(/.{2}/g)
      if(_a !== '00') {
        targets.push(`2001:610:1908:a000:${_x}:${_y}:${_b}${_g}:${_r}ff`)
      }
    }
  }
  queue.push(targets)
}).catch(() => {
  console.error('image does not exist')
  process.exit(-1)
})
