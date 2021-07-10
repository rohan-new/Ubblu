const {
  Workspace,
  UserWorkspaceRelationship,
  UserChannelRelationship,
  WorkspaceMeta,
  Op,
  User,
  Channel,
  Department,
  sequelize
} = require('../models/index')
const Sequelize = require('sequelize')

const {
  SAFE_USER_ATTRIBUTES,
  SAFE_CHANNEL_ATTRIBUTES,
  SAFE_DEPARTMENT_ATTRIBUTES,
  WEB_URL
} = require('./../constants')
const logger = require('./../logger')
const jwt = require('jsonwebtoken')
const { sendMail } = require('./mail')

const createPersonalWorkspace = async (user) => {
  // User's direct messages are stored in a default personal workspace
  const workspace = await createWorkspace({
    name: 'PERSONAL',
    workspace_type: 'PERSONAL',
    created_by: user.id
  })

  return workspace
}

// Add workspace
const createWorkspace = async (workspaceData) => {
  const workspace = await Workspace.create(workspaceData)
  await addUserToWorkspace(workspaceData.created_by, workspace.id, 'SUPERADMIN')
  return workspace
}

const addUserToWorkspace = async (user_id, workspace_id, role) => {
  const resp = await UserWorkspaceRelationship.findOrCreate({
    where: {
      user_id,
      workspace_id
    },
    defaults: {
      user_id,
      workspace_id,
      status: role || 'SUPERADMIN'
    }
  })
  return resp
}

// Update Workspace
const updateWorkspace = async (workspaceId, workspaceData) => {
  try {
    const updated = await Workspace.update(workspaceData, {
      where: { id: workspaceId }
    })
    return updated
  } catch (err) {
    console.log('Err : ', err)
    return 0
  }
}

const checkAvailability = async (name) => {
  try {
    const workspace = await Workspace.findOne({
      where: {
        name: {
          [Op.iLike]: name
        }
      },
      attributes: ['name']
    })

    if (workspace && workspace.name) {
      // Workspace is available
      return false
    } else {
      // Workspace is not available
      return true
    }
  } catch (err) {
    logger.warn('Err : ', err)
    return false
  }
}

const setWorkspaceMeta = async (workspaceId, meta_key, meta_value) => {
  try {
    const where = {
      workspace_id: workspaceId,
      meta_key
    }
    const meta = await WorkspaceMeta.findOrCreate({
      where,
      defaults: {
        workspace_id: workspaceId,
        meta_key,
        meta_value
      }
    })
    if (!meta[1]) {
      await WorkspaceMeta.update(
        {
          meta_value
        },
        {
          where
        }
      )
    }
    return true
  } catch (err) {
    logger.warn(`Workspace-meta insertion failed: `, err.message)
    return false
  }
}

// Values is array with key and value pair
const setMultipleWorkspaceMeta = async (workspaceId, values) => {
  if (Object.keys(values).length > 0) {
    await Promise.all(
      Object.keys(values).map(key => {
        return setWorkspaceMeta(workspaceId, key, values[key])
      })
    )
    return true
  }
  return false
}

// Get workspace detals by id
const getWorkspaceById = async (workspaceId) => {
  try {
    const workspace = await Workspace.findOne({
      where: {
        id: workspaceId
      },
      raw: true
    })

    return workspace
  } catch (err) {
    return false
  }
}


exports.findWorkspaceByUserId = async (userId) => {
  try {
    const query = `
    select workspaces.* from "user-workspace-relationships" 
      full outer join workspaces on "user-workspace-relationships".workspace_id = workspaces.id
      where "user-workspace-relationships".user_id = ${userId} and workspace_type != 'PERSONAL';`
    const workspaces = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return workspaces
  } catch (err) {
    return false
  }
}

// Get workspace detals by id
const findWorkspaceByName = async (name) => {
  try {
    const workspace = await Workspace.findOne({
      where: {
        name: {
          [Op.iLike]: name
        }
      }
    })
    return workspace
  } catch (err) {
    return false
  }
}

// Get user-workspace relationship
const getWorkspaceUser = async (workspace_id, user_id) => {
  try {
    const userWorkspace = await UserWorkspaceRelationship.findOne({
      where: {
        workspace_id,
        user_id
      }
    })
    return userWorkspace
  } catch (err) {
    logger.warn('Error while fetching workspace users : ', err)
    return false
  }
}

