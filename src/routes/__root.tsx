import { Suspense, lazy } from 'react'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : lazy(() =>
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    )

export const Route = createRootRoute({
    component: () => (
        <>
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">
                    Blueprint Playground
                </Link>{' '}
        <Link to="/history" className="[&.active]:font-bold">
                    History
                </Link>
            </div>
            <hr />
            <Outlet />
      <Suspense>
            <TanStackRouterDevtools />
      </Suspense>
        </>
    ),
})