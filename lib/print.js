import PhoneNumber from 'awesome-phonenumber';
import chalk from 'chalk';
import { watchFile } from 'fs';

const urlRegex = (await import('url-regex-safe')).default({ strict: false });

export default async function (m, conn = { user: {} }) {
  let senderName = await conn.getName(m.sender);
  let senderNumber = PhoneNumber('+' + m.sender.replace('@s.whatsapp.net', '')).getNumber('international');
  let chatName;
  
  let text = (m.text || '').replace(/\u200e+/g, '');
  if (text.length < 4096) {
    text = text.replace(urlRegex, url => chalk.blueBright(url));
    if (m.mentionedJid) {
      for (let jid of m.mentionedJid) {
        const name = await conn.getName(jid);
        text = text.replace('@' + jid.split('@')[0], chalk.blueBright('@' + name));
      }
    }
  }

  
  console.log(chalk.yellowBright(`
╭───────────────────────────────⬣
│ Naruto-bot:💬  ${chalk.cyan(text)}
╰───────────────────────────────────⬣
`.trim()));

  console.log();
}

let file = global.__filename(import.meta.url);
watchFile(file, () => {
  console.log(chalk.redBright("🔄 Se actualizó 'lib/print.js'"));
});