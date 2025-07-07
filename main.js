// 🌀 Naruto-Bot: main.js optimizado por Deylin - https://github.com/Deylin-Eliac

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'

import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs from 'fs'
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
import store from './lib/store.js'
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { makeInMemoryStore, DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = await import('@whiskeysockets/baileys')

const { chain } = lodash
const { CONNECTING } = ws
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

// 🧠 Inicializa funciones de Baileys
protoType()
serialize()

// 🌐 Funciones globales útiles
global.__filename = (pathURL = import.meta.url, rmPrefix = platform !== 'win32') =>
  rmPrefix ? fileURLToPath(pathURL) : pathToFileURL(pathURL).toString()

global.__dirname = pathURL => path.dirname(global.__filename(pathURL, true))
global.__require = dir => createRequire(dir)

const __dirname = global.__dirname(import.meta.url)

// 🌐 API global
global.API = (name, route = '/', query = {}, key) => {
  const base = name in global.APIs ? global.APIs[name] : name
  const q = key
    ? { [key]: global.APIKeys[base], ...query }
    : query
  return base + route + (Object.keys(q).length ? '?' + new URLSearchParams(q) : '')
}

// ⚙️ Opciones CLI
global.opts = yargs(process.argv.slice(2)).exitProcess(false).parse()
global.prefix = new RegExp(
  '^[' + (opts.prefix || '*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®&.\\-.@')
    .replace(/[|\\{}()[\]^$+*.\-\^]/g, '\\$&') + ']'
)

// 🗂 Base de datos principal
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

if (global.conns.length) {
  console.log(chalk.green('✅ Conexiones globales restauradas'))
} else {
  console.log(chalk.yellow('🟡 Inicializando nuevas conexiones...'))
}

// Variables de autenticación
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

// Consola interactiva
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
})

const question = (text) => {
  rl.clearLine(rl.input, 0)
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.clearLine(rl.input, 0)
      resolve(answer.trim())
    })
  })
}

// Selección de método
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

// Silenciar logs innecesarios
const filterStrings = [
  "Q2xvc2luZyBzdGFsZSBvcGVu", "Q2xvc2luZyBvcGVuIHNlc3Npb24=",
  "RmFpbGVkIHRvIGRlY3J5cHQ=", "U2Vzc2lvbiBlcnJvcg==",
  "RXJyb3I6IEJhZCBNQUM=", "RGVjcnlwdGVkIG1lc3NhZ2U="
]

console.info = () => {}
console.debug = () => {}
['log', 'warn', 'error'].forEach(m => redefineConsoleMethod(m, filterStrings))

// Configuración de conexión
const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1' || methodCodeQR,
  mobile: MethodMobile,
  browser: ['Naruto-Bot', 'Edge', '20.0.04'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "fatal" }).child({ level: "fatal" })),
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

// Crear conexión principal
global.conn = makeWASocket(connectionOptions)

