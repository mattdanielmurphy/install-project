#!/usr/bin/env node

const chalk = require('chalk')
const util = require('util')
const child_process = require('child_process')
const exec = util.promisify(child_process.exec)
const spawn = child_process.spawn

const access = util.promisify(require('fs').access)
const write = (msg) => process.stdout.write(msg)
const log = console.log

const throwError = (redMessage, yellowMessage) => {
  log(chalk.red('\n' + redMessage))
  if (yellowMessage) log(chalk.yellow(yellowMessage + '\n'))
  process.exit()
}

const getFirstMatch = (string, regEx) => string.match(regEx) && string.match(regEx)[1]

const getGitHubRepoLinkFromParams = () => {
  const repoLink = process.argv[2]
  if (!repoLink) {
    throwError('Error: no GitHub repo provided.', 'Create one here: https://github.com/new.\n')
  }
  return repoLink
}

const getProjectFolder = (repoLink) => getFirstMatch(repoLink, '\/([^.]*)')

const cloneRepo = async (repoLink) => {
  write('Cloning GitHub repo... ')
  await exec(`git clone ${repoLink}`).catch(error => throwError(error))
  write('Done!\n')
}

const checkIfNodeModulesFolder = async (projectFolder) => {
  let nodeModulesFolder = true
  await access(`${projectFolder}/node_modules/`).catch((err) => nodeModulesFolder = false)
  return nodeModulesFolder
}

const createNodeModulesNoSyncSetup = async (projectFolder) => {
  write('Creating node_modules nosync folder setup... ')
  const nodeModulesFolder = await checkIfNodeModulesFolder(projectFolder)
  if (nodeModulesFolder) {
    await exec(`mv ${projectFolder}/node_modules ${projectFolder}/node_modules.nosync`).catch(error => {
      throwError(error)
    })
  } else {
    await exec(`mkdir ${projectFolder}/node_modules.nosync`).catch(error => {
      throwError(error)
    })
  }
  await exec(`ln -s \$PWD/${projectFolder}/node_modules.nosync/ \$PWD/${projectFolder}/node_modules`).catch(error => {
    throwError(error)
  })
  write('Done!\n')
}

const checkIfProjectInitialized = async (projectFolder) => {
  let packagesToInstall = true
  await access(`${projectFolder}/package.json`).catch((err) => packagesToInstall = false)
  return packagesToInstall
}

const installPackages = async (projectFolder) => {
  write('Installing packages... ')
  await new Promise((resolve, reject) => {
    const yarn = spawn('yarn', ['--cwd', projectFolder])

    yarn.stdout.on('data', (data) => write(data.toString()))
    yarn.stderr.on('data', (data) => write(chalk.red(data.toString())))
    yarn.on('close', code => resolve())
  })

  write('Done!\n')
  return true
}

const initializeProject = async (projectFolder) => {
  write('Initializing project... ')
  await new Promise((resolve, reject) => {
    const init = spawn('yarn', ['--cwd', projectFolder, 'init', '-y'])

    init.stdout.on('data', (data) => write(data.toString()))
    init.stderr.on('data', (data) => write(chalk.yellow(data.toString())))
    init.on('close', code => resolve())
  })
  return true
}

const installProject = async () => {
  const repoLink = getGitHubRepoLinkFromParams()
  const projectFolder = getProjectFolder(repoLink)
  await cloneRepo(repoLink)
  const initialized = await checkIfProjectInitialized(projectFolder)
  if (initialized) await installPackages(projectFolder)
  else await initializeProject(projectFolder)
  await createNodeModulesNoSyncSetup(projectFolder)
  log(chalk.green('All done :)'))
}

installProject()