import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { info } from 'melchior'
import { fastify } from 'fastify'

const app = process.env.MAIN_CONTAINER ? null : fastify()

export const bootstrapGQLServer = async () => {
  const { schema } = await import('./graphql.js')

  const server = new ApolloServer({ schema })
  return startStandaloneServer(server, {
    listen: { port: process.env.PORT ? parseInt(process.env.PORT) : 6788 },
    context: async () => ({ prisma: _brklyn.db })
  }).then((d) => {
    info('graphql', `server started @ ${d.url}`)
  })
}

export const bootstrap = async () => {
  if (process.env.MAIN_CONTAINER || process.env.RUN_GQL) {
    await bootstrapGQLServer()
  } else {
    info('networking', 'starting webhook server')
    const webhook = _brklyn.webhookCallback(`/telegraf/${process.env.WEBHOOK_PATH || _brklyn.secretPathComponent()}`, {
      secretToken: undefined
    })

    app!.post(`/telegraf/${process.env.WEBHOOK_PATH || _brklyn.secretPathComponent()}`, (req, res) => {
      res.status(200).send()
      webhook(req, res).then(() => 0)
    })

    app!.get('/status', async (_, res) => {
      const stat = await _brklyn.isBotHealthy()

      // 4xx for false, 200 for true
      res.status(stat ? 200 : 404).send()
    })

    app!.listen({ port: process.env.PORT ? parseInt(process.env.PORT) : 80, host: '0.0.0.0' })
      .then(() => info('networking', `webhook started @ ${process.env.PORT || 80}`))
  }
}
