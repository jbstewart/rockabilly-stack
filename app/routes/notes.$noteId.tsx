import type { ActionFunction, LoaderFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, isRouteErrorResponse, useLoaderData, useRouteError } from '@remix-run/react'
import invariant from 'tiny-invariant'

import type { Note } from '~/models/note.server'
import { deleteNote , getNote } from '~/models/note.server'
import { requireUserId } from '~/session.server'
import { getMessageFromError } from '~/utils'

type LoaderData = {
	note: Note
}

export const loader: LoaderFunction = async ({ request, params }) => {
	const userId = await requireUserId(request)
	invariant(params.noteId, 'noteId not found')

	const note = await getNote({ userId, id: params.noteId })
	if (!note) {
		throw new Response('Not Found', { status: 404 })
	}
	return json<LoaderData>({ note })
}

export const action: ActionFunction = async ({ request, params }) => {
	const userId = await requireUserId(request)
	invariant(params.noteId, 'noteId not found')

	await deleteNote({ userId, id: params.noteId })

	return redirect('/notes')
}

export default function NoteDetailsPage() {
	const data = useLoaderData<LoaderData>()

	return (
		<div>
			<h3 className="text-2xl font-bold">{data.note.title}</h3>
			<p className="py-6">{data.note.body}</p>
			<hr className="my-4" />
			<Form method="post">
				<button
					type="submit"
					className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
				>
					Delete
				</button>
			</Form>
		</div>
	)
}

export function ErrorBoundary() {
	const error = useRouteError()
	console.error(error)

	if (isRouteErrorResponse(error)) {
		if (error.status == 404) {
			return <div>Note not found</div>
		}
		return <div>`Error: ${error.status}: ${error.statusText}`</div>
	}
	else {
		const message = getMessageFromError(error)
		return <div>`An unexpected error occurred: ${message}`</div>
	}
}

