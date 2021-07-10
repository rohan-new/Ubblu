const {
  User,
  Message,
  UserMessageMeta,
  Channel,
  Op,
  Sequelize
} = require('../models/index')
const {
  SAFE_USER_ATTRIBUTES,
  SAFE_CONVERSATION_ATTRIBUTES
} = require('../constants')
const { getChannelUsers, getChannelById } = require('./channel')
const { getKeywordsByUsers } = require('./workspace')
const { sendMail } = require('./mail')

const logger = require('./../logger')

const conversationJoin = [
  {
    model: Message,
    as: 'lastMessage',
    attributes: [
      'id',
      'message',
      'messageType',
      'senderId',
      'receiver_id',
      'channel_id',
      'created_at'
    ]
  },
  {
    model: User,
    as: 'otherUser',
    attributes: SAFE_USER_ATTRIBUTES
  },
  {
    model: Channel
  }
]

const conversationListing = {
  attributes: SAFE_CONVERSATION_ATTRIBUTES,
  include: conversationJoin,
  limit: 20,
  order: [[Sequelize.literal('"lastMessage"."created_at"'), 'DESC']]
}

// async function getInboxListing(workspaceId, userId, limit) {
//   console.log('limit ==> ', limit)
//   const messages = await Message.findAll({
//     where: {
//       workspace_id: workspaceId,
//       receiver_id: userId
//     },
//     includes: [
//       {
//         attributes: SAFE_USER_ATTRIBUTES,
//         model: User,
//         where: {
//           id: userId
//         }
//       }
//     ],
//     order: [['created_at', 'DESC']],
//     group: ['sender_id']
//   })

//   return messages
// }

async function getConversationListing(
  workspaceId,
  userId,
  lastConversationTime
) {
  try {
    conversationListing.where = {
      user_id: userId,
      workspace_id: workspaceId
    }

    if (lastConversationTime) {
      conversationListing['include'][0] = {
        ...conversationListing['include'][0],
        where: {
          created_at: {
            [Op.lt]: lastConversationTime
          }
        }
      }
    }

    const msg = await UserMessageMeta.findAll(conversationListing)
    return msg
  } catch (err) {
    logger.warn('Error while fetching conversation : ', err)
    return false
  }
}

async function getTaggedConversation(
  workspaceId,
  userId,
  lastConversationTime
) {
  try {
    const taggedListing = conversationListing

    taggedListing.where = {
      user_id: userId,
      workspace_id: workspaceId,
      is_tagged: true
    }

    if (lastConversationTime) {
      taggedListing['include'][0] = {
        ...taggedListing['include'][0],
        where: {
          created_at: {
            [Op.lt]: lastConversationTime
          }
        }
      }
    }

    const msg = await UserMessageMeta.findAll(taggedListing)
    return msg
  } catch (err) {
    logger.warn('Error while fetching conversation : ', err)
    return false
  }
}

async function notifyUsersWithChatString(wid, senderId, message, channel_id) {
  // GET USERS FROM CHANNEL
  try {
    let channelUsers = await getChannelUsers(channel_id),
      sender_name,
      channel_name,
      workspace_name
    const channelDetails = await getChannelById(channel_id, senderId)
    channelUsers = channelUsers.map(k => k.dataValues.id)
    const { data, error } = await getKeywordsByUsers(channelUsers, wid)
    if (data) {
      const split_message = message.split(' ')
      const notify_mails = []
      channel_name = channelDetails.length ? channelDetails[0].name : 'unknown'
      await Promise.all(
        data.map(user => {
          split_message.map(w => {
            if (!workspace_name) workspace_name = user.workspace_name
            if (user.user_id == Number(senderId)) {
              sender_name = user.user_name
              return
            }
            if (user.keywords) {
              if (user.keywords.split(',').includes(w)) {
                if (!notify_mails.includes(user.email)) {
                  notify_mails.push(user.email)
                }
              }
            }
          })
        })
      )

      if (notify_mails.length) {
        await Promise.all(
          notify_mails.map(mail => {
            return sendMail(
              'keyword_message',
              {
                to: mail,
                subject: 'Notification for message from tagged list'
              },
              {
                workspace_name,
                channel_name,
                sender_name,
                message
              }
            )
          })
        )
      }
    } else console.info('DATA ERROR', error.message)
  } catch (error) {
    console.info('ERROR SENDING MAILS', error.message)
  }

  return
}

async function getStaredConversation(
  workspaceId,
  userId,
  lastConversationTime
) {
  try {
    const staredListing = conversationListing

    staredListing.where = {
      user_id: userId,
      workspace_id: workspaceId,
      is_starred: true
    }
    if (lastConversationTime) {
      staredListing['include'][0] = {
        ...staredListing['include'][0],
        where: {
          created_at: {
            [Op.lt]: lastConversationTime
          }
        }
      }
    }

    const msg = await UserMessageMeta.findAll(staredListing)
    return msg
  } catch (err) {
    logger.warn('Error while fetching stared conversation : ', err)
    return false
  }
}

