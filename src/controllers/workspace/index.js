'use strict'

const express = require('express')
const { sequelize } = require('../../models')

const router = express.Router()

const {
  workspaceDetail,
  workspaceSuperAdminIsAllowed
} = require('./../../middlewares/auth')

const {
  User,
  Workspace,
  Department,
  UserWorkspaceRelationship,
  Op
} = require('./../../models/index')

const { sendError, sendResponse } = require('./../../utils/http')
const {
  SAFE_USER_ATTRIBUTES,
  SAFE_DEPARTMENT_ATTRIBUTES
} = require('./../../constants')
const {
  createWorkspace,
  checkAvailability,
  updateWorkspace,
  getWorkspaceById,
  setMultipleWorkspaceMeta,
  getWorkspaceUsers,
  getWorkspaceChannels,
  getWorkspaceDepartment,
  inviteUser,
  updateUserWorkspace,
  updateWorkspaceRegistrationSettings,
  workspaceRegistrationSettings,
  getWorkspaceOtherUsers
} = require('./../../helpers/workspace')

const {
  setUserMeta,
  setMultipleUserMeta,
  searchUser,
  getUserByEmail
} = require('./../../helpers/user')

const logger = require('./../../logger')

// Get Personal workspace
router.get('/personal', async (req, res) => {
  const { user } = req

  const workspace = await Workspace.findOne({
    include: [
      {
        model: User,
        attributes: SAFE_USER_ATTRIBUTES,
        as: 'creator'
      }
    ],
    where: {
      workspace_type: 'PERSONAL',
      created_by: user.id
    }
  })

  if (!workspace) {
    return sendError(res, {
      error: 'Personal workspace not found',
      code: 404
    })
  }

  return sendResponse(res, {
    data: { workspace },
    code: 200
  })
})

// Get workspace details by Id
router.get('/:workspace_id', async (req, res) => {
  const { workspace_id } = req.params
  const { user } = req

  const workspace = await Workspace.findOne({
    include: [
      {
        // creator
        model: User,
        attributes: SAFE_USER_ATTRIBUTES,
        as: 'creator'
      },
      {
        // relationships
        model: UserWorkspaceRelationship,
        as: 'user_workspace_relationships',
        attributes: ['id', 'status', 'is_suspended'],
        include: [
          {
            model: User,
            attributes: SAFE_USER_ATTRIBUTES,
            as: 'user'
          }
        ],
        required: true
      }
    ],
    where: {
      id: workspace_id,
      workspace_type: 'PUBLIC'
    }
  })

  if (!workspace) {
    return sendError(res, {
      error: 'Public workspace not found',
      code: 404
    })
  }

  // check permission
  const permission = workspace.user_workspace_relationships.find(permission => {
    return permission.user.id === user.id
  })

  if (!permission || ['BLOCKED', 'NONE'].includes(permission.status)) {
    return sendError(res, {
      error: 'You are not a member of this workspace',
      code: 403
    })
  }

  return sendResponse(res, {
    code: 200,
    data: { workspace }
  })
})

// Tested and working
// Get all workspace
router.get('/', async (req, res) => {
  const { user } = req

  const workspaces = await Workspace.findAll({
    include: [
      {
        // creator
        model: User,
        attributes: SAFE_USER_ATTRIBUTES,
        as: 'creator'
      },
      {
        // relationships
        model: UserWorkspaceRelationship,
        as: 'user_workspace_relationships',
        attributes: ['id', 'status', 'is_suspended'],
        include: [
          {
            model: User,
            attributes: SAFE_USER_ATTRIBUTES,
            as: 'user'
          },
          {
            model: Department,
            attributes: SAFE_DEPARTMENT_ATTRIBUTES
          }
        ],
        where: {
          user_id: user.id,
          is_suspended: false,
          status: {
            [Op.notIn]: ['BLOCKED', 'NONE']
          }
        },
        required: true
      }
    ],
    where: {
      workspace_type: 'PUBLIC'
    }
  })

  if (!workspaces) {
    return sendError(res, {
      error: 'Personal workspace not found',
      code: 404
    })
  }

  // // check permission
  // const permission = workspace.user_workspace_relationships.find(permission => {
  //   return permission.user.id === user.id
  // })

  // if (!permission || ['BLOCKED', 'NONE'].includes(permission.status)) {
  //   return sendError(res, {
  //     error: 'You are not a member of this workspace',
  //     code: 403
  //   })
  // }

  return sendResponse(res, {
    code: 200,
    data: { workspaces }
  })
})

