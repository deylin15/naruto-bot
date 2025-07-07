process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import { createRequire } from 'module'
import path, { join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, rmSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { tmpdir } from 'os'
import { format } from 'util'
import boxen from 'boxen'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import { mongoDB, mongoDBV2 } from './lib/mongoDB.js'
import store from './lib/store.js'
const { proto } = (await import('@whiskeysockets/baileys')).default
const {
  DisconnectReason,
  useMultiFileAuthState,
  MessageRetryMap,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
  PHONENUMBER_MCC
} = await import('@whiskeysockets/baileys')
import readline from 'readline'
import NodeCache from 'node-cache'

const { CONNECTING } = ws
const { chain } = lodash

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

// Aplicar prototipos y serializadores
protoType()
serialize()

// Helpers globales para paths y require
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix
    ? /file:\/\/\//.test(pathURL)
      ? fileURLToPath(pathURL)
      : pathURL
    : pathToFileURL(pathURL).toString()
}
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

global.API = (name, path = '/', query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  path +
  (query || apikeyqueryname
    ? '?' +
      new URLSearchParams(
        Object.entries({
          ...query,
          ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {})
        })
      )
    : '')

global.timestamp = { start: new Date() }

const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#/.]')

// Base de datos LowDB o Mongo según configuración
global.db = new Low(
  /https?:\/\//.test(global.opts['db'] || '') ? new cloudDBAdapter(global.opts['db']) : new JSONFile('src/database/database.json')
)

global.DATABASE = global.db

// Función para cargar base de datos
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) =>
      setInterval(async function () {
        if (!global.db.READ) {
          clearInterval(this)
          resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
        }
      }, 1000)
    )
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
loadDatabase()

// Configuración de autenticación Baileys (Multi File)
const { state, saveState, saveCreds } = await useMultiFileAuthState(global.sessions)
const msgRetryCounterMap = MessageRetryMap()
const msgRetryCounterCache = new NodeCache()
const { version } = await fetchLatestBaileysVersion()
let phoneNumber = global.botNumberCode

// Métodos de conexión detectados en args
const methodCodeQR = process.argv.includes('qr')
const methodCode = !!phoneNumber || process.argv.includes('code')
const methodMobile = process.argv.includes('mobile')

// Colores para consola
const colores = chalk.bgMagenta.white
const opcionQR = chalk.bold.green
const opcionTexto = chalk.bold.cyan

// Interfaz readline para interacción consola
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

// Selección automática de opción conexión
let opcion
if (methodCodeQR) opcion = '1'
if (!methodCodeQR && !methodCode && !fs.existsSync(`./${sessions}/creds.json`)) {
  do {
    opcion =
      await question(
        colores('Seleccione una opción:\n') + opcionQR('1. Con código QR\n') + opcionTexto('2. Con código de texto de 8 dígitos\n--> ')
      )

    if (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.bold.redBright(`🍬 No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`))
    }
  } while ((opcion !== '1' && opcion !== '2') || fs.existsSync(`./${sessions}/creds.json`))
}

const filterStrings = [
  'Q2xvc2luZyBzdGFsZSBvcGVu', // "Closing stable open"
  'Q2xvc2luZyBvcGVuIHNlc3Npb24=', // "Closing open session"
  'RmFpbGVkIHRvIGRlY3J5cHQ=', // "Failed to decrypt"
  'U2Vzc2lvbiBlcnJvcg==', // "Session error"
  'RXJyb3I6IEJhZCBNQUM=', // "Error: Bad MAC"
  'RGVjcnlwdGVkIG1lc3NhZ2U=' // "Decrypted message"
]

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion === '1' || methodCodeQR,
  mobile: methodMobile,
  browser:
    opcion === '1' || methodCodeQR
      ? ['Naruto-bot', 'Edge', '20.0.04']
      : ['Ubuntu', 'Chrome', '20.0.04'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
  },
  markOnlineOnConnect: true,
  generateHighQualityLinkPreview: true,
  getMessage: async (clave) => {
    let jid = jidNormalizedUser(clave.remoteJid)
    let msg = await store.loadMessage(jid, clave.id)
    return msg?.message || ''
  },
  msgRetryCounterCache,
  msgRetryCounterMap,
  defaultQueryTimeoutMs: undefined,
  version: [2, 3000, 1015901307],
}

