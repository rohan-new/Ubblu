'use strict'

const express = require('express')
const request = require('request')
const get = require('lodash/get')
const router = express.Router()

const bcrypt = require('bcrypt')
const mime = require('mime-types')

const multer = require('multer')
const TOKEN_PATH = 'token.json'

const jwt = require('jsonwebtoken')
const { pick, pickBy } = require('lodash')

const { loggedInMiddleware } = require('./../middlewares/auth')
const { User, UserWorkspaceRelationship } = require('../models/index')
const colorgenerator = require('../utils/colorgenerator')

const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')
const dropboxV2Api = require('dropbox-v2-api')
var fetch = require('isomorphic-fetch')

const thumb = require('node-thumbnail').thumb


const { sequelize } = require('../models')
const {
  createPersonalWorkspace,
  findWorkspaceByName,
  findWorkspaceByUserId,
  addUserToWorkspace,
  addUserToAutojoinChannel,
  addUserToAutojoinChannelForGuestUser,
  addUserToAutojoinChannelForEmployee,
  getWorkspaceById
} = require('./../helpers/workspace')

const {
  addMemberstoChannel,
  getChannelUser
} = require('./../helpers/channel')
const {
  getUserByEmail,
  getUserMeta,
  setUserMeta,
  updateUserById,
  generateUsername,
  createTokenLogs,
  updateTokenLogs,
  getTokenLogs
} = require('./../helpers/user')
const {
  addUserToDepartment,
  fetchDefaultDepartmentForAWorkspaceId
} = require('./../helpers/department')

const { sendMail } = require('./../helpers/mail')

const { sendError, sendResponse } = require('./../utils/http')
const {
  loginValidation,
  registerValidation,
  emailValidation
} = require('./../utils/validation/user')

const { SAFE_USER_ATTRIBUTES, WEB_URL } = require('../constants')
const logger = require('./../logger')
const API_PREFIX = '/api/v1'



const scopes = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
]


const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_SECRET_KEY,
  process.env.GOOGLE_REDIRECT_URL
)

//set credentials for dropbox
const dropbox = dropboxV2Api.authenticate({
  client_id: process.env.DROPBOX_CLIENT_ID,
  client_secret: process.env.DROPBOX_SECRET_KEY,
  redirect_uri: process.env.DROPBOX_REDIRECT_URL
})

const config = {
  fetch: fetch,
  clientId: [process.env.DROPBOX_CLIENT_ID,],
  clientSecret: [process.env.DROPBOX_SECRET_KEY]
};

const Dropbox = require('dropbox').Dropbox;
var dbx = new Dropbox(config);


oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // store the refresh_token in my database!
    oauth2Client.setCredentials({
      refresh_token: `STORED_REFRESH_TOKEN`
    })
  }
})



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({ storage: storage }).single('file')

/* Routes for guest user, anyone can access without token */

// Tested and working
// Check user is ubblu user or not
router.post(`${API_PREFIX}/isUbbluUser`, async (req, res) => {
  // Check email in user table
  const user = await getUserByEmail(req.body.email, null)
  if (user) {
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'User is ubblu user'
      }
    })
  } else {
    return sendResponse(res, {
      code: 200,
      data: {
        status: 0,
        message: 'User is not ubblu user'
      }
    })
  }
})

