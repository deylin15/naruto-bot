// 🌀 Naruto-Bot: main.js optimizado por Deylin - https://github.com/Deylin-Eliac

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'

import { createRequire } from 'module'
import path, { join } from 'path'
import {fileURLToPath, pathToFileURL} from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { existsSync, readdirSync, readFileSync, unlinkSync, watchFile, unwatchFile, watch } from 'fs'
import yargs from 'yargs'
import lodash from 'lodash'
import chalk from 'chalk'
import { tmpdir } from 'os'
import { format } from 'util'
import syntaxerror from 'syntax-error'
import readline from 'readline'
import NodeCache from 'node-cache'
import { Boom } from '@hapi/boom'
import { Low, JSONFile } from 'lowdb'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js'
import { __filename, __dirname } from './lib/dirname.js'
import store from './lib/store.js'
import pino from 'pino'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { makeInMemoryStore, DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = await import('@whiskeysockets/baileys')

const { chain } = lodash
const { CONNECTING } = ws
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

protoType()
serialize()

global.__filename = (pathURL = import.meta.url, rmPrefix = platform !== 'win32') =>
  rmPrefix ? fileURLToPath(pathURL) : pathToFileURL(pathURL).toString()

global.__dirname = pathURL => path.dirname(global.__filename(pathURL, true))
global.__require = dir => createRequire(dir)


global.API = (name, route = '/', query = {}, key) => {
  const base = name in global.APIs ? global.APIs[name] : name
  const q = key ? { [key]: global.APIKeys[base], ...query } : query
  return base + route + (Object.keys(q).length ? '?' + new URLSearchParams(q) : '')
}

global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()
global.prefix = new RegExp(
  '^[' + (opts.prefix || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®&.\\-.@')
    .replace(/[|\\{}()[\]^$+*.\-\^]/g, '\\$&') + ']'
)

global.db = new Low(
  /^https?:\/\//.test(opts.db || '')
    ? new cloudDBAdapter(opts.db)
    : new JSONFile('database.json')
)

global.DATABASE = global.db

global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise(resolve => {
      const int = setInterval(async () => {
        if (!global.db.READ) {
          clearInterval(int)
          resolve(global.db.data ?? await global.loadDatabase())
        }
      }, 1000)
    })
  }

  if (global.db.data !== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null

  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {})
  }

  global.db.chain = chain(global.db.data)
}
await global.loadDatabase()

global.conns = Array.isArray(global.conns) ? global.conns : []
console.log(global.conns.length ? chalk.green('✅ Conexiones globales restauradas') : chalk.yellow('🟡 Inicializando nuevas conexiones...'))

global.creds = 'creds.json'
global.authFile = 'NarutoSession'
const { state, saveState, saveCreds } = await useMultiFileAuthState(global.authFile)

const msgRetryCounterMap = (MessageRetryMap) => {}
const msgRetryCounterCache = new NodeCache()
const { version } = await fetchLatestBaileysVersion()

let phoneNumber = global.botNumberCode
const methodCodeQR = process.argv.includes('qr')
const methodCode = !!phoneNumber || process.argv.includes('code')
const MethodMobile = process.argv.includes('mobile')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
})

function redefineConsoleMethod(methodName, filterStrings) {
  const original = console[methodName]
  console[methodName] = function (...args) {
    const msg = args[0]
    if (typeof msg === 'string' && filterStrings.some(s => msg.includes(atob(s)))) {
      args[0] = ''
    }
    original.apply(console, args)
  }
}

const question = (text) => {
  rl.clearLine(rl.input, 0)
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.clearLine(rl.input, 0)
      resolve(answer.trim())
    })
  })
}

let opcion
if (methodCodeQR) {
  opcion = '1'
}

if (!methodCodeQR && !methodCode && !fs.existsSync(`./${authFile}/creds.json`)) {
  do {
    opcion = await question(`
${chalk.blueBright('╭─')} ${chalk.bgBlue(' MÉTODO DE VINCULACIÓN ')} ${chalk.blueBright('─╮')}
${chalk.cyanBright('│')} ${chalk.bold('1')} - Escanear código QR
${chalk.cyanBright('│')} ${chalk.bold('2')} - Ingresar número y generar código
${chalk.blueBright('╰────────────────────────╯')}
${chalk.magentaBright('Escribe una opción (1 o 2):')}
${chalk.bold('---> ')}
    `)

    if (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.redBright(`⚠️  Opción inválida. Solo puedes ingresar ${chalk.greenBright('1')} o ${chalk.greenBright('2')}.`))
    }
  } while (!['1', '2'].includes(opcion) || fs.existsSync(`./${authFile}/creds.json`))
}

const filterStrings = [
  "Q2xvc2luZyBzdGFsZSBvcGVu", "Q2xvc2luZyBvcGVuIHNlc3Npb24=",
  "RmFpbGVkIHRvIGRlY3J5cHQ=", "U2Vzc2lvbiBlcnJvcg==",
  "RXJyb3I6IEJhZCBNQUM=", "RGVjcnlwdGVkIG1lc3NhZ2U="
]

