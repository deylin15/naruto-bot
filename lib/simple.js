// 🌀 Archivo simple.js - Base de mensajes Baileys optimizada por Deylin

import * as baileys from '@whiskeysockets/baileys'

const {
  areJidsSameUser,
  proto,
  jidNormalizedUser,
  getContentType,
  makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  PHONENUMBER_MCC,
  getAggregateVotesInPollMessage,
  generateWAMessageFromContent,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  relayMessage,
  downloadContentFromMessage,
  MessageRetryMap
} = baileys

export {
  makeWASocket,
  makeInMemoryStore,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  PHONENUMBER_MCC,
  getAggregateVotesInPollMessage,
  generateWAMessageFromContent,
  generateWAMessageContent,
  generateWAMessage,
  prepareWAMessageMedia,
  relayMessage,
  downloadContentFromMessage,
  MessageRetryMap,
  jidNormalizedUser,
  areJidsSameUser,
  proto
}

/**
 * Agrega métodos útiles al prototipo de proto.Message
 */
export function protoType() {
  const Chat = proto.Message

  Chat.prototype.isBaileys = function () {
    return this.key?.id?.startsWith('BAE5') && this.key?.id?.length === 16
  }

  Chat.prototype.isFromMe = function () {
    return this.key?.fromMe
  }

  Chat.prototype.isGroup = function () {
    return this.key?.remoteJid?.endsWith('@g.us')
  }

  Chat.prototype.serializeM = function () {
    return serialize(this)
  }
}

/**
 * Serializa un mensaje recibido
 * @param {import('@whiskeysockets/baileys').proto.WebMessageInfo} m
 * @param {import('@whiskeysockets/baileys').WASocket} conn
 * @returns {any}
 */
export function serialize(m, conn = {}) {
  if (!m) return m
  if (m.key) {
    m.id = m.key.id
    m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16
    m.chat = m.key.remoteJid
    m.fromMe = m.key.fromMe
    m.isGroup = m.chat?.endsWith('@g.us')
    m.sender = jidNormalizedUser(m.fromMe ? conn?.user?.id : m.key.participant || m.key.remoteJid)
  }

  if (m.message) {
    m.mtype = getContentType(m.message)
    m.body = getText(m.message[m.mtype])
    m.msg = m.message[m.mtype]

    if (m.mtype === 'ephemeralMessage') {
      m.message = m.message.ephemeralMessage.message
      const type = getContentType(m.message)
      m.mtype = type
      m.msg = m.message[type]
      m.body = getText(m.message[type])
    }

    m.mentionedJid = m.msg?.contextInfo?.mentionedJid || []
    m.quoted = m.msg?.contextInfo?.quotedMessage
      ? parseQuoted(m, conn)
      : null
  }

  m.text = m.body || ''
  m.download = () => conn.downloadAndSaveMediaMessage(m)

  return m
}

/**
 * Extrae texto útil de un mensaje
 * @param {any} msg
 * @returns {string}
 */
function getText(msg) {
  if (!msg) return ''
  if (typeof msg === 'string') return msg
  if (msg.text) return msg.text
  if (msg.caption) return msg.caption
  if (msg.conversation) return msg.conversation
  return ''
}

/**
 * Extrae y prepara el mensaje citado
 * @param {any} m
 * @param {any} conn
 * @returns {any}
 */
function parseQuoted(m, conn) {
  const quoted = m.msg.contextInfo
  const type = getContentType(quoted.quotedMessage)
  const msg = quoted.quotedMessage[type]

  const q = {
    type,
    id: quoted.stanzaId,
    chat: m.chat,
    isBaileys: quoted.participant?.includes('baileys'),
    fromMe: quoted.participant === m.sender,
    sender: jidNormalizedUser(quoted.participant),
    text: getText(msg),
    mentionedJid: msg?.contextInfo?.mentionedJid || [],
    mtype: type,
    msg,
    key: {
      remoteJid: m.chat,
      fromMe: quoted.participant === m.sender,
      id: quoted.stanzaId,
      participant: quoted.participant,
    },
    delete: () => conn.sendMessage(m.chat, { delete: q.key }),
    download: () => conn.downloadAndSaveMediaMessage({ message: { [type]: msg } }),
  }

  return q
}

/**
 * Versión clásica de smsg para compatibilidad
 * @param {import('@whiskeysockets/baileys').WASocket} conn
 * @param {import('@whiskeysockets/baileys').proto.WebMessageInfo} m
 */
export function smsg(conn, m) {
  if (!m) return m
  const M = proto.WebMessageInfo
  m = M.fromObject(m)
  m.conn = conn

  if (m.message) {
    const mtype = getContentType(m.message)
    m.mtype = mtype
    m.msg = m.message[mtype]

    if (m.mtype === 'protocolMessage' && m.msg?.key) {
      let key = m.msg.key
      if (key.remoteJid === 'status@broadcast') key.remoteJid = m.chat
      if (!key.participant || key.participant === 'status_me') key.participant = m.sender
      key.fromMe = conn.decodeJid(key.participant) === conn.decodeJid(conn.user.id)
      if (!key.fromMe && key.remoteJid === conn.decodeJid(conn.user.id))
        key.remoteJid = m.sender

      try {
        conn.ev.emit('message.delete', key)
      } catch (e) {
        console.error(e)
      }
    }

    if (m.quoted && !m.quoted.mediaMessage) delete m.quoted.download
    if (!m.mediaMessage) delete m.download
  }

  return m
}