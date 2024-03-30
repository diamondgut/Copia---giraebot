import { MEDAL_MAP } from '../constants.js'
import { BotContext } from '../types/context.js'
import { getCardByID } from '../utilities/engine/cards.js'
import { getUserCardsCount } from '../utilities/engine/users.js'
import { pluralize } from '../utilities/misc.js'
import { escapeForHTML } from '../utilities/responses.js'
import { getMentionedTgUser, getMentionedUser } from '../utilities/telegram.js'

export default async (ctx: BotContext) => {
  if (ctx.args[0]?.startsWith?.('edit')) {
    const text = `<b>🖼 Como editar o perfil?</b>\n\n/fav - define sua carta favorita (exemplo: <code>/fav ningning</code>)
/bio - define sua biografia (exemplo: <code>/bio eu amo a ningning</code>)
/color - define sua cor favorita (exemplo: <code>/color #ff0000</code>)`
    return ctx.replyWithHTML(text)
  }

  const tgUser = await getMentionedTgUser(ctx, ctx.args[0])
  const userD = await getMentionedUser(ctx, ctx.args[0])
  if (!tgUser || !userD) {
    return ctx.reply('O usuário não foi encontrado. 😔\nEle já usou a bot?')
  }

  const completeUserData = await _brklyn.db.userProfile.findFirst({
    where: {
      userId: userD.id
    },
    include: {
      background: true,
      favoriteCard: true,
      stickers: true
    }
  })
  if (!completeUserData) {
    return ctx.reply('Desculpe, não consegui encontrar o perfil desse usuário. 😔')
  }

  // get favorite card
  const favoriteCard = await getCardByID(completeUserData!.favoriteCard?.cardId)

  const dittoData = await _brklyn.ditto.generateProfile(userD, completeUserData, favoriteCard, tgUser)
  if (!dittoData?.url) {
    return ctx.reply('Desculpe, não consegui gerar a imagem do perfil. 😔\nTente novamente mais tarde. Se o problema persistir, entre em contato com meu suporte, em @giraesupport.')
  }

  const favCardText = favoriteCard ? `\n\n${MEDAL_MAP[favoriteCard.rarity.name]} <code>${favoriteCard.id}</code>. <b>${favoriteCard.name}</b>\n${favoriteCard.category.emoji} <i>${favoriteCard.subcategory!.name}</i>` : ''

  await ctx.replyWithPhoto(dittoData.url, {
    caption: `🖼 <code>${userD.id}</code>. <b>${escapeForHTML(tgUser.first_name)}</b>

🌠 <b>Reputação</b> - <i>${pluralize(completeUserData.reputation, 'ponto')}</i>
🃏 <b>Cartas</b> - <i>${pluralize(await getUserCardsCount(userD.id), 'colecionável', 'is', 1)}</i>
💸 <b>Moedas</b> - <i>${pluralize(userD.coins, 'moeda')}</i>
🎲 <b>Giros</b> - <i>${pluralize(userD.maximumDraws - userD.usedDraws, 'giro')} sobrando</i>${favCardText}

<i>dica: use <code>/perfil editar</code> para aprender como customizar seu perfil</i>`,
    parse_mode: 'HTML'
  })

  return
}

export const info = {
  guards: ['hasJoinedGroup'],
  aliases: ['perfil', 'me', 'ppc', 'pf']
}