// Create workspace
router.post('/', async (req, res) => {
  const { user } = req
  const { name, description } = req.body

  let workspaceAvailable = true

  if (name !== 'PERSONAL') {
    // Check Availability
    workspaceAvailable = await checkAvailability(name)
  }

  if (workspaceAvailable) {
    const workspace = await createWorkspace({
      created_by: user.id,
      name,
      description: description || ''
    })

    // Check if user is creating workspace first time, if yes, then update signup step value
    if (req.body.signupUser) {
      await setUserMeta(user['id'], 'signupStep', '2')
    }

    return sendResponse(res, {
      code: 201,
      data: { workspace }
    })
  } else {
    // Workspace not available
    return sendError(res, {
      code: 400,
      error: {
        status: 0,
        message: 'Workspace name is not available'
      }
    })
  }
})

router.post('/checkAvailability', async (req, res) => {
  const isAvailable = await checkAvailability(req.body.name)
  if (!isAvailable) {
    return sendResponse(res, {
      code: 200,
      data: {
        status: 0,
        message: 'Workspace name is not available'
      }
    })
  } else {
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Workspace name is available'
      }
    })
  }
})

// Update Workspace
router.put('/:workspaceId', async (req, res) => {
  const { user } = req

  const isUpdated = await updateWorkspace(req.params.workspaceId, {
    description: req.body.description
  })

  if (isUpdated) {
    // Record has been updated

    // Check if user is creating workspace first time, if yes, then update signup step value
    if (req.body.signupUser) {
      await setUserMeta(user['id'], 'signupStep', '3')
    }

    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Workspace has been updated'
      }
    })
  } else {
    // Update failed
    return sendError(res, {
      code: 400,
      error: {
        status: 0,
        message: 'Failed to update workspace'
      }
    })
  }
})

router.post('/:workspaceId/inviteUser', async (req, res) => {
  try {

    req.body.invitedEmail.map(async(data) => {
      let userExist = await getUserByEmail(data.email, req.params.workspaceId);
      if (userExist) {
        // User already exist
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'One of the email addresses entered is already an existing user in this workspace'
          }
        })
      }
    })

    // Invite user
    const resp = await inviteUser(
      req.user,
      req.params.workspaceId,
      req.body.invitedEmail
    )

   
    if (resp) {
      // Check if user is creating workspace first time, if yes, then update signup step value
      if (req.body.signupUser) {
        await setUserMeta(req.user['id'], 'signupStep', '4')
      }

      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Invites has been sent'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while inviting user to workspace'
        }
      })
    }
  } catch (err) {
    return sendError(res, {
      code: 400,
      error: {
        status: 0,
        message: 'Fail to invite user to workspace'
      }
    })
  }
})

router.post('/:workspaceId/inviteEmployee', async (req, res) => {
  try {
    //check if user exists
    req.body.invitedEmail.map(async(data) => {
      let userExist = await getUserByEmail(data.email, req.params.workspaceId);
      if (userExist) {
        // User already exist
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'One of the email addresses entered is already an existing user in this workspace'
          }
        })
      }
    })


    // Invite user
    const web_url = req.headers.origin ? `${req.headers.origin}/` : undefined;
    const resp = await inviteUser(
      req.user,
      req.params.workspaceId,
      req.body.invitedEmail,
      'EMPLOYEE',
      web_url
    )

    if (resp) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Invites has been sent'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while inviting user to workspace'
        }
      })
    }
  } catch (err) {
    return sendError(res, {
      code: 400,
      error: {
        status: 0,
        message: 'Fail to invite user to workspace'
      }
    })
  }
})

