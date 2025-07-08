import { smsg } from './lib/simple.js'
import { format } from 'util' 
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import ws from 'ws';

/**
 * @type {import('@whiskeysockets/baileys')}
 */
const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
    clearTimeout(this)
    resolve()
}, ms))

/**
 * Handle messages upsert
 * @param {import('@whiskeysockets/baileys').BaileysEventMap<unknown>['messages.upsert']} groupsUpdate 
 */
export async function handler(chatUpdate) {
this.msgqueque = this.msgqueque || [];
  this.uptime = this.uptime || Date.now();
    if (!chatUpdate)
        return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m)
        return
    if (global.db.data == null)
        await global.loadDatabase()
    try {
        m = smsg(this, m) || m
        if (!m)
            return
        m.exp = 0
m.limit = false
m.money = false
        try {
            let user = global.db.data.users[m.sender]
            if (typeof user !== 'object')
                global.db.data.users[m.sender] = {}
            if (user) {
            if (!isNumber(user.exp)) user.exp = 0;
        if (!('premium' in user)) user.premium = false;
        if (!isNumber(user.joincount)) user.joincount = 2;
       if (!isNumber(user.money)) user.money = 10
if (!isNumber(user.limit)) user.limit = 8       
                }
            let chat = global.db.data.chats[m.chat]
            if (typeof chat !== 'object')
                global.db.data.chats[m.chat] = {}
if (chat) {
}} catch (e) {
console.error(e)
}

if (opts['nyimak']) {
return;
}
    if (!m.fromMe && opts['self']) {
      return;
    }
    if (opts['pconly'] && m.chat.endsWith('g.us')) {
      return;
    }
    if (opts['gconly'] && !m.chat.endsWith('g.us')) {
      return;
    }
    if (opts['swonly'] && m.chat !== 'status@broadcast') {
      return;
    }
    if (typeof m.text !== 'string') {
      m.text = '';
    }

let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender]

        const isROwner = [
  conn.decodeJid(global.conn.user.id),
  ...global.owner.map(([n]) => n),
 ...(Array.isArray(global.lidOwners) ? global.lidOwners.map(([n]) => n) : [])
]
  .map(v => v.replace(/[^0-9]/g, ''))
  .some(n => [`${n}@s.whatsapp.net`, `${n}@lid`].includes(m.sender))
        const isOwner = isROwner || m.fromMe
        const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender) || _user.prem == true

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)
            setInterval(async function () {
                if (queque.indexOf(previousID) === -1) clearInterval(this)
                await delay(time)
            }, time)
        }

//if (m.isBaileys) return 
if (m.isBaileys && m?.sender === this?.this?.user?.jid) {
      return;
}

m.exp += Math.ceil(Math.random() * 10)
let usedPrefix
//let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender]

const groupMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}) || {}
const participants = (m.isGroup ? groupMetadata.participants : []) || []
const user = (m.isGroup ? participants.find(u => conn.decodeJid(u.id) === m.sender) : {}) || {} // User Data
const bot = (m.isGroup ? participants.find(u => conn.decodeJid(u.id) == this.user.jid) : {}) || {} // Your Data
const isRAdmin = user?.admin == 'superadmin' || false
const isAdmin = isRAdmin || user?.admin == 'admin' || false // Is User Admin?
const isBotAdmin = bot?.admin || false // Are you Admin?

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin)
                continue
            if (plugin.disabled)
                continue
            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    // if (typeof e === 'string') continue
                    console.error(e)
                   /*for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
                        let data = (await conn.onWhatsApp(jid))[0] || {}
                        if (data.exists)
                            m.reply(`*Plugin:* ${name}\n*Sender:* ${m.sender}\n*Chat:* ${m.chat}\n*Command:* ${m.text}\n\n${format(e)}.trim(), data.jid)
                    }*/
                }
            }
            if (!opts['restrict'])
                if (plugin.tags && plugin.tags.includes('admin')) {
                    // global.dfail('restrict', m, this)
                    continue
                }
            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix
            let match = (_prefix instanceof RegExp ? // RegExp Mode?
                [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? // Array?
                    _prefix.map(p => {
                        let re = p instanceof RegExp ? // RegExp in Array?
                            p :
                            new RegExp(str2Regex(p))
                        return [re.exec(m.text), re]
                    }) :
                    typeof _prefix === 'string' ? // String?
                        [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                        [[[], new RegExp]]
            ).find(p => p[1])
            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants,
                    groupMetadata,
                    user,
                    bot,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }))
                    continue
            }
            if (typeof plugin !== 'function')
                continue
            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = (command || '').toLowerCase()
                let fail = plugin.fail || global.dfail // When failed
                let isAccept = plugin.command instanceof RegExp ? // RegExp Mode?
                    plugin.command.test(command) :
                    Array.isArray(plugin.command) ? // Array?
                        plugin.command.some(cmd => cmd instanceof RegExp ? // RegExp in Array?
                            cmd.test(command) :
                            cmd === command
                        ) :
                        typeof plugin.command === 'string' ? // String?
                            plugin.command === command :
                            false

