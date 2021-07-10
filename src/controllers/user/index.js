'use strict'

const express = require('express')
const router = express.Router()
const AWS = require('aws-sdk')
const multer = require('multer')
const path = require('path')

const mime = require('mime-types')

const { pick } = require('lodash')
const { Op } = require('./../../models/index')


const {
  getUserById,
  updateUserById,
  updateFirebaseId,
  addNotes,
  verifyEmailBelongsToAnotherUser,
  saveUserProfileImage
} = require('./../../helpers/user')

const {
  messageNotification
} = require('./../../helpers/notification')

const {
  updateUserWorkspace,
  getWorkspaceById
} = require('./../../helpers/workspace')

const { updateExceptionList, getExceptionList } = require('./../../helpers//exceptionlist');

const { sendResponse, sendError } = require('./../../utils/http')

const { SAFE_USER_ATTRIBUTES, BUCKET_URL } = require('./../../constants')
const logger = require('./../../logger')
const {
  updateProfileValidation
} = require('../../utils/validation/user')
AWS.config.update({
  accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_SECRET_KEY
  //  region:' '
})
const s3 = new AWS.S3();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('dir----------------', __dirname)
    console.log('path --------------------', path.join(__dirname, `../../public/image_uploads/`))
    cb(null, path.join(__dirname, `../../public/image_uploads/`))
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})
const upload = multer({ storage: storage }).single('file')

// Tested and working
router.get('/me', (req, res) => {
  return sendResponse(res, {
    code: 200,
    data: {
      user: pick(req.user, SAFE_USER_ATTRIBUTES)
    }
  })
})

// Tested and working
// Fetch user info by userId
router.get('/:userId', async (req, res) => {
  const user = await getUserById(req.params.userId)
  return sendResponse(res, {
    code: 200,
    data: {
      user: pick(user, SAFE_USER_ATTRIBUTES)
    }
  })
})

// Tested and working
// User profile picture upload on s3
router.post('/uploadProfile', async (req, res) => {
  try {
    const userId = req.user.id;
    upload(req, res, async function (err) {

      const profileImage = req.file
      console.log('file reqsr-----------', req.file);
      if (!profileImage || !profileImage.filename) {
        // Invalid request
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'Invalid request'
          }
        })
      }

      const filename = profileImage.filename
      const ext = filename.substr(filename.lastIndexOf('.'))
      const imageFilesExt = ['.jpg', '.jpeg', '.png', '.gif']

      if (ext && imageFilesExt.indexOf(ext.toLowerCase()) >= 0) {
        // const imageUploadPath = path.join(__dirname, `../public/uploads/`)
        // const imageUrl = `http://localhost:8080/image_uploads/${filename}`
        const imageUrl = `http://ec2-13-127-51-17.ap-south-1.compute.amazonaws.com:8080/image_uploads/${filename}`

        const updateUserProfilImage = await saveUserProfileImage(userId, imageUrl);
        if (updateUserProfilImage) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'User profile image has been updated',
              imageUrl
            }
          })
        } else {
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error occured while uploading profile picture'
            }
          })
        }
      } else {
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'Invalid file format, only image is allowed'
          }
        })
      }

    })
  } catch (err) {
    logger.warn('Error occured while uploading profile picture : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while uploading profile picture'
      }
    })
  }
})

router.put('/firebaseid/:userid', async (req, res) => {

  let code = null, message = '', data = null
  try {
    const { firebase_id } = req.body
    const { userid } = req.params;
    if (userid, firebase_id) {
      const resp = await updateFirebaseId(userid, firebase_id)
      if (resp) {
        code = 200
        message = 'Updated'
        data = resp
      } else {
        code = 400
        message = 'Error Updating'
        data = resp
      }
    } else {
      code = 400
      message = 'Missing Parameters'
      data = null
    }
  } catch (error) {
    code = 500
    message = 'Something broke'
    data = error
  } finally {
    res.statusCode = code
    res.statusMessage = message
    res.send({
      code,
      message,
      data
    })
  }
})
/* Tested and working. sending push notifications*/
router.post('/triggerPushNotification', async (req, res) => {
  let {firebaseIds, data = {}, ...others } = req.body;
  data = JSON.stringify(data);
  let code = null, message = '';
  try{
    firebaseIds = firebaseIds.filter((firebase_id)=>!!firebase_id);
    if(!!firebaseIds.length){
      messageNotification({dataValues: others}, firebaseIds, false, data);
      code = 200;
      message = 'notification sent';
    } else {
      code = 500;
      message = 'invalid firebaseIds';
    }
  } catch (e) {
    code = 500;
    message = 'Something broke';
  } finally {
    return sendResponse(res, { code, data: message })
  }
});

