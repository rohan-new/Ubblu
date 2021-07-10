'use strict'

const express = require('express')
const router = express.Router()

const { sendError, sendResponse } = require('./../../utils/http')
const {
  getChannelById,
  addMemberstoChannel,
  getChannelUser,
  getChannelUsers,
  getChannelNonMembers,
  updateChannelUser,
  fetchCommonChannelWithUser,
  fetchSharedFiles,
  addChannelNotes,
  deleteNotes,
  removeNotes,
  fetchChannelRoleForUser,
  removeUserFromChannel,
  joinChannelViaInvite,
  searchChannels,
  deleteChannel,
  updateChannelNotes, 
  fetchChannelNotes,
  starConversations,
  muteConversations,
  pinConversations,
  fetchPinConversations,
  fetchMuteConversations,
  fetchStarConversations,
  changeChannelType,
  fetchChannelsForUser,
  searchUserChannels
} = require('./../../helpers/channel')

const logger = require('./../../logger')

// Add Members to channel
router.post('/:channelId/members', async (req, res) => {
  try {
    const userId = req.user.id;
    const channel = await getChannelById(req.params.channelId, userId);

    if (channel) {
      if (req.user.id === channel[0].created_by) {
        // Channel Admin can add member

        let channelUser = await getChannelUser(req.params.channelId, req.body.usersId[0]);
        if (channelUser) {
          let resp = await updateChannelUser(
            req.params.channelId,
            req.body.usersId[0],
            {
              status: 'MEMBER'
            }
          );

          if (resp) {
            return sendResponse(res, {
              code: 200,
              data: {
                status: 1,
                message: 'User role has changed to Member'
              }
            })
          } else {
            return sendError(res, {
              code: 500,
              error: {
                status: 0,
                message: 'Error occured while making channel Member'
              }
            })
          }
        }

        const resp = await addMemberstoChannel(
          req.params.channelId,
          req.body.usersId
        )
        if (resp) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'Members has been added to channel'
            }
          })
        } else {
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error occured while adding member to channel'
            }
          })
        }
      } else {
        return sendError(res, {
          code: 401,
          error: {
            status: 0,
            message: 'You are not authorized to add member'
          }
        })
      }
    } else {
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Invalid channel'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while adding members in channel'
      }
    })
  }
})

// Fetch common channel with other user
router.get('/:workspaceId/fetchCommon/:userId', async (req, res) => {
  try {
    const channels = await fetchCommonChannelWithUser(
      req.params.workspaceId,
      req.user.id,
      req.params.userId
    )
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Common channel has been fetched',
        channels
      }
    })
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching common channel'
      }
    })
  }
})

// Add Channel Notes
router.post('/:channelId/addNotes', async (req, res) => {
  try {
    const notes = await addChannelNotes(
      req.user.id,
      req.params.channelId,
      req.body.notes
    )
    if (notes) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Channel notes has been added',
          notes: notes
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while adding channel notes'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while adding channel notes'
      }
    })
  }
})

// Update channel notes
router.put('/:channelId/notes/:noteId', async (req, res) => {
  try {
    const channels = await updateChannelNotes(req.params.noteId,req.body.notes,req.body.deleted)
    if (channels) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Channel notes has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while updating channel notes'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while adding channel notes'
      }
    })
  }
})

// Tested and working
// Delete channel
router.delete('/', async (req, res) => {
  try {
    // const channelUser = await getChannelUser(req.body.channelId, req.user.id)

    // if (channelUser && channelUser.status == 'ADMIN') {
    // Delete channel
    const resp = await deleteChannel(req.body.channelId)
    if (resp) {
      sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Channel has been deleted'
        }
      })
    } else {
      sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Unable to delete channel',
          error: resp
        }
      })
    }
    // }
    //  else {
    //   return sendError(res, {
    //     code: 403,
    //     error: {
    //       status: 0,
    //       message:
    //         "You don't have sufficient privilege to access this functionality"
    //     }
    //   })
    // }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while making channel admin'
      }
    })
  }
})

