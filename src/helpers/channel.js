const {
  Channel,
  UserChannelRelationship,
  ChannelConnections,
  ChannelNotes,
  User,
  Op,
  sequelize
} = require('../models/index')
const logger = require('./../logger')


const {
  SAFE_USER_ATTRIBUTES,
  SAFE_CHANNEL_ATTRIBUTES
} = require('./../constants')

async function addChannelToWorkspace(values) {
  try {
    const query = `INSERT INTO "channels" ("workspace_id","name","description", "visibility","auto_join","invite_link","channel_type","active","created_by","created_at","updated_at", "colors") VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW(),?) RETURNING *`;

    // const channel = await Channel.create(values)

    const channel = await sequelize.query(query, {
      type: sequelize.QueryTypes.INSERT,
      replacements: [values.workspace_id, values.name, values.description, values.visibility, values.auto_join, values.invite_link, values.channel_type, true, values.created_by, values.colors]
    });

    return channel
  } catch (err) {
    logger.warn('Err : ', err)
    return false
  }
}

async function getTokensByChannelId(channelId) {
  try {
    const query = `
      select users.firebase_id as tokens, username, channels.name as channelname from users
      inner join "user-channel-relationships"
      on users.id="user-channel-relationships".user_id
      inner join channels
      on channels.id="user-channel-relationships".channel_id
      where "user-channel-relationships".channel_id=${channelId} and "user-channel-relationships".muted=false;
    `
    const resp = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    })
    if (resp.length) {
      const channelName = resp[0]['channelname']
      const tokens = resp.map(t => t.tokens)
      const mails = resp.map(t => t.email)
      return { channelName, tokens, mails }
    }
    return false
  } catch (error) {
    console.info('CATCHING ERROR', error)
  }
}

// Fetch channel information by Id
async function getChannelById(channelId, userId) {
  try {


    const query = `select
    tc.id,
    (
      select
        muted
      from
        "user-channel-relationships" ucr
      where
        ucr.channel_id = tc.id
        and user_id = ${userId} ),
    (
    select
      status
    from
      "user-channel-relationships" ucr
    where
      ucr.channel_id = tc.id
      and user_id = ${userId} ),
    (
    select
      count(*)
    from
      "user-channel-relationships" ucr
    where
      channel_id = tc.id )as users_count,
    tc.name,
    tc.channel_type,
    tc.invite_link,
    tc.auto_join,
    tc.visibility,
    tc.created_by,
    tc.created_at,
    tc.colors,
    tc.description
  from
    (
    select
      *
    from
      channels
    where
      id = ${channelId} ) as tc`;

    const channel = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    if (channel && channel.length) {
      return channel
    } else {
      return false
    }
  } catch (err) {
    logger.warn('Err : ', err)
    return false
  }
}

// Add members to channel
async function addMemberstoChannel(channel_id, usersId, role = 'MEMBER') {
  try {
    const arr = usersId.map(user_id => {
      return {
        user_id,
        channel_id,
        status: role
      }
    });

    // Bulk create
    const resp = await UserChannelRelationship.bulkCreate(arr)
    return resp
  } catch (err) {
    logger.warn('Err : ', err)
    return false
  }
}



// Add members to connections
async function addMemberstoConnections(room_id, usersId) {
  try {
    const arr = usersId.map(user_id => {
      return {
        user_id,
        room_id
      }
    })

    // Bulk create
    const resp = await ChannelConnections.bulkCreate(arr)
    return resp
  } catch (err) {
    logger.warn('Err : ', err)
    return false
  }
}

// Fetch single user-channel-relationship
async function getChannelUser(channel_id, user_id) {
  try {
    const channelUser = await UserChannelRelationship.findOne({
      where: {
        channel_id,
        user_id
      }
    })
    if (channelUser && channelUser.id) {
      return channelUser
    } else {
      return false
    }
  } catch (err) {
    logger.warn('Err : ', err)
    return false
  }
}

// Fetch all users of channel
async function getChannelUsers(channel_id) {
  try {
    const users = await User.findAll({
      attributes: SAFE_USER_ATTRIBUTES,
      include: [
        {
          attributes: [],
          model: UserChannelRelationship,
          where: {
            channel_id
          }
        }
      ],
      order: [['username', 'ASC']]
    })
    return users
  } catch (err) {
    logger.warn('Error while fetching channel users : ', err)
    return false
  }
}