// Get all users for given workspace
const getWorkspaceUsers = async (workspace_id, user_id) => {
  try {
    const users = await User.findAll({
      attributes: SAFE_USER_ATTRIBUTES,
      include: [
        {
          attributes: ['status', 'is_suspended','department_id'],
          model: UserWorkspaceRelationship,
          as: 'user_workspace_relationships',
          where: {
            workspace_id,
            is_deleted: false
          },
          include: [
            {
              attributes: SAFE_DEPARTMENT_ATTRIBUTES,
              model: Department
            }
          ]
        }
      ],
      order: [['username', 'ASC']]
    })
    return users
  } catch (err) {
    logger.warn('Error while fetching workspace users : ', err)
    return false
  }
}


// Get all users for given workspace except the logged in one
const getWorkspaceOtherUsers = async (workspace_id, user_id) => {
  try {
    const users = await User.findAll({
      attributes: SAFE_USER_ATTRIBUTES,
      where: {
        id: { [Sequelize.Op.notIn]: [user_id] }
      },
      include: [
        {
          attributes: ['status', 'is_suspended','department_id'],
          model: UserWorkspaceRelationship,
          as: 'user_workspace_relationships',
          where: {
            workspace_id,
            is_deleted: false,
          },
          include: [
            {
              attributes: SAFE_DEPARTMENT_ATTRIBUTES,
              model: Department
            }
          ]
        }
      ],
      order: [['username', 'ASC']]
    })
    return users
  } catch (err) {
    logger.warn('Error while fetching workspace users : ', err)
    return false
  }
}

// Get all channels for given workspace
const getWorkspaceChannels = async (workspace_id, user_id) => {
  try {
    let channel_type = ['PUBLIC', 'PRIVATE'];

    const channels = await Channel.findAll({
      attributes: SAFE_CHANNEL_ATTRIBUTES,
      where: {
        workspace_id,
        channel_type
      },
      include: [
        {
          attributes: [],
          model: UserChannelRelationship,
          where: {
            user_id
          }
        }
      ]
    })
    return channels
  } catch (err) {
    logger.warn('Error while fetching workspace channels : ', err)
    return false
  }
}

const getAllChannels = async (workspace_id, user_id) => {
  try {

    const query = `select
    *,
    (select count(*)from "user-channel-relationships" ucr where channel_id =  t.id )as users_count,
    (
      select
        status
        from "user-channel-relationships" ucr
      where
        channel_id = t.id and user_id = ${user_id} ) as status
  from
    (
    select
      c.id,
      c.name,
      c.channel_type,
      c.invite_link,
      c.auto_join,
      c.visibility,
      c.created_at,
      c.description
    from
      channels c
    where
      c.workspace_id = ${workspace_id}
      and c.channel_type in ('PUBLIC',
      'PRIVATE',
      'RESTRICTED')
      order by name asc
      ) t
    `;

    const channels = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return channels
  } catch (err) {
    logger.warn('Error while fetching all channels : ', err)
    return false
  }
}

// Get all channels for given workspace
const getWorkspacePublicChannels = async (workspace_id, user_id) => {
  try {
    let channel_type = ['PUBLIC', 'PRIVATE'];

    const channels = await Channel.findAll({
      attributes: SAFE_CHANNEL_ATTRIBUTES,
      where: {
        workspace_id,
        channel_type
      },
      include: [
        {
          attributes: [],
          model: UserChannelRelationship,
          where: {
            user_id
          }
        }
      ]
    })
    return channels
  } catch (err) {
    logger.warn('Error while fetching workspace channels : ', err)
    return false
  }
}


// Get all channels for given workspace
const getChannels = async (workspace_id, user_id) => {
  try {


    const query = `select * from 	(select
      c.id,
      ucr.status,
      c.name,
      c.channel_type,
      c.invite_link,
      c.auto_join,
      c.visibility,
      c.created_at,
      c.description,
      c.colors
    from
      channels c
    left join "user-channel-relationships" ucr on
      c.id = ucr.channel_id
      and ucr.user_id = ${user_id}
    where
      c.workspace_id =  ${workspace_id}
      and c.channel_type in ('PUBLIC',
      'PRIVATE',
      'RESTRICTED')) t 
    where t.status is not null or t.channel_type != 'RESTRICTED' ;`;

    const channels = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return channels
  } catch (err) {
    logger.warn('Error while fetching workspace channels : ', err)
    return false
  }
}