// Set or update metadata for given workspace
router.post('/:workspaceId/setMetadata', async (req, res) => {
  try {
    // Fetch workspace details
    const workspace = await getWorkspaceById(req.params.workspaceId)
    if (workspace) {
      // valid workspace
      if (workspace.created_by == req.user.id) {
        // Valid user
        const values = {}
        if (req.body.sizeOfTeam) {
          values['sizeOfTeam'] = req.body.sizeOfTeam
        }
        if (req.body.companyRole) {
          values['companyRole'] = req.body.companyRole
        }
        if (req.body.companyIndustry) {
          values['companyIndustry'] = req.body.companyIndustry
        }
        if (req.body.howFind) {
          values['howFind'] = req.body.howFind
        }
        if (req.body.otherServices) {
          values['otherServices'] = req.body.otherServices
        }
        await setMultipleWorkspaceMeta(req.params.workspaceId, values)

        // Check if user is creating workspace first time, if yes, then update signup step value
        if (req.body.signupUser) {
          await setUserMeta(req.user['id'], 'signupStep', '5')
        }

        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Workspace meta has been updated'
          }
        })
      } else {
        // Unauthorize user
        return sendError(res, {
          code: 401,
          error: {
            status: 0,
            message: 'Invalid workspace'
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
        message: 'Internal error occured while updating workspace metadata'
      }
    })
  }
})

// Update user profile
router.post('/:workspaceId/updateMember/:userId', async (req, res) => {
  try {
    // To-do: Check current user is super admin of workspace or not

    const possibleRole = [
      'SUPERADMIN',
      'ADMIN',
      'BLOCKED',
      'GUEST USER',
      'NONE'
    ]
    if (
      !req.body.role ||
      (req.body.role && possibleRole.indexOf(req.body.role) !== -1)
    ) {
      const values = {}

      if (req.body.name) {
        values['name'] = req.body.name
      }

      // To-do: We should have different table for department
      if (req.body.department) {
        values['department'] = req.body.department
      }
      if (req.body.timeZone) {
        values['timeZone'] = req.body.timeZone
      }
      if (req.body.note) {
        values['note'] = req.body.note
      }
      await setMultipleUserMeta(req.params.userId, values)

      if (req.body.role) {
        // Update user role
        await UserWorkspaceRelationship.update(
          {
            user_id: req.params.userId,
            workspace_id: req.params.workspaceId,
            status: req.body.role // Role should be from possible role
          },
          {
            where: {
              user_id: req.params.userId,
              workspace_id: req.params.workspaceId
            }
          }
        )
      }

      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User details has been updated'
        }
      })
    } else {
      // Invalid role
      return sendResponse(res, {
        code: 400,
        data: {
          status: 1,
          message: 'Invalid user role'
        }
      })
    }
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while updating user metadata'
      }
    })
  }
})

// List of all users of workspace
router.get('/:workspaceId/users', async (req, res) => {
  try {
    const users = await getWorkspaceUsers(req.params.workspaceId, req.user.id)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Users has been found',
        users
      }
    })
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching workspace users'
      }
    })
  }
})

// List of all users of workspace excluding the logged in user
router.get('/:workspaceId/otherUsers', async (req, res) => {
  try {
    const users = await getWorkspaceOtherUsers(req.params.workspaceId, req.user.id)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Users has been found',
        users
      }
    })
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching workspace users'
      }
    })
  }
})


