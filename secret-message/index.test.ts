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
const store = new Map<string, string>()

before(async () => {
	ganache = await launchGanache(7545)
	stub(lockup, 'createLockupContract').callsFake(() => () => ({
		getValue: async (address: string) => store.get(address)
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
	store.set(property, '1000000000000000000')
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

test('returns a response with status code 402 when sent from an account that staking to specified property is less than 1 DEV', async t => {
	const { provider, messages, signature } = prepare({
		message: 'Hello World'
	})
	const property = '0x2C55AFeDC55525f974D23E9FE410478aF8a0F6Ce'

	store.set(property, '999999999999999999')

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
		status: 402,
		body: ''
	})
})

test('returns a response with status code 404 when a property address is not founded in the stored messages', async t => {
	const { provider, messages, signature, property } = prepare({
		message: 'Hello World'
	})
	const msg = messages.find(({ address }) => address === property)
	msg.address = '0x000'

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
		status: 404,
		body: ''
	})
})
