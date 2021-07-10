const moment = require('moment');

const {
  getRoomByTitle,
  getRoomById,
  createRooms,
  addUser,
  removeUser,
  fetchAllRooms,
  updateUserSocketData,
  checkUserRoomPresence } = require('../helpers/room');
const { getUserById } = require('../helpers/user');
const { sendMail } = require('../helpers/mail');
const {
  addMessage,
  editMessages } = require('../helpers/messages');

const { messageNotification } = require('../helpers/notification');

const { getChannelById, getTokensByChannelId } = require('../helpers/channel');
const { makeUserOffline } = require('../helpers/user');


/**
 * Encapsulates all code for emitting and listening to socket events
 *
 */
var ioEvents = function (io) {
  console.log('io')

  // Rooms namespace
  io.of('/rooms').on('connection', function (socket) {

    console.log('socket conected to this namespace ---------------------', socket.id);

    // Create a new room
    socket.on('createRoom', async function (data) {
      let title;
      let channelType = 'PERSONAL';
      let visibility = true;
      let inviteLink = 'null';
      let autoJoin = 'NONE';
      let workspaceId = data.workspaceId;
      let createdBy = data.currentUser;
      let otherUser = data.otherUser;
      if (data.currentUser > data.otherUser) {
        title = data.otherUser + '_' + data.currentUser;
      } else {
        title = data.currentUser + '_' + data.otherUser;
      }
      const room = await getRoomByTitle(title, workspaceId);
      if (room && room.length > 0) {
        return socket.emit('roomDetails', room[0]);
      } else {
        createRooms(title, workspaceId, channelType, visibility, autoJoin, inviteLink, createdBy, otherUser, function (err, newRoom) {
          if (err) throw err;
          return socket.emit('roomDetails', newRoom[0]);
        });
      }
    });

    //create a channel
    socket.on('createChannel', async function (data) {
      let channelId = data.channelId;
      let userId = data.userId;


      const channel = await getChannelById(channelId, userId);
      if (channel) {
        return socket.emit('roomDetails', channel[0]);
      } else {
        return socket.emit('error', {
          msg: "Something wrong happened!"
        })
      }
    });

  });

  // Chatroom namespace
  io.of('/chatroom').on('connection', async function (socket) {

    socket.on('updateSocketDetails', async (data) => {
      const userId = data.userId;
      console.info('socket id ------------------------------------', socket.id);
      updateUserSocketData(userId, socket.id, (err, data) => {
        if (err) return socket.emit('error', {
          msg: "Something wrong happened!"
        })
      })
    })

    //join all rooms a user is present
    socket.on('joinAllRooms', async (data) => {
      const workspaceId = data.workspaceId;
      const userId = data.userId;
      const socketId = socket.id;

      fetchAllRooms(userId, function (err, rooms) {
        if (err) {
          return socket.emit('error', {
            msg: "Something wrong happened!"
          })
        }
        const roomsList = rooms;
        roomsList.map(room => {
          socket.join(room["room_id"]);
          addUser(userId, room["room_id"], socketId, function (err, connection) {
            if (err) {
              return socket.emit('error', {
                msg: "Something wrong happened!"
              })
            }
          });
        });
      })
    });


    // Join a chatroom
    socket.on('join', function (data) {
      let roomId = data.roomId;
      let userId = data.userId;
      getRoomById(roomId, function (err, room) {
        if (err) return socket.emit('error', {
          msg: "Something wrong happened!"
        });
        if (!room) {
          // Assuming that you already checked in router that chatroom exists
          // Then, if a room doesn't exist here, return an error to inform the client-side.
          socket.emit('updateUsersList', { error: 'Room doesnt exist.' });
        } else {
          addUser(userId, room[0]["id"], socket.id, function (err, connection) {
            if (err) {
              return socket.emit('error', {
                msg: "Something wrong happened!"
              })
            }
            // Join the room channel
            socket.join(roomId);
          });
        }
      });
    });



    // When a socket exits
    socket.on('disconnect', function () {

      // Find the room to which the socket is connected to, 
      // and remove the current user + socket from this room

      removeUser(socket.id, async function (err, rooms) {
        if (err) throw err;
        let userId;
        // Leave the room channel
        rooms.forEach(room => {
          userId = room.user_id;
          socket.leave(room.room_id);
        });
        await makeUserOffline(userId);

      });
    });

    // When a new message arrives
    socket.on('newMessage', async function (data) {

      const message = data.message;
      const roomId = data.roomId;
      const messageType = data.messageType;
      const senderId = data.senderId;
      const receiverId = data.receiverId;
      const receiver = data.receiver;
      const workspaceId = data.workspaceId;
      const isPinned = data.isPinned;
      const pinnedBy = data.pinnedBy;
      const fileUploadMethod = data.fileUploadMethod;
      const isTagged = data.isTagged;
      let tagged_id = data.tagged_id;
      const deleted = false;
      const quotedMsgId = data.quotedMsgId;
      const fileDetails = JSON.stringify(data.fileDetails);
      let pinnedAt = data.pinnedAt;

      if (pinnedAt != null || pinnedAt != undefined) {
        pinnedAt = moment(pinnedAt).format('YYYY-MM-DD');
      }

      if (!deleted) {
        const sender = await getUserById(senderId)
        console.info('SENDER', sender.dataValues.username);
        if (roomId) {
          // const tokenData = await getTokensByChannelId(roomId)
          // if (tokenData) {
          //   await messageNotification(sender, tokenData.tokens, tokenData.channelName);
          //   await Promise.all(tokenData.mails.map(mail => {
          //     sendMail(
          //       'new_message', {
          //       to: mail,
          //       subject: `Ubblu - New Message from Channel ${tokenData.channelName}`
          //     }, {
          //       channel_name: tokenData.channelName,
          //       message
          //     })
          //   }))
          // }
        }
        // if (receiverId !== senderId) {
        //   const receiver = await getUserById(receiverId);
        //   if (receiver) {
        //     await messageNotification(sender, [receiver.dataValues.id])
        //   }
        // }
      }

      if(tagged_id == undefined){
        tagged_id = []
      }

      addMessage(message, roomId, senderId, deleted, receiverId, workspaceId, isPinned, pinnedBy, pinnedAt, messageType, fileDetails, fileUploadMethod, quotedMsgId, isTagged, receiver,tagged_id, async function (err, message) {
        if (err) throw err;
        if (message && message.length > 0) {
          socket.broadcast.to(roomId).emit('addMessage', message);
          if (receiver == 'USER') {
            let userPresentInTheRoom = await checkUserRoomPresence(receiverId, roomId);
            if (userPresentInTheRoom && userPresentInTheRoom.length
              && userPresentInTheRoom[0]['room_id'] == 0
            ) {
              const receiverSocketId = userPresentInTheRoom[0]['socket_id'];
              socket.broadcast.to(receiverSocketId).emit('addMessage', message);
            }
          }
          return socket.emit('addMessage', message)
        } else {
          socket.emit('error', 'Something wrong happened!');
        }
      });

    });

    socket.on('editMessage', (data) => {
      editMessages(data.editedMsg, data.msgId, data.deleted, (err, data) => {
        if (err) {
          logger.warn('Error while editing conversation  : ', err)
        }

        if (data && data.length && data[0].length) {
          const roomId = data[0][0]["channel_id"];
          socket.broadcast.to(roomId).emit('addMessage', data[0]);

        }
      })
    })
  });
}

/**
 * Initialize Socket.io
 * Uses Redis as Adapter for Socket.io
 *
 */
var init = function (app) {

  var server = require('http').Server(app);
  var io = require('socket.io')(server);

  // Force Socket.io to ONLY use "websockets"; No Long Polling.
  io.set('transports', ['websocket']);

  // Allow sockets to access sfession data
  // io.use((socket, next) => {
  //   require('../session')(socket.request, {}, next);
  // });

  // Define all Events
  ioEvents(io);

  // The server object will be then used to list to a port number
  return server;
}

module.exports = init; 