// List of all users of workspace with their last conversations to a user
router.get('/:workspaceId/:userId/users/recent/messages', async (req, res) => {
  let workspaceId = req.params.workspaceId
  let userId = req.params.userId

  let query = `select
	json_agg( json_build_object('otherUser',
	(case when t.channel_type != 'PERSONAL' then (select json_build_object( 'id', t.channel_id, 'channel', true, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned,'username', t.name, 'email', null, 'availability', t.availability, 'name', t.name, 'profile_image', null ) ) else ( select json_build_object( 'id', t.user_id, 'channel', false, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned ,'username', t.username, 'email', t.email, 'availability', t.availability, 'name', t.name, 'profile_image', t.profile_image ) ) end),
	'senderDetails', ( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message,'fileDetails', t.file_upload_details, 'messageType', t.message_type,'is_tagged',t.is_tagged, 'created_at', t.created_at, 'unread',
	(select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id  ) ) )) ) as conversations
from
	( (
	select
		distinct on
		(u.id) m.message,
		m.created_at,
		m.id as msg_id,
		m.receiver_id,
		m.sender_id,
    m.message_type,
    m.is_tagged,
    m.file_upload_details,
		u.id as user_id,
		u.username,
		u.profile_image,
		u.name,
    u.email,
    u.profile_color as colors,
		u.availability,
		c.id as channel_id,
		c.channel_type,
		ucr.starred,
    ucr.muted,
    ucr.pinned
	from
		users u
	join "user-workspace-relationships" uwr on
		uwr.user_id = u.id
	join messages m on
		  u.id = (case when m.receiver_id= ${userId} then m.sender_id else m.receiver_id end)
	left join channels c on
		c.id = m.channel_id
	left join "user-channel-relationships" ucr on
		ucr.channel_id = c.id
	where
		uwr.workspace_id = ${workspaceId}
		and
    m.receiver_id = ${userId} or m.sender_id = ${userId} 
    and m.deleted = false
		and  ucr.user_id = ${userId}
	and c.channel_type = 'PERSONAL'
  order by
		u.id,
		m.created_at desc)
union (
select
	distinct on
	(c.id) m.message,
	m.created_at,
	m.id as msg_id,
	m.receiver_id,
	m.sender_id,
  m.message_type,
  m.is_tagged,
  m.file_upload_details,
	null as user_id,
	c."name" as username ,
	null as profile_image,
	c.name,
  null as email,
  c.colors ,
	null as availability,
	c.id as channel_id,
  c.channel_type,
	ucr.starred,
  ucr.muted,
  ucr.pinned
from
	channels c
join messages m on
	  m.receiver_id = c.id
left join "user-channel-relationships" ucr on
	ucr.channel_id = c.id
where
	c.workspace_id = ${workspaceId}
	and ucr.user_id = ${userId}
  and c.channel_type != 'PERSONAL'
  and m.deleted = false
order by
	c.id,
	m.created_at desc)
order by
created_at desc )as t`;

  sequelize
    .query(query, {
      type: sequelize.QueryTypes.SELECT
    })
    .then(result => {
      let pinned = []
      let unpinned =  []
      if (result.length > 0) {
        result[0]['conversations'].forEach(element => {
          //console.log('----------------------------')
            if(element.otherUser.pinned){
              pinned.push(element)
            } else {
              unpinned.push(element)
            }
        })
      }
      //console.log('------>>>>>>>>>PINNED<<<<<<<<<<<-------',pinned)
      //console.log('------>>>>>>>>>UNPINNED<<<<<<<<<<<-------',unpinned)
      let conversations = pinned.concat(unpinned);
     // console.log('------>>>>>>>>>conversations<<<<<<<<<<<-------',conversations)
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Conversation found',
          conversations: result.length > 0 ? conversations : [],
          id: userId
        }
      })
    })
    .catch(err => {
      console.info('RESPONSE HANDLING MESSAGES 1', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while fetching  recent conversations'
        }
      })
    })
})

