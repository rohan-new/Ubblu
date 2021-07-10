'use strict'

const express = require('express')
const request = require('request')
const router = express.Router()
const AWS = require('aws-sdk')
const mime = require('mime-types');

const fs = require('fs');
const { google } = require('googleapis');



const {
  getConversationListing,
  fetchDirectConversation,
  fetchDirectConversationPinnedMessages,
  searchDirectConversation,
  searchMessages,
  fetchChannelConversation,
  fetchChannelConversationPinnedMessages,
  getTaggedConversation,
  getStaredConversation,
  getConversationRecordById,
  updateConversationRecord,
  readTaggedConversation
} = require('./../../helpers/message');


const {
  fetchMessages,
  deleteMessages,
  fetchSearchResults,
  changeReadStatus,
  readTaggedUpdateConversation,
  taggedConversations } = require('./../../helpers/messages');

const {
  sendResponse,
  sendError } = require('./../../utils/http')
const logger = require('./../../logger')
const { BUCKET_URL } = require('./../../constants')

AWS.config.update({
  accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
  secretAccessKey: process.env.BUCKET_SECRET_KEY
  //  region:' '
})
const s3 = new AWS.S3();



// Fetch all conversation listing
router.get('/:workspaceId/listing', async (req, res) => {
  try {
    const lastConversationTime = req.query.lastConversationTime || 0

    const conversations = await getConversationListing(
      req.params.workspaceId,
      req.user.id,
      lastConversationTime
    )

    if (conversations && conversations.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Conversation found',
          conversations
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No conversation found',
          conversations: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while fetching conversation listing : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'No conversation found'
      }
    })
  }
})

// Fetch tagged conversation listing
router.get('/:workspaceId/listing/tagged', async (req, res) => {
  try {
    const lastConversationTime = req.query.lastConversationTime || 0
    const taggedConversations = await getTaggedConversation(
      req.params.workspaceId,
      req.user.id,
      lastConversationTime
    )

    if (taggedConversations && taggedConversations.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Tagged Conversation found',
          conversations: taggedConversations
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'No tagged conversation found',
          conversations: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while fetching tagged conversation listing : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'No conversation found'
      }
    })
  }
})



// Fetch stared conversation listing
router.get('/:workspaceId/listing/stared', async (req, res) => {
  try {
    const lastConversationTime = req.query.lastConversationTime || 0
    const staredConversations = await getStaredConversation(
      req.params.workspaceId,
      req.user.id,
      lastConversationTime
    )

    if (staredConversations && staredConversations.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Stared Conversation found',
          conversations: staredConversations
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No stared conversation found',
          conversations: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while fetching stared conversation listing : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'No conversation found'
      }
    })
  }
})

// Fetch direct messages between two user
router.post('/:workspaceId/directMessage/:userId', async (req, res) => {
  try {
    const options = {
      limit: req.body.limit || 20
    }

    if (req.body.lastMessageTime) {
      options['lastMessageTime'] = req.body.lastMessageTime
    }

    const messages = await fetchDirectConversation(
      req.params.workspaceId,
      req.user.id,
      req.params.userId,
      options
    )

    const pinnedMessages = await fetchDirectConversationPinnedMessages(
      req.params.workspaceId,
      req.user.id,
      req.params.userId,
      {
        limit: 3
      }
    )

    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Conversation has been fetched successfully',
        messages,
        pinnedMessages
      }
    })
  } catch (err) {
    logger.warn('Error while fetching direct conversation : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while fetching messages'
      }
    })
  }
})

// Search in direct messages
router.post('/:workspaceId/directMessage/:userId/search', async (req, res) => {
  try {
    const options = {
      limit: req.body.limit || 20
    }

    if (req.body.searchString) {
      options['searchString'] = '%' + req.body.searchString + '%'
    } http://localhost:8080/api/v1/messages/24/196
    if (req.body.lastMessageTime) {
      options['lastMessageTime'] = req.body.lastMessageTime
    }

    const messages = await searchDirectConversation(
      req.params.workspaceId,
      req.user.id,
      req.params.userId,
      options
    )
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Conversation searched performed successfully',
        messages
      }
    })
  } catch (err) {
    logger.warn('Error while fetching direct conversation : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while fetching messages'
      }
    })
  }
})



router.post('/:workspaceId/search', async (req, res) => {
  try {

    const options = {
      limit: req.body.limit || 20
    }

    if (req.body.searchString) {
      options['searchString'] = '%' + req.body.searchString + '%'
    }
    if (req.body.lastMessageTime) {
      options['lastMessageTime'] = req.body.lastMessageTime
    }

    fetchSearchResults(
      req.params.workspaceId,
      req.user.id,
      req.body.searchString,
      options, (err, messages) => {
        if (err) {
          logger.warn('Error while fetching direct conversation : ', err)
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error while fetching messages'
            }
          })
        }
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation searched performed successfully',
            conversations: messages,
            searchString: req.body.searchString
          }
        })
      }
    )

  } catch (err) {
    logger.warn('Error while fetching direct conversation : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while fetching messages'
      }
    })
  }
})