const updateUserKeywords = async (wid, uid, keywords, get = false) => {
  let data = null, error = null
  try {
    let query
    if (get) {
      query = `select * from "user-workspace-relationships"
        where workspace_id=${Number(wid)} and user_id=${Number(uid)};`
    } else {
      query = `update "user-workspace-relationships" set keywords='${keywords}' 
      where workspace_id=${Number(wid)} and user_id=${Number(uid)};`
    }

    const response = await sequelize.query(query, {
      type: get ? sequelize.QueryTypes.SELECT : sequelize.QueryTypes.UPDATE
    })
    if (!get) data = response
    else {
      data = response.length ? response[0].keywords : ''
    }
  } catch (err) {
    console.info('error updating keywords', err)
    error = {
      message: err.message
    }
  }
  return { data, error }
}

const getKeywordsByUsers = async (uids, wid) => {
  let data = null, error = null
  try {
    const query = `
    select workspaces.name as workspace_name, users.username, users.email, "user-workspace-relationships".user_id, "user-workspace-relationships".keywords 
    from "user-workspace-relationships" 
    full outer join users on "user-workspace-relationships".user_id = users.id
    full outer join workspaces on "user-workspace-relationships".workspace_id = workspaces.id
    where workspace_id=${Number(wid)} and user_id in (${uids.join(',')});`
    data = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    })
  } catch (err) {
    error = {
      message: err.message
    }
  }

  return { data, error }
}

//update regstration settings
const updateWorkspaceRegistrationSettings = async (workspaceId, emailTags, department, userType) => {
  try {
    if (workspaceId) {
      emailTags = emailTags.join(',');

      let queryToUpdateWorkspace = `update workspaces set email_tags = null where id = ${workspaceId} `;
      const setEmailtagsToNull = await sequelize.query(queryToUpdateWorkspace, {
        type: sequelize.QueryTypes.UPDATE
      });

      let query = `update workspaces set email_tags = email_tags || '{${emailTags}}', default_user_type = '${userType}' where id = ${workspaceId} `;
      const workspace = await sequelize.query(query, {
        type: sequelize.QueryTypes.UPDATE
      });
      query = `UPDATE departments set "default" = false where workspace_id = ${workspaceId}`
      const updateDepartment = await sequelize.query(query, {
        type: sequelize.QueryTypes.UPDATE
      });

      query = `update departments set "default" = true where id =${department} and workspace_id = ${workspaceId} `;
      const updateWorkspaceDepartment = await sequelize.query(query, {
        type: sequelize.QueryTypes.UPDATE
      });

      return true

    } else {

      return false;
    }

  } catch (err) {
    logger.warn('Error while updating workspace updateWorkspaceRegistrationSettings : ', err)
    return false
  }
}


//fetch regstration settings
const workspaceRegistrationSettings = async (workspaceId, emailTags, department, userType) => {
  try {
    const query = `select default_user_type as user_type, email_tags, d.name as department, d.id as department_id from workspaces join departments d on d.workspace_id= workspaces.id where d.default = true and workspaces.id =${workspaceId}  `

    const data = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    })

    return data;

  } catch (err) {
    logger.warn('Error while fetching workspace workspaceRegistrationSettings : ', err)
    return false
  }
}
// Add user to all channels of given workspace with autoJoin ability
const addUserToAutojoinChannel = async (workspace_id, user_id, role) => {
  try {
    // To-do: Fetch channel with role anyone and provided role
    const channels = await Channel.findAll({
      attributes: SAFE_CHANNEL_ATTRIBUTES,
      where: {
        workspace_id,
        auto_join: 'ANYONE'
      }
    })

    const channelData = channels.map(c => {
      return {
        user_id,
        channel_id: c.id,
        status: 'MEMBER'
      }
    })

    const resp = await UserChannelRelationship.bulkCreate(channelData)
    return resp
  } catch (err) {
    logger.warn('Error while adding user to autojoin channels : ', err)
    return false
  }
}


