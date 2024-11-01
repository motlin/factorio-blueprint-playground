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
        <nav style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px',
            fontSize: '110%',
            padding: '8px'
        }}>
            <Link
                to="/"
                style={{
                    color: '#7dcaed',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '110%'
                }}
                activeProps={{
                    style: {
                        color: '#ffe6c0',
                        fontWeight: 'bold',
                        textDecoration: 'none'
                    }
                }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
                Blueprint Playground
            </Link>
            <span style={{
                color: '#7dcaed',
                userSelect: 'none',
                cursor: 'default',
                margin: '0 8px'
            }}>|</span>
            <Link
                to="/history"
                style={{
                    color: '#7dcaed',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: '110%'
                }}
                activeProps={{
                    style: {
                        color: '#ffe6c0',
                        fontWeight: 'bold',
                        textDecoration: 'none'
                    }
                }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
                History
            </Link>
        </nav>

        <div style={{marginTop: '12px'}}>
            <Outlet/>
        </div>

        <Suspense>
            <TanStackRouterDevtools/>
        </Suspense>
    </Background>
    ),
})