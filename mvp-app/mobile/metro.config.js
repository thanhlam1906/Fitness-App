const path = require("path")
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeWind } = require("nativewind/metro")

const config = getDefaultConfig(__dirname)
const webSrc = path.resolve(__dirname, "../web/src")

// File thuần của web import thẳng qua alias @/ (doc/design-mobile-v1.md §3), Metro phải theo dõi được.
config.watchFolders = [webSrc]

// File trong web/src import "zod"… thì Metro mặc định đi ngược lên web/node_modules: hai bản một
// thư viện, và clone mới phải cài cả web mới chạy được mobile. Ép mọi gói về node_modules của mobile.
const defaultResolve = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromWeb = context.originModulePath.startsWith(webSrc)
  const bare = !moduleName.startsWith(".") && !moduleName.startsWith("@/") && !path.isAbsolute(moduleName)
  const ctx = fromWeb && bare ? { ...context, originModulePath: path.join(__dirname, "package.json") } : context
  return defaultResolve ? defaultResolve(ctx, moduleName, platform) : ctx.resolveRequest(ctx, moduleName, platform)
}

module.exports = withNativeWind(config, { input: "./global.css" })
