import { Suspense, lazy } from 'react'
import { createRootRoute, Link, Outlet } from '@tanstack/react-router'
import {Background, Panel} from "../components/ui";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null // Render nothing in production
  : lazy(() =>
      import('@tanstack/router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    )

export const Route = createRootRoute({
    component: () => (
    <Background>
      <Panel>
        <nav style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
          <Link
            to="/"
            style={{
              color: '#7dcaed',
              textDecoration: 'none'
            }}
            activeProps={{
              style: {
                color: '#ffe6c0',
                fontWeight: 'bold'
              }
            }}
          >
                    Blueprint Playground
          </Link>
          <span style={{ color: '#7dcaed' }}>|</span>
          <Link
            to="/history"
            style={{
              color: '#7dcaed',
              textDecoration: 'none'
            }}
            activeProps={{
              style: {
                  color: '#ffe6c0',
                  fontWeight: 'bold'
              }
            }}
          >
              History
          </Link>
        </nav>
      </Panel>

        <div style={{ marginTop: '12px' }}>
            <Outlet />
        </div>

        <Suspense>
            <TanStackRouterDevtools />
        </Suspense>
    </Background>
    ),
})