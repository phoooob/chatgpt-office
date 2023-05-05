import { ConfigEnv, defineConfig, loadEnv } from 'vite';
import eslintPlugin from 'vite-plugin-eslint';

const path = require('path');

export function useViteConfig(useLib: Function) {
    // @ts-ignore
    return defineConfig(({ mode, command }: ConfigEnv) => {
        const envPrefix = ['FEISHU_', 'OPENAI_', 'POST_'];
        const env = loadEnv(mode, './', envPrefix);
        return {
            envPrefix,
            publicDir: `${mode}`,
            server: {
                host: '0.0.0.0',
                port: 8086
            },
            build: {
                emptyOutDir: true,
                outDir: 'dist',
                minify: false,
                lib: useLib(mode, env),
                rollupOptions: {
                    external: ['@larksuiteoapi/node-sdk', 'aircode', 'openai', 'gpt-3-encoder', 'axios']
                }
            },
            plugins: [
                {
                    ...eslintPlugin({
                        include: ['src/**/*.js', 'src/**/*.vue', 'src/**/*.ts'],
                        exclude: ['./node_modules/**'],
                        cache: false
                    }),
                    apply: 'serve'
                }
            ],
            resolve: {
                alias: {
                    '@': path.resolve(process.cwd(), 'src')
                },
                extensions: ['.js', '.vue', '.json', '.scss', '*']
            }
        };
    });
}