if (!isAccept)
continue
m.plugin = name
if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
let chat = global.db.data.chats[m.chat]
let user = global.db.data.users[m.sender]
let botSpam = global.db.data.settings[this.user.jid]
if (!['owner-unbanchat.js', 'gc-link.js', 'gc-hidetag.js', 'info-creator.js'].includes(name) && chat && chat.isBanned && !isROwner) return // Except this
if (name != 'owner-unbanchat.js' && name != 'owner-exec.js' && name != 'owner-exec2.js' && name != 'tool-delete.js' && chat?.isBanned && !isROwner) return 
if (m.text && user.banned && !isROwner) {
if (typeof user.bannedMessageCount === 'undefined') {
    user.bannedMessageCount = 0;
  }
//m.reply(messageText);
user.bannedMessageCount++;
} else if (user.bannedMessageCount === 3) {
user.bannedMessageSent = true;
} else {
return;
}
return;
}

//Antispam 2                
if (user.antispam2 && isROwner) return
let time = global.db.data.users[m.sender].spam + 3000
if (new Date - global.db.data.users[m.sender].spam < 3000) return console.log(`[ SPAM ]`) 
global.db.data.users[m.sender].spam = new Date * 1
}

const hl = _prefix;
const adminMode = global.db.data.chats[m.chat].modoadmin;
const mystica = `${plugin.botAdmin || plugin.admin || plugin.group || plugin || noPrefix || hl || m.text.slice(0, 1) == hl || plugin.command}`;
if (adminMode && !isOwner && !isROwner && m.isGroup && !isAdmin && mystica) return;                         
if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { // Both Owner
fail('owner', m, this)
continue
}
                if (plugin.rowner && !isROwner) { // Real Owner
                    fail('rowner', m, this)
                    continue
                }
                if (plugin.owner && !isOwner) { // Number Owner
                    fail('owner', m, this)
                    continue
                }
                if (plugin.mods && !isMods) { // Moderator
                    fail('mods', m, this)
                    continue
                }
                if (plugin.premium && !isPrems) { // Usuarios Premium
                    fail('premium', m, this)
                    continue
                }
                if (plugin.group && !m.isGroup) { // Group Only
                    fail('group', m, this)
                    continue
                } else if (plugin.botAdmin && !isBotAdmin) { // You Admin
                    fail('botAdmin', m, this)
                    continue
                } else if (plugin.admin && !isAdmin) { // User Admin
                    fail('admin', m, this)
                    continue
                }
                if (plugin.private && m.isGroup) { // Private Chat Only
                    fail('private', m, this)
                    continue
                }
                if (plugin.register == true && _user.registered == false) { // Butuh daftar?
                    fail('unreg', m, this)
                    continue
                }
                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 1 // Ganancia de XP por comando
                if (xp > 9000)
                    m.reply('chirrido -_-') // Hehehe
                else
