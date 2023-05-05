import { useViteConfig } from './vite';
const path = require('path');

export default useViteConfig((mode, env) => {
    return {
        entry: path.resolve(__dirname, `src/${mode}.ts`),
        formats: ['cjs'],
        fileName: () => `${mode}.js`
    };
});
