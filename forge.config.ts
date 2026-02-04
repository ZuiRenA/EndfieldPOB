import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerDMG } from '@electron-forge/maker-dmg'

const config: ForgeConfig = {
    packagerConfig: {},
    makers: [
        new MakerDMG({
            name: 'EndfieldPOB'
        })
    ]
}

export default config