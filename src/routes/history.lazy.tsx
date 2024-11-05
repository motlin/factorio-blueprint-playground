import {createLazyFileRoute} from '@tanstack/react-router';
import {InsetDark, InsetLight, Panel} from '../components/ui';

export const Route = createLazyFileRoute('/history')({
  component: History,
});

function History() {
  return (
    <Panel title="Blueprint History">
      <InsetLight>
        This panel will show your previously viewed blueprints. Each blueprint will be
        shown with its label, icons, and when you last viewed it. You'll be able to
        quickly reopen blueprints or download selections as a new blueprint book.
      </InsetLight>

      <InsetDark>
        No blueprints in history yet. Paste a blueprint in the playground to get started!
      </InsetDark>
    </Panel>
  );
}
