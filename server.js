#! /usr/bin/env node

const http = require('http')
const serve = require('ecstatic')
const fs = require('fs')
const path = require('path')
const ssbKeys = require('ssb-keys')
const minimist = require('minimist')
const notifier = require('node-notifier')
const SysTray = require('systray').default

let argv = process.argv.slice(2)
let i = argv.indexOf('--')
let conf = argv.slice(i + 1)
argv = ~i ? argv.slice(0, i) : argv

const config = require('ssb-config/inject')(process.env.ssb_appname, minimist(conf))

const keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if (keys.curve === 'k256') {
  throw new Error('k256 curves are no longer supported,' +
    'please delete' + path.join(config.path, 'secret'))
}

const manifestFile = path.join(config.path, 'manifest.json')

const createSbot = require('scuttlebot')
  // .use(require('scuttlebot/plugins/plugins'))
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('ssb-friends'))
  .use(require('ssb-blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/local'))
  .use(require('ssb-query'))
  .use(require('ssb-ooo'))
  .use(require('ssb-ebt'))
  .use(require('ssb-ws'))
  .use(require('ssb-names'))
  .use(require('ssb-backlinks'))
  .use(require('ssb-about'))

// start server

config.keys = keys
const server = createSbot(config)

// write RPC manifest to ~/.ssb/manifest.json
fs.writeFileSync(manifestFile, JSON.stringify(server.getManifest(), null, 2))

const icon = fs.readFileSync(path.join(__dirname, `icon.${process.platform === 'win32' ? 'ico' : 'png'}`))
const tray = new SysTray({
  menu: {
    icon: icon.toString('base64'),
    title: 'Scuttle-Shell',
    tooltip: 'Secure Scuttlebutt tray app',
    items: [

      {
        title: 'Quit',
        tooltip: 'Stop sbot and quit tray application',
        checked: false,
        enabled: true
      }
    ]
  },
  debug: false,
  copyDir: true,
})

tray.onClick(action => {
  switch (action.seq_id) {
    case 0:
      console.log("### EXITING IN TWO SECONDS ###")

      notifier.notify({
        title: 'Secure Scuttlebutt',
        message: `Secure Scuttlebutt will exit in two seconds...`,
        icon: path.join(__dirname, "icon.png"),
        wait: true,
        id: 0,
      })

      tray.kill()
  }
})

tray.onExit((code, signal) => {
  setTimeout(() =>
    process.exit(0), 2000)
})