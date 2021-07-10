const { sequelize } = require('../models');
const logger = require('../logger');
const { notifyUsersWithChatString } = require('./message')

// Fetch room information by Id
module.exports.addMessage = async (message, roomId, senderId, deleted, recieverId, workspaceId, isPinned, pinnedBy, pinnedAt, messageType, fileDetails, fileUploadMethod, quotedMsgId, isTagged, receiver,tagged_id, callback) => {
 console.log('addMessage',tagged_id);
  try {
    let query;

    if (pinnedAt != null || pinnedAt != undefined) {

      if (fileDetails == null || fileDetails == undefined) {

        query = `INSERT into messages(message, channel_id, sender_id, deleted, receiver_id, workspace_id, is_pinned, pinned_by, pinned_at, message_type, file_upload_details,quoted_msg_id, is_tagged,tagged_id ) values( ?, ${roomId}, ${senderId}, ${deleted}, ${recieverId}, ${workspaceId}, ${isPinned}, ${pinnedBy}, '${pinnedAt}', '${messageType}', null, ${quotedMsgId}, ${isTagged},'{${tagged_id}}') returning id`;

      } else {

        query = `INSERT into messages(message, channel_id, sender_id, deleted, receiver_id, workspace_id, is_pinned, pinned_by, pinned_at, message_type, file_upload_details, file_upload_service_method, quoted_msg_id, is_tagged,tagged_id) values(?, ${roomId}, ${senderId}, ${deleted}, ${recieverId}, ${workspaceId}, ${isPinned}, ${pinnedBy}, '${pinnedAt}', '${messageType}', '${fileDetails}', '${fileUploadMethod}', ${quotedMsgId}, ${isTagged},'{${tagged_id}}') returning id`;
      }

    } else {
      if (fileDetails == null || fileDetails == undefined) {

        query = `INSERT into messages(message, channel_id, sender_id, deleted, receiver_id, workspace_id, is_pinned, pinned_by, pinned_at, message_type, file_upload_details, quoted_msg_id, is_tagged,tagged_id) values(?, ${roomId}, ${senderId}, ${deleted}, ${recieverId}, ${workspaceId}, ${isPinned}, ${pinnedBy}, null, '${messageType}', null, ${quotedMsgId}, ${isTagged},'{${tagged_id}}') returning id`;

      } else {
        query = `INSERT into messages(message, channel_id, sender_id, deleted, receiver_id, workspace_id, is_pinned, pinned_by, pinned_at, message_type, file_upload_details, file_upload_service_method, quoted_msg_id, is_tagged,tagged_id) values(?, ${roomId}, ${senderId}, ${deleted}, ${recieverId}, ${workspaceId}, ${isPinned}, ${pinnedBy}, null, '${messageType}', '${fileDetails}', '${fileUploadMethod}', ${quotedMsgId}, ${isTagged},'{${tagged_id}}') returning id`;
      }
    }

    await notifyUsersWithChatString(workspaceId, senderId, message, roomId);
    if (receiver == 'CHANNEL') {
      await module.exports.changeReadStatusForChannelMembers(senderId, roomId);
    } else {
      await module.exports.changeReadStatus(recieverId, roomId);
    }

    const saveMessage = await sequelize.query(query, {
      type: sequelize.QueryTypes.INSERT,
      replacements: [message]
    })
    if (saveMessage && saveMessage.length > 0) {
      const msgId = saveMessage[0][0]["id"];
      query = `select
      m.*,
      m1.message as quoted_msg,
      m1.created_at as quoted_msg_timestamp,
      users.id as user_id,
      users.username ,
      users.name,
      users.email,
      users.profile_image,
      users.profile_color,
      u1.username as quoted_msg_sender_name
    from
      messages m
      left join messages m1 on m1.id = m.quoted_msg_id
      join users on
      users.id = m.sender_id
    left join users u1 on
	u1.id = m1.sender_id
    where
      m.channel_id = ${roomId}
      and m.workspace_id =  ${workspaceId}
      and m.id = ${msgId}
    order by
      m.created_at;`;
      const getMessageDetails = await sequelize.query(query, {
        type: sequelize.QueryTypes.SELECT
      });
      if (getMessageDetails && getMessageDetails.length > 0) {
        return callback(null, getMessageDetails);
      }

    } else {
      return callback(null, false);
    }

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}

//fetch messages of a channel/private conversation
module.exports.fetchMessages = async (roomId, workspaceId, callback) => {
  const query = `select
	m.*,
	m1.message as quoted_msg,
	m1.created_at as quoted_msg_timestamp,
	users.id as user_id,
	users.username ,
	users.name,
	users.email,
	users.profile_image,
	users.profile_color,
	u1.username as quoted_msg_sender_name
from
	messages m
join users on
	users.id = m.sender_id
left join messages m1 on
	m1.id = m.quoted_msg_id
left join users u1 on
	u1.id = m1.sender_id
where
	m.channel_id = ${roomId}
	and m.workspace_id = ${workspaceId}
order by
	created_at  ;`;
  sequelize.query(query, {
    type: sequelize.QueryTypes.SELECT
  }).then((listMessages) => {
    if (listMessages && listMessages.length > 0) {
      return callback(null, listMessages);
    } else {
      return callback(null, false);
    }
  })
    .catch((err) => {
      logger.warn('Err : ', err)
      return callback(err);
    })
}


//delete messages of a channel/private conversation
module.exports.deleteMessages = async (roomId, messageId, callback) => {
  try {
    const query = `update messages set deleted = true where id = ${messageId} and room_id = ${roomId} returning id`;
    const deleteMessage = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    if (deleteMessage && deleteMessage.length > 0) {
      return callback(null, deleteMessage);
    } else {
      return callback(true);
    }

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}


//edit messages of a channel/private conversation
module.exports.editMessages = async (message, messageId, deleted, callback) => {
  try {
    const query = `update messages set message = '${message}', deleted = ${deleted} where id = ${messageId}  returning *`;
    const editMessage = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    if (editMessage && editMessage.length > 0) {
      return callback(null, editMessage);
    } else {
      return callback(true);
    }

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}


//filter the results of search 

//delete messages of a channel/private conversation
module.exports.fetchSearchResults = async (workspaceId, userId, searchInput, options, callback) => {
  try {
    const query = `select
    json_agg( json_build_object('otherUser',
     (select json_build_object('id', user_id, 'username', name, 'email', email, 'name', name, 'profile_image', profile_image ) ),
     'senderDetails',
	( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 
     'lastMessage',(  json_build_object('reciever_id', receiver_id, 'sender_id', sender_id, 'message', message,'fileDetails', t.file_upload_details, 'messageType', message_type, 'created_at', created_at ) )) ) as conversations
  from
    (
    select 
      m.*,
      u.id as user_id,
		u.username,
		u."name",
		u.email,
		u.profile_image
    from
      messages as m
      join connections as c on
      c.room_id = m.channel_id
      join users u on
		u.id = case when m.sender_id != ${userId} then 
		m.sender_id else m.receiver_id end
    where
      user_id = ${userId}
      and workspace_id = ${workspaceId}
      and m.deleted = false
      and message like '%${searchInput}%' order by m.created_at desc limit ${options.limit} ) as t`;
    const searchResults = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return callback(null, (searchResults[0]["conversations"] ? searchResults[0]["conversations"] : []));

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}

// module.exports.taggedConversations = async (userId, workspaceId, callback) => {
//   try {
//     const userdata = await sequelize.query(`select username from users where id=${Number(userId)}`, {
//       type: sequelize.QueryTypes.SELECT
//     })

//     const query = `select
//     json_agg( json_build_object('otherUser', (case when t.channel_type != 'PERSONAL' then (select json_build_object( 'id', t.channel_id, 'channel', true, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned, 'username', t.name, 'email', null, 'availability', t.availability, 'name', t.name, 'profile_image', null ) ) else ( select json_build_object( 'id', t.user_id, 'channel', false, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned , 'username', t.username, 'email', t.email, 'availability', t.availability, 'name', t.name, 'profile_image', t.profile_image ) ) end), 'senderDetails', ( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message, 'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id ) ) )) ) as conversations
//   from
//      (
//     select
//       distinct on
//       (m.channel_id) message,
//       m.created_at,
//       m.id as msg_id,
//       m.receiver_id,
//       m.sender_id,
//       m.message_type,
//       m.file_upload_details,
//       u.id as user_id,
//       u.username,
//       u.profile_image,
//       u.name,
//       u.email,
//       u.profile_color as colors,
//       u.availability,
//       c.id as channel_id,
//       c.channel_type,
//       ucr.starred,
//       ucr.muted,
//       ucr.pinned
//     from
//       users u
//     join "user-workspace-relationships" uwr on
//       uwr.user_id = u.id
//     join messages m on
//       u.id =
//       (case
//         when m.receiver_id = ${userId} then m.sender_id
//         else m.receiver_id end)
//     left join channels c on
//       c.id = m.channel_id
//     join "user-channel-relationships" ucr on
//       ucr.channel_id = c.id
//     where
//       m.channel_id in(
//       select
//         distinct channel_id
//       from
//         "user-channel-relationships"
//       where
//        ${userId} in (sender_id,receiver_id )
//         and is_tagged = true)
//       and m.workspace_id = ${workspaceId}
//       and ucr.user_id = ${userId}
//       and m.deleted = false
//     order by
//       m.channel_id,
//       m.created_at desc) as t;`;

//     const taggedConversations = await sequelize.query(query, {
//       type: sequelize.QueryTypes.SELECT
//     });

//     // if (taggedConversations.length>0) {
//     //   console.log("taggedConversations",taggedConversations);
//     //   if (taggedConversations[0].conversations.length) {
//     //     const conversations = taggedConversations[0].conversations.filter(convo => {
//     //       const user_regex = new RegExp('\\b'+userdata[0].username+'\\b','g')
//     //       return convo.lastMessage.message.match(user_regex)
//     //     })
//     //     taggedConversations[0].conversations = conversations
//     //   }
//     // }

//     return callback(null, taggedConversations);

//   } catch (err) {
//     logger.warn('Err : ', err)
//     return callback(err);
//   }
// }

module.exports.taggedConversations = async (userId, workspaceId, callback) => {
 
  try {
    const userdata = await sequelize.query(`select username from users where id=${Number(userId)}`, {
      type: sequelize.QueryTypes.SELECT
    })
    const query = `select
    json_agg( json_build_object( 'otherUser', (case when t.receiver_id = t.channel_id then (select json_build_object( 'id', id, 'channel', true, 'username', name, 'starred', starred, 'muted', t.muted,'pinned', t.pinned,'email', null, 'name', name, 'profile_image', null ) from channels where id = t.channel_id) else ( select json_build_object( 'id', id, 'channel', false, 'starred', starred,'muted', t.muted, 'pinned', t.pinned,'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.receiver_id ) end),
    'senderDetails',
	( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ),
    'lastMessage',( select json_build_object('msg_id', t.id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message,'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at,'is_tagged',t.is_tagged,'tagged_id',t.tagged_id, 'unread', (case when t.sender_id = t.channel_id then 0 else (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id) end ) ) )) ) as conversations
  from
    (
    select
    distinct on
      (m.channel_id)
      message,
      m.channel_id,
      m.id,
      sender_id,
      receiver_id,
      message_type,
      tagged_id,
      is_tagged,
      file_upload_details,
      m.created_at,
      ucr.starred,
      ucr.muted,
      ucr.pinned      
    from
      messages m
    join "user-channel-relationships" ucr on
      ucr.channel_id = m.channel_id
    where
      is_tagged = true
      and m.deleted = false  
      and ${userId} != sender_id 
      and ${userId} = Any (tagged_id)           
      and workspace_id = ${workspaceId}
      and ucr.user_id = ${userId}
    order by
      channel_id,
      created_at desc) as t`;

    const taggedConversations = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    // if (taggedConversations.length) {
    //   console.log("taggedConversations",taggedConversations);
    //   if (taggedConversations[0].conversations.length) {
    //     const conversations = taggedConversations[0].conversations.filter(convo => {
    //       const user_regex = new RegExp('\\b'+userdata[0].username+'\\b','g');
    //       console.log("taggedConversations,essage",user_regex);
    //       return convo.lastMessage.message.match(userdata[0].username)
    //     })
    //     taggedConversations[0].conversations = conversations
    //   }
    // }


    return callback(null, taggedConversations);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}


module.exports.changeReadStatus = async (user_id, channel_id, reset = false) => {
  const query = `update "user-channel-relationships"  set unread_msgs_count = (case when ${reset} = true then 0 else unread_msgs_count +1 end ) where user_id=${user_id} and channel_id = ${channel_id} `;
  await sequelize.query(query, {
    type: sequelize.QueryTypes.UPDATE
  });

}

module.exports.readTaggedUpdateConversation = async ( workspaceId, channelId, userId, senderId,is_tagged = false) => {
  const query = `update "messages"  set is_tagged = ${is_tagged} where  channel_id = ${channelId}  and workspace_id=${workspaceId} and sender_id = ${senderId} and ${userId} = Any (tagged_id)`;
  await sequelize.query(query, {
    type: sequelize.QueryTypes.UPDATE
  });

}


module.exports.changeReadStatusForChannelMembers = async (user_id, channel_id) => {
  const query = `update "user-channel-relationships"  set unread_msgs_count =  unread_msgs_count +1  where user_id in (select user_id from "user-channel-relationships" where channel_id = ${channel_id}  ) and user_id != ${user_id} and channel_id = ${channel_id} `;
  await sequelize.query(query, {
    type: sequelize.QueryTypes.UPDATE
  });

}