// Tested and working
// Send verification email to user
router.post(`${API_PREFIX}/verifyEmail`, emailValidation, async (req, res) => {
  // Check email in user table
  const user = await getUserByEmail(req.body.email, req.body.workspaceId);
  const channelId = req.body.channel;
  const workspaceId = req.body.workspaceId;
  let channelName;
  let workspaceName;
  if (workspaceId) {
    const workspaceDetails = await getWorkspaceById(workspaceId);
    workspaceName = workspaceDetails.name;
  }

  if (channelId) {
    const query = `select channel_type, name from channels where id = ${channelId} `;
    const channelDetails = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    channelName = channelDetails[0]['name'];
    if (channelDetails[0]['channel_type'] == 'RESTRICTED') {
      return sendError(res, {
        code: 400,
        error: 'The channel is a secret channel, Please contact admin!'
      })
    }
  }

  if (user) {
    if (channelId) {
      const channelUser = await getChannelUser(channelId, user.id)
      if (!channelUser) {
        // Add member to channel
        await addMemberstoChannel(channelId, [user.id], 'MEMBER');
      }

      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: "User is added to the channel",
          user: pick(user, SAFE_USER_ATTRIBUTES),
          channel: channelId,
          channelName,
          workspaceId: workspaceId

        }
      })

    }
    return sendError(res, {
      code: 400,
      error: 'User with this email already registered with us'
    })
  } else {
    // Generate token
    const userData = {
      email: req.body.email,
      workspaceId: req.body.workspaceId,
      role: req.body.inviteType,
      channel: channelId
    }

    const token = jwt.sign(userData, process.env.JWT_SECRET, {
      expiresIn: 60 * 60 * 120
    }) // Expired in 2 hours
    const url = WEB_URL + 'signup?token=' + token

    // Send mail
    const resp = await sendMail(
      'email_confirmation',
      {
        to: req.body.email,
        subject: 'Ubblu - Confirm your email'
      },
      {
        url,
        text: channelId ? `You are invited you to join ${channelName} in ${workspaceName} worspace...` : '',
      }
    )


    // Send response back
    if (resp.status) {
      await createTokenLogs(req.body.email, token, req.body.workspaceId);
      return sendResponse(res, {
        data: {
          message: 'Mail has been sent on given email address'
        },
        code: 200
      })
    } else {
      return sendError(res, {
        code: 500,
        error: 'Error occured while sending mail'
      })
    }
  }
})

// Tested and working
router.post(`${API_PREFIX}/verifyToken`, async (req, res) => {
  const { token } = req.body

  try {
    jwt.verify(token, process.env.JWT_SECRET)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Link is valid'
      }
    })
  } catch (exp) {
    return sendError(res, {
      code: 400,
      error: 'Link expired'
    })
  }
})

// Tested and working
// If workspaceId available, user is invited into that particular workspace
// Verify verification token and register user
router.post(`${API_PREFIX}/register`, registerValidation, async (req, res) => {
  const { name, password, token } = req.body;
  let maintainRegistrationSettings = false;
  let data = {}
  try {
    data = jwt.verify(token, process.env.JWT_SECRET)
    const isTokenExpired = await getTokenLogs(data.email, token);
    console.log('token espired----------', isTokenExpired)
    if (isTokenExpired && isTokenExpired.length && isTokenExpired[0]['expired']) {
      return sendError(res, {
        code: 400,
        error: 'Error: This link has already been used'
      })
    }

  } catch (exp) {
    console.log('eror -------------------------------', exp)
    return sendError(res, {
      code: 400,
      error: 'Link expired'
    })
  }

  try {

    await updateTokenLogs(data.email, req.body.token, data['workspaceId']);
    let workspace;
    if (data['workspaceId']) {
      // Verify email whether it  exist already
      const userExist = await getUserByEmail(data.email, data['workspaceId'])
      if (userExist) {
        // User already exist
        return sendError(res, {
          code: 400,
          error: 'User with this email already registered with us'
        })
      }
      workspace = await getWorkspaceById(data['workspaceId']);
      const supportedEmailTags = workspace.email_tags;
      if (data['role'] === null && data['channel'] === null) {
        maintainRegistrationSettings = true;
        if (supportedEmailTags.length && supportedEmailTags.indexOf('@' + data.email.split('@')[1]) === -1) {
          return sendError(res, {
            code: 400,
            error: 'User with this email tag not supported'
          })
        }
      }
    }

    const hash = await bcrypt.hash(password, 10)

    const textColor = colorgenerator()
    const backgroundColor = colorgenerator()

    const username = await generateUsername(name.substring(0, 7).replace(/\s/g, ""));

    const user = await User.create({
      email: data.email,
      username: username,
      name: name,
      password: hash,
      profile_color: `${textColor} ${backgroundColor}`
    })

    // Send email to Admin for new Signup
    await sendMail(
      'admin_new_signup',
      {
        to: process.env.ADMIN_EMAIL,
        subject: 'Ubblu - New Signup'
      },
      {
        email: data.email,
        username
      }
    )

    // Generate Authorization token
    const userData = {
      user_id: user.id,
      timestamp: Date.now() / 1000
    }

    const token = jwt.sign(userData, process.env.JWT_SECRET);
    let userChannelRole = 'MEMBER';

    if (
      // req.body.workspaceId &&
      data['workspaceId']
      //  &&
      // data['workspaceId'] === req.body.workspaceId
    ) {
      // Restrict user if workspace is not allowing registration of new user

      if (data['role'] == 'USERS' || data['role'] == 'users') {
        data['role'] = 'GUEST USER';
      }
      if (data['role'] == undefined || data['role'] == null) {
        data['role'] = 'EMPLOYEE'
      }

      data['role'] = maintainRegistrationSettings ? workspace.default_user_type : data['role'];
      if (workspace.allow_new_registration) {
        await addUserToWorkspace(user['id'], data['workspaceId'], data['role'])
        await setUserMeta(user['id'], 'signupStep', '5')
        // Auto join user to channel of workspace
        if (data['role'] == 'EMPLOYEE') {
          await addUserToAutojoinChannelForEmployee(
            data['workspaceId'],
            user['id'],
            userChannelRole
          )
        }
        if (data['role'] == 'GUEST USER') {
          await addUserToAutojoinChannelForGuestUser(
            data['workspaceId'],
            user['id'],
            userChannelRole
          )
        }
        await addUserToAutojoinChannel(
          data['workspaceId'],
          user['id'],
          userChannelRole
        )
        const defaultDepartmentForWorkspaceId = await fetchDefaultDepartmentForAWorkspaceId(data['workspaceId'])
        const departmentId = defaultDepartmentForWorkspaceId.length ? defaultDepartmentForWorkspaceId[0]['id'] : null
        await addUserToDepartment(
          [user['id']],
          data['workspaceId'],
          departmentId
        )
      } else {
        return sendResponse(res, {
          code: 403,
          data: {
            status: 1,
            message:
              "Registration is successful, but can't add to workspace as workspace is closed.",
            user: pick(user, SAFE_USER_ATTRIBUTES),
            token
          }
        })
      }
    } else {
      await setUserMeta(user['id'], 'signupStep', '1')
    }

    if (data['channel']) {
      const query = `select channel_type from channels where id = ${data['channel']} `;
      const channelDetails = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });
      if (channelDetails[0]['channel_type'] == 'RESTRICTED') {
        return sendError(res, {
          code: 400,
          error: 'The channel is a secret channel, Please contact admin!'
        })
      }
      await addMemberstoChannel(data['channel'], [user.id], userChannelRole)
    }
    return sendResponse(res, {
      data: {
        user: pick(user, SAFE_USER_ATTRIBUTES),
        workspace: {
          id: data['workspaceId']
        },
        token
      },
      code: 201
    })
  } catch (err) {
    logger.warn(`User registration failed: `, err)
    return sendError(res, {
      code: 400,
      error: err['errors'][0]['message']
    })
  }
})