global.conn = makeWASocket(connectionOptions)

if (!fs.existsSync(`./${sessions}/creds.json`)) {
  if (opcion === '2' || methodCode) {
    opcion = '2'

    if (!conn.authState.creds.registered) {
      if (methodMobile) throw new Error('No se puede usar un código de emparejamiento con la API móvil')

      let numeroTelefono
      if (phoneNumber) {
        numeroTelefono = phoneNumber.replace(/[^0-9]/g, '')
        if (!Object.keys(PHONENUMBER_MCC).some((v) => numeroTelefono.startsWith(v))) {
          console.log(
            chalk.bgBlack(
              chalk.bold.greenBright(
                `🍬 Por favor, Ingrese el número de WhatsApp.\n${chalk.bold.yellowBright(
                  `🍭  Ejemplo: 57321×××××××`
                )}\n${chalk.bold.magentaBright('---> ')}`
              )
            )
          )
          process.exit(0)
        }
      } else {
        while (true) {
          numeroTelefono = await question(
            chalk.bgBlack(
              chalk.bold.greenBright(`🍬 Por favor, escriba su número de WhatsApp.\n🍭  Ejemplo: 57321×××××××\n`)
            )
          )
          numeroTelefono = numeroTelefono.replace(/[^0-9]/g, '')

          if (numeroTelefono.match(/^\d+$/) && Object.keys(PHONENUMBER_MCC).some((v) => numeroTelefono.startsWith(v))) {
            break
          } else {
            console.log(
              chalk.bgBlack(
                chalk.bold.greenBright(`🍬 Por favor, escriba su número de WhatsApp.\n🍭  Ejemplo: 57321×××××××\n`)
              )
            )
          }
        }
        rl.close()
      }

      setTimeout(async () => {
  let codigo = await conn.requestPairingCode(numeroTelefono)
  codigo = codigo?.match(/.{1,4}/g)?.join('-') || codigo
  console.log(
    chalk.white.bold.bgMagenta('🎀  CÓDIGO DE VINCULACIÓN DE NARUTO-BOT  🎀'),
    chalk.white.bold(`\n\n🌀 Chakra Code: ${codigo}\n`)
  )
}, 3000)
}

conn.isInit = false
conn.well = false

if (!opts['test']) {
  if (global.db) {
    setInterval(async () => {
      if (global.db.data) await global.db.write()
    }, 30 * 1000)
  }
}

if (opts['server']) (await import('./server.js')).default(global.conn, PORT)

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update
  global.stopped = connection
  if (isNewLogin) conn.isInit = true

  const code = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    await global.reloadHandler(true).catch(console.error)
    global.timestamp.connect = new Date()
  }

  if (global.db.data == null) await loadDatabase()

  if ((update.qr != 0 && update.qr != undefined) || methodCodeQR) {
    if (opcion == '1' || methodCodeQR) {
      console.log(
        chalk.yellow.bold(
          '\n🌀 ESCANEA EL CÓDIGO QR PARA ACTIVAR EL MODO NINJA — EXPIRA EN 45 SEGUNDOS'
        )
      )
    }
  }

  if (connection == 'open') {
    console.log(
      boxen(chalk.bold('🟢 NARUTO-BOT CONECTADO A WHATSAPP'), {
        borderStyle: 'round',
        borderColor: 'green',
        title: chalk.green.bold('🔥 CONEXIÓN ESTABLECIDA 🔥'),
        titleAlignment: 'center'
      })
    )
    if (typeof joinChannels === 'function') await joinChannels(conn)
  }

  const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
        console.log(chalk.bgRed.bold(`❌ SESIÓN INVÁLIDA\n🍥 Elimina la carpeta ${global.sessions} y vuelve a iniciar sesión.`))
        break
      case DisconnectReason.connectionClosed:
        console.log(chalk.bgMagenta.bold(`📴 CONEXIÓN CERRADA\n🌀 Reconectando el chakra...`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.connectionLost:
        console.log(chalk.bgBlue.bold(`📡 CONEXIÓN PERDIDA\n🍃 Intentando reconectar con el mundo shinobi...`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.connectionReplaced:
        console.log(chalk.bgYellow.bold(`⚠️ SESIÓN REEMPLAZADA\n🔁 Otra sesión fue iniciada en otro dispositivo.`))
        break
      case DisconnectReason.loggedOut:
        console.log(chalk.bgRed.bold(`🛑 CERRASTE SESIÓN\n🍥 Borra la carpeta ${global.sessions} y vuelve a escanear.`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.restartRequired:
        console.log(chalk.bgCyan.bold(`♻️ REINICIO NECESARIO\n⚡ Restaurando el vínculo con la Aldea...`))
        await global.reloadHandler(true).catch(console.error)
        break
      case DisconnectReason.timedOut:
        console.log(chalk.bgYellow.bold(`⌛ TIEMPO AGOTADO\n🔥 Cargando Jutsu de reconexión...`))
        await global.reloadHandler(true).catch(console.error)
        break
      default:
        console.log(
          chalk.bgRed.bold(`❗ ERROR DESCONOCIDO\n📄 Razón: ${reason || 'Desconocida'} | Estado: ${connection || 'No encontrado'}`)
        )
        break
    }
  }
}

process.on('uncaughtException', console.error)

let isInit = true
let handler = await import('./handler.js')

global.reloadHandler = async function (restartConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
    if (Handler && Object.keys(Handler).length) handler = Handler
  } catch (e) {
    console.error(e)
  }

  if (restartConn) {
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

conn.ev.on('messages.upsert', handler.default || handler)
conn.ev.on('connection.update', connectionUpdate)
conn.ev.on('creds.update', saveState)

isInit = false
}

conn.handler = handler.handler.bind(global.conn)
conn.connectionUpdate = connectionUpdate.bind(global.conn)
conn.credsUpdate = saveCreds.bind(global.conn, true)

const currentDateTime = new Date()
const messageDateTime = new Date(conn.ev)
const chats = Object.entries(conn.chats)
  .filter(([jid, chat]) => !jid.endsWith('@g.us') && chat.isChats)
  .map(([jid]) => jid)

conn.ev.on('messages.upsert', conn.handler)
conn.ev.on('connection.update', conn.connectionUpdate)
conn.ev.on('creds.update', conn.credsUpdate)

isInit = false
return true
}

// 🌀 Activación de SubBots (JadiBot) - Solo si está habilitado
global.rutaJadiBot = join(__dirname, './JadiBots')

if (global.yukiJadibts) {
  if (!existsSync(global.rutaJadiBot)) {
    mkdirSync(global.rutaJadiBot, { recursive: true }) 
    console.log(chalk.bold.cyan(`🟢 Carpeta '${jadi}' creada correctamente.`))
  } else {
    console.log(chalk.bold.cyan(`🟢 Carpeta '${jadi}' ya existe.`))
  }

  const readRutaJadiBot = readdirSync(rutaJadiBot)
  if (readRutaJadiBot.length > 0) {
    const creds = 'creds.json'
    for (const gjbts of readRutaJadiBot) {
      const botPath = join(rutaJadiBot, gjbts)
      const readBotPath = readdirSync(botPath)
      if (readBotPath.includes(creds)) {
        yukiJadiBot({ pathYukiJadiBot: botPath, m: null, conn, args: '', usedPrefix: '/', command: 'serbot' })
      }
    }
  }
}

// 🧩 Plugins dinámicos
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
      if (existsSync(dir)) conn.logger.info(`🔄 Plugin actualizado: '${filename}'`)
      else {
        conn.logger.warn(`🗑️ Plugin eliminado: '${filename}'`)
        return delete global.plugins[filename]
      }
    } else {
      conn.logger.info(`🆕 Nuevo plugin detectado: '${filename}'`)
    }

    const err = syntaxerror(readFileSync(dir), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true
    })

    if (err) conn.logger.error(`❌ Error de sintaxis en '${filename}'\n${format(err)}`)
    else {
      try {
        const module = await import(`${global.__filename(dir)}?update=${Date.now()}`)
        global.plugins[filename] = module.default || module
      } catch (e) {
        conn.logger.error(`❗ Error al cargar '${filename}':\n${format(e)}`)
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
      }
    }
  }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()

