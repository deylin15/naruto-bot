import { fileURLToPath, pathToFileURL } from 'url'
import { join, dirname } from 'path'

export const __filename = (path, urlMode = false) =>
  urlMode ? pathToFileURL(path).href : path

export const __dirname = (meta) => dirname(fileURLToPath(meta))