// Tested and working
// If workspaceId available, user is invited into that particular workspace
router.post(`${API_PREFIX}/login`, loginValidation, async (req, res) => {
  const { username, password, email, workspaceId } = req.body
  let data = {}
  if (req.body.token) {
    // Verify token, Invited user
    try {
      data = jwt.verify(req.body.token, process.env.JWT_SECRET)
    } catch (exp) {
      return sendError(res, {
        code: 400,
        error: 'Link expired'
      })
    }
  }

  try {
    const user = await User.findOne({
      where: pickBy(
        {
          username: username,
          email: email
        },
        x => x
      ),
      include: [
        {
          attributes: ['is_suspended'],
          model: UserWorkspaceRelationship,
          as: 'user_workspace_relationships',
          where: {
            workspace_id: workspaceId,
            // is_suspended: false,

          },
        }
      ]
    })



    if (!user) {
      return sendError(res, {
        code: 404,
        error: 'Invalid Username/Password'
      })
    }

    if (user && workspaceId) {
      // check for user suspension
      const user = await User.findOne({
        where: pickBy(
          {
            username: username,
            email: email
          },
          x => x
        ),
        include: [
          {
            attributes: ['is_suspended'],
            model: UserWorkspaceRelationship,
            as: 'user_workspace_relationships',
            where: {
              workspace_id: workspaceId,
              is_suspended: false,
            },
          }
        ]
      })

      if (!user) {
        return sendError(res, {
          code: 403,
          error: 'User Suspended. Please contact admin!',
        })
      }
    }

    if (!(await bcrypt.compare(password, user.password))) {
      // Add usermeta for invalid login attempt
      const invalidAttempt = await getUserMeta(user.id, 'invalidAttemptCount')
      const count = invalidAttempt ? invalidAttempt['metaValue'] * 1 + 1 : 1

      await setUserMeta(user.id, 'invalidAttemptCount', count)

      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Invalid username/password',
          invalidAttemptCount: count
        }
      })
    } else {
      await setUserMeta(user.id, 'invalidAttemptCount', 0)
    }

    // if invited user, add him to workspace
    if (
      req.body.workspaceId &&
      data['workspaceId'] &&
      data['workspaceId'] === req.body.workspaceId
    ) {
      console.log('testing -------------------');
      await addUserToWorkspace(user.id, req.body.workspaceId, data['role'])
      // Auto join user to channel of workspace
      await addUserToAutojoinChannel(
        req.params.workspaceId,
        user.id,
        userChannelRole
      )
    }

    const userData = {
      user_id: user.id,
      timestamp: Date.now() / 1000
    }

    const token = jwt.sign(userData, process.env.JWT_SECRET)

    return sendResponse(res, {
      data: {
        user: pick(user, SAFE_USER_ATTRIBUTES),
        token
      },
      code: 200
    })
  } catch (err) {
    logger.warn(`User login failed: `, err.message)

    return sendError(res, {
      code: 200,
      error: err.message
    })
  }
})

