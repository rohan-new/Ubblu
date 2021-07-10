'use strict'

const chai = require('chai')
const expect = chai.expect
const request = require('supertest')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const {
  User,
  Workspace,
  UserWorkspaceRelationship
} = require('../src/models/index')
const app = require('../src/app')

const URI_BASE = '/api/v1/workspaces'

const dummyUser = {
  username: 'hello',
  email: 'hello@ubblu.com',
  password: bcrypt.hashSync('Hunter2!', 10)
}

const createDummyUser = async () => {
  const user = await User.create(dummyUser)
  user.workspace = await Workspace.create({
    name: 'PERSONAL',
    workspace_type: 'PERSONAL',
    created_by: user.id
  })

  user.token = await jwt.sign(
    {
      user_id: user.id,
      timestamp: Date.now() / 1000
    },
    '12345'
  )

  await UserWorkspaceRelationship.create({
    user_id: user.id,
    workspace_id: user.workspace.id,
    status: 'SUPERADMIN'
  })

  return user
}

describe('Workspace Controller', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = '12345'
    // Clear database before each test
    User.destroy({
      where: {},
      truncate: true
    })

    Workspace.destroy({
      where: {},
      truncate: true
    })
  })

  it(`should return user's personal workspace`, async () => {
    const user1 = await createDummyUser()

    const {
      body: { data, errors, success }
    } = await request(app)
      .get(`${URI_BASE}/personal`)
      .set({
        Authorization: user1.token
      })
      .expect(200)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.workspace.id).to.equal(user1.workspace.id)
    expect(data.workspace.creator.id).to.equal(user1.id)
    expect(data.workspace.creator.username).to.equal(user1.username)
    expect(data.workspace.creator.password).to.equal(undefined)
  })

  it(`should allow to create a public workspace`, async () => {
    const user1 = await createDummyUser()

    const {
      body: { data, errors, success }
    } = await request(app)
      .post(`${URI_BASE}/`)
      .set({
        Authorization: user1.token
      })
      .send({
        name: 'Hello'
      })
      .expect(201)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.workspace.created_by).to.equal(user1.id)
    expect(data.workspace.name).to.equal('Hello')
  })

  it(`should return a workspace by id`, async () => {
    const user1 = await createDummyUser()

    const createResponse = await request(app)
      .post(`${URI_BASE}/`)
      .set({
        Authorization: user1.token
      })
      .send({
        name: 'Hello'
      })
      .expect(201)

    const {
      body: { data, errors, success }
    } = await request(app)
      .get(`${URI_BASE}/${createResponse.body.data.workspace.id}`)
      .set({
        Authorization: user1.token
      })
      .expect(200)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.workspace.created_by).to.equal(user1.id)
    expect(data.workspace.name).to.equal('Hello')
  })
})
