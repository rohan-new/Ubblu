const { Department, UserWorkspaceRelationship, sequelize } = require('../models/index')
const logger = require('./../logger')

async function insertDepartment(data) {
  try {
    const department = await Department.create(data)
    return department
  } catch (err) {
    logger.warn('Error while adding department', err)
    return false
  }
}

async function updateDepartment(where, data) {
  try {
    const department = await Department.update(data, {
      where
    })
    return department
  } catch (err) {
    logger.warn('Error while updating department')
    return false
  }
}


async function updateAllDepartments(workspaceId) {
  try {
    const query = `UPDATE departments set "default" = false where workspace_id = ${workspaceId}`
    const department = await sequelize.query(query, {
      type: sequelize.QueryTypes.UPDATE
    });
    return department
  } catch (err) {
    console.log('Error while updating department', err)
    return false
  }
}

async function findDepartmentByName(name, workspaceId) {
  try {
    const query = `select * from  departments where name = '${name}' and  workspace_id = ${workspaceId}`
    const department = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return department
  } catch (err) {
    console.log('Error while updating department', err)
    return false
  }
}

async function countUserByDepartmentId(department_id) {
  try {
    const count = await UserWorkspaceRelationship.count({
      where: {
        department_id
      }
    })
    return count
  } catch (err) {
    logger.warn('Error while counting users for particular department : ', err)
    return false
  }
}

async function deleteDepartment(department_id) {
  try {
    const resp = await Department.destroy({
      where: {
        id: department_id
      }
    })
    return resp
  } catch (err) {
    logger.warn('Error occured while deleting department :', err)
    return false
  }
}

async function addUserToDepartment(userIds, workspace_id, department_id) {
  try {
    const resp = await userIds.map(async user_id => {
      return await UserWorkspaceRelationship.update(
        {
          department_id
        },
        {
          where: {
            user_id,
            workspace_id
          }
        }
      )
    })
    return resp
  } catch (err) {
    logger.warn('Error occured while adding user to department :', err)
    return false
  }
}

async function fetchDefaultDepartmentForAWorkspaceId(workspace_id) {
  try {
    const query = `select id from departments where "default" = true and workspace_id = ${workspace_id} limit 1`
    const department = sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    return department
  } catch (err) {
    logger.warn('Error occured while adding user to department :', err)
    return false
  }
}

module.exports = {
  insertDepartment,
  updateDepartment,
  updateAllDepartments,
  countUserByDepartmentId,
  deleteDepartment,
  addUserToDepartment,
  fetchDefaultDepartmentForAWorkspaceId,
  findDepartmentByName
}