router.post(`${API_PREFIX}/forgotWorkspace`, emailValidation, async (req, res) => {
  try {
    if (req.body.email) {
      const user = await getUserByEmail(req.body.email, null)
      const userid = get(user, 'dataValues.id', false)
      if (userid) {
        const workspaces = await findWorkspaceByUserId(userid)
        if (workspaces) {
          const resp = await sendMail(
            'forgot_workspace', {
            to: req.body.email,
            subject: 'Ubblu - Your Workspaces',
          }, {
            url: process.env.HOSTNAME ?
              process.env.HOSTNAME : 'https://ubblu.ga/', workspaces
          })

          if (resp.status) {
            return sendResponse(res, {
              data: {
                message: 'Mail has been sent on given email address'
              },
              code: 200
            })
          } else {
            return sendError(res, {
              code: 500,
              error: 'Error occured while sending mail'
            })
          }

        } else {
          res.send({
            code: 500,
            status: 'Something broke'
          })
        }
      } else {
        res.statusCode = 400
        res.send({
          code: 400,
          status: 'Unable to find user'
        })
      }
    } else {
      res.send({
        code: 400,
        status: 'Mail ID is required'
      })
    }
  } catch (error) {
    console.info('ERROR', error);
    res.statusCode = 500
    res.send({
      code: 500,
      status: 'Something broke',
      error
    })

  }
})

// Tested and working
// Send verification email to user
router.post(
  `${API_PREFIX}/forgotPassword`,
  emailValidation,
  async (req, res) => {
    // Check email in user table
    const user = await getUserByEmail(req.body.email, req.body.workspaceId)
    if (!user) {
      return sendResponse(res, {
        data: {
          message: 'Mail has been sent on given email address'
        },
        code: 200
      })
    } else {
      // Generate token
      const userData = {
        email: req.body.email,
        workspaceId: req.body.workspaceId
      }

      const token = jwt.sign(userData, process.env.JWT_SECRET, {
        expiresIn: 60 * 60 * 2
      }) // Expired in 2 hours
      const url = WEB_URL + 'login/setpassword?token=' + token

      // Send mail
      const resp = await sendMail(
        'forget_password',
        {
          to: req.body.email,
          subject: 'Ubblu - Reset Password'
        },
        {
          url
        }
      )

      // Send response back
      if (resp.status) {
        await createTokenLogs(req.body.email, token, req.body.workspaceId);
        return sendResponse(res, {
          data: {
            message: 'Mail has been sent on given email address'
          },
          code: 200
        })
      } else {
        return sendError(res, {
          code: 500,
          error: 'Error occured while sending mail'
        })
      }
    }
  }
)

// Tested and working
// Reset password
router.post(`${API_PREFIX}/resetPassword`, async (req, res) => {
  const { password, token } = req.body

  let data = {}
  try {
    data = jwt.verify(token, process.env.JWT_SECRET);
    const isTokenExpired = await getTokenLogs(data.email, token);
    console.log('token logs-------------', isTokenExpired)
    if (isTokenExpired && isTokenExpired.length && isTokenExpired[0]['expired']) {
      return sendError(res, {
        code: 400,
        error: 'Error: Password Reset Link has been used already'
      })
    }
  } catch (exp) {
    return sendError(res, {
      code: 400,
      error: 'Link expired'
    })
  }

  try {
    // Verify email is not exist already
    const user = await getUserByEmail(data.email, data.workspaceId)
    if (!user) {
      // User not exist
      return sendError(res, {
        code: 400,
        error: 'User with this email is not registered with us'
      })
    } else {
      const hash = await bcrypt.hash(password, 10)
      await updateUserById(user.id, {
        password: hash
      })
      await updateTokenLogs(data.email, req.body.token, user.user_workspace_relationships.workspace_id);

      return sendResponse(res, {
        data: {
          status: 1,
          message: 'Password has been updated'
        },
        code: 201
      })
    }
  } catch (exp) {
    return sendError(res, {
      code: 400,
      error: 'Link expired'
    })
  }
})

