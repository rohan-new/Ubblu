'use strict'

const chai = require('chai')
const expect = chai.expect
const request = require('supertest')
const bcrypt = require('bcrypt')

const { User, Workspace } = require('../src/models/index')
const app = require('../src/app')

const URI_BASE = '/api/v1/users'

describe('User Controller', () => {
  beforeEach(() => {
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

  it('should allow an user to register and create a personal workspace', async () => {
    const {
      body: { data, errors, success }
    } = await request(app)
      .post(`${URI_BASE}/register`)
      .send({
        username: 'hello',
        password: 'Hunter2!',
        email: 'hello@ubblu.com'
      })
      .expect(201)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.user.username).to.equal('hello')
    expect(data.user.email).to.equal('hello@ubblu.com')
    expect(data.user.password).to.equal(undefined)

    const user = await User.findOne({
      where: {
        id: data.user.id
      }
    })

    expect(user.username).to.equal('hello')
    expect(user.password).not.to.equal('Hunter2!')
    expect(user.email).to.equal('hello@ubblu.com')
    expect(user.id).to.equal(data.user.id)

    // Should have created a personal workspace for the user
    const personalWorkspace = await Workspace.findOne({
      where: {
        created_by: user.id
      }
    })

    expect(personalWorkspace).not.to.equal(undefined)
    expect(personalWorkspace.workspace_type).to.equal('PERSONAL')
  })

  it('should allow an user to login with username', async () => {
    // Create a dummy user in database
    await User.create({
      username: 'hello',
      email: 'hello@ubblu.com',
      password: await bcrypt.hash('Hunter2!', 10)
    })

    const {
      body: { data, errors, success }
    } = await request(app)
      .post(`${URI_BASE}/login`)
      .send({
        username: 'hello',
        password: 'Hunter2!'
      })
      .expect(200)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.user.username).to.equal('hello')
    expect(data.user.email).to.equal('hello@ubblu.com')
    expect(data.user.password).to.equal(undefined)
  })

  it('should allow an user to login with email', async () => {
    // Create a dummy user in database
    await User.create({
      username: 'hello',
      email: 'hello@ubblu.com',
      password: await bcrypt.hash('Hunter2!', 10)
    })

    const {
      body: { data, errors, success }
    } = await request(app)
      .post(`${URI_BASE}/login`)
      .send({
        email: 'hello@ubblu.com',
        password: 'Hunter2!'
      })
      .expect(200)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.user.username).to.equal('hello')
    expect(data.user.email).to.equal('hello@ubblu.com')
    expect(data.user.password).to.equal(undefined)
  })

  it('should get user profile with valid token', async () => {
    // Create a dummy user in database
    await User.create({
      username: 'hello',
      email: 'hello@ubblu.com',
      password: await bcrypt.hash('Hunter2!', 10)
    })

    const resp = await request(app)
      .post(`${URI_BASE}/login`)
      .send({
        username: 'hello',
        password: 'Hunter2!'
      })
      .expect(200)

    const {
      body: { data, success, errors }
    } = await request(app)
      .get(`${URI_BASE}/me`)
      .set({
        Authorization: resp.body.data.token
      })
      .expect(200)

    expect(success).to.equal(true)
    expect(errors).to.equal(undefined)
    expect(data.user.username).to.equal('hello')
    expect(data.user.email).to.equal('hello@ubblu.com')
    expect(data.user.password).to.equal(undefined)
  })

  it('should throw on invalid username for login', async () => {
    const {
      body: { errors, success }
    } = await request(app)
      .post(`${URI_BASE}/login`)
      .send({
        username: 'hello',
        password: 'Hunter2!'
      })
      .expect(404)

    expect(success).to.equal(false)
    expect(errors[0]).to.equal('Username/email does not exist')
  })

  it('should throw on invalid email for login', async () => {
    const {
      body: { errors, success }
    } = await request(app)
      .post(`${URI_BASE}/login`)
      .send({
        email: 'hello@ubblu.com',
        password: 'Hunter2!'
      })
      .expect(404)

    expect(success).to.equal(false)
    expect(errors[0]).to.equal('Username/email does not exist')
  })

  it('should throw on invalid password', async () => {
    // Create a dummy user in database
    await User.create({
      username: 'hello',
      email: 'hello@ubblu.com',
      password: await bcrypt.hash('invalid', 10)
    })

    const {
      body: { errors, success }
    } = await request(app)
      .post(`${URI_BASE}/login`)
      .send({
        username: 'hello',
        password: 'Hunter2!'
      })
      .expect(400)

    expect(success).to.equal(false)
    expect(errors[0]).to.equal('Invalid password')
  })
})
