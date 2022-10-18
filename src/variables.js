exports.updateVariableDefinitions = function () {
	const variables = []

	variables.push(
		{ label: `Online Users`, name: `onlineUsers` },
		{ label: `Display Name`, name: `user_displayName` },
		{ label: `User Name`, name: `user_name` },
		{ label: `User ID`, name: `user_id` },
		{ label: `User State`, name: `user_state` },
		{ label: `User Status`, name: `user_status` },
		{ label: `User Status Description`, name: `user_statusDescription` },
		{ label: `Ins ID`, name: `ins_id` },
		{ label: `Ins World ID`, name: `ins_worldId` },
		{ label: `Ins Instance ID`, name: `ins_instanceId` },
		{ label: `Ins Type`, name: `ins_type` },
		{ label: `Ins Name`, name: `ins_name` },
		{ label: `Ins Short Name`, name: `ins_shortName` },
		{ label: `Ins Owner ID`, name: `ins_ownerId` },
		{ label: `Ins Capacity`, name: `ins_capacity` },
		{ label: `Ins Occupants`, name: `ins_occupants` },
		{ label: `Ins Full`, name: `ins_full` },
		{ label: `Ins Region`, name: `ins_region` },
		{ label: `World Name`, name: `wor_name` },
		{ label: `World Description`, name: `wor_description` },
		{ label: `World Author Id`, name: `wor_authorId` },
		{ label: `World Author Name`, name: `wor_authorName` },
		{ label: `World Release Status`, name: `wor_releaseStatus` },
		{ label: `World Visits`, name: `wor_visits` },
		{ label: `World Occupants`, name: `wor_occupants` },
		{ label: `World Public Occupants`, name: `wor_publicOccupants` },
		{ label: `World Private Occupants`, name: `wor_privateOccupants` }
	)

	this.setVariableDefinitions(variables)
	this.updateVariables()
}

exports.updateVariables = function () {
	let d = this.data
	let u = d.user
	let i = d.instance
	let w = d.world

	this.setVariable(`onlineUsers`, d.onlineUsers)
	this.setVariable(`user_displayName`, u.displayName)
	this.setVariable(`user_name`, u.name)
	this.setVariable(`user_id`, u.id)
	this.setVariable(`user_state`, u.state)
	this.setVariable(`user_status`, u.status)
	this.setVariable(`user_statusDescription`, u.statusDescription)
	this.setVariable(`ins_id`, i.id)
	this.setVariable(`ins_worldId`, i.worldId)
	this.setVariable(`ins_instanceId`, i.instanceId)
	this.setVariable(`ins_type`, i.type)
	this.setVariable(`ins_name`, i.name)
	this.setVariable(`ins_shortName`, i.shortName)
	this.setVariable(`ins_ownerId`, i.ownerId)
	this.setVariable(`ins_capacity`, i.capacity)
	this.setVariable(`ins_occupants`, i.occupants)
	this.setVariable(`ins_full`, i.full)
	this.setVariable(`ins_region`, i.region)
	this.setVariable(`wor_name`, w.name)
	this.setVariable(`wor_description`, w.description)
	this.setVariable(`wor_authorId`, w.authorId)
	this.setVariable(`wor_authorName`, w.authorName)
	this.setVariable(`wor_releaseStatus`, w.releaseStatus)
	this.setVariable(`wor_visits`, w.visits)
	this.setVariable(`wor_occupants`, w.occupants)
	this.setVariable(`wor_publicOccupants`, w.publicOccupants)
	this.setVariable(`wor_privateOccupants`, w.privateOccupants)
}
