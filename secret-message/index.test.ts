/* eslint-disable accessor-pairs */
import test, { before, after } from 'ava'
import { Context, HttpRequest } from '@azure/functions'
import { ChildProcess } from 'child_process'
import { launchGanache } from '../utils/test'
import Web3 from 'web3'
import httpTrigger from '.'

const context = (resolve: (value?: unknown) => void): Context =>
	(({
		set res(v: any) {
			resolve(v)
		}
	} as unknown) as Context)
const req = (data: any): HttpRequest => (data as unknown) as HttpRequest

let ganache: ChildProcess

before(async () => {
	ganache = await launchGanache(7545)
})

after(() => {
	process.kill(ganache.pid)
})

test('this is just a prototype', async t => {
	const provider = 'ws://localhost:7545'
	const web3 = new Web3(provider)
	const account = web3.eth.accounts.create()
	const { signature } = account.sign('hello')

	const res = await new Promise(resolve => {
		httpTrigger(
			context(resolve),
			req({
				body: {
					provider,
					signature: `${signature}`
				}
			})
		)
	})

	t.deepEqual(res, {
		status: 200,
		body: account.address
	})
})
