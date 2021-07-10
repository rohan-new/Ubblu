'use strict'

const express = require('express')
const router = express.Router()

const { workspaceSuperAdminIsAllowed } = require('./../../middlewares/auth')
const logger = require('./../../logger')
const { sendError, sendResponse } = require('./../../utils/http')

const { getWorkspaceDepartment } = require('./../../helpers/workspace')
const {
  insertDepartment,
  updateDepartment,
  updateAllDepartments,
  countUserByDepartmentId,
  deleteDepartment,
  addUserToDepartment,
  findDepartmentByName
} = require('./../../helpers/department')

// Get all departments of workspace
router.get('/', async (req, res) => {
  try {
    const departments = await getWorkspaceDepartment(req.workspace.id)
    return sendResponse(res, {
      code: 200,
      data: {
        status: 1,
        message: 'Department found',
        departments
      }
    })
  } catch (err) {
    logger.warn('Error in get department listing : ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while fetching department',
        err
      }
    })
  }
})

// Insert Department
router.post('/', workspaceSuperAdminIsAllowed, async (req, res) => {
  try {
    const checkForSimilarNameDepartment = await findDepartmentByName(req.body.name, req.workspace.id);
    console.log('kisssssssssssssssssssssssss', checkForSimilarNameDepartment)
    if (checkForSimilarNameDepartment && checkForSimilarNameDepartment.length) {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Department with same name already exists'
        }
      })
    }
    const department = await insertDepartment({
      name: req.body.name,
      workspace_id: req.workspace.id,
      created_by: req.user.id,
      default: false
    })
    if (department) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Department has been added',
          department
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error while adding department'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while adding department: ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while adding department',
        err
      }
    })
  }
})

// Tested and working
// Update Department
router.put('/:departmentId', workspaceSuperAdminIsAllowed, async (req, res) => {
  try {
    if (req.body.default) {
      const updatedAllDepartments = await updateAllDepartments(req.workspace.id);
    }
    const department = await updateDepartment(
      {
        workspace_id: req.workspace.id,
        id: req.params.departmentId,
        // created_by: req.user.id
      },
      {
        name: req.body.name,
        default: req.body.default

      }
    )
    if (department) {
      return sendResponse(res, {
        code: 200,
        data: {
          status: 1,
          message: 'Department has been updated'
        }
      })
    } else {
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error while updating department'
        }
      })
    }
  } catch (err) {
    logger.warn('Error while adding department: ', err)
    return sendError(res, {
      code: 500,
      error: {
        status: 0,
        message: 'Error while adding department',
        err
      }
    })
  }
})

router.delete(
  '/:departmentId',
  workspaceSuperAdminIsAllowed,
  async (req, res) => {
    try {
      // Check for user associated with department
      const count = await countUserByDepartmentId(req.params.departmentId)
      if (count === false) {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while deleting department'
          }
        })
      } else if (count > 1) {
        return sendError(res, {
          code: 400,
          error: {
            status: 0,
            message: "Can't delete department as department is having user"
          }
        })
      } else {
        // Delete department
        const resp = await deleteDepartment(req.params.departmentId)
        if (resp) {
          return sendResponse(res, {
            code: 200,
            data: {
              status: 1,
              message: 'Department has been deleted'
            }
          })
        } else {
          return sendError(res, {
            code: 500,
            error: {
              status: 0,
              message: 'Error occured while deleting department'
            }
          })
        }
      }
    } catch (err) {
      logger.warn('Error while deleting department : ', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while deleting department',
          err
        }
      })
    }
  }
)

// Add users to departmemt
router.post(
  '/:departmentId/addUsers',
  workspaceSuperAdminIsAllowed,
  async (req, res) => {
    try {
      const resp = await addUserToDepartment(
        req.body.userIds,
        req.workspace.id,
        req.params.departmentId
      )
      if (resp) {
        return sendResponse(res, {
          code: 200,
          data: {
            status: 1,
            message: 'User has been added to department'
          }
        })
      } else {
        return sendError(res, {
          code: 500,
          error: {
            status: 0,
            message: 'Error occured while adding user to department'
          }
        })
      }
    } catch (err) {
      logger.warn('Error occured while adding user to department:', err)
      return sendError(res, {
        code: 500,
        error: {
          status: 0,
          message: 'Error occured while deleting department',
          err
        }
      })
    }
  }
)

module.exports = router
