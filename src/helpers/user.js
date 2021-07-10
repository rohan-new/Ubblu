
const {
  User,
  UserMeta,
  UserMessageMeta,
  UserWorkspaceRelationship,
  Department,
  Workspace,
  Op,
  sequelize
} = require('../models/index')
const logger = require('./../logger')
const {
  SAFE_USER_ATTRIBUTES,
  SAFE_DEPARTMENT_ATTRIBUTES
} = require('../constants')

async function getUserById(userId) {
  try {
    const user = await User.findOne({
      where: {
        id: userId
      }
    })
    return user
  } catch (err) {
    return false
  }
}

async function getWorkspaceUserById(workspace_id, userId) {
  try {
    const user = await User.findOne({
      where: {
        id: userId
      },
      attributes: SAFE_USER_ATTRIBUTES,
      include: [
        {
          attributes: ['status', 'is_suspended', 'availability'],
          model: UserWorkspaceRelationship,
          as: 'user_workspace_relationships',
          where: {
            workspace_id
          },
          include: [
            {
              attributes: SAFE_DEPARTMENT_ATTRIBUTES,
              model: Department,
            },
            {
              attributes: ['name'],
              model: Workspace,
              as: 'workspace',
              where: {
                id: workspace_id
              },
            }
          ],
        },

      ]
    })
    return user
  } catch (err) {
    console.log('error', err)
    return false
  }
}

async function getUserByEmail(email, workspace_id) {
  let required = false;
  if (workspace_id) {
    required = true
  }
  const user = await User.findOne({
    where: {
      email,
    },
    attributes: [],
    include: [
      {
        attributes: ['workspace_id'],
        model: UserWorkspaceRelationship,
        as: 'user_workspace_relationships',
        where: {
          workspace_id
        },
        required,
      }
    ]

  })
  return user
}

async function getUserMeta(user_id, metaKey) {
  try {
    const meta = await UserMeta.findOne({
      where: {
        user_id,
        metaKey
      }
    })
    return meta
  } catch (err) {
    logger.warn(`Error while fetching user meta: `, err)
    return false
  }
}

async function setUserMeta(userId, metaKey, metaValue) {
  try {
    const where = {
      user_id: userId,
      metaKey
    }
    const meta = await UserMeta.findOrCreate({
      where,
      defaults: {
        user_id: userId,
        metaKey,
        metaValue
      }
    })
    if (!meta[1]) {
      UserMeta.update(
        {
          metaValue
        },
        {
          where
        }
      )
    }
    return true
  } catch (err) {
    logger.warn(`User-meta insertion failed: `, err.message)
    return false
  }
}

// Values is array with key and value pair
async function setMultipleUserMeta(userId, values) {
  if (Object.keys(values).length > 0) {
    await Promise.all(
      Object.keys(values).map(key => {
        return setUserMeta(userId, key, values[key])
      })
    )
    return true
  }
  return false
}

async function updateFirebaseId(userId, firebaseId) {
  try {
    const query = `update users set firebase_id='${firebaseId}' where id=${userId}`
    const resp = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    })
    return resp
  } catch (error) {
    logger.warn('Error while uodating firebase : ', error)
    return false
  }
}

// Update info like email, username, password
async function updateUserById(userId, data) {
  //console.log(data,userId);
  try {
    const resp = await User.update(data, {
      where: {
        id: userId
      }
    })
    return resp
  } catch (err) {
    logger.warn('Error while updating user : ', err)
    return false
  }
}

// Search user
async function searchUser(searchTerm, workspace_id) {
  try {
    const users = await User.findAll({
      attributes: SAFE_USER_ATTRIBUTES,
      where: {
        [Op.or]: [
          {
            name: {
              [Op.iLike]: '%' + searchTerm + '%'
            }
          },
          {
            username: {
              [Op.iLike]: '%' + searchTerm + '%'
            }
          },
          {
            email: {
              [Op.iLike]: '%' + searchTerm + '%'
            }
          }
        ]
      },
      include: [
        {
          attributes: ['status', 'is_suspended'],
          model: UserWorkspaceRelationship,
          as: 'user_workspace_relationships',
          where: {
            workspace_id
          },
          include: [
            {
              attributes: SAFE_DEPARTMENT_ATTRIBUTES,
              model: Department
            }
          ]
        }
      ]
    })
    return users
  } catch (err) {
    logger.warn('Error while searching workspace users : ', err)
    return false
  }
}