// Tested and working
// Verify workspace
router.post(`${API_PREFIX}/verifyWorkspace`, async (req, res) => {
  const { name } = req.body

  try {
    const workspace = await findWorkspaceByName(name)
    if (workspace) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'Workspace is already in use',
          workspace
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Workspace is available to use'
          //workspace
        }
      })
    }
  } catch (err) {
    return sendError(res, {
      code: 500,
      error: 'Error occured while finding workspace',
      err
    })
  }
})


router.get(`${API_PREFIX}/google/signIn`, async (req, res) => {
  console.log('google oauth state ID---------------------', req.query.id);

  try {
    const authUrl = oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      // If you only need one scope you can pass it as a string
      scope: scopes.join(' '),
      // approval_prompt:'force',
      prompt: 'consent',
      state: req.query.id

    })
    return res.redirect(authUrl)

  } catch (err) {
    logger.warn('Error while google sign in ', err)
  }
})


router.get(`${API_PREFIX}/dropbox/signIn`, async (req, res) => {
  try {
    const userId = req.query.id;
    // const authUrl = dropbox.generateAuthUrl()
    const authUrl = dbx.getAuthenticationUrl(process.env.DROPBOX_REDIRECT_URL, userId, 'code');
    return res.redirect(authUrl)

  } catch (err) {
    logger.warn('Error while dropbox sign in ')
  }
})


router.get(`${API_PREFIX}/google/signIn/callback`, async (req, res) => {
  try {
    console.log('response afte google signinxxxxxxxxxx', req.query.state);
    const userId = req.query.state;
    const { tokens } = await oauth2Client.getToken(req.query.code)
    const tokenDetails = JSON.stringify(tokens)
    oauth2Client.setCredentials(tokens)
    if (userId) {

      const query = `update users set google_access_token = '${tokenDetails}' where id = ${userId}`;
      await sequelize.query(query, {
        type: sequelize.QueryTypes.UPDATE
      });
    }

    // return res.redirect('http://localhost:3010/login');
    return res.redirect('http://ubblu.ga/login')

  } catch (err) {
    logger.warn('Error while google sign in ', err)
  }
})



router.get(`${API_PREFIX}/dropbox/signIn/callback`, async (req, res) => {
  try {
    const code = req.query.code;
    const userId = req.query.state;
    let redirectUri = process.env.DROPBOX_REDIRECT_URL;

    dbx.getAccessTokenFromCode(redirectUri, code)
      .then(async function (token) {
        console.log('Token Result:' + JSON.stringify(token));
        const tokenDetails = token
        const query = `update users set dropbox_access_token = '${tokenDetails}' where id = ${userId}`;
        console.log('query', query);
        var data = await sequelize.query(query, {
          type: sequelize.QueryTypes.UPDATE
        });
        dbx.setAccessToken(token);
        // return res.redirect('http://localhost:3010/login');
        return res.redirect('https://ubblu.ga/login')
      })
      .catch(function (error) {
        console.log(error);
      });

  } catch (err) {
    logger.warn('Error while dropbox sign in ', err)
  }
})




