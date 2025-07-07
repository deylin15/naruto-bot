// © Código adaptado por Deylin - https://github.com/Deylin-Eliac

import { join, dirname } from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
import { watchFile, unwatchFile } from 'fs'
import cfonts from 'cfonts'
import readline from 'readline'
import yargs from 'yargs'
import chalk from 'chalk'

console.log(chalk.cyan('\n✦ Iniciando Naruto-Bot ✦'))

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)
const { name, version, author } = require(join(__dirname, './package.json'))

cfonts.say('NARUTO - BOT', {
  font: 'block',
  align: 'center',
  colors: ['yellowBright']
})

cfonts.say(`Multi Device`, {
  font: 'chrome',
  align: 'center',
  colors: ['orange']
})

cfonts.say(`Creado por Deylin`, {
  font: 'console',
  align: 'center',
  colors: ['blueBright']
})

let isRunning = false

function start(entryFile) {
  if (isRunning) return
  isRunning = true

  const args = [join(__dirname, entryFile), ...process.argv.slice(2)]

  cfonts.say(`→ ${process.argv[0]} ${args.join(' ')}`, {
    font: 'console',
    align: 'center',
    colors: ['candy']
  })

  setupMaster({ exec: args[0], args: args.slice(1) })
  const child = fork()

  child.on('message', msg => {
    if (msg === 'reset') {
      child.kill()
      isRunning = false
      start(entryFile)
    } else if (msg === 'uptime') {
      child.send(process.uptime())
    }
  })

  child.on('exit', (code) => {
    isRunning = false
    console.error(chalk.red(`⛔ Error de ejecución (${code})`))
    if (code !== 0) {
      watchFile(args[0], () => {
        unwatchFile(args[0])
        start(entryFile)
      })
    } else {
      process.exit()
    }
  })

  const rl = readline.createInterface(process.stdin, process.stdout)
  const opts = yargs(process.argv.slice(2)).exitProcess(false).parse()

  if (!opts.test) {
    rl.on('line', line => {
      child.emit('message', line.trim())
    })
  }
}

process.on('warning', warning => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn(chalk.red('🚨 Listener máximo excedido:\n'), warning.stack)
  }
})

start('main.js')