router.delete('/:channelId/notes/:noteId', async (req, res) => {
  try {
    const notes = await deleteNotes(
      req.user.id,
      req.params.channelId,
      req.params.noteId     
    )
    if (notes) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Channel notes has been deleted'
        }
      })
    } else {
      return sendResponse(res, {
        code: 400,
        data: {
          status: 0,
          message: 'No notes available'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while deleting channel notes'
      }
    })
  }
})

router.delete('/:channelId/notes/:noteId/remove', async (req, res) => {
  console.info('DELET NOTES', req.params)
  try {
    const notes = await removeNotes(
      req.user.id,
      req.params.channelId,
      req.params.noteId
    )
    if (notes) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Channel notes has been removed'
        }
      })
    } else {
      return sendResponse(res, {
        code: 400,
        data: {
          status: 0,
          message: 'No notes available'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while removing channel notes'
      }
    })
  }
})

router.delete('/:channelId/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId === 'me' ? req.user.id : req.params.userId
    if (req.user.id != userId) {
      // Check user is channel admin or not
      const channelRole = await fetchChannelRoleForUser(
        req.params.channelId,
        req.user.id
      )

      if (channelRole && channelRole['status'] !== 'ADMIN') {
        return sendError(res, {
          code: 403,
          error: {
            message:
              "You don't have sufficient privileges to delete user from channel"
          }
        })
      }
    }
    const resp = await removeUserFromChannel(req.params.channelId, userId)
    if (resp) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User has been removed from channel'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          message: 'Error occured while deleting user from channel'
        }
      })
    }
  } catch (err) {
    return sendError(res, {
      code: 500,
      error: {
        message: 'Error occured while deleting user from channel'
      }
    })
  }
})

//fetch Channel Role
router.get('/:channelId/user/:userId', async (req, res) => {
  try {
    const channelRole = await fetchChannelRoleForUser(
      req.params.channelId,
      req.params.userId
    )
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        data: channelRole,
        message: 'Channel Role for User'
      }
    })

  }
  catch (err) {
    return sendError(res, {
      code: 500,
      error: {
        message: 'Error occured while deleting user from channel'
      }
    })
  }
})

//leave a channel
router.delete('/:channelId/unjoin', async (req, res) => {
  try {
    const userId = req.user.id;

    const resp = await removeUserFromChannel(parseInt(req.params.channelId), userId)
    if (resp) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'User has been removed from channel'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          message: 'Error occured while deleting user from channel'
        }
      })
    }
  } catch (err) {
    return sendError(res, {
      code: 500,
      error: {
        message: 'Error occured while deleting user from channel'
      }
    })
  }
})

// Make Admin of channel
router.put('/:channelId/makeAdmin/:userId', async (req, res) => {
  try {
    // Mute channel
    let channelUser = await getChannelUser(req.params.channelId, req.params.userId)

    if (channelUser && channelUser.status == 'ADMIN') {
      // Already Admin
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'User is already Admin'
        }
      })
    } else if (!channelUser) {
      const addMembertoChannel = await addMemberstoChannel(
        req.params.channelId,
        [req.params.userId]
      )
      if (addMembertoChannel) {
        let resp = await updateChannelUser(
          req.params.channelId,
          req.params.userId,
          {
            status: 'ADMIN'
          }
        )
        if (resp) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'User role has changed to Admin'
            }
          })
        } else {
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error occured while making channel Admin'
            }
          })
        }
      } else {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while making channel Admin'
          }
        })
      }
    }
    else {
      // Update channelUser
      const resp = await updateChannelUser(
        req.params.channelId,
        req.params.userId,
        {
          status: 'ADMIN'
        }
      )
      if (resp) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'User role has changed to Admin'
          }
        })
      } else {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while making channel Admin'
          }
        })
      }
    }

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while making channel admin'
      }
    })
  }
})