const fileUploadByGoogleDrive = async (auth, fileOriginalName, fileName, fileFieldName, userId, storedGoogleAccessToken) => {
  try {

    if (storedGoogleAccessToken) {
      auth.setCredentials({
        refresh_token: storedGoogleAccessToken.refresh_token
      });
    } else return false

    const drive = google.drive({
      version: 'v3',
      auth: auth
    })
    const response = await drive.files.create({
      requestBody: {
        name: fileOriginalName,
        mimeType: mime.lookup(fileName)
      },
      media: {
        mimeType: mime.lookup(fileName),
        body: fs.createReadStream(`uploads/${fileName}`),
      }
    })


    const thumbnailUploadFileName = `${fileFieldName}` + '-' + Date.now()
    const thumbnailUploadPath = path.join(__dirname, `../public/dropbox-uploads/`)
    const ext = fileName.substr(fileName.lastIndexOf('.'))

    console.log('extension check', ext.toLowerCase());

    if (ext.toLowerCase() == '.jpeg' || ext.toLowerCase() == '.jpg' || ext.toLowerCase() == '.gif' || ext.toLowerCase() == '.png') {

      await thumb({
        source: `uploads/${fileName}`, // could be a filename: dest/path/image.jpg
        destination: thumbnailUploadPath,
        suffix: '',
        basename: thumbnailUploadFileName,
        ignore: true,
        width: 150
      })
    }

    // response.data.thumbnailLink = `http://localhost:8080/dropbox-uploads/${thumbnailUploadFileName}${ext}`;
    response.data.thumbnailLink = `https://backend.ubblu.ga/dropbox-uploads/${thumbnailUploadFileName}${ext}`
    response.data.hasThumbnail = true
    response.data.fileUploadMethod = 'GOOGLE-DRIVE'
    response.data.fileName = fileOriginalName
    return response.data
    // })

  } catch (err) {
    console.log('error in file upload--------------------', err)
    return false
  }
}


const fileUploadByDropBox = async (fileName, fileOriginalName, fileFieldName, userId, storedDropboxAccessToken) => {
  return new Promise(async (resolve, reject) => {
    console.log('dropbox token', storedDropboxAccessToken);
    //save access token to database
    // if (!storedDropboxAccessToken && dbx && dbx.accessToken) {

    //   const tokenDetails = (dbx.accessToken);
    //   const query = `update users set dropbox_access_token = '${tokenDetails}' where id = ${userId}`;
    //   await sequelize.query(query, {
    //     type: sequelize.QueryTypes.UPDATE
    //   });
    // }
    var dbx = new Dropbox({ accessToken: storedDropboxAccessToken });


    dbx.filesUpload({ path: `/ubblu/uploads/${fileName}`, contents: `uploads/${fileName}` })
      .then(function (response) {
        response.fileUploadMethod = 'DROPBOX'
        response.fileName = fileOriginalName
        response.mimeType = mime.lookup(fileName)
        return resolve(response)

      })
      .catch(function (error) {
        console.error(error);
        return reject(error)
      });
  })

}


// File upload
router.post(`${API_PREFIX}/uploadFile`, loggedInMiddleware, async (req, res) => {
  try {

    const auth = oauth2Client
    // console.log('dropbox data', dbx);

    upload(req, res, async function (err) {

      const file = req.file

      console.log('req file  ====================', req.file)
      console.log('file Description', req.body.fileDescription)

      if (!file || !file.filename) {
        // Invalid request
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'Invalid request due to no file'
          }
        })
      }

      const fileName = req.file.filename;
      const fileOriginalName = req.file.originalname;
      const fileFieldName = req.file.fieldname

      let response;
      let storedGoogleAccessToken;
      let storedDropboxAccessToken;
      const query = `select cloud_storage, google_access_token, dropbox_access_token from users where id = ${req.user.id}`
      let cloudStorage = await sequelize.query(query)
      if (cloudStorage.length) {
        storedGoogleAccessToken = cloudStorage[0][0]['google_access_token'];
        storedDropboxAccessToken = cloudStorage[0][0]['dropbox_access_token'];
        cloudStorage = cloudStorage[0][0]['cloud_storage'];

      }
      if (cloudStorage == 'GOOGLE-DRIVE') {
        response = await fileUploadByGoogleDrive(auth, fileOriginalName, fileName, fileFieldName, req.user.id, storedGoogleAccessToken);

      } else if (cloudStorage == 'DROPBOX') {
        try {
          if (storedDropboxAccessToken == null) {
            return sendError(res, {
              code: 500,
              error: {
                status: 2,
                message: 'DROPBOX sign In required',
                error: 'ss'
              }
            })
          }

          response = await fileUploadByDropBox(fileName, fileOriginalName, fileFieldName, req.user.id, storedDropboxAccessToken)
        } catch (err) {
          return sendError(res, {
            code: 500,
            error: {
              status: 2,
              message: 'DROPBOX sign In required',
              error: err
            }
          })
        }

      } else {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'NO cloud storage method found',
            error: err
          }
        })
      }
      console.log('response afyer file upload', response)

      if (response) {
        return sendResponse(res, {
          code: 200,
          data: response
        })
      } else {
        return sendError(res, {
          code: 500,
          error: {
            status: 3,
            message: 'Google Sign In required',
            error: err
          }
        })
      }
    })

  } catch (err) {
    logger.warn('Error occured while uploading file : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while uploading file'
      }
    })
  }
})


