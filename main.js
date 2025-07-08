// 🌀 Naruto-Bot: main.js creado por Deylin - https://github.com/Deylin-Eliac

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'

import fs, { readdirSync, unlinkSync } from 'fs'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import readline from 'readline'
import chalk from 'chalk'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import { spawn } from 'child_process'
import lodash from 'lodash'
import { Low, JSONFile } from 'lowdb'
import { mongoDB } from './lib/mongoDB.js'
import store from './lib/store.js'
import { tmpdir } from 'os'
import boxen from 'boxen'
import NodeCache from 'node-cache'
import yargs from 'yargs'
import { makeWASocket, protoType, serialize } from './lib/simple.js'

const { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } = await import('@whiskeysockets/baileys')

global.__filename = function (pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? fileURLToPath(pathURL) : pathToFileURL(pathURL).toString()
}
global.__dirname = function (pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}
const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#./]')
global.db = new Low(/https?:\/\//.test(global.opts['db'] || '') ? new mongoDB(global.opts['db']) : new JSONFile('src/database/database.json'))
global.loadDatabase = async function () {
  if (global.db.READ) return new Promise(resolve => setInterval(async function () {
    if (!global.db.READ) {
      clearInterval(this)
      resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
    }
  }, 1000))
  if (global.db.data !== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {}, ...(global.db.data || {}) }
  global.db.chain = lodash.chain(global.db.data)
}
await loadDatabase()

protoType()
serialize()

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise(res => rl.question(texto, res))
const sessions = 'sessions'
const { state, saveState, saveCreds } = await useMultiFileAuthState(sessions)
const { version } = await fetchLatestBaileysVersion()
const msgRetryCounterMap = {}
const msgRetryCounterCache = new NodeCache()

let phoneNumber = global.botNumberCode
const methodCodeQR = process.argv.includes('qr')
const methodCode = !!phoneNumber || process.argv.includes('code')
const methodMobile = process.argv.includes('mobile')

let opcion
if (methodCodeQR) opcion = '1'
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${sessions}/creds.json`)) {
  do {
    opcion = await question(chalk.bgMagenta('Seleccione una opción:\n') +
      chalk.green('1. Con código QR\n') +
      chalk.cyan('2. Con código de emparejamiento\n--> '))
    if (!/^[1-2]$/.test(opcion)) console.log(chalk.redBright('❌ Solo se permite 1 o 2.'))
  } while (!['1', '2'].includes(opcion))
}

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1' || methodCodeQR,
  mobile: methodMobile,
  browser: opcion === '1' ? ['Naruto-Bot', 'Edge', '20.0.0'] : ['Ubuntu', 'Chrome', '20.0.0'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' }))
  },
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  msgRetryCounterCache,
  msgRetryCounterMap,
  getMessage: async (key) => {
    let jid = jidNormalizedUser(key.remoteJid)
    let msg = await store.loadMessage(jid, key.id)
    return msg?.message || ''
  },
  version
}

global.conn = makeWASocket(connectionOptions)

const handler = await import('./handler.js')
conn.ev.on('messages.upsert', handler.default)
conn.ev.on('creds.update', saveCreds)
conn.ev.on('connection.update', connectionUpdate)

if (!fs.existsSync(`./${sessions}/creds.json`) && (opcion === '2' || methodCode)) {
  opcion = '2'

  if (!conn.authState.creds.registered) {
    let addNumber
    if (!!phoneNumber) {
      addNumber = phoneNumber.replace(/[^0-9]/g, '')
    } else {
      do {
        phoneNumber = await question(chalk.bgBlack(chalk.bold.green('📲 INGRESA TU NÚMERO DE WHATSAPP (sin +): ')))
        phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
      } while (!phoneNumber || !/^[0-9]{8,15}$/.test(phoneNumber))
      addNumber = phoneNumber
    }

    console.log(chalk.bold.green('\n⌛ SOLICITANDO CÓDIGO DE EMPAREJAMIENTO...\n'))

    try {
      let codeBot = await conn.requestPairingCode(addNumber)
      codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
      console.log(chalk.bold.white(chalk.bgMagenta(`🌀 CÓDIGO DE VINCULACIÓN:`)), chalk.bold.white(codeBot))
      console.log(chalk.bold.yellow('\n⏳ TIENES 2 MINUTOS PARA VINCULAR TU CUENTA'))

      const timeout = setTimeout(async () => {
        if (!conn.user) {
          console.log(chalk.redBright('\n⚠️ CÓDIGO EXPIRADO. SESIÓN NO VINCULADA.'))
          await saveCreds()
        }
      }, 120000)

      conn.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          clearTimeout(timeout)
          console.log(chalk.green('\n✅ ¡VINCULACIÓN EXITOSA!'))
          await saveCreds()
        }
      })

    } catch (err) {
      console.error(chalk.redBright('❌ ERROR AL GENERAR EL CÓDIGO:'), err)
    }
  }
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin, qr } = update
  if (isNewLogin) conn.isInit = true

  if ((qr && qr != 0) || methodCodeQR) {
    if (opcion == '1') {
      console.log(chalk.yellow.bold('\n📷 ESCANEA EL CÓDIGO QR - EXPIRA EN 45 SEGUNDOS'))
    }
  }

  const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
      case DisconnectReason.loggedOut:
        console.log(chalk.red('❌ Sesión inválida. Borra la carpeta y vuelve a vincular.'))
        process.exit()
        break
      case DisconnectReason.connectionClosed:
      case DisconnectReason.connectionLost:
      case DisconnectReason.connectionReplaced:
      case DisconnectReason.restartRequired:
      case DisconnectReason.timedOut:
        console.log(chalk.yellow('⚠️ Reconectando...'))
        await global.reloadHandler(true).catch(console.error)
        break
      default:
        console.log(chalk.red(`❗ Desconexión desconocida: ${reason}`))
        break
    }
  }

  if (connection === 'open') {
    console.log(boxen(chalk.bold('🔥 Naruto-Bot Conectado'), {
      borderStyle: 'double',
      borderColor: 'yellow',
      title: chalk.redBright('🔥 Konoha Core Activado 🔥'),
      titleAlignment: 'center',
      padding: 1,
      margin: 1
    }))
    rl.close()
    if (typeof joinChannels === 'function') await joinChannels(conn)
  }
}

global.reloadHandler = async function (restartConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`)
    if (Handler && typeof Handler.default === 'function') {
      handler = Handler
    } else {
      console.error('❌ handler.js no exporta una función válida.')
      return
    }
  } catch (e) {
    console.error('❌ Error al recargar handler.js:', e)
  }

  if (restartConn) {
    const oldChats = global.conn.chats
    try { global.conn.ws.close() } catch { }
    global.conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    conn.ev.on('messages.upsert', handler.default)
    conn.ev.on('connection.update', connectionUpdate)
    conn.ev.on('creds.update', saveCreds)
  }
}
await global.reloadHandler()

