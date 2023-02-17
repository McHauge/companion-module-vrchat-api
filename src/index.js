const instance_skel = require('../../../instance_skel')
const { updateVariableDefinitions, updateVariables } = require('./variables')
const vrchat = require('vrchat')

class instance extends instance_skel {
	/**
	 * Create an instance of the module
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config)

		this.data = {
			login: false,
			authType: [''],
			onlineUsers: 0,
			user: {
				displayName: 'NaN',
				name: 'NaN',
				id: 'NaN',
				state: 'NaN',
				status: 'NaN',
				statusDescription: 'NaN',
			},
			instance: {
				id: 'NaN',
				instanceId: 'NaN',
				worldId: 'NaN',
				type: 'NaN',
				name: 'NaN',
				shortName: 'NaN',
				ownerId: 'NaN',
				capacity: 0,
				occupants: 0,
				full: false,
				region: 'NaN',
			},
			world: {
				id: 'NaN',
				name: 'NaN',
				description: 'NaN',
				authorId: 'NaN',
				authorName: 'NaN',
				releaseStatus: 'NaN',
				visits: 0,
				publicOccupants: 0,
				privateOccupants: 0,
				occupants: 0,
			},
			notifications: {
				inviteCounts: {
					all: 0,
					staff: 0,
					dancer: 0,
					vip: 0,
					guest: 0,
				},
			},
		}

		this.configuration = new vrchat.Configuration({
			username: this.config.username,
			password: this.config.password,
			apiKey: this.config.apiKey,
		})

		// Custom Variables Handling
		this.customVariables = {}
		system.emit('custom_variables_get', this.updateCustomVariables)
		system.on('custom_variables_update', this.updateCustomVariables)

		this.actions() // export actions
		this.updateVariables = updateVariables
		this.updateVariableDefinitions = updateVariableDefinitions
	}

	updateCustomVariables = (variables) => {
		this.customVariables = variables
		this.actions()
	}

	updateConfig(config) {
		this.config = config
		this.actions()
		this.updateVariableDefinitions()

		this.configuration = new vrchat.Configuration({
			username: this.config.username,
			password: this.config.password,
			apiKey: this.config.apiKey,
		})

		this.init()
	}

	async login(data, configuration) {
		await this.AuthenticationApi.getCurrentUser(configuration).then((resp_Login) => {
			if (resp_Login.data.requiresTwoFactorAuth != null) {
				resp_Login.data.requiresTwoFactorAuth.forEach((element) => {
					switch (element) {
						case 'emailOtp':
							this.log('warn', 'Email 2FA Required')
							console.log('Email 2FA Required')
							break
						case 'totp':
							this.log('warn', 'Authenticator 2FA Required')
							console.log('Authendicator 2FA Required')
							break
						default:
							this.log('warn', 'Unknown 2FA Type Required')
							console.log('Other 2FA Required')
							break
					}
					this.data.authType = resp_Login.data.requiresTwoFactorAuth // store the Auth Type for later use
					data.login = false

					this.status(this.STATUS_ERROR, 'Missing 2FA Auth')
					this.log('error', 'Please Send 2FA Action with the new valid code')
					return data
				})
			} else if (resp_Login.data != null) {
				console.log('Login Success')
				data.login = true
				data.user.name = resp_Login.data.username
				data.user.displayName = resp_Login.data.displayName
				data.user.id = resp_Login.data.id
				data.user.status = resp_Login.data.status
				data.user.statusDescription = resp_Login.data.statusDescription
			}
		})
		return data
	}

	async getCurrentOnlineUsers(data, configuration) {
		let resp_UserCount = await this.SystemApi.getCurrentOnlineUsers(configuration.apiKey).catch((err) => {
			this.log('error', err.message)
			console.log(err)
		})
		data.onlineUsers = resp_UserCount.data
		this.log('info', `Online Users: ${data.onlineUsers}`)
		return data
	}

	async getCurrentInstanceID(data) {
		if (data.login == false) {
			return data
		}
		let resp_User = await this.UsersApi.getUser(data.user.id).catch((err) => {
			this.log('error', err.message)
			console.log(err)
		})
		data.user.state = resp_User.data.state
		data.instance.worldId = resp_User.data.worldId
		data.instance.instanceId = resp_User.data.instanceId
		return data
	}

	async getInstanceInfo(data) {
		if (data.login == false) {
			return data
		}
		if (
			data.instance.worldId == 'NaN' ||
			data.instance.instanceId == 'NaN' ||
			data.instance.worldId === 'offline' ||
			data.instance.instanceId == 'offline'
		) {
			return data
		}
		let resp_Instance = await this.InstancesApi.getInstance(data.instance.worldId, data.instance.instanceId).catch(
			(err) => {
				this.log('error', err.message)
				console.log(err)
			}
		)
		// console.log(resp_Instance.data)
		let d = resp_Instance.data
		data.instance = {
			id: d.id,
			instanceId: d.instanceId,
			worldId: d.worldId,
			type: d.type,
			name: d.name,
			shortName: d.shortName,
			ownerId: d.ownerId,
			capacity: d.capacity,
			occupants: d.n_users,
			full: d.full,
			region: d.region,
		}

		return data
	}

	async getWorldInfo(data) {
		if (data.login == false) {
			return data
		}
		if (data.user.state === 'offline' || data.instance.worldId == 'offline') {
			return data
		}
		let resp_World = await this.WorldsApi.getWorld(data.instance.worldId).catch((err) => {
			this.log('error', err.message)
			console.log(err)
		})
		// console.log(resp_World.data)
		let d = resp_World.data
		data.world = {
			id: d.id,
			name: d.name,
			description: d.description,
			authorId: d.authorId,
			authorName: d.authorName,
			releaseStatus: d.releaseStatus,
			visits: d.visits,
			publicOccupants: d.publicOccupants,
			privateOccupants: d.privateOccupants,
			occupants: d.occupants,
		}

		return data
	}

	// Depricated in the API:
	// async getUserByName(UserName) {
	// 	let resp_User = await this.UsersApi.getUserByName(UserName).catch((err) => {
	// 		this.log('error', err.message)
	// 		console.log(err)
	// 	})
	// 	this.data.user.state = resp_User.data.state
	// 	return resp_User.data
	// }

	async init() {
		this.status(1, 'Connecting')
		this.actions()
		// this.init_feedbacks()
		// initPresets.bind(this)()
		this.updateVariableDefinitions()
		// vrchat.AuthenticationApiFp
		this.AuthenticationApi = new vrchat.AuthenticationApi(this.configuration)
		this.UsersApi = new vrchat.UsersApi(this.configuration)
		this.SystemApi = new vrchat.SystemApi(this.configuration)
		this.NotificationsApi = new vrchat.NotificationsApi(this.configuration)
		this.InviteApi = new vrchat.InviteApi(this.configuration)
		this.InstancesApi = new vrchat.InstancesApi(this.configuration)
		this.WorldsApi = new vrchat.WorldsApi(this.configuration)
		this.FriendsApi = new vrchat.FriendsApi(this.configuration)

		if (this.config.username != '' && this.config.password != '' && this.config.apiKey != '') {
			this.data = await this.getCurrentOnlineUsers(this.data, this.configuration)
			this.data = await this.login(this.data, this.configuration)

			if (this.data.login == true) {
				this.data = await this.getCurrentInstanceID(this.data)
				this.data = await this.getInstanceInfo(this.data)
				this.data = await this.getWorldInfo(this.data)
				this.status(this.STATE_OK)
				this.updateVariables()
				this.log('info', 'Logged in as ' + this.data.user.name)
			} else {
				this.log('error', 'Error Logging In')
				console.log('Error Logging In')
			}
			console.log(this.data)
		} else {
			this.log('error', 'Username, Password or API Key is missing')
			this.status(this.STATUS_ERROR, 'Missing username, password or API key')
		}

		// Get test data from a user
		// let resp_User = await this.UsersApi.getUserByName("McHauge").catch(err => {this.log('error', err.message)})
		// console.log(resp_User.data)
	}

	// Return config fields for web config
	config_fields() {
		return [
			{
				type: 'text',
				id: 'loginInfo',
				width: 12,
				value:
					'This module only supports logging in with a username and password. If you have 2FA enabled, you will not be able to use this module without disabeling it first.',
			},
			{
				type: 'textinput',
				id: 'username',
				label: 'Username',
				width: 6,
			},
			{
				type: 'textinput',
				id: 'password',
				label: 'Password',
				width: 6,
			},
			{
				type: 'text',
				id: 'keyInfo',
				width: 12,
				value:
					'The API Key has always been the same and is filled out by default, if this ever changes you can find it here (https://vrchatapi.github.io/docs/api/#overview) and change it.',
			},
			{
				type: 'textinput',
				id: 'apiKey',
				label: 'API Key',
				default: 'JlE5Jldo5Jibnk5O5hTx6XVqsJu4WJ26',
				width: 12,
			},
		]
	}

	// When module gets deleted
	destroy() {
		this.debug('destroy')
		this.system.removeListener('custom_variables_update', this.updateCustomVariables)
	}

	actions() {
		this.setActions({
			InviteUser: {
				label: 'Invite User',
				options: [
					{
						type: 'textinput',
						id: 'userId',
						label: 'User ID Only (usr_)',
						default: '',
					},
					{
						type: 'dropdown',
						label: 'Instance',
						id: 'cmd',
						default: 'current',
						choices: [
							{ id: 'current', label: 'Current Instance' },
							{ id: 'specific', label: 'Specific Instance' },
						],
					},
					{
						type: 'textinput',
						id: 'worldId',
						label: 'Specific World ID',
						default: '',
					},
					{
						type: 'textinput',
						id: 'instanceId',
						label: 'Specific Instance ID',
						default: '',
					},
				],
			},
			AcceptAllJoinRequest: {
				label: 'Accept Join Requests',
				description: 'Gets all notifications and accept all "request invite" notifications',
				options: [
					{
						type: 'number',
						label: 'Max Notifications To Check',
						id: 'maxNotifications',
						default: 100,
						min: 1,
						max: 1000,
					},
					{
						type: 'multiselect',
						label: 'Count Invites Variable',
						id: 'invCountType',
						default: 'none',
						choices: [
							{ id: 'all', label: 'All / Total' },
							{ id: 'staff', label: 'Staff' },
							{ id: 'dancer', label: 'Dancers' },
							{ id: 'vip', label: 'VIP / Patreon / Bosters' },
							{ id: 'guest', label: 'Guests' },
						],
					},
					{
						type: 'checkbox',
						label: 'Ignore Message',
						id: 'ignoreMessage',
						default: true,
					},
					{
						type: 'textinput',
						id: 'message',
						label: 'Specific Request Message',
						default: '',
					},
					{
						type: 'dropdown',
						label: 'Instance',
						id: 'cmd',
						default: 'current',
						choices: [
							{ id: 'current', label: 'Current Instance' },
							{ id: 'specific', label: 'Specific Instance' },
						],
					},
					{
						type: 'textinput',
						id: 'worldId',
						label: 'Specific World ID',
						default: '',
					},
					{
						type: 'textinput',
						id: 'instanceId',
						label: 'Specific Instance ID',
						default: '',
					},
				],
			},
			AcceptAllFriendRequests: {
				label: 'Accept Friend Request',
				description: 'Gets all notifications and accept all "friend requests", if selected',
				options: [
					{
						type: 'dropdown',
						label: 'Behavior',
						id: 'cmd',
						default: 'all',
						choices: [
							{ id: 'all', label: 'All Requests' },
							{ id: 'specific', label: 'Specific' },
						],
					},
					{
						type: 'textinput',
						id: 'notificationID',
						label: 'Specific Notification ID',
						default: '',
					},
					{
						type: 'number',
						label: 'Max Notifications To Check',
						id: 'maxNotifications',
						default: 100,
						min: 1,
						max: 1000,
					},
				],
			},
			UpdateStatus: {
				label: 'Update Status',
				options: [
					{
						type: 'dropdown',
						label: 'Online Status',
						id: 'cmd',
						default: 'active',
						choices: [
							{ id: 'join me', label: 'join me' },
							{ id: 'active', label: 'Active' },
							{ id: 'ask me', label: 'Ask Me' },
							{ id: 'busy', label: 'Busy' },
							{ id: 'offline', label: 'Offline' },
						],
					},
				],
			},
			UpdateStatusDescription: {
				label: 'Update Status Description',
				options: [
					{
						type: 'textinput',
						id: 'cmd',
						label: 'Description',
						default: 'Join Me',
					},
				],
			},
			UpdateBio: {
				label: 'Update Bio',
				options: [
					{
						type: 'textinput',
						id: 'cmd',
						label: 'Description',
						default: 'Hi there!',
					},
				],
			},
			UpdateBioLinks: {
				label: 'Update Bio Links',
				options: [
					{
						type: 'textinput',
						id: 'link1',
						label: 'Link 1',
						default: '',
					},
					{
						type: 'textinput',
						id: 'link2',
						label: 'Link 2',
						default: '',
					},
					{
						type: 'textinput',
						id: 'link3',
						label: 'Link 3',
						default: '',
					},
				],
			},
			TotalUsersOnline: {
				label: 'Pull Total Users Online',
			},
			GetInstanceInfo: {
				label: 'Pull Instance Info',
			},
			GetCurentUserInfo: {
				label: 'Pull Current User Info',
			},
			GetCurentWorldInfo: {
				label: 'Pull Current World Info',
			},
			GetFriends: {
				label: 'Get Friends',
				description: 'Get all friends from VRChat, not super useful but nice for debugging',
				options: [
					{
						type: 'number',
						label: 'Max Friends To Get',
						id: 'maxFriends',
						default: 100,
						min: 1,
						max: 1000,
					},
					{
						type: 'dropdown',
						label: 'Friend Status',
						id: 'offline',
						default: 'all',
						choices: [
							{ id: 'all', label: 'All' },
							{ id: 'false', label: 'Online/Web' },
							{ id: 'true', label: 'Offline' },
						],
					},
				],
			},
			GetNotifications: {
				label: 'Get Notifications',
				description: 'Get notifications from VRChat, not super useful but nice for debugging',
				options: [
					{
						type: 'number',
						label: 'Max Notifications To Get',
						id: 'maxNotifications',
						default: 100,
						min: 1,
						max: 1000,
					},
				],
			},
			ClearAllNotifications: {
				label: 'Clear All Notifications',
			},
			ClearInviteVariables: {
				label: 'Clear Invite Variables',
				description: 'Rest the invite variables to 0',
				options: [
					{
						type: 'multiselect',
						label: 'Variables to Clear',
						id: 'invCountType',
						default: 'all',
						choices: [
							{ id: 'all', label: 'All / Total' },
							{ id: 'staff', label: 'Staff' },
							{ id: 'dancer', label: 'Dancers' },
							{ id: 'vip', label: 'VIP / Patreon / Bosters' },
							{ id: 'guest', label: 'Guests' },
						],
					},
					{
						type: 'number',
						label: 'Value to set',
						id: 'value',
						default: 0,
						min: 0,
						max: 100,
					},
				],
			},
			Send2FACode: {
				label: 'Send 2FA Code',
				description: 'Send 2FA code, can be E-mail, Authenticator or Recovery Code.',
				options: [
					{
						type: 'textinput',
						id: 'code',
						label: '2FA Code',
						default: '',
					},
				],
			}
		})
	}

	async action(action) {
		var opt = action.options
		let instanceMessage = {}

		if (action.action == 'Send2FACode' && this.data.login == false) {
			let rawCode = {
				code: opt.code,
			}

			if (this.data.authType != []) {
				this.data.authType.forEach((element) => {
					if (this.data.login == true) {
						this.log('Info', 'Already Logged In')
						console.log('Already Logged In')
						return
					}
					if (rawCode.code == '') {
						this.log('warn', 'Missing 2FA Code')
						console.log('Missing 2FA Code')
						this.data.login = false
					}
					switch (element) {
						case 'emailOtp':
							this.log('warn', 'Email 2FA Required')
							console.log('Email 2FA Required')
							this.AuthenticationApi.verify2FAEmailCode(rawCode, this.configuration).catch((err) => {
								console.log("Wrong Code")
								console.log(err)
							}).then((resp) => {
								console.log(resp.data)
								if (resp.data.verified == true) {
									console.log("Logged In")
									this.data.login = true
									this.status(this.STATUS_OK, 'Logged In')
									this.log('info', 'Logged In')
									this.init()
								}
							})
							break
						case 'totp':
							this.log('warn', 'Authenticator 2FA Required')
							console.log('Authendicator 2FA Required')
							this.AuthenticationApi.verify2FA(rawCode, this.configuration).catch((err) => {
								console.log("Wrong Code")
								console.log(err)
							}).then((resp) => {
								console.log(resp.data)
								if (resp.data.verified == true) {
									console.log("Logged In")
									this.data.login = true
									this.status(this.STATUS_OK, 'Logged In')
									this.log('info', 'Logged In')
									this.init()
								}
							})
							break
						default:
							this.log('warn', 'Unknown 2FA Type Required')
							console.log('Other 2FA Required')
							this.AuthenticationApi.verifyRecoveryCode(rawCode, this.configuration).catch((err) => {
								console.log("Wrong Code")
								console.log(err)
							}).then((resp) => {
								console.log(resp.data)
								if (resp.data.verified == true) {
									console.log("Logged In")
									this.data.login = true
									this.status(this.STATUS_OK, 'Logged In')
									this.log('info', 'Logged In')
									this.init()
								}
							})
							break
					}
				})
			}
			this.updateVariables()
			return
		} else if (action.action == 'Send2FACode' && this.data.login == true) {
			this.log('warn', 'Already Logged In: 2FA Code Not Sent')
			console.log('Already Logged In')
			this.updateVariables()
			return
		}

		// Check if logged in
		if (this.data.login == false) {
			this.log('warn', 'Not Logged In: Action Aborted')
			this.updateVariables()
			return
		}

		switch (action.action) {
			case 'InviteUser':
				if (opt.cmd == 'specific' && opt.worldId != '' && opt.instanceId != '') {
					instanceMessage = {
						instanceId: opt.worldId + ':' + opt.instanceId,
					}
				} else {
					this.data = await this.getCurrentInstanceID(this.data)
					instanceMessage = {
						instanceId: this.data.instance.worldId + ':' + this.data.instance.instanceId,
					}
				}

				let user = opt.userId
				if (!user.includes('usr_')) {
					this.log.error('User ID must start with "usr_"')
					console.log('User ID must start with "usr_"')
					return

					// Depricated:
					// let raw_user = await this.getUserByName(user)
					// user = raw_user.id
				}

				this.InviteApi.inviteUser(user, instanceMessage)
					.then((resp) => {
						this.debug(resp.data)
						this.log('info', 'Invite Sent to ' + user)
					})
					.catch((err) => {
						this.log('error', err.message)
					})
				break
			case 'AcceptAllJoinRequest':
				if (opt.cmd == 'specific' && opt.worldId != '' && opt.instanceId != '') {
					instanceMessage = {
						instanceId: opt.worldId + ':' + opt.instanceId,
					}
				} else {
					this.data = await this.getCurrentInstanceID(this.data)
					instanceMessage = {
						instanceId: this.data.instance.worldId + ':' + this.data.instance.instanceId,
					}
				}

				let count = 0 // stores the number of invites accepted

				for (let i = 0; i < opt.maxNotifications; i += 100) {
					await this.NotificationsApi.getNotifications(undefined, undefined, undefined, undefined, 100, i)
						.then((resp) => {
							resp.data.forEach((notification) => {
								if (notification.type === vrchat.NotificationType.RequestInvite) {
									console.log(
										notification.senderUserId,
										' ',
										notification.senderUsername,
										' ',
										JSON.parse(notification.details)
									)

									let optMessage = opt.message.toLowerCase()

									if (
										optMessage != '' &&
										opt.ignoreMessage == false &&
										JSON.parse(notification.details).requestMessage != undefined
									) {
										// specific message
										let val = JSON.parse(notification.details)
										let valMsg = val.requestMessage.toLowerCase()
										if (valMsg == optMessage) {
											count++
											this.InviteApi.inviteUser(notification.senderUserId, instanceMessage)
												.then((resp) => {
													// this.debug(resp.data)
													this.log('info', 'Accepted Join Request From: ' + notification.senderUsername + ' ' + valMsg)
													this.NotificationsApi.deleteNotification(notification.id) // Might not be needed
												})
												.catch((err) => {
													this.log('error', err.message)
													console.log(err)
												})
										}
									} else if (opt.ignoreMessage == false) {
										// only with no message
										if (notification.details == '{}') {
											count++
											this.InviteApi.inviteUser(notification.senderUserId, instanceMessage)
												.then((resp) => {
													// this.debug(resp.data)
													this.log('info', 'Accepted Join Request From: ' + notification.senderUsername)
													this.NotificationsApi.deleteNotification(notification.id) // Might not be needed
												})
												.catch((err) => {
													this.log('error', err.message)
													console.log(err)
												})
										}
									} else {
										// Any request
										count++
										this.InviteApi.inviteUser(notification.senderUserId, instanceMessage)
											.then((resp) => {
												// this.debug(resp.data)
												this.log('info', 'Accepted Join Request From: ' + notification.senderUsername)
												this.NotificationsApi.deleteNotification(notification.id) // Might not be needed
											})
											.catch((err) => {
												this.log('error', err.message)
												console.log(err)
											})
									}
								}
							})
						})
						.catch((err) => {
							this.log('error', err.message)
						})
				}

				console.log('Invite Count: ' + count)

				if (count > 0) {
					let i = this.data.notifications.inviteCounts

					opt.invCountType.forEach((invType) => {
						switch (invType) {
							case 'all':
								this.log('info', 'Accepted ' + count + ' Join Requests, All Users')
								i.all = count + i.all
								break
							case 'staff':
								this.log('info', 'Accepted ' + count + ' Join Requests, Staff')
								i.staff = count + i.staff
								break
							case 'dancer':
								this.log('info', 'Accepted ' + count + ' Join Requests, Dancers')
								i.dancer = count + i.dancer
								break
							case 'vip':
								this.log('info', 'Accepted ' + count + ' Join Requests, VIPs')
								i.vip = count + i.vip
								break
							case 'guest':
								this.log('info', 'Accepted ' + count + ' Join Requests, Guests')
								i.guest = count + i.guest
								break

							default:
								this.log('info', 'Accepted ' + count + ' Join Requests')
								break
						}
					})
					console.log(this.data.notifications.inviteCounts)
					this.updateVariables()
				}

				break
			case 'AcceptAllFriendRequests':
				for (let i = 0; i < opt.maxNotifications; i += 100) {
					this.NotificationsApi.getNotifications(undefined, undefined, undefined, undefined, 100, i)
						.then((resp) => {
							if (opt.cmd === 'all') {
								resp.data.forEach((notification) => {
									if (notification.type === vrchat.NotificationType.FriendRequest) {
										this.NotificationsApi.acceptFriendRequest(notification.id)
											.then((resp) => {
												this.debug(resp.data)
												this.log('info', 'Accepted Friend Request From: ' + notification.senderUsername)
												this.NotificationsApi.deleteNotification(notification.id) // Might not be needed
											})
											.catch((err) => {
												this.log('error', err.message)
												console.log(err)
											})
									}
								})
							} else if (opt.cmd === 'specific') {
								this.NotificationsApi.acceptFriendRequest(opt.notificationID)
									.then((resp) => {
										this.debug(resp.data)
										this.log('info', 'Accepted Friend Request From: ' + notification.senderUsername)
										this.NotificationsApi.deleteNotification(opt.notificationID) // Might not be needed
									})
									.catch((err) => {
										this.log('error', err.message)
										console.log(err)
									})
							}
						})
						.catch((err) => {
							this.log('error', err.message)
						})
				}
				break
			case 'UpdateStatus':
				this.UsersApi.updateUser(this.data.user.id, { status: opt.cmd })
					.then((resp) => {
						this.debug(resp.data)

						this.data.user.name = resp.data.username
						this.data.user.displayName = resp.data.displayName
						this.data.user.id = resp.data.id
						this.data.user.state = resp.data.state
						this.data.user.status = resp.data.status
						this.data.user.statusDescription = resp.data.statusDescription
						this.updateVariables()
					})
					.catch((err) => {
						this.log('error', err.message)
					})
				this.log('info', 'Status updated to: ' + opt.cmd)
				break
			case 'UpdateStatusDescription':
				this.UsersApi.updateUser(this.data.user.id, { statusDescription: opt.cmd })
					.then((resp) => {
						this.debug(resp.data)

						this.data.user.name = resp.data.username
						this.data.user.displayName = resp.data.displayName
						this.data.user.id = resp.data.id
						this.data.user.state = resp.data.state
						this.data.user.status = resp.data.status
						this.data.user.statusDescription = resp.data.statusDescription
						this.updateVariables()
					})
					.catch((err) => {
						this.log('error', err.message)
					})
				this.log('info', 'Status description updated to: ' + opt.cmd)
				break
			case 'UpdateBio':
				this.UsersApi.updateUser(this.data.user.id, '{ "bio": "' + opt.cmd + '" }')
					.then((resp) => {
						this.debug(resp.data)

						this.data.user.name = resp.data.username
						this.data.user.displayName = resp.data.displayName
						this.data.user.id = resp.data.id
						this.data.user.state = resp.data.state
						this.data.user.status = resp.data.status
						this.data.user.statusDescription = resp.data.statusDescription
						this.updateVariables()
					})
					.catch((err) => {
						this.log('error', err.message)
					})
				this.log('info', 'Updating bio to: ' + opt.cmd)
				break
			case 'UpdateBioLinks':
				this.UsersApi.updateUser(
					this.data.user.id,
					'{ "bioLinks": ["' + opt.link1 + '","' + opt.link2 + '","' + opt.link3 + '"] }'
				)
					.then((resp) => {
						this.debug(resp.data)

						this.data.user.name = resp.data.username
						this.data.user.displayName = resp.data.displayName
						this.data.user.id = resp.data.id
						this.data.user.state = resp.data.state
						this.data.user.status = resp.data.status
						this.data.user.statusDescription = resp.data.statusDescription
						this.updateVariables()
					})
					.catch((err) => {
						console.log(resp.data)
						this.log('error', err.message)
					})
				this.log('info', 'Bio Links Updated to: ' + opt.link1 + ', ' + opt.link2 + ', ' + opt.link3)
				break
			case 'TotalUsersOnline':
				this.data = await this.getCurrentOnlineUsers(this.data, this.configuration)
				break
			case 'GetInstanceInfo':
				this.data = await this.getCurrentInstanceID(this.data)
				this.data = await this.getInstanceInfo(this.data)
				this.log('info', 'Pulled Instance Info')
				break
			case 'GetCurentUserInfo':
				this.data = await this.login(this.data, this.configuration)
				this.data = await this.getCurrentInstanceID(this.data)
				this.log('info', 'Pulled Current User Info')
				break
			case 'GetCurentWorldInfo':
				this.data = await this.login(this.data, this.configuration)
				this.data = await this.getWorldInfo(this.data)
				this.log('info', 'Pulled Current User Info')
				break
			case 'GetFriends':
				if (opt.offline == 'all') {
					for (let i = 0; i < opt.maxFriends; i += 100) {
						this.FriendsApi.getFriends(i, 100, false)
							.then((resp) => {
								resp.data.forEach((friend) => {
									console.log(friend.id, ' ', friend.displayName, ' ', friend.status, '', friend.location)
								})
								this.log('info', 'Pulled Friends, check console for details')
							})
							.catch((err) => {
								this.log('error', err.message)
							})
					}
					for (let i = 0; i < opt.maxFriends; i += 100) {
						this.FriendsApi.getFriends(i, 100, true)
							.then((resp) => {
								resp.data.forEach((friend) => {
									console.log(friend.id, ' ', friend.displayName, ' ', friend.status, '', friend.location)
								})
								this.log('info', 'Pulled Friends, check console for details')
							})
							.catch((err) => {
								this.log('error', err.message)
							})
					}
				} else {
					for (let i = 0; i < opt.maxFriends; i += 100) {
						this.FriendsApi.getFriends(i, 100, opt.offline)
							.then((resp) => {
								resp.data.forEach((friend) => {
									console.log(friend.id, ' ', friend.displayName, ' ', friend.status, '', friend.location)
								})
								this.log('info', 'Pulled Friends, check console for details')
							})
							.catch((err) => {
								this.log('error', err.message)
							})
					}
				}
				break
			case 'GetNotifications':
				for (let i = 0; i < opt.maxNotifications; i += 100) {
					this.NotificationsApi.getNotifications(undefined, undefined, undefined, undefined, 100, i)
						.then((resp) => {
							// console.log(resp.data)
							resp.data.forEach((notification) => {
								console.log(
									notification.senderUserId,
									' ',
									notification.senderUsername,
									' ',
									notification.type,
									'',
									JSON.parse(notification.details)
								)
							})
							this.log('info', 'Pulled Notifications, check console for details')
						})
						.catch((err) => {
							this.log('error', err.message)
						})
				}
				break
			case 'ClearAllNotifications':
				this.NotificationsApi.clearNotifications()
					.then((resp) => {
						this.debug(resp.data)
						this.log('info', 'All Notifications Cleared')
					})
					.catch((err) => {
						this.log('error', err.message)
					})
				break
			case 'ClearInviteVariables':
				let i = this.data.notifications.inviteCounts

				opt.invCountType.forEach((invType) => {
					switch (invType) {
						case 'all':
							i.all = opt.value
							break
						case 'staff':
							i.staff = opt.value
							break
						case 'dancer':
							i.dancer = opt.value
							break
						case 'vip':
							i.vip = opt.value
							break
						case 'guest':
							i.guest = opt.value
							break

						default:
							break
					}
				})
				console.log(this.data.notifications.inviteCounts)
				break
		}

		this.updateVariables()
	}
}
exports = module.exports = instance