// Add guest user to all channels of given workspace with autoJoin fro guest user ability
const addUserToAutojoinChannelForGuestUser = async (workspace_id, user_id, role) => {
  try {
    // To-do: Fetch channel with role anyone and provided role
    const channels = await Channel.findAll({
      attributes: SAFE_CHANNEL_ATTRIBUTES,
      where: {
        workspace_id,
        auto_join: 'ANY GUEST USER'
      }
    })

    const channelData = channels.map(c => {
      return {
        user_id,
        channel_id: c.id,
        status: 'MEMBER'
      }
    })

    const resp = await UserChannelRelationship.bulkCreate(channelData)
    return resp
  } catch (err) {
    logger.warn('Error while adding user to autojoin channels : ', err)
    return false
  }
}

// Add user to all channels of given workspace with autoJoin ability
const addUserToAutojoinChannelForEmployee = async (workspace_id, user_id, role) => {
  try {
    // To-do: Fetch channel with role anyone and provided role
    const channels = await Channel.findAll({
      attributes: SAFE_CHANNEL_ATTRIBUTES,
      where: {
        workspace_id,
        auto_join: 'ANY EMPLOYEE'
      }
    })

    const channelData = channels.map(c => {
      return {
        user_id,
        channel_id: c.id,
        status: 'MEMBER'
      }
    })

    const resp = await UserChannelRelationship.bulkCreate(channelData)
    return resp
  } catch (err) {
    logger.warn('Error while adding user to autojoin channels : ', err)
    return false
  }
}

// Get all department for given workspace
const getWorkspaceDepartment = async (workspace_id) => {
  try {
    const departments = await Department.findAll({
      attributes: SAFE_DEPARTMENT_ATTRIBUTES,
      where: {
        workspace_id
      }
    })
    return departments
  } catch (err) {
    logger.warn('Error while fetching workspace departments : ', err)
    return false
  }
}

// Invite users
const inviteUser = async (user, workspaceId, invitedEmail, role = 'GUEST USER', origin = WEB_URL) => {
  try {
    // Fetch workspace details
    const workspace = await getWorkspaceById(workspaceId)
    // Fetch email address of user and send invite mail to each

    const resp = await invitedEmail.map(async email => {
      // Generate token
      const userData = {
        email: email.email,
        workspaceId: workspace.id,
        role
      }

      const token = jwt.sign(userData, process.env.JWT_SECRET, {
        expiresIn: 60 * 60 * 2
      }) // Expired in 2 hours

      const inviteUrl =
        origin +
        'signup/join?workspace=' +
        workspace.name +
        '&token=' +
        token +
        '&email=' +
        email.email +
        '&id=' +
        workspace.id

      const mailResp = await sendMail(
        'invite_member',
        {
          to: email.email,
          subject: 'Ubblu - Invite received'
        },
        {
          inviteUrl,
          invitee: user.name || user.username || user.email,
          workspace: workspace.name,
          name: email.name
        }
      )

      return mailResp
    })

    return resp
  } catch (err) {
    logger.warn('Error while sending invitation : ', err)
    return false
  }
}

// Update workspace-user-relationship
const updateUserWorkspace = async (where, data) => {
  try {
    const updated = await UserWorkspaceRelationship.update(data, { where })
    return updated
  } catch (err) {
    logger.warn('Error in updating user workspace relationship')
    return false
  }
}

module.exports = {
  createPersonalWorkspace,
  createWorkspace,
  addUserToWorkspace,
  updateWorkspace,
  checkAvailability,
  setWorkspaceMeta,
  setMultipleWorkspaceMeta,
  getWorkspaceById,
  findWorkspaceByName,
  getWorkspaceUser,
  getWorkspaceUsers,
  getWorkspaceChannels,
  getAllChannels,
  getWorkspacePublicChannels,
  getChannels,
  updateUserKeywords,
  getKeywordsByUsers,
  updateWorkspaceRegistrationSettings,
  workspaceRegistrationSettings,
  addUserToAutojoinChannel,
  addUserToAutojoinChannelForEmployee,
  addUserToAutojoinChannelForGuestUser,
  getWorkspaceDepartment,
  inviteUser,
  updateUserWorkspace,
  getWorkspaceOtherUsers
}