// 🧪 Test rápido de dependencias
async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'), spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'), spawn('magick'), spawn('gm'), spawn('find', ['--version'])
  ].map(p => Promise.race([
    new Promise(resolve => p.on('close', code => resolve(code !== 127))),
    new Promise(resolve => p.on('error', () => resolve(false)))
  ])))

  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test
  const s = global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find }
  Object.freeze(global.support)
}

// 🧹 Limpieza automática
function clearTmp() {
  const tmpDir = join(__dirname, 'tmp')
  for (const file of readdirSync(tmpDir)) {
    unlinkSync(join(tmpDir, file))
  }
}

function purgeSession() {
  const directorio = readdirSync(`./${sessions}`)
  const prekeys = directorio.filter(file => file.startsWith('pre-key-'))
  for (const file of prekeys) {
    unlinkSync(`./${sessions}/${file}`)
  }
}

function purgeSessionSB() {
  try {
    const listaDirectorios = readdirSync(`./${jadi}/`)
    let archivos = []
    for (const dir of listaDirectorios) {
      const subpath = `./${jadi}/${dir}`
      if (statSync(subpath).isDirectory()) {
        const files = readdirSync(subpath).filter(f => f.startsWith('pre-key-'))
        archivos.push(...files)
        for (const file of files) {
          if (file !== 'creds.json') unlinkSync(`${subpath}/${file}`)
        }
      }
    }
    if (archivos.length === 0) {
      console.log(chalk.green(`✅ Nada que eliminar en subbots (${jadi})`))
    } else {
      console.log(chalk.cyan(`♻️ Archivos temporales de subbots eliminados.`))
    }
  } catch (err) {
    console.log(chalk.red(`❌ Error limpiando subbots: ${err}`))
  }
}

