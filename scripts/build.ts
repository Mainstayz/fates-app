import { readFile } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'

async function build() {
    const cwd = process.cwd()
    const readFileAsync = promisify(readFile) // convert readFile to Promise API
    let key = ''
    let pwd = ''

    try {
        // read public key
        key = await readFileAsync(resolve(cwd, '.tauri/app.key'), 'utf-8') // read private key
        pwd = await readFileAsync(resolve(cwd, '.tauri/password.key'), 'utf-8') // read password
        console.log('key:', key)
        console.log('pwd:', pwd)
    }
    catch(_) {
        throw new Error('No private key found, private key is used to sign updates, see https://v2.tauri.app/plugin/updater')
    }

    let cmd = 'pnpm tauri build'
    // if platform is macos, add --target dmg
    if (process.platform === 'darwin') {
        cmd += ' --bundles app'
    }
    // add --debug
    cmd += ' --debug'
    // execute build command, pass env to configure environment variables, note that the original environment process.env is not forgotten
    const build_process = spawn(cmd, [], {
        cwd,
        env: {
            TAURI_SIGNING_PRIVATE_KEY: key,
            TAURI_SIGNING_PRIVATE_KEY_PASSWORD: pwd,
            ...process.env,
        },
        shell: true,
        stdio: 'inherit',
    })
    build_process.on('exit', code => {
        if (code !== 0) {
            throw new Error(`Build failed with code ${code}`)
        }
    })

}

build()
