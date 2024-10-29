import { createLazyFileRoute } from '@tanstack/react-router'

export const Route = createLazyFileRoute('/')({
  component: BlueprintPlayground,
})

function BlueprintPlayground() {
  return (
    <div className="p-2">
      <h1>Blueprint Playground</h1>
    </div>
  )
}