m.exp += xp
if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
conn.sendMessage(m.chat, {text: `*⚠ 𝐒𝐮𝐬 𝐝𝐢𝐚𝐦𝐚𝐧𝐭𝐞 💎 𝐬𝐞 𝐡𝐚𝐧 𝐚𝐠𝐨𝐭𝐚𝐝𝐨 𝐩𝐮𝐞𝐝𝐞 𝐜𝐨𝐦𝐩𝐫𝐚𝐫 𝐦𝐚𝐬 𝐮𝐬𝐚𝐧𝐝𝐨 𝐞𝐥 𝐜𝐨𝐦𝐚𝐧𝐝𝐨:* #buy`, contextInfo: {externalAdReply : {mediaUrl: null, mediaType: 1, description: null, "title": wm, body: '', previewType: 0, "thumbnail": img.getRandom(), sourceUrl: [nna, md, yt, nn, tiktok].getRandom()}}}, { quoted: m })         
continue
}
if (plugin.level > _user.level) {
conn.sendMessage(m.chat, {text: `*⚠️𝐍𝐞𝐜𝐞𝐬𝐢𝐭𝐚 𝐞𝐥 𝐧𝐢𝐯𝐞𝐥 ${plugin.level} 𝐩𝐚𝐫𝐚 𝐩𝐨𝐝𝐞𝐫 𝐮𝐬𝐚𝐫 𝐞𝐬𝐭𝐞 𝐜𝐨𝐦𝐚𝐧𝐝𝐨, 𝐓𝐮 𝐧𝐢𝐯𝐞𝐥 𝐚𝐜𝐭𝐮𝐚𝐥 𝐞𝐬:* ${_user.level}`, contextInfo: {externalAdReply : {mediaUrl: null, mediaType: 1, description: null, "title": wm, body: '', previewType: 0, "thumbnail": img.getRandom(), sourceUrl: [nna, md, yt, nn, tiktok].getRandom()}}}, { quoted: m })         
continue // Si no se ha alcanzado el nivel
}
let extra = {match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isRAdmin, isAdmin,  isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename }
try {
await plugin.call(this, m, extra)
if (!isPrems)
m.limit = m.limit || plugin.limit || false
} catch (e) {
// Error occured
m.error = e
console.error(e)
if (e) {
let text = format(e)
for (let key of Object.values(global.APIKeys))
text = text.replace(new RegExp(key, 'g'), '#HIDDEN#')
m.reply(text)
}
} finally {
// m.reply(util.format(_user))
if (typeof plugin.after === 'function') {
try {
await plugin.after.call(this, m, extra)
} catch (e) {
console.error(e)
}}
//if (m.limit) m.reply(`*${+m.limit}* 𝘿𝙞𝙖𝙢𝙖𝙣𝙩𝙚 💎 𝙪𝙨𝙖𝙙𝙤𝙨`)
//if (m.money) m.reply(+m.money + ' 𝙇𝙤𝙡𝙞𝘾𝙤𝙞𝙣𝙨 𝙪𝙨𝙖𝙙𝙤𝙨') 
}
break
}}} catch (e) {
console.error(e)
} finally {
if (opts['queque'] && m.text) {
const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1)
                this.msgqueque.splice(quequeIndex, 1)
        }
        //console.log(global.db.data.users[m.sender])
        let user, stats = global.db.data.stats
        if (m) {
            if (m.sender && (user = global.db.data.users[m.sender])) {
                user.exp += m.exp
                user.diamond -= m.diamond * 1
            }

            let stat
            if (m.plugin) {
                let now = +new Date
                if (m.plugin in stats) {
                    stat = stats[m.plugin]
                    if (!isNumber(stat.total))
                        stat.total = 1
                    if (!isNumber(stat.success))
                        stat.success = m.error != null ? 0 : 1
                    if (!isNumber(stat.last))
                        stat.last = now
                    if (!isNumber(stat.lastSuccess))
                        stat.lastSuccess = m.error != null ? 0 : now
                } else
                    stat = stats[m.plugin] = {
                        total: 1,
                        success: m.error != null ? 0 : 1,
                        last: now,
                        lastSuccess: m.error != null ? 0 : now
                    }
                stat.total += 1
                stat.last = now
                if (m.error == null) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
if (!opts['noprint']) await (await import(`./lib/print.js`)).default(m, this)
} catch (e) {
console.log(m, m.quoted, e)}
let settingsREAD = global.db.data.settings[this.user.jid] || {}  
if (opts['autoread']) await this.readMessages([m.key])
if (settingsREAD.autoread2) await this.readMessages([m.key])  
//if (settingsREAD.autoread2 == 'true') await this.readMessages([m.key])    

if (!m.fromMem && m.text.match(/(bot|a|e|i|o|u|naruto|:v)/gi)) {
let emot = pickRandom(["😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🤩", "😏", "😳", "🥵", "🤯", "😱", "😨", "🤫", "🥴", "🤧", "🤑", "🤠", "🤖", "🤝", "💪", "👑", "😚", "🐱", "🐈", "🐆", "🐅", "⚡️", "🌈", "☃️", "⛄️", "🌝", "🌛", "🌜", "🍓", "🍎", "🎈", "🪄", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💘", "💝", "💟", "🌝", "😎", "🔥", "🖕", "🐦"])
this.sendMessage(m.chat, { react: { text: emot, key: m.key }})}
function pickRandom(list) { return list[Math.floor(Math.random() * list.length)]}}}

/**
 * Handle groups participants update
 * @param {import('@adiwajshing/baileys').BaileysEventMap<unknown>['group-participants.update']} groupsUpdate 
 */

/** 
 * Actualización de grupos de control
 * Handle groups update
 * @param {import('@adiwajshing/baileys').BaileysEventMap<unknown>['groups.update']} groupsUpdate 
 */

global.dfail = (type, m, conn, usedPrefix) => {
    let msg = {
        rowner: '⚠️ Este comando es solo para mi propietario. ¡Lo siento, este es exclusivo! 🔒',
        owner: '⚠️ Este comando es solo para mi propietario. ¡Lo siento, este es exclusivo! 🔒',
        mods: '⚠️ Este comando solo lo puedo usar yo. ¡Privilegios de mod! 😘',
        premium: '⚠️ Este comando es solo para usuarios Premium (VIP). ¡Ser VIP tiene sus beneficios! 🌟',
        group: '⚠️ Pendejo este comando es solo para grupos.',
        private: '⚠️ Vamos al privado, este comando solo funciona en el privado del bot. ¡Hablemos en privado! 🤫',
        admin: '🤨 No eres admins. Solo los admins pueden usar este comando. ¡Necesito a los jefes aquí! 🛡️',
        botAdmin: '⚠️ haz admin al Bot "YO" para poder usar este comando.',
        /*unreg: '「NO ESTAS REGISTRADO」\n\nPA NO APARECES EN MI BASE DE DATOS ✋🥸🤚\n\nPara poder usarme escribe el siguente comando\n\nComando: #reg nombre.edad\nEjemplo: #reg elrebelde.21',*/
        restrict: '[ 🔐 ] Este comando esta desactivado por mi jefe'
    }[type]
    if (msg) return conn.sendMessage(m.chat, { 
        text: msg, 
        contextInfo: { 
            mentionedJid: null
        } 
    }, { quoted: m })
}

const file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
  unwatchFile(file);
  console.log(chalk.redBright('Update \'handler.js\''));
  if (global.reloadHandler) console.log(await global.reloadHandler());

  if (global.conns && global.conns.length > 0 ) {
    const users = [...new Set([...global.conns.filter((conn) => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map((conn) => conn)])];
    for (const userr of users) {
      userr.subreloadHandler(false)
    }
  }

});