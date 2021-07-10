const { ExceptionList } = require('../models');
const logger = require('../logger');

exports.updateExceptionList = async ({
  userIds = [], channelIds = [], exceptionerid, workspace_id
}) => {
  try {

    const mappedData = []

    channelIds.map(channelid => mappedData.push({
      workspace_id,
      channelid,
      userId: null,
      exceptionerid
    }));

    userIds.map(userid => mappedData.push({
      workspace_id,
      channelId: null,
      userid,
      exceptionerid
    }));
    await ExceptionList.destroy({ where: { exceptionerid } })
    const list = await ExceptionList.bulkCreate(mappedData)
    return list

  } catch (error) {
    logger.warn('Error while adding exceptionlist', error)
    return false
  }
}

exports.getExceptionList = async ({ exceptionerid, workspace_id }) => {
  try {
    return await ExceptionList.findAll({
      where: {
        exceptionerid, workspace_id
      }
    })
  } catch (error){
    logger.warn('Error while fetching exceptionlist', error)
    return false
  }
}