import type { LinksFunction, LoaderFunction, MetaFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react'

import tailwindStylesheetUrl from './styles/tailwind.css'
import { getUser } from './session.server'
import type { Theme} from '~/utils/theme-provider';
import { ThemeBody, ThemeHead, ThemeProvider, useTheme } from '~/utils/theme-provider'
import { getThemeSession } from '~/utils/theme.server'

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindStylesheetUrl }]
}

export const meta: MetaFunction = () => ({
	charset: 'utf-8',
	title: 'Remix Notes',
	viewport: 'width=device-width,initial-scale=1',
})

type LoaderData = {
	user: Awaited<ReturnType<typeof getUser>>
	theme: Theme | null
}

export const loader: LoaderFunction = async ({ request }) => {
	const themeSession = await getThemeSession(request)

	const data: LoaderData = {
		theme: themeSession.getTheme(),
		user: await getUser(request),
	}

	return json<LoaderData>(data)
}

function App() {
	const data = useLoaderData<LoaderData>()
	const [theme] = useTheme()

	return (
		<html lang="en" className={theme ?? ''}>
		<head>
			<Meta />
			<Links />
			<ThemeHead ssrTheme={Boolean(data.theme)} />
		</head>
		<body>
		<Outlet />
		<ThemeBody ssrTheme={Boolean(data.theme)} />
		<ScrollRestoration />
		<Scripts />
		<LiveReload />
		</body>
		</html>
	)
}

export default function AppWithProviders() {
	const data = useLoaderData<LoaderData>()

	return (
		<ThemeProvider specifiedTheme={data.theme}>
			<App />
		</ThemeProvider>
	)
}