// Plugins
const pluginFolder = join(__dirname, './plugins/index')
const pluginFilter = f => /\.js$/.test(f)
global.plugins = {}

async function loadPlugins() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = join(pluginFolder, filename)
      const module = await import(pathToFileURL(file))
      global.plugins[filename] = module.default || module
    } catch (e) {
      console.error(`❌ Plugin ${filename} inválido:`, e)
    }
  }
}
await loadPlugins()

fs.watch(pluginFolder, async (_, filename) => {
  if (pluginFilter(filename)) {
    const file = join(pluginFolder, filename)
    try {
      const module = await import(`${pathToFileURL(file)}?update=${Date.now()}`)
      global.plugins[filename] = module.default || module
      console.log(`🔄 Plugin recargado: ${filename}`)
    } catch (e) {
      console.error(`❌ Error al recargar plugin ${filename}:`, e)
    }
  }
})

// Limpieza automática
function clearTmp() {
  const tmp = join(__dirname, 'tmp')
  for (const file of readdirSync(tmp)) unlinkSync(join(tmp, file))
}
function purgeSession() {
  const files = readdirSync(`./${sessions}`).filter(f => f.startsWith('pre-key-'))
  for (const file of files) unlinkSync(`./${sessions}/${file}`)
}
setInterval(() => clearTmp(), 1000 * 60 * 4)
setInterval(() => purgeSession(), 1000 * 60 * 10)

async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'), spawn('ffprobe'), spawn('convert'),
    spawn('magick'), spawn('gm'), spawn('find', ['--version'])
  ].map(p => Promise.race([
    new Promise(res => p.on('close', code => res(code !== 127))),
    new Promise(res => p.on('error', () => res(false)))
  ])))
  const [ffmpeg, ffprobe, convert, magick, gm, find] = test
  global.support = { ffmpeg, ffprobe, convert, magick, gm, find }
  Object.freeze(global.support)
}
await _quickTest()

async function joinChannels(conn) {
  for (const channelId of Object.values(global.ch || {})) {
    await conn.newsletterFollow(channelId).catch(() => { })
  }
}