// Fetch all non users of channel
async function getChannelNonMembers(channel_id) {
  try {
    const query = `select
    *
  from
    users
  where
    id not in (
    select
      user_id
    from
      "user-channel-relationships"
    where
      channel_id = ${channel_id})`;


    const users = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return users
  } catch (err) {
    logger.warn('Error while fetching channel users : ', err)
    return false
  }
}

async function updateChannelUser(channel_id, user_id, data) {
  try {
    const resp = await UserChannelRelationship.update(data, {
      where: {
        channel_id,
        user_id
      }
    })
    return resp
  } catch (err) {
    logger.warn('Error while updating user-channel relationship : ', err)
    return false
  }
}

async function fetchCommonChannelWithUser(
  workspace_id,
  user_id,
  other_user_id
) {
  try {
    const query = `select
    *
  from
    (
    select
      c.id as id,
      name,
      workspace_id,
      description,
      visibility ,
      auto_join ,
      invite_link ,
      channel_type ,
      active ,
      created_by ,
      created_at ,
      updated_at ,
      colors 
    from
      channels c
    join "user-channel-relationships" ucr on
      ucr.channel_id = c.id
    where
      ucr.user_id = ${user_id}
      and c.workspace_id =${workspace_id}
      and c.channel_type in ('PUBLIC', 'PRIVATE', 'RESTRICTED') ) c1
  join (
    select
      c.id as id
    from
      channels c
    join "user-channel-relationships" ucr on
      ucr.channel_id = c.id
    where
      ucr.user_id = ${other_user_id}
      and c.workspace_id =${workspace_id}
      and c.channel_type in ('PUBLIC', 'PRIVATE', 'RESTRICTED') ) c2 on
    c1.id = c2.id
  
    `;

    const channels = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return channels;

  } catch (err) {
    logger.warn('Error while fetching common channels between users : ', err)
    return false
  }
}

async function addChannelNotes(user_id, channel_id, notes) {
  try {
    const note = await ChannelNotes.create({
      user_id,
      channel_id,
      notes,
      deleted: false
    })
    return note
  } catch (err) {
    logger.warn('Error while adding notes : ', err)
    return false
  }
}

async function updateChannelNotes(id, notes,deleted) {
  try {
    // Update Notes
    await ChannelNotes.update(
      {
        notes,
        updated_at: Date.now(),
        deleted:deleted
      },
      {
        where: {
          id
        }
      }
    )
    return true
  } catch (err) {
    logger.warn('Error while updating notes : ', err)
    return false
  }
}

async function deleteNotes(user_id, channel_id, id) {
  try {
    const notes = await ChannelNotes.update({ deleted: true }, {
      where: {
        user_id,
        channel_id,
        id
      }
    })
    return notes
  } catch (err) {
    logger.warn('Error while deleting notes : ', err)
    return false
  }
}

async function removeNotes(user_id, channel_id, id) {
  try {
    const notes = await ChannelNotes.destroy({
      where: {
        user_id,
        channel_id,
        id
      }
    })
    return notes
  } catch (err) {
    logger.warn('Error while deleting notes : ', err)
    return false
  }
}

async function fetchChannelRoleForUser(channel_id, user_id) {
  try {
    const channelRole = await UserChannelRelationship.findOne({
      attributes: ['status'],
      where: {
        channel_id,
        user_id
      }
    })
    return channelRole
  } catch (err) {
    logger.warn('Error while fetching channel role for user : ', err)
    return false
  }
}

async function removeUserFromChannel(channel_id, user_id) {
  try {
    const resp = await UserChannelRelationship.destroy({
      where: {
        channel_id,
        user_id
      }
    })
    return resp
  } catch (err) {
    logger.warn('Error while removing user from channel : ', err)
    return false
  }
}

async function joinChannelViaInvite(user_id, invite_link) {
  try {
    const channel = await getChannelViaInviteLink(invite_link)
    if (channel) {
      const channelUser = await getChannelUser(channel.id, user_id)
      if (!channelUser) {
        // Add member to channel
        const resp = await addMemberstoChannel(channel.id, [user_id])
        if (resp) {
          return {
            status: 200,
            message: 'User has been joined in the channel'
          }
        } else {
          return {
            status: 500,
            message: 'Error occured while joining channel'
          }
        }
      } else {
        // Member is already in the channel
        return {
          status: 400,
          message: 'User is already member of channel'
        }
      }
    } else {
      return {
        status: 400,
        message: 'No channel found with given invite link'
      }
    }
  } catch (err) {
    logger.warn('Error while joining channel via invite link')
    return {
      status: 500,
      message: 'Error while joining channel via invite link'
    }
  }
}