// Enable channel for email notification for user
router.post('/:channelId/enableNotification', async (req, res) => {
  try {
    // Mute channel
    const channelUser = await getChannelUser(req.params.channelId, req.user.id)

    if (channelUser) {
      if (channelUser.is_receive_mail_notification) {
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'Channel has already enabled for email notification'
          }
        })
      } else {
        // Update channelUser
        const resp = await updateChannelUser(
          req.params.channelId,
          req.user.id,
          {
            is_receive_mail_notification: true
          }
        )
        if (resp) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'Email notification has been enabled for channel'
            }
          })
        } else {
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message:
                'Error occured while enable email notification for channel'
            }
          })
        }
      }
    } else {
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Invalid channel'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while enable email notification for channel'
      }
    })
  }
})

// Disabled channel for email notification for user
router.post('/:channelId/disabledNotification', async (req, res) => {
  try {
    // Mute channel
    const channelUser = await getChannelUser(req.params.channelId, req.user.id)

    if (channelUser) {
      if (!channelUser.is_receive_mail_notification) {
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: 'Channel has already disabked for email notification'
          }
        })
      } else {
        // Update channelUser
        const resp = await updateChannelUser(
          req.params.channelId,
          req.user.id,
          {
            is_receive_mail_notification: false
          }
        )
        if (resp) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'Email notification has been disabled for channel'
            }
          })
        } else {
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message:
                'Error occured while disabled email notification for channel'
            }
          })
        }
      }
    } else {
      return sendError(res, {
        code: 400,
        error: {
          status: 0,
          message: 'Invalid channel'
        }
      })
    }
  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while disabled email notification for channel'
      }
    })
  }
})

// Get all users of channel
router.get('/:channelId/users', async (req, res) => {
  try {
    const users = await getChannelUsers(req.params.channelId)
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
        message: 'Error occured while fetching channel users'
      }
    })
  }
})


// Get all non members of channel
router.get('/:channelId/nonUsers', async (req, res) => {
  try {
    const users = await getChannelNonMembers(req.params.channelId)
    if (users && users.length) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Users has been found',
          users: users
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No users found with chanel id',
          users: []
        }
      })
    }
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while fetching channel users'
      }
    })
  }
})

// join channel via invite link
router.post('/join', async (req, res) => {
  try {
    const resp = await joinChannelViaInvite(req.user.id, req.body.inviteLink)
    if (resp.status === 200) {
      sendResponse(res, {
        code: resp.status,
        data: {
          message: resp.message
        }
      })
    } else {
      sendError(res, {
        code: resp.status,
        error: {
          message: resp.message
        }
      })
    }
  } catch (err) {
    logger.warn('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while adding user to channel'
      }
    })
  }
})

// Search Channel by name
router.post('/search', async (req, res) => {
  try {
    const channels = await searchChannels(req.body.searchTerm, req.body.workspaceId)
    if (channels && channels.length > 0) {
      // send response
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          channels
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No channel found with given name',
          channels: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while searching channel by name : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while searching channel'
      }
    })
  }
})

//search channels user can search ('PUBLIC', 'PRIVATE') and 'SECRET' only if the user is a memeber of it

// Search Channel by name
router.post('/list/search', async (req, res) => {
  try {
    const channels = await searchUserChannels(req.body.workspaceId, req.body.userId, req.body.searchTerm)
    if (channels && channels.length > 0) {
      // send response
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          channels
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No channel found with given name',
          channels: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while searching channel by name : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while searching channel'
      }
    })
  }
})


// fetch Channel notes
router.get('/:channelId/notes', async (req, res) => {
  try {
    const notes = await fetchChannelNotes(req.params.channelId)
    if (notes && notes.length > 0) {
      // send response
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          notes
        }
      })
    } else {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 0,
          message: 'No notes for this channel',
          notes: []
        }
      })
    }
  } catch (err) {
    logger.warn('Error while searching notes by channel id : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error occured while searching channel'
      }
    })
  }
})