// Tested and working
// Update user profile
router.put('/', updateProfileValidation, async (req, res) => {
  try {
    const values = {}

    if (req.body.name) {
      values['name'] = req.body.name
    }

    if (req.body.name) {
      values['username'] = req.body.username
    }
    if (req.body.email) {
      values['email'] = req.body.email
      const emailExistsToAnotherUser = await verifyEmailBelongsToAnotherUser(req.body.email, req.body.userId,req.body.workspace_id);
      if (emailExistsToAnotherUser) {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'An user with this email address already exists in this workspace'
          }
        })
      }
    }
    if (req.body.profileImage) {
      values['profile_image'] = req.body.profileImage
    }
    if (req.body.timezone) {
      values['timezone'] = req.body.timezone
    }
    if (req.body.note) {
      values['note'] = req.body.note
    }
    if (req.body.availability) {
      values['availability'] = req.body.availability
    }

    if (req.body.cloud_storage) {
      values['cloud_storage'] = req.body.cloud_storage
    }

    if(req.body.is_cookie){
      values['is_cookie'] = req.body.is_cookie
    }
    //await setMultipleUserMeta(req.user.id, values)
    const resp = await updateUserById(req.user.id, values)

    if (resp) {
      const userWorkspaceData = {}
      if (req.body.departmentId) {
        userWorkspaceData['department_id'] = req.body.departmentId
      }

      await updateUserWorkspace(
        {
          user_id: req.params.userId,
          workspace_id: req.body.workspace_id
        },
        userWorkspaceData
      )

      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User details has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error while updating user information'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while updating user metadata'
      }
    })
  }
})

// Tested and working
// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const values = {}

    if (req.body.name) {
      values['name'] = req.body.name
    }
    if (req.body.email) {
      values['email'] = req.body.email
      const emailExistsToAnotherUser = await verifyEmailBelongsToAnotherUser(req.body.email, req.params.userId, req.body.workspace_id);
      if (emailExistsToAnotherUser) {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'An user with this email address already exists in this workspace'
          }
        })
      }
    }
    if (req.body.fileUpload) {
      values['cloud_storage'] = req.body.fileUpload
    }
    //await setMultipleUserMeta(req.user.id, values)
    const resp = await updateUserById(req.params.userId, values)

    console.log('update reposne------------------', resp);

    if (resp) {
      const userWorkspaceData = {}
      if (req.body.departmentId) {
        console.log('department_id-', resp);
        userWorkspaceData['department_id'] = parseInt(req.body.departmentId)
      }
      if (req.body.role) {
        userWorkspaceData['status'] = req.body.role
      }

      await updateUserWorkspace(
        {
          user_id: req.params.userId,
          workspace_id: req.body.workspace_id
        },
        userWorkspaceData
      )

      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User details has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error while updating user information'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while updating user metadata'
      }
    })
  }
})

// Tested amd working
// Add user notes
router.post('/addNotes', async (req, res) => {
  try {
    const data = {
      user_id: req.user.id,
      other_user_id: req.body.userId,
      notes: req.body.notes,
      workspace_id: req.body.workspaceId
    }
    const notes = await addNotes(data)
    if (notes) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Notes has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error while updating notes'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while Adding notes : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while Adding notes'
      }
    })
  }
})

