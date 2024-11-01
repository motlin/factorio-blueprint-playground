import { createLazyFileRoute } from '@tanstack/react-router'
import {Panel} from "../components/ui";

export const Route = createLazyFileRoute('/history')({
  component: History,
})

function History() {
  return (
    <Panel title="Blueprint History">
      <div style={{
        color: '#fff',
        lineHeight: 1.25
      }}>
        Your previously viewed blueprints will appear here.
      </div>
    </Panel>
  )
}
