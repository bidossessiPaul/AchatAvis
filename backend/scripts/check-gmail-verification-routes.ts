import axios from 'axios';

process.env.VERCEL = process.env.VERCEL || '1';

type RouteEntry = {
    base: string;
    path: string;
    methods: string[];
};

type ExpectedRoute = {
    baseIncludes: string;
    path: string;
    method: string;
    label: string;
};

type Probe = {
    method: 'get' | 'post';
    url: string;
    label: string;
};

const EXPECTED_ROUTES: ExpectedRoute[] = [
    {
        baseIncludes: 'api\\/anti-detection',
        path: '/gmail-accounts/:accountId/verify',
        method: 'post',
        label: 'Guide Gmail verification submit',
    },
    {
        baseIncludes: 'api\\/anti-detection',
        path: '/gmail-accounts/:accountId/verification-status',
        method: 'get',
        label: 'Guide Gmail verification status',
    },
    {
        baseIncludes: 'api\\/admin',
        path: '/gmail-verifications',
        method: 'get',
        label: 'Admin Gmail verifications list',
    },
];

function collectMountedRoutes(app: any): RouteEntry[] {
    const stack = app?._router?.stack || [];

    return stack
        .filter((layer: any) => layer.name === 'router')
        .flatMap((routerLayer: any) => {
            const base = routerLayer.regexp?.toString?.() || '';
            return (routerLayer.handle?.stack || [])
                .filter((nestedLayer: any) => nestedLayer.route)
                .map((nestedLayer: any) => ({
                    base,
                    path: nestedLayer.route.path,
                    methods: Object.keys(nestedLayer.route.methods || {}),
                }));
        });
}

function assertLocalRoutes(routes: RouteEntry[]) {
    const missing = EXPECTED_ROUTES.filter((expected) => !routes.some((route) =>
        route.base.includes(expected.baseIncludes)
        && route.path === expected.path
        && route.methods.includes(expected.method)
    ));

    if (missing.length > 0) {
        console.error('Missing local Gmail verification routes:');
        for (const route of missing) {
            console.error(`- ${route.label}: ${route.method.toUpperCase()} ${route.path}`);
        }
        process.exit(1);
    }

    console.log('Local Gmail verification routes are mounted.');
}

async function probeLiveRoutes(baseUrl: string) {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const probes: Probe[] = [
        {
            method: 'get',
            url: `${cleanBaseUrl}/api/admin/gmail-verifications?status=pending`,
            label: 'Admin Gmail verifications list',
        },
        {
            method: 'post',
            url: `${cleanBaseUrl}/api/anti-detection/gmail-accounts/85/verify`,
            label: 'Guide Gmail verification submit',
        },
        {
            method: 'get',
            url: `${cleanBaseUrl}/api/anti-detection/gmail-accounts/85/verification-status`,
            label: 'Guide Gmail verification status',
        },
    ];

    let failed = false;

    for (const probe of probes) {
        try {
            await axios.request({
                method: probe.method,
                url: probe.url,
                validateStatus: () => true,
                maxRedirects: 0,
            }).then((response) => {
                if (response.status === 404) {
                    failed = true;
                    console.error(`LIVE MISSING: ${probe.label} -> ${response.status} ${probe.url}`);
                    return;
                }
                console.log(`LIVE OK: ${probe.label} -> ${response.status} ${probe.url}`);
            });
        } catch (error: any) {
            failed = true;
            console.error(`LIVE ERROR: ${probe.label} -> ${error.message}`);
        }
    }

    if (failed) {
        process.exit(1);
    }
}

async function main() {
    const { default: app } = await import('../src/app');
    const routes = collectMountedRoutes(app);

    assertLocalRoutes(routes);

    const liveBaseUrl = process.env.BACKEND_BASE_URL;
    if (liveBaseUrl) {
        await probeLiveRoutes(liveBaseUrl);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