// Search messages in channel connversation
router.post('/:workspaceId/channelMessages/search', async (req, res) => {
  try {
    const options = {
      limit: req.body.limit || 20,
      isChannelSearch: true
    }

    if (req.body.searchString) {
      options['searchString'] = '%' + req.body.searchString + '%'
    }
    if (req.body.lastMessageTime) {
      options['lastMessageTime'] = req.body.lastMessageTime
    }

    const messages = await searchMessages(
      req.params.workspaceId,
      req.user.id,
      options
    )
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Conversation searched performed successfully',
        messages
      }
    })
  } catch (err) {
    logger.warn('Error while fetching direct conversation : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while fetching messages'
      }
    })
  }
})


// change read status of messages for a user
router.put('/:workspaceId/:roomId/read', async (req, res) => {
  try {

    const status = await changeReadStatus(
      req.user.id,
      req.params.roomId,
      true
    )
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Conversation read status changed performed successfully',
        updated: status
      }
    })
  } catch (err) {
    logger.warn('Error while updating conversation read status: ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while updating conversation read status'
      }
    })
  }
})

// Fetch channel messages
router.post('/channelMessage/:channelId', async (req, res) => {
  try {
    const options = {
      limit: req.body.limit || 20
    }

    if (req.body.lastMessageTime) {
      options['lastMessageTime'] = req.body.lastMessageTime
    }

    const messages = await fetchChannelConversation(
      req.params.channelId,
      options
    )

    const pinnedMessages = await fetchChannelConversationPinnedMessages(
      req.params.channelId,
      {
        limit: 3
      }
    )

    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Conversation has been fetched successfully',
        messages,
        pinnedMessages
      }
    })
  } catch (err) {
    logger.warn('Error while fetching channel conversation : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while fetching messages'
      }
    })
  }
})








/* new changed router methods by rohan */



//fetch messages of a channel

router.get('/:workspaceId/:roomId', async (req, res) => {
  const roomId = req.params.roomId;
  const workspaceId = req.params.workspaceId;
  fetchMessages(roomId, workspaceId, (err, messages) => {
    if (err) {
      logger.warn('Error while fetching  conversation listing : ', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'No conversation found'
        }
      })
    }
    if (messages && messages.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Conversation found',
          conversations: messages
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No  conversation found',
          conversations: []
        }
      })
    }
  })
});



//delete messages of a channel

router.get('/delete/message', async (req, res) => {
  const roomId = req.query.roomId;
  const messageId = req.query.messageId;
  deleteMessages(roomId, messageId, (err, messages) => {
    if (err) {
      logger.warn('Error while deleting conversation  : ', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'No conversation found'
        }
      })
    }
    if (messages && messages.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Conversation deleted'
        }
      })
    }
  })
});

//edit messages of a channel

router.get('/edit/message', async (req, res) => {
  const roomId = req.query.roomId;
  const messageId = req.query.messageId;
  const editedMessage = req.query.message;
  editMessages(editedMessage, roomId, messageId, (err, messages) => {
    if (err) {
      logger.warn('Error while editing conversation  : ', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'No conversation found'
        }
      })
    }
    if (messages && messages.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Conversation edited'
        }
      })
    }
  })
});


// tagged conversations

router.get('/:workspaceId/:userId/tagged', async (req, res) => {
  const workspaceId = req.params.workspaceId;
  const userId = req.params.userId;
  taggedConversations(userId, workspaceId, (err, result) => {
    if (err) {
      logger.warn('Error while fetching tagged conversation  : ', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Unable to fetch tagged conversation'
        }
      })
    }
    if (result && result.length > 0) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'tagged Conversation List',
          conversations: result.length > 0 ? result[0]["conversations"] : []
        }
      })
    }
  })
});


//-------------------Read tagged conversation----------------
router.post('/:workspaceId/:channelId/:userId/:senderId/readTagged', async (req, res) => {
  console.log('workspaceId channelId userId senderId',req.params.workspaceId,req.params.channelId,req.params.userId,req.params.senderId);
  try {

    const status = await readTaggedUpdateConversation(
      req.params.workspaceId,
      req.params.channelId,
      req.params.userId,
      req.params.senderId,
      false
    )
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Conversation tagged read status changed performed successfully',
        updated: status
      }
    })
  } catch (err) {
    logger.warn('Error while updating conversation tagged read status: ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while updating conversation tagged read status'
      }
    })
  }
})

module.exports = router;
