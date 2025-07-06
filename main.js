process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1' import './config.js'; import { createRequire } from 'module' import path, { join } from 'path' import { fileURLToPath, pathToFileURL } from 'url' import { platform } from 'process' import * as ws from 'ws' import fs, { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch } from 'fs' import yargs from 'yargs' import { spawn } from 'child_process' import lodash from 'lodash' import chalk from 'chalk' import syntaxerror from 'syntax-error' import { tmpdir } from 'os' import { format } from 'util' import Pino from 'pino' import { Boom } from '@hapi/boom' import { makeWASocket, protoType, serialize } from './lib/simple.js' import { Low, JSONFile } from 'lowdb' import store from './lib/store.js' import readline from 'readline' import NodeCache from 'node-cache' import pkg from 'google-libphonenumber' const { PhoneNumberUtil } = pkg const phoneUtil = PhoneNumberUtil.getInstance() const { makeCacheableSignalKeyStore, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, DisconnectReason } = await import('@whiskeysockets/baileys')

protoType() serialize()

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000 const __dirname = path.dirname(fileURLToPath(import.meta.url)) const __filename = fileURLToPath(import.meta.url) const createRequireFn = createRequire(import.meta.url)

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs ? global.APIs[name] : name) + path + (query || apikeyqueryname ? '?' + new URLSearchParams(Object.entries({ ...query, ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}) })) : '')

const opts = yargs(process.argv.slice(2)).exitProcess(false).parse() global.opts = opts

const dbFile = opts['db'] || '' global.db = new Low(/https?:///.test(dbFile) ? new cloudDBAdapter(dbFile) : new JSONFile(${opts._[0] ? opts._[0] + '_' : ''}database.json)) await global.db.read().catch(console.error) global.db.data ||= { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {} } global.db.chain = lodash.chain(global.db.data)

const { state, saveCreds } = await useMultiFileAuthState('PixelapSession') const version = await fetchLatestBaileysVersion() const msgRetryCounterMap = MessageRetryMap => {} const msgRetryCounterCache = new NodeCache()

const rl = readline.createInterface({ input: process.stdin, output: process.stdout }) const question = texto => new Promise(res => rl.question(texto, ans => res(ans.trim())))

let opcion = '1' if (!fs.existsSync('./PixelapSession/creds.json')) { do { opcion = await question('🌱 Seleccione una opción :\n1. Código QR\n2. Código de emparejamiento\n---> ') } while (!['1', '2'].includes(opcion)) }

const connectionOptions = { logger: Pino({ level: 'silent' }), printQRInTerminal: opcion === '1', browser: ['Pixelap', 'Chrome', '20.0.0'], auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: 'silent' })) }, version: version.version, markOnlineOnConnect: true, generateHighQualityLinkPreview: true, syncFullHistory: false, msgRetryCounterCache, msgRetryCounterMap, getMessage: async (key) => { let jid = jidNormalizedUser(key.remoteJid) let msg = await store.loadMessage(jid, key.id) return msg?.message || '' } }

let conn = makeWASocket(connectionOptions) global.conn = conn

conn.ev.on('connection.update', async (update) => { const { connection, lastDisconnect, qr } = update if (qr && opcion === '1') console.log(chalk.greenBright('🌿 Escanea el código QR'))

if (connection === 'open') { console.log(chalk.greenBright('✅ Conectado correctamente.')) } else if (connection === 'close') { let reason = new Boom(lastDisconnect?.error)?.output?.statusCode if (reason === DisconnectReason.badSession) { console.log(chalk.red('❌ Sesión incorrecta, borra la carpeta PixelapSession')) } else { console.log(chalk.yellow('🔁 Reconectando...')) await global.reloadHandler(true).catch(console.error) } } })

conn.ev.on('creds.update', saveCreds)

global.reloadHandler = async function (restartConn) { const handler = await import(./handler.js?update=${Date.now()}).then(m => m.handler).catch(console.error) conn.handler = handler.bind(conn)

conn.ev.off('messages.upsert', conn.handler) conn.ev.on('messages.upsert', conn.handler)

if (restartConn) { const oldChats = conn.chats try { conn.ws.close() } catch {} conn.ev.removeAllListeners() global.conn = makeWASocket(connectionOptions, { chats: oldChats }) } }

await global.reloadHandler()

function clearTmp() { const dir = join(__dirname, './tmp') for (const file of readdirSync(dir)) { const filePath = join(dir, file) const stats = statSync(filePath) if (stats.isFile() && (Date.now() - stats.mtimeMs >= 180000)) unlinkSync(filePath) } }

setInterval(clearTmp, 180000)

function isValidPhoneNumber(number) { try { number = number.replace(/\s+/g, '') if (number.startsWith('+521')) number = number.replace('+521', '+52') const parsed = phoneUtil.parseAndKeepRawInput(number) return phoneUtil.isValidNumber(parsed) } catch { return false } }

function clockString(ms) { const d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24, m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60 return ${d}d ${h}h ${m}m ${s}s }

console.log(chalk.blueBright('🌐 Pixelap bot iniciado'))

