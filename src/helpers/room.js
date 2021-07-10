'use strict'

// import { Sequelize } from "sequelize/types"
const { sequelize } = require('../models');
const logger = require('../logger')


// Fetch room information by Name
module.exports.getRoomByTitle = async (name, workspaceId) => {
  try {
    const query = `select
    channels.*,
    ucr.muted
  from
    channels
  join "user-channel-relationships" ucr on
    ucr.channel_id = channels.id
  where
    name = '${name}'
    and workspace_id = ${workspaceId};`;
    const channel = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return channel;
    // if (channel && channel.length > 0) {
    //   return  channel;
    // } else {
    //   return false ;
    // }

  } catch (err) {
    logger.warn('Err : ', err)
    return false;
  }
}

// Fetch room information by ID

module.exports.getRoomById = async (roomId, callback) => {
  try {
    const query = `select * from channels where id = ${roomId}`;
    const channel = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    if (channel && channel.length > 0) {
      return callback(null, channel);
    } else {
      return callback(null, false);
    }

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}


// Create rooms for one-to-one chat
module.exports.createRooms = async (channelName, workspaceId, channelType, visibility, autoJoin, inviteLink, createdBy, otherUser, callback) => {
  try {

    let query = `INSERT INTO channels(workspace_id, name, channel_type,visibility, auto_join, invite_link, created_by) values(${workspaceId}, '${channelName}','${channelType}', ${visibility}, '${autoJoin}','${inviteLink}', ${createdBy}) returning *`;
    const room = await sequelize.query(query, {
      type: sequelize.QueryTypes.INSERT
    });

    const channelId = room[0][0]["id"];

    query = `INSERT INTO "user-channel-relationships"(user_id, channel_id, status) values(${createdBy}, '${channelId}','MEMBER')`;
    const currentUserChannelRelationship = await sequelize.query(query, {
      type: sequelize.QueryTypes.INSERT
    });

    if (createdBy != otherUser) {

      query = `INSERT INTO "user-channel-relationships"(user_id, channel_id, status) values(${otherUser}, '${channelId}','MEMBER')`;
      const otherUserChannelRelationship = await sequelize.query(query, {
        type: sequelize.QueryTypes.INSERT
      });

    }


    if (room) {
      callback(null, room[0])
    } else {
      callback(null, false)
    }
  } catch (err) {
    logger.warn('Err : ', err)
    callback(err)
  }
}

//add user

module.exports.addUser = async (userId, roomId, socketId, callback) => {

  try {
    let roomData;

    let userAvailable = await checkForAUserInARoom(userId, roomId);

    if (userAvailable) {
      const query = `update  connections set socket_id = '${socketId}' where user_id = ${userId} and room_id = ${roomId} returning *;`
      const updateSocketId = await sequelize.query(query, {
        type: sequelize.QueryTypes.UPDATE
      });
      roomData = updateSocketId;
    } else {
      const query = `insert into connections(user_id, room_id, socket_id) values(${userId}, ${roomId}, '${socketId}') returning *;`
      const newConnection = await sequelize.query(query, {
        type: sequelize.QueryTypes.INSERT
      });
      roomData = newConnection;
    }
    callback(null, roomData);

  } catch (err) {
    logger.warn('Err : ', err)
    callback(err)
  }
}

/**
 * Get all users in a room
 *
 */
module.exports.getUsers = (room, socket, callback) => {

  var users = [], vis = {}, cunt = 0;
  var userId = socket.request.session.passport.user;

  // Loop on room's connections, Then:
  room.connections.forEach(function (conn) {

    // 1. Count the number of connections of the current user(using one or more sockets) to the passed room.
    if (conn.userId === userId) {
      cunt++;
    }

    // 2. Create an array(i.e. users) contains unique users' ids
    if (!vis[conn.userId]) {
      users.push(conn.userId);
    }
    vis[conn.userId] = true;
  });

  // Loop on each user id, Then:
  // Get the user object by id, and assign it to users array.
  // So, users array will hold users' objects instead of ids.
  var loadedUsers = 0;
  users.forEach(function (userId, i) {
    User.findById(userId, function (err, user) {
      if (err) { return callback(err); }
      users[i] = user;

      // fire callback when all users are loaded (async) from database 
      if (++loadedUsers === users.length) {
        return callback(null, users, cunt);
      }
    });
  });
}

/**
 * Remove a user along with the corresponding socket from a room
 *
 */
module.exports.removeUser = async (socketId, callback) => {

  try {
    const query = `select user_id, room_id from connections where socket_id = '${socketId}' `
    const rooms = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return callback(null, rooms);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err)
  }
}



const checkForAUserInARoom = async (userId, roomId) => {

  try {

    const query = `select * from connections where room_id = ${roomId} and user_id = ${userId}`;
    const room = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    if (room && room.length > 0) {
      return true;
    } else {
      return false;
    }

  } catch (err) {
    logger.warn('Err : ', err)
    throw err;
  }
}

module.exports.fetchAllRooms = async (userId, callback) => {

  try {
    const query = `select distinct room_id from connections where user_id = ${userId} and active= true `;
    const rooms = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return callback(null, rooms);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err)
  }
}

module.exports.updateUserSocketData = async (userId, socketId, callback) => {

  try {
    let query = `select id from connections where user_id = ${userId} and room_id  = 0  `
    const userSocketDetails = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    if (userSocketDetails && userSocketDetails.length) {
      let query = `update connections set socket_id = '${socketId}' where user_id = ${userId} and room_id =0 `
      const updateUserSocketDetails = await sequelize.query(query, {
        type: sequelize.QueryTypes.UPDATE
      });
    } else {
      let query = `insert into  connections ( user_id, socket_id, room_id) values(${userId}, '${socketId}', 0) `
      const insertUserSocketDetails = await sequelize.query(query, {
        type: sequelize.QueryTypes.INSERT
      });
    }
    return callback(null, true);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err)
  }
}


module.exports.checkUserRoomPresence = async (userId, roomId) => {

  try {
    let query = `select socket_id, room_id from connections where user_id = ${userId} and room_id  = ${roomId}  `
    let userSocketDetails = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    if (userSocketDetails && userSocketDetails.length) {

    } else {
      let query = `select socket_id, room_id from connections where user_id = ${userId} and room_id  = 0 `
      userSocketDetails = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });
    }

    return userSocketDetails;

  } catch (err) {
    logger.warn('Err : ', err)
    return false;
  }
}