// List of all users of workspace with their last conversations to a user
router.get(
  '/:workspaceId/:userId/users/direct/recent/messages',
  async (req, res) => {
    const workspaceId = req.params.workspaceId
    const userId = req.params.userId

    const query = `select
	json_agg( json_build_object('otherUser',
	(( select json_build_object( 'id', t.user_id, 'channel', false, 'channelType', t.channel_type, 'username', t.username, 'email', t.email, 'availability', t.availability, 'name', t.name, 'profile_image', t.profile_image, 'starred', t.starred, 'muted', t.muted, 'pinned',t.pinned ) ) ), 'senderDetails',
	( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ),
	'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message,'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id  ) ) )) ) as conversations
from
	(
	select
		distinct on
		(u.id) m.message,
		m.created_at,
		m.id as msg_id,
		m.receiver_id,
		m.sender_id,
    m.message_type,
    m.file_upload_details,
		u.id as user_id,
		u.username,
    u.profile_image,
		u.name,
		u.email,
		u.availability,
		c.id as channel_id,
		c.channel_type,
		ucr.muted,
    ucr.starred,
    ucr.pinned
	from
		users u
	join "user-workspace-relationships" uwr on
		uwr.user_id = u.id
	join messages m on
		u.id =
		(case
			when m.receiver_id = ${userId} then m.sender_id
			else m.receiver_id end)
	left join channels c on
		c.id = m.channel_id
	left join "user-channel-relationships" ucr on
		ucr.channel_id = c.id
	where
		uwr.workspace_id = ${workspaceId}
		and m.receiver_id = ${userId}
		or m.sender_id = ${userId}
    and m.message is not null
    and m.deleted = false
		and c.channel_type = 'PERSONAL'
	order by
		u.id,
		m.created_at desc) as t;`

    sequelize
      .query(query, {
        type: sequelize.QueryTypes.SELECT
      })
      .then(result => {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation found',
            conversations: result.length > 0 ? result[0]['conversations'] : [],
            id: userId
          }
        })
      })
      .catch(err => {
        console.info('RESPONSE HANDLING MESSAGES 2', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while fetching  recent conversations'
          }
        })
      })
  }
)

// List of all users of workspace with their last conversations to a user
router.get(
  '/:workspaceId/:userId/users/channel/recent/messages',
  async (req, res) => {
    const workspaceId = req.params.workspaceId
    const userId = req.params.userId

    const query = `select
	json_agg( json_build_object('otherUser',
	 (select json_build_object( 'id', t.channel_id, 'channel', true, 'colors', t.colors,'channelType', t.channel_type, 'username', t.name, 'email', null, 'availability', t.availability, 'name', t.name, 'profile_image', null,'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned )  ),
	 'senderDetails', ( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 'lastMessage',
	 ( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message, 'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id ) ) )) ) as conversations
from
	(
	select
		distinct on
		(c.id) m.message,
		m.created_at,
		m.id as msg_id,
		m.receiver_id,
		m.sender_id,
    m.message_type,
    m.file_upload_details,
		null as user_id,
		c."name" as username ,
		null as profile_image,
		c.name,
		c.colors ,
		null as email,
		null as availability,
		c.id as channel_id,
    c.channel_type,
    ucr.muted,
    ucr.starred,
    ucr.pinned
	from
		channels c
	left join messages m on
		m.receiver_id = c.id
	left join "user-channel-relationships" ucr on
		ucr.channel_id = c.id
	where
		c.workspace_id = ${workspaceId}
		and ucr.user_id = ${userId}
		and c.channel_type != 'PERSONAL'
    and m.message is not null
    and m.deleted = false
	order by
		c.id,
		m.created_at desc)as t ;`

    sequelize
      .query(query, {
        type: sequelize.QueryTypes.SELECT
      })
      .then(result => {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation found',
            conversations: result.length > 0 ? result[0]['conversations'] : [],
            id: userId
          }
        })
      })
      .catch(err => {
        console.info('RESPONSE HANDLING MESSAGES 3', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while fetching  recent conversations'
          }
        })
      })
  }
)