// starred conversation
router.post('/:channelId/:userId/star', async (req, res) => {
  try {
    // starred convo
    const channelId = req.params.channelId;
    const userId = req.params.userId;
    starConversations(channelId, userId, (err, result) => {
      if (err) {
        logger.warn('Error while starring the channel  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to star the conversation'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation starred'
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while making conversation starred'
      }
    })
  }
});

// pinned conversation
router.post('/:channelId/:userId/pin', async (req, res) => {
  try {
    // starred convo
    const channelId = req.params.channelId;
    const userId = req.params.userId;
    pinConversations(channelId, userId, (err, result) => {
      if (err) {
        logger.warn('Error while pining the channel----------------  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to pin the conversation'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation pinned'
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while making conversation starred'
      }
    })
  }
});

//users and channels list for exceptoion list
router.get('/:workspaceId/:userId/list', async (req, res) => {
  try {
    // star convo
    const userId = req.params.userId;
    const workspaceId = req.params.workspaceId;
    fetchChannelsForUser(userId, workspaceId, (err, result) => {
      if (err) {
        logger.warn('Error while feyching the channels  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to fetch channels'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'channels list',
            channels: result
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching channels '
      }
    })
  }
});


// mute a conversation
router.post('/:userId/mute', async (req, res) => {
  try {
    // star convo
    let channelId = req.body.channelId
    channelId = channelId.join ? channelId.join(',') : channelId
    const userId = req.params.userId
    muteConversations(channelId, userId, (err, result) => {
      if (err) {
        logger.warn('Error while muting the channel  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to mute the conversation'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Conversation muted'
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while making conversation muted'
      }
    })
  }
});

//list pinned conversation

router.get('  ', async (req, res) => {
  try {
    // starred convo
    const workspaceId = req.params.workspaceId;
    const userId = req.params.userId;
    fetchPinConversations(userId, workspaceId, (err, result) => {
      if (err) {
        logger.warn('Error while fetching starred conversation  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to fetch starred conversation'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Starred Conversation List',
            conversations: result.length > 0 ? result[0]["conversations"] : []
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching starred conversation '
      }
    })
  }
});

//list mute convo

router.get('/:workspaceId/:userId/starred', async (req, res) => {
  try {
    // starred convo
    const workspaceId = req.params.workspaceId;
    const userId = req.params.userId;
    fetchStarConversations(userId, workspaceId, (err, result) => {
      if (err) {
        logger.warn('Error while fetching starred conversation  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to fetch starred conversation'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Starred Conversation List',
            conversations: result.length > 0 ? result[0]["conversations"] : []
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching starred conversation '
      }
    })
  }
});


// mute a conversation
router.get('/:workspaceId/:userId/muted', async (req, res) => {
  try {
    // starred convo
    const workspaceId = req.params.workspaceId;
    const userId = req.params.userId;
    fetchMuteConversations(userId, workspaceId, (err, result) => {
      if (err) {
        logger.warn('Error while fetching muted conversations  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to fetch muted conversations'
          }
        })
      }
      if (result && result.length > 0) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Muted Conversation List',
            conversations: result[0]["conversations"] ? result[0]["conversations"] : [],
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching conversation muted'
      }
    })
  }
});





// sahred files in a channel 
router.get('/:channelId/files', async (req, res) => {
  try {
    // starred convo
    const channelId = req.params.channelId;
    fetchSharedFiles(channelId, (err, result) => {
      if (err) {
        logger.warn('Error while fetching muted conversations  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to fetch shared files'
          }
        })
      }
      if (result) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'Shared Files List',
            files: result
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching Shared Files'
      }
    })
  }
});



// change channel type of a channel 
router.put('/:channelId/channelType', async (req, res) => {
  try {
    // starred convo
    const channelId = req.params.channelId;
    changeChannelType(channelId, (err, result) => {
      if (err) {
        logger.warn('Error while updating channel type  : ', err)
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Unable to update channel type'
          }
        })
      }
      if (result) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'updated channel',
            files: result
          }
        })
      }
    })

  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while updating channel type'
      }
    })
  }
});


//fetch channel details
router.get('/:channelId', async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const userId = req.user.id;
    const channel = await getChannelById(channelId, userId);


    if (channel.length) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'channel details',
          user: channel[0]
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'channel not present'
        }
      })
    }


  } catch (err) {
    console.log('err : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Internal error occured while fetching channnel details'
      }
    })
  }
});


module.exports = router;