function purgeOldFiles() {
  const directories = [`./${sessions}/`, `./${jadi}/`]
  directories.forEach(dir => {
    for (const file of readdirSync(dir)) {
      if (file !== 'creds.json') {
        const filePath = join(dir, file)
        unlinkSync(filePath)
        console.log(chalk.gray(`🗑️ Eliminado: ${file}`))
      }
    }
  })
}

function redefineConsoleMethod(methodName, filterStrings) {
  const original = console[methodName]
  console[methodName] = function () {
    const msg = arguments[0]
    if (typeof msg === 'string' && filterStrings.some(f => msg.includes(atob(f)))) {
      arguments[0] = ''
    }
    original.apply(console, arguments)
  }
}

// ⏱️ Tareas automáticas cada cierto tiempo
setInterval(() => {
  if (stopped === 'close' || !conn?.user) return
  clearTmp()
  console.log(chalk.cyanBright(`🧹 Limpieza TMP completada`))
}, 1000 * 60 * 4)

setInterval(() => {
  if (stopped === 'close' || !conn?.user) return
  purgeSession()
  console.log(chalk.cyanBright(`🔒 Sesiones depuradas (${sessions})`))
}, 1000 * 60 * 10)

setInterval(() => {
  if (stopped === 'close' || !conn?.user) return
  purgeSessionSB()
}, 1000 * 60 * 10)

setInterval(() => {
  if (stopped === 'close' || !conn?.user) return
  purgeOldFiles()
  console.log(chalk.cyanBright(`📂 Archivos residuales eliminados.`))
}, 1000 * 60 * 10)

_quickTest()
  .then(() => conn.logger.info(chalk.green.bold(`✨ Naruto-Bot listo y en marcha.`)))
  .catch(console.error)

async function joinChannels(conn) {
  for (const channelId of Object.values(global.ch)) {
    await conn.newsletterFollow(channelId).catch(() => {})
  }
}