async function addNotes(data) {
  try {
    const where = {
      user_id: data.user_id,
      other_user_id: data.other_user_id,
      workspace_id: data.workspace_id
    }
    const resp = await UserMessageMeta.findOrCreate({
      where,
      defaults: data
    })
    if (resp && resp[1] === false) {
      // Update record
      await UserMessageMeta.update(
        {
          notes: data.notes
        },
        {
          where
        }
      )
      return true
    } else if (resp && resp[1] === true) {
      return true
    } else {
      return false
    }
  } catch (err) {
    logger.warn('Error while updating notes : ', err)
    return false
  }
}

async function changeAvailabilityStatus(userId, workspaceId) {
  try {

    const query = `update "user-workspace-relationships" set availability = (case when availability = true then false else true end) where user_id = ${userId} and workspace_id = ${workspaceId} returning availability`;

    const availabilityStatus = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    console.log('availablity status xxxxxxxxxxxxxxxxxxxxxxx', availabilityStatus)
    if (availabilityStatus && availabilityStatus.length && availabilityStatus[0].length && availabilityStatus[0][0]['availability']) {
      await makeUserOnline(userId);
    } else {
      await makeUserOffline(userId);

    }


    if (availabilityStatus && availabilityStatus.length && availabilityStatus[0].length && availabilityStatus[0][0]['availability']) {
      const queryToUpdateMutedStatus = `update "user-channel-relationships" set muted = false where user_id = ${userId} `;

      const updateMutedStatus = await sequelize.query(queryToUpdateMutedStatus, {
        type: sequelize.QueryTypes.UPDATE
      });

    }
    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}

async function makeUserOnline(userId) {
  try {

    const query = `update users set availability = true where id = ${userId} returning availability`;

    const onlineStatus = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}

async function generateUsername(name) {
  try {

    const query = `select count(*) from users where username like '%${name}%'; `;

    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    if (results[0]['count'] > 0) {
      return (name + results[0]['count']);
    } else {
      return name;
    }

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}

async function deleteTokenLogs(email, token, workspaceId) {
  try {

    const query = `delete from token_logs  where email = '${email}' and token = '${token}' and workspace_id = ${workspaceId}`;

    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.DELETE
    });

    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}

async function getTokenLogs(email, token) {
  try {

    const query = `select expired from token_logs  where email = '${email}' and token = '${token}'`;

    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return results;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}



async function createTokenLogs(email, token, workspace_id) {
  try {
    await deleteTokenLogs(email, token, workspace_id);
    const query = `INSERT into token_logs(email,token, workspace_id) values('${email}','${token}', ${workspace_id})`;

    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.INSERT
    });

    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}


async function updateTokenLogs(email, token, workspace_id) {
  try {
    const query = `update token_logs set expired = true where email = '${email}' and token = '${token}' and workspace_id = ${workspace_id}`;

    const results = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}

async function verifyEmailBelongsToAnotherUser(email, userId, workspace_id) {
  try {
    const users = await User.findAll({
      attributes: SAFE_USER_ATTRIBUTES,
      where: {
        email,
      },
      include: [
        {
          attributes: ['user_id', 'workspace_id'],
          model: UserWorkspaceRelationship,
          as: 'user_workspace_relationships',
          where: {
            workspace_id
          }
        }
      ],
      raw: true
    });
    if (users.length > 0) {
      return true;
    } else {
      return false;
    }

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}


async function makeUserOffline(userId) {
  try {

    const query = `update users set availability = false where id = ${userId} returning availability`;

    const onlineStatus = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}


async function saveUserProfileImage(userId,imageUrl) {
  try {

    const query = `update users set profile_image = '${imageUrl}' where id = ${userId} returning profile_image`;

    const updateProfileImage = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    return true;

  } catch (err) {
    logger.warn('Error while updating availability : ', err)
    return false
  }
}


module.exports = {
  getUserById,
  getUserByEmail,
  setUserMeta,
  updateUserById,
  setMultipleUserMeta,
  searchUser,
  updateFirebaseId,
  addNotes,
  getUserMeta,
  getWorkspaceUserById,
  changeAvailabilityStatus,
  makeUserOnline,
  makeUserOffline,
  generateUsername,
  verifyEmailBelongsToAnotherUser,
  createTokenLogs,
  updateTokenLogs,
  getTokenLogs,
  saveUserProfileImage
}
