import common from './common'
import sidebar from './sidebar'
import components from './components'
import upload from './upload'
import auth from './pages/auth'
import audit from './pages/audit'
import users from './pages/users'
import files from './pages/files'
import setup from './pages/setup'
import texts from './pages/texts'

export default {
  ...common,
  ...sidebar,
  ...components,
  ...upload,
  ...auth,
  ...audit,
  ...users,
  ...files,
  ...setup,
  ...texts,
}
