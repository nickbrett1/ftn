        kit: {
                adapter: adapter({
                        platformProxy: {
                                enabled: true
                        },
                        build: {
                                rollupOptions: {
                                        external: [
                                                'clsx', '@sveltejs/kit', '@sveltejs/kit/internal', '@sveltejs/kit/internal/server',
                                                'devalue', 'cookie', 'set-cookie-parser', 'nanoid', 'nanoid/non-secure', 'dequal',
                                                '@floating-ui/dom', 'focus-trap', 'mitt', 'camera-controls', 'three-viewport-gizmo',
                                                'three-mesh-bvh', '@threejs-kit/instanced-sprite-mesh', 'linkify-it', 'llama-api-client'
                                        ]
                                }
                        }
                }),