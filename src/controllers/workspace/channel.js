'use strict'

const express = require('express')
const router = express.Router()

const {
  getWorkspaceUsers,
  getWorkspaceChannels,
  getWorkspacePublicChannels,
  getChannels,
  getAllChannels
} = require('./../../helpers/workspace')
const {
  addChannelToWorkspace,
  addMemberstoChannel,
  addMemberstoConnections,
  updateChannel,
  searchChannels,
  findChannelWithName,
  getWorkspaceUsersRelationToAChannel
} = require('./../../helpers/channel')

const logger = require('./../../logger')
const { sendError, sendResponse } = require('./../../utils/http')
const colorgenerator = require('./../../utils/colorgenerator')

// List of all channels of workspace
router.get('/', async (req, res) => {
  try {
    const channels = await getWorkspaceChannels(req.workspace.id, req.user.id)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Channels has been found',
        channels
      }
    })
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching workspace channels'
      }
    })
  }
});

// List of all channels of workspace
router.get('/list', async (req, res) => {
  try {
    const channels = await getAllChannels(req.workspace.id, req.user.id)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Channels has been found',
        channels
      }
    })
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching workspace channels'
      }
    })
  }
});




// List of all public channels of workspace
router.get('/public', async (req, res) => {
  try {
    const channels = await getChannels(req.workspace.id, req.user.id)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Channels has been found',
        channels
      }
    })
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching workspace channels'
      }
    })
  }
});


// Add new channel to workspace
router.post('/', async (req, res) => {
  try {
    // Get workspace by id
    const { workspace } = req

    if (workspace && workspace.id) {
      // Add user to channel
      const value = {
        name: req.body.name,
        workspace_id: workspace.id,
        created_by: req.user.id,
        invite_link: (
          '/invite/' +
          workspace.name +
          '/' +
          req.body.name
        ).toLowerCase()
      }

      value['visibility'] = true;
      value['colors'] = `${colorgenerator()} ${colorgenerator()}`


      if (req.body.description != undefined && req.body.description != null) {
        value['description'] = req.body.description
      }
      if (req.body.channelType != undefined && req.body.channelType != null) {
        value['channel_type'] = req.body.channelType
      }

      if (req.body.autoJoin != undefined && req.body.autoJoin != null) {
        value['auto_join'] = req.body.autoJoin
      }

      const channelExist = await findChannelWithName(value['name'], null, value['workspace_id'])
      if (channelExist) {
        // channel already exist
        return sendError(res, {
          code: 400,
          error: 'Channel with this name already exists! '
        })
      }


      let channel = await addChannelToWorkspace(value)
      if (channel && channel.length) {
        channel = channel[0][0]
      }



      let users = []
      // if (req.body.autoJoin) { // make this line to registration
      //   // // Auto join user to channel
      //   const u = await getWorkspaceUsers(workspace.id)
      //   users = u.map(user => {
      //     return user.id
      //   })

      //   // Remove creator from list
      //   const index = users.indexOf(req.user.id)
      //   if (index !== -1) {
      //     users.splice(index, 1)
      //   }
      // }

      // Add channel creator to that channel
      await addMemberstoChannel(channel.id, [req.user.id], 'ADMIN');
      // await addMemberstoChannel(channel.id, users, 'MEMBER');
      users.push(req.user.id);
      await addMemberstoConnections(channel.id, [req.user.id])

      if (channel) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Channel has been added to workspace',
            channel
          }
        })
      } else {
        return sendResponse(res, {
          code: 400,
          data: {
            status: 0,
            message: 'Fail to add channel in given workspace'
          }
        })
      }
    } else {
      // Invalid workspace
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Invalid workspace'
        }
      })
    }
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while adding channel'
      }
    })
  }
})

// Update channel to workspace
router.put('/:channelId', async (req, res) => {
  try {
    // Get workspace by id
    const { workspace } = req

    if (workspace && workspace.id) {
      let value = {}

      if (req.body.name) {
        value['name'] = req.body.name
      }
      if (req.body.description) {
        value['description'] = req.body.description
      }
      if (req.body.visibility) {
        value['visibility'] = req.body.visibility
      }
      if (req.body.channelType != undefined && req.body.channelType != null) {
        value['channel_type'] = req.body.channelType;
      }
      if (req.body.autoJoin != undefined && req.body.autoJoin != null) {
        value['auto_join'] = req.body.autoJoin;
      }

      const channelExist = await findChannelWithName(value['name'], req.params.channelId, workspace.id)
      if (channelExist) {
        // channel already exist
        return sendError(res, {
          code: 400,
          error: 'Channel with this name already exists! '
        })
      }

      const channel = await updateChannel(req.params.channelId, value)

      if (channel) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Channel has been updated'
          }
        })
      } else {
        return sendResponse(res, {
          code: 400,
          data: {
            status: 0,
            message: 'Fail to update channel information'
          }
        })
      }
    } else {
      // Invalid workspace
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Invalid workspace'
        }
      })
    }
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while adding channel'
      }
    })
  }
})

// get all the workspace users and its relation to a channel
router.get('/users/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const users = await getWorkspaceUsersRelationToAChannel(req.workspace.id, channelId)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'users has been found',
        users
      }
    })
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching users'
      }
    })
  }
})

module.exports = router
// module.exports = router