// Tested and working
// Suspend user
router.post('/suspend/:userId', async (req, res) => {
  try {
    // To-do: Add express validation letter
    // Required: workspaceId
    if (req.body.workspaceId) {
      // Verify workspace
      const workspace = await getWorkspaceById(req.body.workspaceId)
      if (workspace.created_by === req.user.id) {
        const updated = await updateUserWorkspace(
          {
            user_id: req.params.userId,
            workspace_id: workspace.id
          },
          {
            is_suspended: true
          }
        )

        if (updated) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'User has been suspended'
            }
          })
        } else {
          // Not updated
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error while suspending the user'
            }
          })
        }
      } else {
        // Access denied
        return sendError(res, {
          code: 403,
          error: {
            status: 0,
            message: "You can't suspend this user"
          }
        })
      }
    } else {
      return sendError(res, {
        code: 400,
        error: ['Enter workspaceId']
      })
    }
  } catch (err) {
    logger.warn('Error while suspending user')
  }
})

// Tested and working
// Suspend user
router.post('/suspendUsers', async (req, res) => {
  try {
    // To-do: Add express validation letter
    // Required: workspaceId
    // Required: userIds
    if (req.body.workspaceId) {
      // Verify workspace
      const workspace = await getWorkspaceById(req.body.workspaceId)
      if (workspace.created_by === req.user.id) {
        const updated = await updateUserWorkspace(
          {
            user_id: {
              [Op.in]: req.body.userIds
            },
            workspace_id: workspace.id
          },
          {
            is_suspended: true
          }
        )

        if (updated) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'Users suspended'
            }
          })
        } else {
          // Not updated
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error while suspending the users'
            }
          })
        }
      } else {
        // Access denied
        return sendError(res, {
          code: 403,
          error: {
            status: 0,
            message: "You can't suspend users"
          }
        })
      }
    } else {
      return sendError(res, {
        code: 400,
        error: ['Enter workspaceId']
      })
    }
  } catch (err) {
    logger.warn('Error while suspending users')
  }
})

router.post('/exceptionlist', async (req, res) => {
  try {
    const list = await updateExceptionList(req.body)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Exception List Updated',
        list
      }
    })
  } catch (error) {
    return sendError(res, {
      code: 400,
      error: 'Error creating exceptionlist',
      message: JSON.stringify(error)
    })
  }
})

router.get('/exceptionlist/:wid/:uid', async (req, res) => {
  try {
    const { wid, uid } = req.params
    const list = await getExceptionList({ exceptionerid: uid, workspace_id: wid })
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Exception List',
        list
      }
    })
  } catch (error) {
    return sendError(res, {
      code: 400,
      error: 'Error fetching exceptionlist',
      message: JSON.stringify(error)
    })
  }
})

//re-activate/resume users
router.post('/resume/:userId', async (req, res) => {
  try {
    // To-do: Add express validation letter
    // Required: workspaceId
    if (req.body.workspaceId) {
      // Verify workspace
      const workspace = await getWorkspaceById(req.body.workspaceId)
      if (workspace.created_by === req.user.id) {
        const updated = await updateUserWorkspace(
          {
            user_id: req.params.userId,
            workspace_id: workspace.id
          },
          {
            is_suspended: false
          }
        )

        if (updated) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'User has been re-activated'
            }
          })
        } else {
          // Not updated
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error while re-activating the user'
            }
          })
        }
      } else {
        // Access denied
        return sendError(res, {
          code: 403,
          error: {
            status: 0,
            message: "You can't suspend this user"
          }
        })
      }
    } else {
      return sendError(res, {
        code: 400,
        error: ['Enter workspaceId']
      })
    }
  } catch (err) {
    logger.warn('Error while suspending user')
  }
})

// Terminate users
router.post('/terminate/:userId', async (req, res) => {
  try {
    // To-do: Add express validation letter
    // Required: workspaceId
    if (req.body.workspaceId) {
      // Verify workspace
      const workspace = await getWorkspaceById(req.body.workspaceId)
      if (workspace.created_by === req.user.id) {
        const updated = await updateUserWorkspace(
          {
            user_id: req.params.userId,
            workspace_id: workspace.id
          },
          {
            is_deleted: true
          }
        )

        if (updated) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'User has been terminated'
            }
          })
        } else {
          // Not updated
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error while terminating the user'
            }
          })
        }
      } else {
        // Access denied
        return sendError(res, {
          code: 403,
          error: {
            status: 0,
            message: "You can't terminate this user"
          }
        })
      }
    } else {
      return sendError(res, {
        code: 400,
        error: ['Enter workspaceId']
      })
    }
  } catch (err) {
    logger.warn('Error while terminating user')
  }
})


module.exports = router
