import { execSync } from 'child_process'

let handler = async (m, { conn, args }) => {
  try {
    
    const command = 'git pull' + (args.length ? ' ' + args.join(' ') : '')
    const output = execSync(command).toString()
    const isUpdated = /Already up(?:-)?to(?:-)?date/i.test(output)

    const response = isUpdated
      ? '🍜 ¡El Hokage informa que el bot ya está al día!\nNo se detectaron nuevos jutsus.'
      : `🍥 ¡Actualización completada con éxito!\n\n` +
        '🌀 Nuevos jutsus aplicados:\n\n' +
        '```' + output.trim() + '```'

    return await conn.reply(m.chat, response, m)

  } catch (error) {
    try {
      
      const statusOutput = execSync('git status --porcelain').toString().trim()
      if (statusOutput) {
        const conflictedFiles = statusOutput
          .split('\n')
          .filter(line =>
            !line.includes('pikachuSession/') &&
            !line.includes('.cache/') &&
            !line.includes('tmp/') &&
            line[0] !== '?'
          )

        if (conflictedFiles.length > 0) {
          const conflictMsg = `⚠️ ¡Alerta de conflicto en los archivos secretos de Konoha!\n\n` +
            conflictedFiles.map(f => '🗂️ ' + f.slice(3)).join('\n') +
            `\n\n👊 Usa el poder del ninja y resuelve los conflictos o reinstala el bot.`

          return await conn.reply(m.chat, conflictMsg, m)
        }
      }
    } catch (statusError) {
      console.error('⛩️ [Error al revisar conflictos]', statusError)
    }

    console.error('💀 [Error al ejecutar git pull]', error)
    return await conn.reply(m.chat, `❌ ¡Falló el jutsu de actualización!\n\n📛 Detalle: ${error.message || 'Error desconocido del mundo shinobi.'}`, m)
  }
}

handler.help = ['update', 'actualizar']
handler.tags = ['owner']
handler.command = ['update', 'actualizar', 'up']
handler.rowner = true

export default handler