router.get(`${API_PREFIX}/file/download/:msgId`, loggedInMiddleware, async (req, res) => {
  const msgId = req.params.msgId
  const auth = oauth2Client

  // try {

  const query = `select file_upload_details, file_upload_service_method from messages where id = ${msgId}`
  const fileData = await sequelize.query(query)
  console.log('file data ---------------------', fileData)

  if (fileData[0].length) {
    const fileMetaData = fileData[0][0]['file_upload_details']
    const cloudStorage = fileData[0][0]['file_upload_service_method']

    const fileName = fileMetaData['fileName']
    const fileId = fileMetaData['id']
    const mimeType = fileMetaData['mimeType']

    const filePath = `uploads/${fileName}`
    const dest = fs.createWriteStream(filePath)

    let storedGoogleAccessToken;
    let storedDropboxAccessToken;
    const query = `select cloud_storage, google_access_token, dropbox_access_token from users where id = ${req.user.id}`
    let cloudStorageMethod = await sequelize.query(query)
    if (cloudStorageMethod.length) {
      storedGoogleAccessToken = cloudStorageMethod[0][0]['google_access_token'];
      storedDropboxAccessToken = cloudStorageMethod[0][0]['dropbox_access_token'];

    }

    if (cloudStorage == 'GOOGLE-DRIVE') {
      if (storedGoogleAccessToken) {
        auth.setCredentials({
          refresh_token: storedGoogleAccessToken.refresh_token
        });
      }
      const drive = google.drive({
        version: 'v3',
        auth: auth
      })

      console.log('file id ------------------', fileId)

      drive.files.get(
        {
          fileId,
          alt: 'media'
        },
        {
          responseType: 'stream'
        }
      ).then(response => {
        console.log('google fie fownload', response)
        response.data
          .on('end', () => {
            console.log('Done downloading file path.', path.join(__dirname + `../../../uploads/${fileName}`))
            const fileData = {}
            fileData['path'] = path.join(__dirname + `../../../uploads/${fileName}`)
            fileData['mimeType'] = mimeType
            const filePath = path.join(__dirname + `../../../uploads/${fileName}`)
            return res.download(filePath)

          })
          .on('error', err => {
            console.error('Error downloading file.')
          })
          .on('data', d => {

          })
          .pipe(dest)
      })
    } else {
      const dropboxFilePath = fileMetaData['path_lower']

      var dbx = new Dropbox({ accessToken: storedDropboxAccessToken });

      dbx.filesDownload({ path: dropboxFilePath })
        .then(response => {
          console.log('data from dropbox file', response);
          //download completed
          console.log('Done downloading file path.', path.join(__dirname + `../../../uploads/${fileName}`))
          const filePath = path.join(__dirname + `../../../uploads/${fileName}`)
          fs.writeFile(filePath, response.fileBinary, 'binary', function (err) {
            if (err) { throw err; }
            console.log('File: ' + response.name + ' saved.');
            return res.download(filePath);
          });
        })
        .catch(function (error) {
          console.error(error);
        })


      // dropbox({
      //   resource: 'files/download',
      //   parameters: {
      //     path: dropboxFilePath
      //   }
      // }, (err, result, response) => {
      //   //download completed
      //   console.log('Done downloading file path.', path.join(__dirname + `../../../uploads/${fileName}`))
      //   const fileData = {}
      //   fileData['path'] = path.join(__dirname + `../../../uploads/${fileName}`)
      //   fileData['mimeType'] = mimeType
      //   const filePath = path.join(__dirname + `../../../uploads/${fileName}`)
      //   return res.download(filePath)
      // })
      //   .pipe(dest)
    }
  }

})







/* Routes that required token */
router.use(`${API_PREFIX}/users`, loggedInMiddleware, require('./user'))
router.use(
  `${API_PREFIX}/workspaces`,
  loggedInMiddleware,
  require('./workspace')
)
router.use(`${API_PREFIX}/channels`, loggedInMiddleware, require('./channel'))
router.use(`${API_PREFIX}/messages`, loggedInMiddleware, require('./message'))

module.exports = router