import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/history')({
  component: History,
})

function History() {
  return <div className="p-2">Blueprint History</div>
}
