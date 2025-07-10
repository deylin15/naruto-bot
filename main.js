console.log(chalk.bold.redBright(`\n Iniciando Naruto-bot ⑇⑇⑇⑇⑇⑇⑇⑇⑇⑇⑇⑇\n`))

say('Naruto', {
  font: 'block',
  align: 'center',
  colors: ['yellowBright', 'redBright', 'yellow']
})

say(`Developed By ° Deylin`, {
font: 'console',
align: 'center',
colors: ['blueBright']
})

opcion = await question(colores('┏━━━━━━━━━━━━━━━━━━━━⌬\n┃ Seleccione una opción:\n┗━━━━━━━━━━━━━━━━━━━⌬\n') + opcionQR('┏━━━━━━━━━━━━━━━⍰\n┃1. Con código QR\n') + opcionTexto('┃2. Con código de texto de 8 dígitos\n┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⍰\n--> '))