// latest inbox mesage not present in the inbox view
router.get(
  '/:workspaceId/:receiverId/user/inbox/message/:msgId',
  async (req, res) => {
    const workspaceId = req.params.workspaceId
    const receiverId = req.params.receiverId
    const msgId = req.params.msgId

    const query = `select
  json_agg( json_build_object('otherUser', (case when t.channel_type != 'PERSONAL' then (select json_build_object( 'id', t.channel_id, 'channel', true, 'channelType', t.channel_type, 'starred', t.starred, 'username', t.name, 'email', null, 'name', t.name, 'profile_image', null ) ) else ( select json_build_object( 'id', t.user_id, 'channel', false, 'channelType', t.channel_type, 'starred', t.starred, 'username', t.username, 'email', t.email, 'name', t.name, 'profile_image', t.profile_image ) ) end),
  'senderDetails',
	( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ),
   'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (case when t.channel_type != 'PERSONAL' then 0 else (select count(read_status) from messages where sender_id = t.sender_id and receiver_id = ${receiverId} and read_status = false) end ) ) )) ) as conversations
from
	( (
	select
		distinct on
		(u.id) m.message,
		m.created_at,
		m.id as msg_id,
		m.receiver_id,
		m.sender_id,
		m.message_type,
		u.id as user_id,
		u.username,
		u.profile_image,
		u.name,
		u.email,
		c.id as channel_id,
		c.channel_type,
		ucr.starred,
    ucr.muted,
    ucr.pinned
	from
		users u
	join "user-workspace-relationships" uwr on
		uwr.user_id = u.id
	join messages m on
		m.sender_id = u.id
		and m.receiver_id = ${receiverId}
	left join channels c on
		c.id = m.channel_id
	left join "user-channel-relationships" ucr on
		ucr.channel_id = c.id
	where
		m.id = ${msgId}
    and uwr.workspace_id = ${workspaceId}
    and m.deleted = false
	order by
		u.id,
		m.created_at desc)
union (
select
	distinct on
	(c.id) m.message,
	m.created_at,
	m.id as msg_id,
	m.receiver_id,
	m.sender_id,
	m.message_type,
	null as user_id,
	c."name" as username ,
	null as profile_image,
	c.name,
	null as email,
	c.id as channel_id,
	c.channel_type,
	ucr.starred,
  ucr.muted,
  ucr.pinned
from
	channels c
join messages m on
	m.sender_id = c.id
	and c.id = m.receiver_id
left join "user-channel-relationships" ucr on
	ucr.channel_id = c.id
where
	c.workspace_id = ${workspaceId}
	and ucr.user_id = ${receiverId}
	and c.channel_type != 'PERSONAL'
  and m.id = ${msgId}
  and m.deleted = false
order by
	c.id,
	m.created_at desc)
order by
message,
created_at desc )as t`

    sequelize
      .query(query, {
        type: sequelize.QueryTypes.SELECT
      })
      .then(result => {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation found',
            conversations: result.length > 0 ? result[0]['conversations'] : [],
            id: receiverId
          }
        })
      })
      .catch(err => {
        console.info('RESPONSE HANDLING MESSAGES 4', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while fetching  recent conversations'
          }
        })
      })
  }
)

// Fetch all entity that user can tag i.e. users, channels, department
router.get('/:workspaceId/tags', async (req, res) => {
  const users = await getWorkspaceUsers(req.params.workspaceId, req.user.id)
  const channels = await getWorkspaceChannels(
    req.params.workspaceId,
    req.user.id
  )
  const departments = await getWorkspaceDepartment(req.params.workspaceId)

  const tags = []
  users.map(u => {
    tags.push({
      id: u.id,
      name: u.username,
      type: 'user'
    })
  })

  channels.map(c => {
    tags.push({
      id: c.id,
      name: c.name,
      type: 'channel'
    })
  })

  departments.map(d => {
    tags.push({
      id: d.id,
      name: d.name,
      type: 'department'
    })
  })

  return sendResponse(res, {
    code: 200,
    data: {
      status: 1,
      message: 'Tag has been found',
      tags
    }
  })
})

