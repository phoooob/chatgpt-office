/**
 * 由于 vite 不再使用传统的 webpack 配置文件，故 WebStorm/Idea 无法识别别名
 * 本文件对项目无任何作用，仅作为 WebStorm/Idea 识别别名用
 * 进入 WebStorm/Idea preferences -> Language & Framework -> JavaScript -> Webpack，选择这个文件即可
 * 修改完毕如果不生效，需要重启IDE
 */
// eslint-disable-next-line no-undef
const resolve = dir => require('path').join(__dirname, dir);

// eslint-disable-next-line no-undef
module.exports = {
    resolve: {
        alias: {
            '@': resolve('/src')
        }
    }
};
