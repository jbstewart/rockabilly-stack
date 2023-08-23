import { setupServer } from 'msw/node'

import '~/utils/utils'

const server = setupServer()

server.listen({ onUnhandledRequest: 'bypass' })
console.info('🔶 Mock server running')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
