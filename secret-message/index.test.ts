/* eslint-disable accessor-pairs */
import test from 'ava'
import { Context, HttpRequest } from '@azure/functions'
import httpTrigger from '.'

const context = (res: (value: any) => void): Context =>
	(({
		set res(v: any) {
			res(v)
		}
	} as unknown) as Context)

const req = (data: any): HttpRequest => (data as unknown) as HttpRequest

test('returns value', async t => {
	await httpTrigger(
		context(data => {
			t.deepEqual(data, {
				body: 'Hello Alice'
			})
		}),
		req({
			query: {
				name: 'Alice'
			}
		})
	)
})
