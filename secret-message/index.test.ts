/* eslint-disable accessor-pairs */
import test, { before, after } from 'ava'
import { Context, HttpRequest } from '@azure/functions'
import * as lockup from '@dev-protocol/dev-kit-js/esm/lockup'
import { ChildProcess } from 'child_process'
import { stub } from 'sinon'
import { launchGanache } from '../utils/test'
import Web3 from 'web3'
import { httpTrigger, SecretMessages } from '.'
import { cipher } from '../utils/crypto'

const context = (resolve: (value?: unknown) => void): Context =>
	(({
		set res(v: any) {
			resolve(v)
		}
	} as unknown) as Context)
const req = (data: any): HttpRequest => (data as unknown) as HttpRequest

let ganache: ChildProcess
let getValueReturns = '1000000000000000000'

before(async () => {
	ganache = await launchGanache(7545)
	stub(lockup, 'createLockupContract')
		.onCall(0)
		.returns(() => ({
			getValue: async () => getValueReturns
		}))
})

after(() => {
	process.kill(ganache.pid)
})

const prepare = ({
	provider = 'ws://localhost:7545',
	message
}: {
	provider?: string
	message: string
}): {
	provider: string
	messages: SecretMessages
	signature: string
	property: string
} => {
	const web3 = new Web3(provider)
	const account = web3.eth.accounts.create()
	const { signature } = account.sign('hello')
	const property = '0x3EE1dF804544B2326b827AE30dDC9A93C35002D5'
	const ciphertext = cipher(message, 'password')
	const messages = [{ address: property, ciphertext }]
	process.env.CIPHER_KEY = 'password'
	return {
		provider,
		messages,
		signature,
		property
	}
}

test('returns deciphered text', async t => {
	const { provider, messages, signature, property } = prepare({
		message: 'Hello World'
	})

	const res = await new Promise(resolve => {
		httpTrigger(messages)(
			context(resolve),
			req({
				query: {
					property
				},
				body: {
					provider,
					signature
				}
			})
		)
	})

	t.deepEqual(res, {
		status: 200,
		body: 'Hello World'
	})
})

test('returns a response with status code 400 when property address is not founded in the query string', async t => {
	const { provider, messages, signature } = prepare({
		message: 'Hello World'
	})

	const res = await new Promise(resolve => {
		httpTrigger(messages)(
			context(resolve),
			req({
				query: {},
				body: {
					provider,
					signature
				}
			})
		)
	})

	t.deepEqual(res, {
		status: 400,
		body: ''
	})
})

test('returns a response with status code 400 when a provider is not founded in the request body', async t => {
	const { messages, signature, property } = prepare({
		message: 'Hello World'
	})

	const res = await new Promise(resolve => {
		httpTrigger(messages)(
			context(resolve),
			req({
				query: {
					property
				},
				body: {
					signature
				}
			})
		)
	})

	t.deepEqual(res, {
		status: 400,
		body: ''
	})
})
