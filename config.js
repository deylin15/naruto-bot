import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone' 

//*⛩️━━━━━━━━━━━━━━━⛩️*
//🌀 Naruto-Bot Config 🌀
//⚔️ Código secreto de Konoha
//*⛩️━━━━━━━━━━━━━━━⛩️*

// 👤 PROPIETARIOS Y ALDEANOS
global.owner = [
['50433191934', '🍥 Hokage Supremo', true]
//['numero', 'nombre', true],
];


global.mods = ['50433191934'];
global.suittag = ['50433191934'];
global.prems = [];


global.libreria = 'Baileys';
global.baileys = '@whiskeysockets/baileys';
global.nameqr = 'Naruto-Bot';
global.namebot = 'Naruto-Bit';
global.sessions = 'AldeaSessions';
global.jadi = 'ClonesJutsu';
global.pikaJadibts = true;


global.packname = '🌀 Naruto-Bot MD';
global.botname = '🍥 Naruto-Bot 🍥';
global.wm = 'Konoha-MD';
global.dev = '🔥 Desarrollado por Deylin del Clan Uzumaki';
global.textbot = 'Naruto-Bot • Chakra de Deylin';
global.etiqueta = 'Clan Shinobi 🍥';


global.moneda = 'ramens';


global.catalogo = fs.readFileSync('./src/catalogo.jpg');
global.photoSity = [catalogo];


global.gp1 = 'https://chat.whatsapp.com/F8KwM3rVqkS9HhR5msoRqQ'
global.channel2 = 'https://whatsapp.com/channel/0029VayQwPsFnSzESZJ9Us3z'
global.md = 'https://github.com/Deylin-Eliac/Naruto-Bot'
global.correo = 'deylibaquedano801@gmail.com'
global.cn = 'https://whatsapp.com/channel/0029VawF8fBBvvsktcInIz3m';


global.catalogo = fs.readFileSync('./src/catalogo.jpg');
global.estilo = { 
  key: {  
    fromMe: false, 
    participant: `0@s.whatsapp.net`, 
    ...(false ? { remoteJid: "5219992095479-1625305606@g.us" } : {}) 
  }, 
  message: { 
    orderMessage: { 
      itemCount : -999999, 
      status: 1, 
      surface : 1, 
      message: packname, 
      orderTitle: 'Kage Bunshin no Jutsu', 
      thumbnail: catalogo, 
      sellerJid: '0@s.whatsapp.net'
    }
  }
};

global.ch = {
  ch1: '120363365444927738@newsletter',
}


global.MyApiRestBaseUrl = 'https://api.cafirexos.com';
global.MyApiRestApikey = 'BrunoSobrino';
global.openai_org_id = 'org-3';
global.openai_key = 'sk-0';
global.keysZens = ['LuOlangNgentot', 'c2459db922', '37CC845916', '6fb0eff124', 'hdiiofficial', 'fiktod', 'BF39D349845E', '675e34de8a', '0b917b905e6f'];
global.keysxxx = keysZens[Math.floor(keysZens.length * Math.random())];
global.keysxteammm = ['29d4b59a4aa687ca', '5LTV57azwaid7dXfz5fzJu', 'cb15ed422c71a2fb', '5bd33b276d41d6b4', 'HIRO', 'kurrxd09', 'ebb6251cc00f9c63'];
global.keysxteam = keysxteammm[Math.floor(keysxteammm.length * Math.random())];
global.keysneoxrrr = ['5VC9rvNx', 'cfALv5'];
global.keysneoxr = keysneoxrrr[Math.floor(keysneoxrrr.length * Math.random())];
global.lolkeysapi = ['kurumi'];
global.itsrose = ['4b146102c4d500809da9d1ff'];


let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("🩸 ¡Archivo 'config.js' actualizado! (Modo sabio activado)"))
  import(`${file}?update=${Date.now()}`)
})