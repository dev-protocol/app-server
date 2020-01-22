import { AzureFunction, Context, HttpRequest } from '@azure/functions'
import Web3 from 'web3'

const responseCreator = (context: Context) => (
	status = 200,
	body: string | object = ''
) => {
	context.res = {
		status,
		body
	}
}

const httpTrigger: AzureFunction = async function(
	context: Context,
	req: HttpRequest
): Promise<void> {
	const response = responseCreator(context)
	const { body } = req
	const { signature, provider } = body
	if (signature === undefined || provider === undefined) {
		return response(400)
	}

	const web3 = new Web3(provider)
	const account = web3.eth.accounts.recover('hello', signature)

	return response(200, account)
}

export default httpTrigger