// Search user by name
router.post('/:workspaceId/user/search', async (req, res) => {
  try {
    const users = await searchUser(req.body.searchTerm, req.params.workspaceId)
    if (users && users.length > 0) {
      // send response
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          users
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No user found with given name',
          users: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while searching user by name : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while searching user'
      }
    })
  }
})

//update registration settings
router.put('/:workspaceId/register/settings', async (req, res) => {
  try {
    const workspaceId = req.body.workspaceId
    const emailTags = req.body.emailTags
    const department = req.body.department
    const userType = req.body.userType
    const updateWorkspace = await updateWorkspaceRegistrationSettings(
      workspaceId,
      emailTags,
      department,
      userType
    )
    if (updateWorkspace) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Workspace registration settings has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while updating registration settings'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while searching user by name : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while updating registration settings'
      }
    })
  }
})

//fetch registration settings
router.get('/:workspaceId/register/settings', async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId
    const getWorkspaceRegistrationSettings = await workspaceRegistrationSettings(
      workspaceId
    )
    if (getWorkspaceRegistrationSettings) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          data: getWorkspaceRegistrationSettings
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while fetching registration settings'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while fetching registration settings : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching registration settings'
      }
    })
  }
})

// Update Workspace based on registration option
router.post(
  '/:workspaceId/registerOption',
  workspaceDetail,
  workspaceSuperAdminIsAllowed,
  async (req, res) => {
    const value = {}
    if (req.body.allowNewRegistration) {
      value['allowNewRegistration'] = req.body.allowNewRegistration
    }
    if (req.body.show_signup_button) {
      value['show_signup_button'] = req.body.show_signup_button
    }
    if (req.body.must_have_email) {
      value['must_have_email'] = req.body.must_have_email
    }
    if (req.body.default_user_type) {
      value['default_user_type'] = req.body.default_user_type
    }

    const isUpdated = await updateWorkspace(req.params.workspaceId, value)

    if (isUpdated) {
      // Record has been updated
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Workspace has been updated'
        }
      })
    } else {
      // Update failed
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Failed to update workspace'
        }
      })
    }
  }
)

// Update notification settings
router.post(
  '/:workspaceId/notificationSettings',
  workspaceDetail,
  async (req, res) => {
    try {
      const data = {}
      if (req.body.notification_frequency) {
        data['notification_frequency'] = req.body.notification_frequency
      }
      if (req.body.email_notifications) {
        data['email_notifications'] = req.body.email_notifications
      }
      if (typeof req.body.ubblu_tips !== 'undefined') {
        data['ubblu_tips'] = req.body.ubblu_tips
      }
      if (typeof req.body.ubblu_news_announcement !== 'undefined') {
        data['ubblu_news_announcement'] = req.body.ubblu_news_announcement
      }

      const updated = await updateUserWorkspace(
        {
          user_id: req.user.id,
          workspace_id: req.workspace.id
        },
        data
      )

      if (updated) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Notification settings has been updated'
          }
        })
      } else {
        // Not updated
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error while updating notification settings'
          }
        })
      }
    } catch (err) {
      logger.warn('Error occured while updating notification settings:', err)
      return false
    }
  }
)

// Other routes
router.use(
  '/:workspaceId/departments',
  workspaceDetail,
  require('./department')
)

router.use('/:workspaceId/channels', workspaceDetail, require('./channel'))

router.use('/:workspaceId/users', workspaceDetail, require('./user'))

module.exports = router
