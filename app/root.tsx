import type { LinksFunction, LoaderFunction } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'

import tailwindStylesheetUrl from './styles/tailwind.css'
import { getUser } from './session.server'

export const links: LinksFunction = () => {
	return [{ rel: 'stylesheet', href: tailwindStylesheetUrl }]
}

export const meta: () => [{ title: string; content: string }, { name: string; content: string }, {
	name: string;
	content: string
}] = () => {
	return [
		{ title: 'charset', content: 'Remix Notes' },
		{ name: 'charset', content: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width,initial-scale=1' },
	]
}

type LoaderData = {
	user: Awaited<ReturnType<typeof getUser>>
}

export const loader: LoaderFunction = async ({ request }) => {
	return json<LoaderData>({
		user: await getUser(request),
	})
}

export default function App() {
	return (
		<html lang="en" className="h-full">
			<head>
				<Meta />
				<Links />
			</head>
			<body className="h-full">
				<Outlet />
				<ScrollRestoration />
				<Scripts />
				<LiveReload />
			</body>
		</html>
	)
}
