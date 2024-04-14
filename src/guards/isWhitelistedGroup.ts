import { BotContext } from '../types/context.js'

export default async (ctx: BotContext) => {
  // if this doesn't have a message, return
  if (!ctx.message) return

  const config = await _brklyn.db.groupConfig.findFirst({ where: { groupId: ctx.chat!.id } })
  if ((config?.disabledCommands?.length || 0) > 0) {
    // @ts-ignore
    const commandName = ctx.message.text?.split(' ')[0].replace('/', '').split('@')[0].toLowerCase()
    if (config?.disabledCommands?.includes(commandName)) {
      return false
    }
  }

  if (process.env.ALLOW_FULL_GLOBAL_USAGE) return true
  if (ctx.chat?.id === -1002058397651 || ctx.chat?.id === -1002096118477 || ctx.chat?.id === -1001945644138 || ctx.chat?.id === -1001786847999) {
    return true
  }

  if (ctx.chat?.type === 'private') {
    return true
  }

  if (await _brklyn.db.groupDrawLock.findFirst({ where: { groupId: ctx.chat!.id } })) {
    return true
  }

  // if this is the beta bot and it's a dm, return true
  // @ts-ignore
  if (process.env.RUN_BETA && ctx.chat?.type === 'private') {
    return true
  }

  await ctx.reply(`Atualmente, este comando só pode ser executado nos grupos de testes!\n\nPara usá-los, considere doar para a Giraê, ou aguarde o lançamento oficial.`)
  return false
}
