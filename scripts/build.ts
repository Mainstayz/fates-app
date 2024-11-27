import { readFile } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'

async function build() {
    const cwd = process.cwd()
    const readFileAsync = promisify(readFile) // 将 readFile 转为 Promise API
    let key = ''
    let pwd = ''

    try {
        // 读取公钥
        key = await readFileAsync(resolve(cwd, '.tauri/app.key'), 'utf-8') // 读取私钥
        pwd = await readFileAsync(resolve(cwd, '.tauri/password.key'), 'utf-8') // 读取密码
    }
    catch(_) {
        throw new Error('No private key found, private key is used to sign updates, see https://v2.tauri.app/plugin/updater')
    }
    // 执行打包命令，通过 env 配置环境变量，注意不要忘了原始环境 process.env
    const build_process = spawn('pnpm tauri build', [], {
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
