import { areJidsSameUser, proto, jidNormalizedUser, getContentType } from '@whiskeysockets/baileys'

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
      ? parseQuoted(m)
      : null
  }

  m.text = m.body || ''
  m.download = () => conn.downloadAndSaveMediaMessage(m)

  return m
}

function getText(msg) {
  if (!msg) return ''
  if (typeof msg === 'string') return msg
  if (msg.text) return msg.text
  if (msg.caption) return msg.caption
  if (msg.conversation) return msg.conversation
  return ''
}

function parseQuoted(m) {
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
    delete: () => m.conn.sendMessage(m.chat, { delete: q.key }),
    download: () => m.conn.downloadAndSaveMediaMessage({ message: { [type]: msg } }),
  }

  return q
}