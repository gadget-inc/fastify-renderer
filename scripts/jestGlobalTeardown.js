const fs = require('fs-extra')
const path = require('path')

module.exports = async () => {
  await global.__BROWSER_SERVER__.close()
  if (!process.env.FR_PRESERVE_BUILD_ARTIFACTS) {
    await fs.remove(path.resolve(__dirname, '../temp'))
  }
}
