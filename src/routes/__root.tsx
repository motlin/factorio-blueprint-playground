import {lazy, Suspense} from 'react'
import {createRootRoute, Link, Outlet} from '@tanstack/react-router'

const TanStackRouterDevtools = import.meta.env.PROD
    ? () => null // Render nothing in production
    : lazy(() =>
        import('@tanstack/router-devtools').then((res) => ({
            default: res.TanStackRouterDevtools,
        })),
    )

export const Route = createRootRoute({
    component: () => (
        <div>
            <div className="top-bar">
                <div className='top-bar-inner'>
                    <nav className="flex flex-items-baseline p8">
                        <Link
                            to="/"
                            className="blue nowrap fs110"
                            activeProps={{
                                className: 'yellow bold'
                            }}
                        >
                            Blueprint Playground
                        </Link>
                        <span className="separator">|</span>
                        <Link
                            to="/history"
                            className="blue nowrap fs110"
                            activeProps={{
                                className: 'yellow bold'
                            }}
                        >
                            History
                        </Link>
                    </nav>
                </div>
            </div>

            <div className="container mt12">
                <Outlet/>
            </div>

            <Suspense>
                <TanStackRouterDevtools/>
            </Suspense>
        </div>
    ),
})