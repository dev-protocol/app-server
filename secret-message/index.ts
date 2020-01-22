import { AzureFunction, Context, HttpRequest } from '@azure/functions'

const httpTrigger: AzureFunction = async function(
	context: Context,
	req: HttpRequest
): Promise<void> {
	context.res = {
		body: `Hello ${req.query?.name}`
	}
}

export default httpTrigger