console.info = () => {}
console.debug = () => {}
['log', 'warn', 'error'].forEach(m => redefineConsoleMethod(m, filterStrings))

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1' || methodCodeQR,
  mobile: MethodMobile,
  browser: ['Naruto-Bot', 'Edge', '20.0.04'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
  },
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  syncFullHistory: false,
  getMessage: async (key) => {
    const jid = jidNormalizedUser(key.remoteJid)
    const msg = await store.loadMessage(jid, key.id)
    return msg?.message || ""
  },
  msgRetryCounterCache,
  msgRetryCounterMap,
  defaultQueryTimeoutMs: undefined,
  version: [2, 3000, 1015901307],
}

global.conn = makeWASocket(connectionOptions)

if (!fs.existsSync(`./${authFile}/creds.json`) && (opcion === '2' || methodCode)) {
  let addNumber

  if (!!phoneNumber) {
    addNumber = phoneNumber.replace(/[^0-9]/g, '')
  } else {
    do {
      phoneNumber = await question(chalk.greenBright(`\n💬 Ingrese el número de WhatsApp (Ej: +54123456789):\n${chalk.bold('---> ')}`))
      phoneNumber = phoneNumber.replace(/\D/g, '')
      if (!phoneNumber.startsWith('+')) phoneNumber = `+${phoneNumber}`
    } while (!await isValidPhoneNumber(phoneNumber))

    rl.close()
    addNumber = phoneNumber.replace(/\D/g, '')
  }

  try {
    conn.ev.on('connection.update', async ({ connection }) => {
  if (connection === 'open') {
    try {
      let code = await conn.requestPairingCode(addNumber)
      code = code?.match(/.{1,4}/g)?.join('-') || code
      console.log(chalk.bold.bgMagenta.white('\n🔗 CÓDIGO DE EMPAREJAMIENTO:'), chalk.whiteBright(code), '\n')
    } catch (e) {
      console.error(chalk.redBright('❌ Error generando código de emparejamiento:'), e)
    }
  }
})

process.on('uncaughtException', console.error)

let isInit = true
let handler = await import('./handler.js')

global.reloadHandler = async function (restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
    if (Object.keys(Handler || {}).length) handler = Handler
  } catch (e) {
    console.error(e)
  }

  if (restatConn) {
    const oldChats = global.conn.chats
    try { global.conn.ws.close() } catch {}
    conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    isInit = true
  }

  if (!isInit) {
    conn.ev.off('messages.upsert', conn.handler)
    conn.ev.off('connection.update', conn.connectionUpdate)
    conn.ev.off('creds.update', conn.credsUpdate)
  }

  conn.handler = handler.handler.bind(global.conn)
  conn.connectionUpdate = connectionUpdate.bind(global.conn)
  conn.credsUpdate = saveCreds.bind(global.conn, true)

  conn.ev.on('messages.upsert', conn.handler)
  conn.ev.on('connection.update', conn.connectionUpdate)
  conn.ev.on('creds.update', conn.credsUpdate)

  isInit = false
  return true
}


const pluginFolder = join(__dirname(import.meta.url), './plugins')
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}


async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = pathToFileURL(join(pluginFolder, filename)).href
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      console.error(`❌ Error cargando plugin ${filename}:`, e)
      delete global.plugins[filename]
    }
  }
}


await filesInit()


global.reload = async (_ev, filename) => {
  if (!pluginFilter(filename)) return
  const fullPath = join(pluginFolder, filename)

  if (!existsSync(fullPath)) {
    console.log(chalk.redBright(`🗑 Plugin eliminado: '${filename}'`))
    return delete global.plugins[filename]
  }

  const err = syntaxerror(readFileSync(fullPath), filename, {
    sourceType: 'module',
    allowAwaitOutsideFunction: true
  })

  if (err) {
    console.error(chalk.redBright(`🛑 Error de sintaxis en '${filename}':\n`), err)
    return
  }

  try {
    const updatedModule = await import(`${pathToFileURL(fullPath).href}?update=${Date.now()}`)
    global.plugins[filename] = updatedModule.default || updatedModule
    console.log(chalk.greenBright(`♻️ Plugin recargado: '${filename}'`))
  } catch (e) {
    console.error(chalk.redBright(`❌ Error al recargar '${filename}':\n`), format(e))
  }
}


Object.freeze(global.reload)


watch(pluginFolder, global.reload)


await filesInit()


watchFile(fileURLToPath(import.meta.url), () => {
  unwatchFile(fileURLToPath(import.meta.url))
  console.log(chalk.bold.greenBright("📦 Código actualizado automáticamente."))
  import(`${pathToFileURL(import.meta.url).href}?update=${Date.now()}`)
})

async function isValidPhoneNumber(number) {
  try {
    number = number.replace(/\s+/g, '')
    if (number.startsWith('+521')) {
      number = number.replace('+521', '+52')
    } else if (number.startsWith('+52') && number[4] === '1') {
      number = number.replace('+52 1', '+52')
    }
    const parsed = phoneUtil.parseAndKeepRawInput(number)
    return phoneUtil.isValidNumber(parsed)
  } catch {
    return false
  }
}