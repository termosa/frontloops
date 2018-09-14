const go = require('go')
const userHome = require('user-home')
const { resolve } = require('path')
const decompress = require('decompress')

const matchInDownloads = async (solution) => {
  const downloadsPath = `${userHome}/Downloads/`
  const list = await go.fs.readdir(resolve(downloadsPath))
  const tasks = list
    .filter(t => /^Loop \d+ - Step \d+( - Solution)?\.zip/.test(t))
    .filter(t => !solution || ~t.indexOf('Solution'))
    .map(t => downloadsPath + t)
  return tasks
}

const matchZip = async (givenPath, solution = false) => {
  if (givenPath && givenPath.toLowerCase().endsWith('.zip') && await go.fs.pathExists(resolve(givenPath))) {
    return givenPath
  }

  const message = givenPath
    ? 'Invalid path given. Check it and enter again:'
    : 'Enter the path to zip:'
  return matchZip(await go.ask({
    message,
    default: (await matchInDownloads(solution)).slice(-1)[0]
  }));
}

const setupSolution = async zip => {
  const [_, lesson, step] = zip.match(/(\d+).+(\d+)/)
  const solutionPath = `tasks/l${lesson.padStart(2, 0)}s${step.padStart(2, 0)}/solution/`
  const writing = (await decompress(zip))
    .filter(entry => entry.type === 'file')
    .map(f => go.writeFile(solutionPath + f.path.slice('source/'.length), f.data))
  await Promise.all(writing)
  console.log('Solution is delivered to', solutionPath)
}

const setupTask = async zip => {
  const [_, lesson, step] = zip.match(/(\d+).+(\d+)/)
  const taskPath = `l${lesson.padStart(2, 0)}s${step.padStart(2, 0)}/`
  const writing = (await decompress(zip))
    .filter(entry => entry.type === 'file')
    .map(f => go.writeFile(taskPath + f.path.slice('assets/'.length), f.data))
  await Promise.all(writing)
  console.log('Task is delivered to', taskPath)
}

const loadSolution = {
  name: 'load-solution',
  options: {
    path: String,
    remove: Boolean
  },
  async callback ({ args }) {
    const zip = await matchZip(args.path || args._[2], true)
    await setupSolution(zip)
    if (args.remove || await go.confirm('Do you want to remove source zip?')) {
      await go.remove(zip)
    }
  }
}

const loadStep = {
  name: 'load-step',
  options: {
    path: String,
    remove: Boolean
  },
  async callback ({ args }) {
    const zip = await matchZip(args.path || args._[2])
    await setupTask(zip)
    if (args.remove || await go.confirm('Do you want to remove source zip?')) {
      await go.remove(zip)
    }
  }
}

go.registerCommand([
  loadSolution,
  loadStep
])