async function getChannelViaInviteLink(invite_link) {
  try {
    const channel = await Channel.findOne({
      where: {
        invite_link
      }
    })
    return channel
  } catch (err) {
    return false
  }
}

// Search channels
async function searchChannels(searchTerm, workspace_id) {
  try {
    const query = `select
    *,
    (select count(*)from "user-channel-relationships" ucr where channel_id =  t.id )as users_count
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
      c.description,
      c.colors
    from
      channels c
    where
       c.channel_type in ('PUBLIC',
      'PRIVATE',
      'RESTRICTED') and c.name like '%${searchTerm}%' and c.workspace_id = ${workspace_id}
      ) t
    `;

    const channels = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return channels

  } catch (err) {
    logger.warn('error while searching channels : ', err)
  }
}
//find channel with same name exists
async function findChannelWithName(searchTerm, channelId, workspace_id) {
  try {
    let query;
    if (channelId) {
      query = `select count(*) from channels where name = '${searchTerm}' and id != ${channelId} and workspace_id = ${workspace_id}`;

    } else {
      query = `select count(*) from channels where name = '${searchTerm}' and workspace_id =  ${workspace_id}`;
    }

    const channels = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    if (channels[0]['count'] > 0) {
      return true
    }
    return false
    // return channels;

  } catch (err) {
    logger.warn('error while searching channels : ', err)
  }
}
//search channels('PUBLIC', 'PRIVATE') and 'RESTRICTED' only if the user is a memeber of it
async function searchUserChannels(workspace_id, user_id, searchTerm) {
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
      'RESTRICTED') and c.name like '%${searchTerm}%') t 
    where t.status is not null or t.channel_type != 'RESTRICTED' ;`;

    const channels = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return channels
  } catch (err) {
    logger.warn('error while searching channels : ', err)
  }
}

// Delete Channel
async function deleteChannel(channelId) {
  try {
    const deleteResp = await Channel.destroy({
      where: {
        id: {
          [Op.in]: channelId
        },
      }
    })

    // To-do: Delete all other relationship like user-channel

    return deleteResp
  } catch (err) {
    logger.warn('Error while deleting channel : ', err)
    return false
  }
}

// Edit channel
async function updateChannel(channelId, data) {
  try {
    const channel = await Channel.update(data, {
      where: {
        id: channelId
      }
    })
    return channel
  } catch (err) {
    logger.warn('Error while updating channel', err)
    return false
  }
}


// fetch channel notes
async function fetchChannelNotes(channelId, data) {
  try {
    const query = `select cn.*, u.name, u.username, u.profile_image from "channel-notes" as cn
    join users as u on cn.user_id = u.id
    where channel_id  = ${channelId}`
    const channelNotes = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    return channelNotes
  } catch (err) {
    logger.warn('Error while updating channel')
    return false
  }
}



const starConversations = async (channelId, userId, callback) => {
  try {

    var query = `update "user-channel-relationships" set starred = (case when starred = true then false else true end) where channel_id = ${channelId} and user_id =${userId} returning channel_id`;
    var data = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });


    // if (data && !(data[0].length)) {

    //   query = `insert into "user-channel-relationships" (user_id, channel_id, status, starred)  values( ${userId}, ${channelId}, 'MEMBER', true ) returning id  `;
    //   data = await sequelize.query(query, {
    //     type: sequelize.QueryTypes.INSERT
    //   });
    // }
    return callback(null, data);


  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);

  }
}


const muteConversations = async (channelId, userId, callback) => {
  try {

    var query = `update "user-channel-relationships" set muted = (case when muted = true then false else true end)  where channel_id in(${channelId}) and user_id =${userId} returning channel_id`;
    var data = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });


    return callback(null, data);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}

const pinConversations = async (channelId, userId, callback) => {
  try {
    var query = `update "user-channel-relationships" set  pinned = (case when pinned = true then false else true end) where channel_id = ${channelId} and user_id =${userId} returning channel_id`;
    var data = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });
    console.log('channel Id in pinned conversation', data);
    return callback(null, data);
  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);

  }
}



const fetchChannelsForUser = async (userId, workspaceId, callback) => {
  try {

    var query = `select
    distinct u.username as name,
    c.id as channel_id,
    c.channel_type
  from
    users u
  join "user-workspace-relationships" uwr on
    uwr.user_id = u.id
  left join messages m on
    m.sender_id = u.id
    and m.receiver_id = ${userId}
  left join channels c on
    c.id = m.channel_id
  left join "user-channel-relationships" ucr on
    ucr.channel_id = c.id
  where
     message is not null
    and channel_type = 'PERSONAL'
    and uwr.workspace_id = ${workspaceId}
  union (
  select
    channels.name,
    channel_id,
    channel_type
  from
    "user-channel-relationships" ucr
  join channels on
    ucr.channel_id = channels.id
  where
    user_id = ${userId}
    and workspace_id = ${workspaceId}
    and channel_type != 'PERSONAL')
    order by name asc;
  `;
    var data = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });


    return callback(null, data);
    
  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}


//fetch stared conversations

const fetchStarConversations = async (userId, workspaceId, callback) => {
  try {

    const query = `	select
    json_agg( json_build_object('otherUser', (case when t.channel_type != 'PERSONAL' then (select json_build_object( 'id', t.channel_id, 'channel', true, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned, 'username', t.name, 'email', null, 'availability', t.availability, 'name', t.name, 'profile_image', null ) ) else ( select json_build_object( 'id', t.user_id, 'channel', false, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned , 'username', t.username, 'email', t.email, 'availability', t.availability, 'name', t.name, 'profile_image', t.profile_image ) ) end), 'senderDetails', ( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message, 'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id ) ) )) ) as conversations
  from
    ((
    select
      distinct on
      (m.channel_id) message,
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
      u.id =
      (case
        when m.receiver_id = ${userId} then m.sender_id
        else m.receiver_id end)
    left join channels c on
      c.id = m.channel_id
    join "user-channel-relationships" ucr on
      ucr.channel_id = c.id
    where
      m.channel_id in(
      select
        distinct channel_id
      from
        "user-channel-relationships"
      where
        user_id = ${userId}
        and starred = true)
      and m.workspace_id = ${workspaceId}
      and m.deleted = false
      and ucr.user_id = ${userId}
    order by
      m.channel_id,
      m.created_at desc)
  union(
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
    m.channel_id in(
    select
      distinct channel_id
    from
      "user-channel-relationships"
    where
      user_id = ${userId}
      and starred = true)
    and c.workspace_id = ${workspaceId}
    and ucr.user_id = ${userId}
    and c.channel_type != 'PERSONAL'
    and m.deleted = false
  order by
    c.id,
    m.created_at desc)
  order by
  created_at desc) as t ;`;

    const starredConversations = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });



    return callback(null, starredConversations);


  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);

  }
}

const fetchPinConversations = async (userId, workspaceId, callback) => {
  try {

    const query = `select
    json_agg( json_build_object('otherUser', (case when t.channel_type != 'PERSONAL' then (select json_build_object( 'id', t.channel_id, 'channel', true, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned, 'username', t.name, 'email', null, 'availability', t.availability, 'name', t.name, 'profile_image', null ) ) else ( select json_build_object( 'id', t.user_id, 'channel', false, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned , 'username', t.username, 'email', t.email, 'availability', t.availability, 'name', t.name, 'profile_image', t.profile_image ) ) end), 'senderDetails', ( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message, 'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id ) ) )) ) as conversations
  from
    ( (
    select
      distinct on
      (m.channel_id) message,
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
      u.id =
      (case
        when m.receiver_id = ${userId} then m.sender_id
        else m.receiver_id end)
    left join channels c on
      c.id = m.channel_id
    join "user-channel-relationships" ucr on
      ucr.channel_id = c.id
    where
      m.channel_id in(
      select
        distinct channel_id
      from
        "user-channel-relationships"
      where
        user_id = ${userId}
        and pinned = true)
      and m.workspace_id = ${workspaceId}
      and ucr.user_id = ${userId}
      and m.deleted = false
    order by
      m.channel_id,
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
    m.channel_id in(
    select
      distinct channel_id
    from
      "user-channel-relationships"
    where
      user_id = ${userId}
      and pinned = true)
    and c.workspace_id = ${workspaceId}
    and ucr.user_id = ${userId}
    and c.channel_type != 'PERSONAL'
    and m.deleted = false
  order by
    c.id,
    m.created_at desc)
  order by
  created_at desc ) as t ;`;

    const pinnedConversations = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('channel Id in pinned conversation', pinnedConversations);


    return callback(null, pinnedConversations);


  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);

  }
}

const fetchMuteConversations = async (userId, workspaceId, callback) => {
  try {

    const query = ` select
    json_agg( json_build_object('otherUser', (case when t.channel_type != 'PERSONAL' then (select json_build_object( 'id', t.channel_id, 'channel', true, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned, 'username', t.name, 'email', null, 'availability', t.availability, 'name', t.name, 'profile_image', null ) ) else ( select json_build_object( 'id', t.user_id, 'channel', false, 'colors', t.colors, 'channelType', t.channel_type, 'starred', t.starred, 'muted', t.muted, 'pinned', t.pinned , 'username', t.username, 'email', t.email, 'availability', t.availability, 'name', t.name, 'profile_image', t.profile_image ) ) end), 'senderDetails', ( ( select json_build_object( 'id', id, 'channel', false, 'username', username, 'email', email, 'name', name, 'profile_image', profile_image ) from users where id = t.sender_id ) ), 'lastMessage',( select json_build_object('msg_id', t.msg_id, 'reciever_id', t.receiver_id, 'sender_id', t.sender_id, 'channel_id', t.channel_id , 'message', t.message, 'fileDetails', t.file_upload_details, 'messageType', t.message_type, 'created_at', t.created_at, 'unread', (select (unread_msgs_count) from "user-channel-relationships" where user_id = ${userId} and channel_id = t.channel_id ) ) )) ) as conversations
  from
    ( (
    select
      distinct on
      (m.channel_id) message,
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
      u.id =
      (case
        when m.receiver_id = ${userId} then m.sender_id
        else m.receiver_id end)
    left join channels c on
      c.id = m.channel_id
    join "user-channel-relationships" ucr on
      ucr.channel_id = c.id
    where
      m.channel_id in(
      select
        distinct channel_id
      from
        "user-channel-relationships"
      where
        user_id = ${userId}
        and muted = true)
      and m.workspace_id = ${workspaceId}
      and ucr.user_id = ${userId}
      and m.deleted = false
    order by
      m.channel_id,
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
    m.channel_id in(
    select
      distinct channel_id
    from
      "user-channel-relationships"
    where
      user_id = ${userId}
      and muted = true)
    and c.workspace_id = ${workspaceId}
    and ucr.user_id = ${userId}
    and c.channel_type != 'PERSONAL'
    and m.deleted = false
  order by
    c.id,
    m.created_at desc)
  order by
  created_at desc ) as t;`;

    const mutedConversations = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });


    return callback(null, mutedConversations);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}

const fetchSharedFiles = async (channelId, callback) => {
  try {

    const query = `select
    m.*,
    users.name,
    users.username
  from
    messages m
    join users on users.id= m.sender_id
  where
    file_upload_details is not null
    and channel_id = ${channelId}`;

    const files = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });


    return callback(null, files);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err);
  }
}

const changeChannelType = async (channelId, callback) => {
  try {

    const query = `update channels set channel_type = (case when channel_type = 'PUBLIC' then 'PRIVATE' else 'PUBLIC' end)::enum_channels_channel_type where id = ${channelId} returning *`;

    const channel = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });

    return callback(null, channel);

  } catch (err) {
    logger.warn('Err : ', err)
    return callback(err)
  }
}


// fetch channel notes
async function getWorkspaceUsersRelationToAChannel(workspaceId, channelId) {
  try {
    const query = `select
    u.id,
    uwr.workspace_id,
    username,
    u.name,
    u.profile_image,
    u.profile_color,
    u.firebase_id,
    email,
    ucr.status as role
  from
    users u
  join "user-workspace-relationships" uwr on
    u.id = uwr.user_id
  left join "user-channel-relationships" ucr on
    u.id = ucr.user_id
    and ucr.channel_id = ${channelId}
  where
    uwr.workspace_id = ${workspaceId}
    order by ucr.status, username`
    const users = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    })

    return users
  } catch (err) {
    logger.warn('Error while fetching  users')
    return false
  }
}


module.exports = {
  addChannelToWorkspace,
  getTokensByChannelId,
  getChannelById,
  addMemberstoChannel,
  addMemberstoConnections,
  getChannelUser,
  getChannelUsers,
  getChannelNonMembers,
  updateChannelUser,
  fetchCommonChannelWithUser,
  addChannelNotes,
  fetchSharedFiles,
  deleteNotes,
  removeNotes,
  fetchChannelRoleForUser,
  removeUserFromChannel,
  joinChannelViaInvite,
  searchChannels,
  deleteChannel,
  updateChannel,
  updateChannelNotes,
  fetchChannelNotes,
  starConversations,
  muteConversations,
  pinConversations,
  fetchPinConversations,
  fetchStarConversations,
  changeChannelType,
  fetchMuteConversations,
  fetchChannelsForUser,
  getWorkspaceUsersRelationToAChannel,
  searchUserChannels,
  findChannelWithName
}
