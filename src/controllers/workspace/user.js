'use strict'

const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const { pick } = require('lodash')

const { User } = require('./../../models/index')

const {
  createPersonalWorkspace,
  addUserToWorkspace,
  updateUserKeywords,
  addUserToAutojoinChannel
} = require('./../../helpers/workspace')
const { changePasswordValidation } = require('./../../utils/validation/user')
const {
  getUserByEmail,
  setUserMeta,
  changeAvailabilityStatus,
  makeUserOnline,
  generateUsername,
  getUserById,
  updateUserById
} = require('./../../helpers/user')

const { addUserToDepartment } = require('./../../helpers/department')
const { sendMail } = require('./../../helpers/mail')
const { workspaceSuperAdminIsAllowed } = require('./../../middlewares/auth')
const { getWorkspaceUserById } = require('./../../helpers/user')
const { sendError, sendResponse } = require('./../../utils/http')
const colorgenerator = require('./../../utils/colorgenerator')

const { SAFE_USER_ATTRIBUTES } = require('./../../constants')
const logger = require('./../../logger')

// Fetch user info for given workspace
router.get('/:userId', async (req, res) => {
  const userId = req.params.userId == 'me' ? req.user.id : req.params.userId


  const user = await getWorkspaceUserById(req.workspace.id, userId)
  return sendResponse(res, {
    code: 200,
    data: {
      user
    }
  })
})

router.put('/:uid/keywords', async (req, res) => {
  let status = 203,
    error = null,
    data = null
  try {
    const { uid } = req.params

    const { keywords } = req.body
    const resp = await updateUserKeywords(req.workspace.id, uid, keywords)
    data = resp.data
    if (resp.error) {
      error = resp.error
      status = 500
    }
  } catch (err) {
    status = 500
    error = {
      message: err.message
    }
  }

  res.status(status)
  res.send({ data, error })
})

router.get('/:uid/keywords', async (req, res) => {
  let status = 200,
    error = null,
    data = null
  try {
    const { uid } = req.params
    const resp = await updateUserKeywords(req.workspace.id, uid, null, true)
    data = resp.data
    if (resp.error) {
      error = resp.error
      status = 500
    }
  } catch (err) {
    status = 500
    error = {
      message: err.message
    }
  }

  res.status(status)
  res.send({ data, error })
})

// Add new user to workspace
router.post('/', workspaceSuperAdminIsAllowed, async (req, res) => {
  try {
    const notifyUser = req.body.notifyUser;
    delete req.body.notifyUser;
    // Verify email is not exist already
    const userExist = await getUserByEmail(req.body.email, req.body.workspaceId)
    if (userExist) {
      // User already exist
      return sendError(res, {
        code: 400,
        error:
          'An user with this email address already exists in this workspace'
      })
    }

    // Generate random password for user
    const password = (+new Date()).toString(36).slice(-10)
    const hash = await bcrypt.hash(password, 10)

    const username = await generateUsername(
      req.body.name.substring(0, 7).replace(/\s/g, '')
    )

    const textColor = colorgenerator()
    const backgroundColor = colorgenerator()

    const user = await User.create({
      email: req.body.email,
      username: username,
      name: req.body.name,
      password: hash,
      profile_color: `${textColor} ${backgroundColor}`
    })

    // await createPersonalWorkspace(user)

    // Send email to Admin for new Signup
    await sendMail(
      'admin_new_signup',
      {
        to: process.env.ADMIN_EMAIL,
        subject: 'Ubblu - New Signup'
      },
      {
        email: req.body.email,
        username: req.body.email.split('@')[0]
      }
    )

    await addUserToWorkspace(user['id'], req.workspace.id, req.body.role)
    if (req.body.departmentId) {
      await addUserToDepartment(
        [user['id']],
        req.workspace.id,
        req.body.departmentId
      )
    }

    await setUserMeta(user['id'], 'signupStep', '5')
    // Auto join user to channel of workspace
    await addUserToAutojoinChannel(req.workspace.id, user['id'], req.body.role)

    // Send email to user for new Signup
    if(notifyUser){
    await sendMail(
      'add_user',
      {
        to: req.body.email,
        subject: 'Ubblu - You added in workspace'
      },
      {
        email: req.body.email,
        password: password
      }
    )}

    return sendResponse(res, {
      data: {
        user: pick(user, SAFE_USER_ATTRIBUTES)
      },
      code: 201
    })
  } catch (err) {
    logger.warn(`User registration failed: `, err)
    return sendError(res, {
      code: 400,
      error: err.message
    })
  }
})

router.put('/availability', async (req, res) => {
  // also reset exceptionlist of user
  try {
    const userId = req.body.userId
    const workspaceId = req.body.workspaceId
    const updatedUserAvailability = await changeAvailabilityStatus(
      userId,
      workspaceId
    )

    if (updatedUserAvailability) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User availability status has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 403,
        error: {
          status: 0,
          message: 'unable to update availaibilty status'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while suspending user')
  }
})

router.put('/:userId/status', async (req, res) => {
  try {
    const userId = req.params.userId
    const updatedUserOnlineStatus = await makeUserOnline(userId)

    if (updatedUserOnlineStatus) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User online status has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 403,
        error: {
          status: 0,
          message: 'unable to update online status'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while updating online status')
  }
})

router.post('/:uid/changePassword',
  changePasswordValidation,
  async (req, res) => {
     let status = 200,
      error = null,
       data = null
    try {
      const { uid } = req.params
      const userDetails = await getUserById(uid)
    
      let storedpassword = userDetails.dataValues.password;
      let currentpasswordInput = req.body.currentPassword
      let newPassword = req.body.newPassword;
     
      let hashedPassword = await bcrypt.hash(newPassword, 10)
     
      if (await bcrypt.compare(currentpasswordInput,storedpassword )) {
       
        await updateUserById(uid, {
          password: hashedPassword
        });

        return sendResponse(res, {
          data: {
            status: 1,
            message: 'Password has been changed'
          },
          code: 201
        });
      } else {
        return sendError(res, {
          code: 400,
          error: 'User current password not matched.'
        })
      }
    } catch (err) {
      status = 500
      error = {
        message: err.message
      }
    }

    res.status(status)
    res.send({ data, error })
  }
)
module.exports = router