// Si no hay sesión aún, generar código de emparejamiento
if (!fs.existsSync(`./${authFile}/creds.json`) && (opcion === '2' || methodCode)) {
  opcion = '2'

  if (!conn.authState.creds.registered) {
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

    setTimeout(async () => {
  let code = await conn.requestPairingCode(addNumber)
  code = code?.match(/.{1,4}/g)?.join('-') || code
  console.log(chalk.bold.bgMagenta.white(' CÓDIGO DE EMPAREJAMIENTO: '), chalk.bold.white(code))
}, 2000)
}

conn.isInit = false
conn.well = false

if (!opts['test']) {
  if (global.db) setInterval(async () => {
    if (global.db.data) await global.db.write()
  }, 30 * 1000)
}

if (opts['server']) {
  (await import('./server.js')).default(global.conn, PORT)
}

async function getMessage(key) {
  if (store) {
    const jid = jidNormalizedUser(key.remoteJid)
    const msg = await store.loadMessage(jid, key.id)
    return msg?.message || ""
  }
  return { conversation: 'Naruto-Bot' }
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update
  global.stopped = connection
  if (isNewLogin) conn.isInit = true

  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error)
    global.timestamp.connect = new Date()
  }

  if (global.db.data == null) loadDatabase()

  if ((update.qr != 0 && update.qr !== undefined) || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      console.log(chalk.bold.yellow('\n🌸 ESCANEA EL CÓDIGO QR — EXPIRA EN 45 SEGUNDOS'))
    }
  }

  if (connection == 'open') {
    console.log(chalk.bold.greenBright(`
❒⸺⸺⸺⸺【• CONECTADO •】⸺⸺⸺⸺❒
│
│ 🟢 Se ha conectado con WhatsApp exitosamente.
│
❒⸺⸺⸺⸺【• CONECTADO •】⸺⸺⸺⸺❒`))
  }

  let reason = new Boom(lastDisconnect?.error)?.output?.statusCode
  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
        console.log(chalk.bold.cyanBright(`⚠️ SIN CONEXIÓN — BORRA LA CARPETA '${global.authFile}' Y ESCANEA DE NUEVO.`))
        break
      case DisconnectReason.connectionClosed:
        console.log(chalk.bold.magentaBright(`⚠️ CONEXIÓN CERRADA — REINTENTANDO...`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.connectionLost:
        console.log(chalk.bold.blueBright(`⚠️ CONEXIÓN PERDIDA CON EL SERVIDOR — REINTENTANDO...`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.connectionReplaced:
        console.log(chalk.bold.yellowBright(`⚠️ SESIÓN REEMPLAZADA — SE ABRIÓ OTRA SESIÓN.`))
        break
      case DisconnectReason.loggedOut:
        console.log(chalk.bold.redBright(`⚠️ SIN CONEXIÓN — BORRA LA CARPETA '${global.authFile}' Y ESCANEA DE NUEVO.`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.restartRequired:
        console.log(chalk.bold.cyanBright(`❇️ CONECTANDO AL SERVIDOR...`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.timedOut:
        console.log(chalk.bold.yellowBright(`⌛ TIEMPO AGOTADO — REINTENTANDO CONEXIÓN...`))
        await global.reloadHandler(true).catch(console.error)
        break
      default:
        console.log(chalk.bold.redBright(`⚠️ DESCONEXIÓN DESCONOCIDA: ${reason || 'No encontrado'} >> ${connection || 'No encontrado'}`))
        break
    }
  }
}

process.on('uncaughtException', console.error)

;(async () => {
  global.conns = []

  const mainBotAuthFile = 'NarutoSession'
  try {
    const mainBot = await connectionUpdate(mainBotAuthFile)
    global.conns.push(mainBot)
    console.log(chalk.bold.greenBright(`🍥 Naruto-Bot conectado correctamente.`))
  } catch (error) {
    console.error(chalk.bold.redBright(`❌ Error al iniciar Naruto-Bot: `), error)
  }
})()

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

// Carga dinámica de plugins
const pluginFolder = global.__dirname(join(__dirname, './plugins/index'))
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}

async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      conn.logger.error(e)
      delete global.plugins[filename]
    }
  }
}

filesInit().then(() => Object.keys(global.plugins)).catch(console.error)

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true)
    if (filename in global.plugins) {
      if (existsSync(dir)) {
        conn.logger.info(`✅ Plugin actualizado: '${filename}'`)
      } else {
        conn.logger.warn(`🗑 Plugin eliminado: '${filename}'`)
        return delete global.plugins[filename]
      }
    } else {
      conn.logger.info(`🆕 Nuevo plugin detectado: '${filename}'`)
    }

    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true
    })

    if (err) {
      conn.logger.error(`🛑 Error de sintaxis en '${filename}':\n${format(err)}`)
    } else {
      try {
        const module = await import(`${pathToFileURL(dir)}?update=${Date.now()}`)
        global.plugins[filename] = module.default || module
      } catch (e) {
        conn.logger.error(`❌ Error al recargar plugin '${filename}':`, e)
      }
    }
  }
} else {
  try {
    const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
    global.plugins[filename] = module.default || module;
  } catch (e) {
    conn.logger.error(`❌ ERROR EN EL PLUGIN '${filename}'\n${format(e)}`);
  } finally {
    global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
  }
}
};

Object.freeze(global.reload);
watch(pluginFolder, global.reload);
await global.reloadHandler();

async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version']),
  ].map(p => Promise.race([
    new Promise(resolve => p.on('close', code => resolve(code !== 127))),
    new Promise(resolve => p.on('error', () => resolve(false)))
  ])))

  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test
  global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find }
  Object.freeze(global.support)
}

function clearTmp() {
  const tmpDir = join(__dirname, 'tmp')
  if (!existsSync(tmpDir)) return
  for (const file of readdirSync(tmpDir)) {
    try {
      unlinkSync(join(tmpDir, file))
    } catch {}
  }
}

function purgeSession() {
  const dir = './NarutoSession'
  if (!existsSync(dir)) return
  const prekeys = readdirSync(dir).filter(f => f.startsWith('pre-key-'))
  for (const file of prekeys) {
    try {
      unlinkSync(join(dir, file))
    } catch {}
  }
}

function purgeOldFiles() {
  const dir = './NarutoSession'
  if (!existsSync(dir)) return
  for (const file of readdirSync(dir)) {
    if (file !== 'creds.json') {
      const filePath = join(dir, file)
      try {
        unlinkSync(filePath)
        console.log(chalk.bold.green(`🟢 Archivo eliminado: ${file}`))
      } catch (err) {
        console.log(chalk.bold.red(`🔴 No se pudo eliminar: ${file}\n${err}`))
      }
    }
  }
}

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

// Limpieza cada 4 minutos
setInterval(() => {
  if (stopped === 'close' || !conn || !conn.user) return
  clearTmp()
  console.log(chalk.bold.cyanBright(`\n🌀 TMP LIMPIADO: Archivos temporales eliminados.`))
}, 1000 * 60 * 4)

// Limpieza de claves antiguas cada 10 minutos
setInterval(() => {
  if (stopped === 'close' || !conn || !conn.user) return
  purgeOldFiles()
  console.log(chalk.bold.yellowBright(`\n🍥 KEYS LIMPIADAS: Archivos residuales eliminados.`))
}, 1000 * 60 * 10)

_quickTest()
  .then(() => conn.logger.info(chalk.bold(`\n🔥 Naruto-Bot listo para la batalla.`)))
  .catch(console.error)

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.bold.greenBright("📦 Código actualizado automáticamente."))
  import(`${file}?update=${Date.now()}`)
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