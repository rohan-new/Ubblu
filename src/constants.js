'use strict'

module.exports = {
  SAFE_USER_ATTRIBUTES: [
    'id',
    'username',
    'email',
    'name',
    'profile_image',
    'timezone',
    'availability',
    'note',
    'created_at',
    'profile_color',
    'firebase_id',
    'is_cookie',
    'cloud_storage'
  ],
  SAFE_WORKSPACE_ATTRIBUTES: [
    'id',
    'name',
    'description',
    'active',
    'created_at',
    'updated_at'
  ],
  SAFE_CHANNEL_ATTRIBUTES: [
    'id',
    'name',
    'description',
    'channel_type',
    'invite_link',
    'visibility',
    'created_by',
    'auto_join',
    'created_at',
    'colors',
    'channel_type'
  ],
  SAFE_DEPARTMENT_ATTRIBUTES: ['id', 'name', 'created_at', 'default'],
  SAFE_USERMETA_ATTRIBUTES: ['role'],
  SAFE_CONVERSATION_ATTRIBUTES: [
    'id',
    'user_id',
    'workspace_id',
    'notes',
    'is_muted',
    'is_tagged',
    'is_starred'
  ],
  // WEB_URL: 'http://app.ubblu.ga/',
  WEB_URL: 'http://app.ubblu.ga/',
  // WEB_URL: 'http://localhost:3010/',
  BUCKET_URL: 'https://ubblu.s3.ap-south-1.amazonaws.com/'
}
