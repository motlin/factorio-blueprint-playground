import { createLazyFileRoute } from '@tanstack/react-router';

import { BlueprintPlayground } from '../components/BlueprintPlayground';

export const Route = createLazyFileRoute('/')({
  component: BlueprintPlayground,
});
