import { resetAllDailies, resetAllDraws, resetAllReps } from '../utilities/engine/users.js'
import * as cron from 'cron'
import { msToDate } from '../utilities/misc.js'
import { debug, error } from 'melchior'
import { getNewCardsInOldSubcategories, getSubcategoriesCreatedInLastNHours, notifySubcategoryCreation, notifySubcategoryModification } from './functions/changelog.js'

export const REP_CRON = '0 0 */12 * * *'
export const DRAW_CRON = '0 0 */3 * * *'
export const DAILY_CRON = '0 0 0 * * *'
export const CREATE_EDIT_SUBCATEGORY_CRON = '0 0 */2 * * *'
export const CARD_MODIFICATIONS_CRON = '0 0 0 * * *'

export class Sidecar {
  draws: cron.CronJob | undefined
  reps: cron.CronJob | undefined
  dailies: cron.CronJob | undefined
  drawCooldowns: cron.CronJob | undefined
  createEditSubcategory: cron.CronJob | undefined

  scheduleAll () {
    // reset reps is every 6h
    this.reps = new cron.CronJob(REP_CRON, () => this.resetReps(), null, true, 'America/Sao_Paulo')
    this.draws = new cron.CronJob(DRAW_CRON, () => this.increaseUserDraws(), null, true, 'America/Sao_Paulo')
    this.dailies = new cron.CronJob(DAILY_CRON, () => this.resetDailies(), null, true, 'America/Sao_Paulo')
    this.createEditSubcategory = new cron.CronJob(CREATE_EDIT_SUBCATEGORY_CRON, () => this.generateCardLog(), null, true, 'America/Sao_Paulo')

    setTimeout(() => this.deleteDrawCooldowns(), 10_000)
  }

  async deleteDrawCooldowns () {
    await _brklyn.cache.clearNamespace('draw_cooldowns')
  }

  async resetUserStuff () {
    debug('sidecar', 'called resetUserStuff')
    await resetAllDailies()
    await resetAllReps()
    await resetAllDraws()
  }

  async increaseUserDraws () {
    debug('sidecar', 'called increaseUserDraws')
    await _brklyn.db.$executeRaw`UPDATE "User" SET "usedDraws" = "usedDraws" - 1 WHERE "usedDraws" > 0 AND "isPremium" = false`
    await _brklyn.db.$executeRaw`UPDATE "User" SET "usedDraws" = "maximumDraws" - 1 WHERE "usedDraws" >= "maximumDraws" AND "isPremium" = false`

    // for premium, decrease 2
    await _brklyn.db.$executeRaw`UPDATE "User" SET "usedDraws" = "usedDraws" - 2 WHERE "usedDraws" > 0 AND "isPremium" = true`
    await _brklyn.db.$executeRaw`UPDATE "User" SET "usedDraws" = "maximumDraws" - 3 WHERE "usedDraws" >= "maximumDraws" AND "isPremium" = true`
  }

  async findExpiredSubscriptions () {
    const users = await _brklyn.db.donator.findMany({ where: { expiresAt: { lt: new Date() }, cancelled: false }, include: { user: true } })
    for (const user of users) {
      // if there are no more subscriptions, remove premium
      const subs = await _brklyn.db.donator.findMany({ where: { userId: user.userId } })
      if (subs.filter((s) => s.expiresAt > new Date()).length === 0) {
        await _brklyn.db.user.update({ where: { id: user.userId }, data: { isPremium: false, maximumDraws: 12 } })
        await _brklyn.telegram.sendMessage(user.user.tgId.toString(), 'Seu plano premium expirou. Obrigado por apoiar a Giraê! 💗')
      }
      await _brklyn.db.donator.update({ where: { id: user.id }, data: { cancelled: true } })
    }
  }

  async resetReps () {
    await _brklyn.db.user.updateMany({ data: { hasGivenRep: false } })
  }

  resetDailies () {
    return resetAllDailies()
  }

  async generateCardLog () {
    const newSubcategories = await getSubcategoriesCreatedInLastNHours(2)
    for (const subcategory of newSubcategories) {
      await notifySubcategoryCreation(subcategory).catch((e) => {
        error('sidecar', 'error while notifying subcategory creation: '+ e.stack)
      })
    }

    const subs = await getNewCardsInOldSubcategories(2)
    for (const sub of subs) {
      await notifySubcategoryModification(sub).catch((e) => {
        error('sidecar', 'error while notifying subcategory modification: '+ e.stack)
      })
    }
  }

  willRunIn (expr: string) {
    return msToDate(cron.timeout(expr))
  }
}
