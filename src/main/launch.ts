import { LaunchOPTS } from 'minecraft-java-core/build/Launch'
import { gamePath, mainWindow } from '.'
import { Mojang, Launch } from 'minecraft-java-core'
import { LauncherParams } from './types'

export async function startGame(params: LauncherParams): Promise<void> {
  const launch = new Launch()

  console.log(params)
  const ipc = mainWindow.webContents
  Mojang.ChangeAuthApi('https://testauth.xllifi.ru/auth')

  const opt: LaunchOPTS = {
    authenticator: await Mojang.login(params.username, "xxx").catch((err) => {
      ipc.send('feed-push', {
        title: 'Ошибка!',
        description: `${err.toString()}\n\nПохоже, вы ввели неверные данные. Пожалуйста, проверьте.`
      })
    }),
    timeout: 10000,
    path: gamePath,
    instance: 'main',
    version: '1.21',
    detached: false,
    downloadFileMultiple: 8,
    url: null,
    mcp: null,

    loader: {
      path: 'load',
      type: 'fabric',
      build: 'latest',
      enable: true
    },

    verify: true,
    ignored: ['config', 'logs', 'resourcepacks', 'saves', 'screenshots', 'shaderpacks', 'options.txt'],

    JVM_ARGS: ['-javaagent:<path to authlib>/authlib-injector-1.2.5.jar=https://testauth.xllifi.ru/'],
    GAME_ARGS: [],

    java: {
      path: undefined,
      version: undefined,
      type: 'jre'
    },

    screen: {
      width: 854,
      height: 480
    },

    memory: {
      min: `${params.launchParams.minMem}M`,
      max: `${params.launchParams.maxMem}M`
    }
  }

  ipc.send('start')
  await launch.Launch(opt)

  let lastProgress = 0

  launch.on('extract', (extract) => {
    console.log(`Extract: ${extract}`)
    ipc.send('extract', { extract })
  })

  launch.on('progress', (progress, size, element) => {
    if (lastProgress <= Date.now()) {
      console.log(`Progress: ${element} - ${((progress / size) * 100).toFixed(2)}%`)
      ipc.send('progress', { element, percent: ((progress / size) * 100).toFixed(2) })
      lastProgress = Date.now() + 250
    }
  })

  launch.on('check', (progress, size, element) => {
    if (lastProgress <= Date.now()) {
      console.log(`Verify: ${element} - ${((progress / size) * 100).toFixed(2)}%`)
      ipc.send('check', { element, percent: ((progress / size) * 100).toFixed(2) })
      lastProgress = Date.now() + 250
    }
  })

  launch.on('estimated', (time) => {
    if (time == Infinity) {
      return
    }
    console.log(`ETA: ${time}`)
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time - hours * 3600) / 60)
    const seconds = Math.floor(time - hours * 3600 - minutes * 60)
    console.log(`ETA: ${hours == 0 ? '' : `${hours}h `}${minutes == 0 ? '' : `${minutes}m `}${seconds}s`)
    ipc.send('eta', { eta: `${hours == 0 ? '' : `${hours}ч `}${minutes == 0 ? '' : `${minutes}м `}${seconds}с` })
  })

  launch.on('speed', (speed) => {
    if (speed == 0) {
      return
    }
    console.log(`Speed: ${(speed / 1067008).toFixed(2)} Mb/s`)
    ipc.send('speed', { speed: `${(speed / 1067008).toFixed(2)} Мб/c` })
  })

  launch.on('patch', (patch) => {
    console.log(`Patch: ${patch}`)
  })

  launch.on('data', (logs) => {
    console.log(`Data: ${logs}`.replace(/\n$/, ''))
    ipc.send('data') // TODO: сделать логи? а надо вообще???
  })

  launch.on('close', (message) => {
    console.log(`Close message: ${message}`)
    ipc.send('close')
  })

  launch.on('error', (err) => {
    ipc.send('feed-push', {
      title: 'Ошибка!',
      description: `${err.message.toString()}\n\nЭта ошибка может быть не критичной, но пожалуйста, сообщите нам о ней!\nЕсли Minecraft долго не запускается - перезапустите лаунчер.`
    })
    console.log(`Error: ${err}`)
  })
}