async function fetchDirectConversation(
  workspaceId,
  userId,
  anotherUserId,
  options
) {
  try {
    const where = {
      workspace_id: workspaceId,
      [Op.or]: [
        {
          sender_id: userId,
          receiver_id: anotherUserId
        },
        {
          sender_id: anotherUserId,
          receiver_id: userId
        }
      ]
    }

    if (options['lastMessageTime']) {
      where['created_at'] = {
        [Op.lt]: options['lastMessageTime']
      }
    }

    const messages = await Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit
    })
    return messages
  } catch (err) {
    logger.warn('Error while fetching conversation : ', err)
    return false
  }
}

async function fetchDirectConversationPinnedMessages(
  workspaceId,
  userId,
  anotherUserId,
  options
) {
  try {
    const where = {
      workspace_id: workspaceId,
      [Op.or]: [
        {
          sender_id: userId,
          receiver_id: anotherUserId
        },
        {
          sender_id: anotherUserId,
          receiver_id: userId
        }
      ],
      is_pinned: true
    }

    const messages = await Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit
    })
    return messages
  } catch (err) {
    logger.warn('Error while fetching pinned message of conversation : ', err)
    return false
  }
}

async function searchDirectConversation(
  workspaceId,
  userId,
  anotherUserId,
  options
) {
  try {
    const where = {
      workspace_id: workspaceId,
      [Op.or]: [
        {
          sender_id: userId,
          receiver_id: anotherUserId
        },
        {
          sender_id: anotherUserId,
          receiver_id: userId
        }
      ]
    }

    if (options['searchString']) {
      where['message'] = {
        [Op.iLike]: options['searchString']
      }
    }

    if (options['lastMessageTime']) {
      where['created_at'] = {
        [Op.lt]: options['lastMessageTime']
      }
    }

    const messages = await Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit
    })
    return messages
  } catch (err) {
    logger.warn('Error while fetching conversation : ', err)
    return false
  }
}

async function searchMessages(workspaceId, userId, options) {
  try {
    const where = {
      workspace_id: workspaceId,
      [Op.or]: [
        {
          sender_id: userId
        },
        {
          receiver_id: userId
        }
      ]
    }

    if (options['searchString']) {
      where['message'] = {
        [Op.iLike]: options['searchString']
      }
    }

    if (options['lastMessageTime']) {
      where['created_at'] = {
        [Op.lt]: options['lastMessageTime']
      }
    }

    if (options['isChannelSearch'] === true) {
      where['channel_id'] = {
        [Op.ne]: null
      }
    }

    const messages = await Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit
    })
    return messages
  } catch (err) {
    logger.warn('Error while fetching conversation : ', err)
    return false
  }
}

// Fetch channel messages
async function fetchChannelConversation(channel_id, options) {
  try {
    const where = {
      channel_id
    }

    if (options['lastMessageTime']) {
      where['created_at'] = {
        [Op.lt]: options['lastMessageTime']
      }
    }

    const messages = await Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit
    })
    return messages
  } catch (err) {
    logger.warn('Error while fetching conversation : ', err)
    return false
  }
}

// Fetch channel messages
async function fetchChannelConversationPinnedMessages(channel_id, options) {
  try {
    const where = {
      channel_id,
      is_pinned: true
    }

    if (options['lastMessageTime']) {
      where['created_at'] = {
        [Op.lt]: options['lastMessageTime']
      }
    }

    const messages = await Message.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: options.limit
    })
    return messages
  } catch (err) {
    logger.warn('Error while fetching pinned message of channel : ', err)
    return false
  }
}

// Get conversation by Id (user-message-meta)
async function getConversationRecordById(conversationId) {
  try {
    const msg = await UserMessageMeta.findOne({
      attributes: SAFE_CONVERSATION_ATTRIBUTES,
      where: {
        id: conversationId
      }
    })
    return msg
  } catch (err) {
    logger.warn('Error in getConversationRecordById : ', err)
    return false
  }
}

// Update conversation
async function updateConversationRecord(id, data) {
  try {
    const resp = await UserMessageMeta.update(data, {
      where: {
        id
      }
    })
    return resp
  } catch (err) {
    logger.warn('Error in updateConversationRecord : ', err)
    return false
  }
}

async function readTaggedConversation(
  workspaceId,
  channelId,
  userId,
  senderId
) {
  try {
    const readTagged = await Message.update({ isTagged : false }, {
      where: {
        workspace_id :   workspaceId,
        channel_id: channelId,
        receiver_id:userId,
        senderId:senderId,
        read_status:'true'
      }
    })
    return readTagged
    
  } catch (err) {
    logger.warn('Error while updating read for tagged conversaion')
    return false
  }
}
module.exports = {
  // getInboxListing,
  getConversationListing,
  fetchDirectConversation,
  fetchDirectConversationPinnedMessages,
  searchDirectConversation,
  searchMessages,
  fetchChannelConversation,
  fetchChannelConversationPinnedMessages,
  getConversationRecordById,
  updateConversationRecord,
  getTaggedConversation,
  getStaredConversation,
  notifyUsersWithChatString,
  readTaggedConversation
}
