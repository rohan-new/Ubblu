'use strict'

const jwt = require('jsonwebtoken')
const { User } = require('./../models/index')
const { getWorkspaceUser, getWorkspaceById } = require('./../helpers/workspace')

async function loggedInMiddleware(req, res, next) {
  const token = req.headers.authorization;

  console.log('req.path -----------------', req.path);

  if (req.path == '/google/signIn') {

    return next();
  }


  if (!token) {
    return res.status(403).send({
      success: false,
      errors: ['Authorization token is required']
    })
  }

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET)
    if (Date.now() / 1000 - data.timestamp > 60 * 60 * 24 * 27) {
      return res.status(403).send({
        success: false,
        errors: ['Authorization token has expired']
      })
    }

    // eslint-disable-next-line require-atomic-updates
    req.user = await User.findOne({
      where: {
        id: data.user_id
      }
    })
  } catch (err) {
    console.log('Err : ', err)
    return res.status(401).send({
      success: false,
      errors: ['Invalid token']
    })
  }

  next()
}

async function workspaceDetail(req, res, next) {
  // Check user is exist in workspace or nor
  const { workspaceId } = req.params
  // Fetch user relationship with given workspace
  const userWorkspace = await getWorkspaceUser(workspaceId, req.user.id)
  // console.info('USERWORKSPACE', userWorkspace, req.user.id, workspaceId);
  if (userWorkspace && userWorkspace.id && !userWorkspace.is_suspended) {
    // Fetch workspace details
    const workspace = await getWorkspaceById(workspaceId)
    req.userWorkspace = userWorkspace
    req.workspace = workspace
  } else {
    return res.status(403).send({
      success: false,
      errors: ['You are not autorized to access this workspace']
    })
  }
  next()
}

async function workspaceSuperAdminIsAllowed(req, res, next) {
  console.log('User workspace : ', req.userWorkspace)
  if (req.userWorkspace.status !== 'SUPERADMIN') {
    return res.status(403).send({
      success: false,
      errors: ['You are not autorized to perform this action']
    })
  }
  next()
}

module.exports = {
  loggedInMiddleware,
  workspaceDetail,
  workspaceSuperAdminIsAllowed
}
