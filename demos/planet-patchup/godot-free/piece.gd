extends RigidBody2D

const S := 4.0
const BearingConstraint = preload("res://bearing_constraint.gd")
var ids: Array = []
var origin_center := Vector2.ZERO
var owner_world: Node
var last_impact := -10.0
var previous_velocity := Vector2.ZERO
var previous_angular := 0.0
var previous_contacts := {}
var hinge: Node2D
var bearing_solver := BearingConstraint.new()
var bearing_constraint := {}
var constraint_impulse := {"x": 0.0, "y": 0.0, "angle": 0.0}
var support_id := -1
var anchor_id := -1
var hinge_age := 0.0
var damage := 0.0
var motion_radius := 1.0
var pixel_rects: Array = []
var pixel_shapes: Array = []
var pixel_mesh: Mesh

func configure(world: Node, pixels: Array, parent_piece = null) -> void:
	owner_world = world
	ids = pixels.duplicate()
	var same_geometry: bool = parent_piece != null and ids == parent_piece.ids
	if same_geometry:
		origin_center = parent_piece.origin_center
	else:
		for id in ids:
			origin_center += world.original_point(id)
		origin_center /= ids.size()
	position = origin_center * S
	mass = ids.size() * 0.002
	custom_integrator = true
	center_of_mass_mode = RigidBody2D.CENTER_OF_MASS_MODE_CUSTOM
	center_of_mass = Vector2.ZERO
	linear_damp_mode = RigidBody2D.DAMP_MODE_REPLACE
	angular_damp_mode = RigidBody2D.DAMP_MODE_REPLACE
	linear_damp = 0.24
	angular_damp = 0.24
	continuous_cd = RigidBody2D.CCD_MODE_CAST_SHAPE
	contact_monitor = true
	max_contacts_reported = 32
	var material := PhysicsMaterial.new()
	material.friction = 0.7
	material.bounce = 0.08
	physics_material_override = material
	if same_geometry:
		inertia = parent_piece.inertia
		motion_radius = parent_piece.motion_radius
		pixel_rects = parent_piece.pixel_rects
		pixel_shapes = parent_piece.pixel_shapes
		pixel_mesh = parent_piece.pixel_mesh
	else:
		var moment := 0.0
		for id in ids:
			var local: Vector2 = (world.original_point(id) - origin_center) * S
			moment += 0.008 * (local.length_squared() + S * S / 6.0)
			motion_radius = maxf(motion_radius, local.length() + 0.75 * S)
		inertia = moment
		pixel_rects = world.rectangles(ids)
		for rect in pixel_rects:
			var shape := RectangleShape2D.new()
			shape.size = rect.size * S
			pixel_shapes.append(shape)
	for index in range(pixel_rects.size()):
		var rect: Rect2 = pixel_rects[index]
		var collider := CollisionShape2D.new()
		collider.shape = pixel_shapes[index]
		collider.position = (rect.get_center() - origin_center) * S
		add_child(collider)
	var surface: MeshInstance2D = world.pixel_sprite(ids, origin_center, pixel_rects, pixel_mesh)
	pixel_mesh = surface.mesh
	add_child(surface)
	if parent_piece != null:
		rotation = parent_piece.rotation
		var offset: Vector2 = ((origin_center - parent_piece.origin_center) * S).rotated(rotation)
		position = parent_piece.position + offset
		linear_velocity = parent_piece.linear_velocity + Vector2(-offset.y, offset.x) * parent_piece.angular_velocity
		angular_velocity = parent_piece.angular_velocity
		damage = parent_piece.damage
		last_impact = parent_piece.last_impact
		set_meta("blackhole_rubbing_time", parent_piece.get_meta("blackhole_rubbing_time", 0.0))
	previous_velocity = linear_velocity
	previous_angular = angular_velocity

func pixel_position(id: int) -> Vector2:
	return (position + ((owner_world.original_point(id) - origin_center) * S).rotated(rotation)) / S

func pixel_velocity(id: int) -> Vector2:
	var r: Vector2 = ((owner_world.original_point(id) - origin_center) * S).rotated(rotation)
	return (linear_velocity + Vector2(-r.y, r.x) * angular_velocity) / S

func limit_motion() -> void:
	var travel := linear_velocity.length() + absf(angular_velocity) * motion_radius
	var cap := 180.0 * S
	if travel > cap:
		linear_velocity *= cap / travel
		angular_velocity *= cap / travel

func solve_bearing(state: PhysicsDirectBodyState2D) -> void:
	if not is_instance_valid(hinge) or bearing_constraint.is_empty():
		return
	var before: Vector2 = state.transform.origin / S
	var angle := state.transform.get_rotation()
	# Matter projects the pose after gravity/damping and velocity integration.
	var predicted: Vector2 = before + state.linear_velocity * state.step / S
	var predicted_angle := angle + state.angular_velocity * state.step
	var body := {"position": {"x": float(predicted.x), "y": float(predicted.y)}, "positionPrev": {"x": float(before.x), "y": float(before.y)}, "angle": float(predicted_angle), "inverseMass": 1.0 / mass, "inverseInertia": S * S / inertia, "constraintImpulse": constraint_impulse}
	for pass_index in range(2):
		bearing_solver.phase(body, bearing_constraint, 4, minf(1, state.step * 60))
	var after := Vector2(body.position.x, body.position.y)
	var previous_after := Vector2(body.positionPrev.x, body.positionPrev.y)
	# Godot performs velocity integration next; start at the damped previous pose.
	state.transform = Transform2D(angle, previous_after * S)
	state.linear_velocity = (after - previous_after) * S / state.step
	state.angular_velocity = (body.angle - angle) / state.step
	var travel := state.linear_velocity.length() + absf(state.angular_velocity) * motion_radius
	if travel > 180 * S:
		state.linear_velocity *= 180 * S / travel
		state.angular_velocity *= 180 * S / travel

func _integrate_forces(state: PhysicsDirectBodyState2D) -> void:
	if owner_world == null or owner_world.paused:
		return
	owner_world.perf.begin(owner_world.perf.COLLISION)
	_integrate_forces_unprofiled(state)
	owner_world.perf.end()

func _integrate_forces_unprofiled(state: PhysicsDirectBodyState2D) -> void:
	if owner_world == null or owner_world.paused:
		return
	state.integrate_forces()
	var patches := {}
	var contacts := {}
	for i in range(state.get_contact_count()):
		var key := "%d:%d:%d" % [state.get_contact_collider_id(i), state.get_contact_local_shape(i), state.get_contact_collider_shape(i)]
		contacts[key] = true
		if not patches.has(key):
			var other_id := state.get_contact_collider_id(i)
			var local_shape := state.get_contact_local_shape(i)
			var other_shape := state.get_contact_collider_shape(i)
			var pair_key := "%d:%d:%d:%d" % [get_instance_id(), local_shape, other_id, other_shape] if get_instance_id() < other_id else "%d:%d:%d:%d" % [other_id, other_shape, get_instance_id(), local_shape]
			patches[key] = {"points": [], "normal": state.get_contact_local_normal(i), "other": state.get_contact_collider_object(i), "other_v": state.get_contact_collider_velocity_at_position(i), "impulse": 0.0, "pair_key": pair_key}
		patches[key].points.append(state.get_contact_local_position(i))
		patches[key].impulse += absf(state.get_contact_impulse(i).dot(patches[key].normal)) / (S * 60)
	for patch in patches.values():
		var points: Array = []
		var center := Vector2.ZERO
		for q in patch.points:
			points.append(q / S)
			center += q / (S * patch.points.size())
		var arm: Vector2 = center * S - state.transform.origin
		var velocity: Vector2 = state.linear_velocity + Vector2(-arm.y, arm.x) * state.angular_velocity
		var other_velocity: Vector2 = patch.other_v
		if patch.other is RigidBody2D:
			var other_arm: Vector2 = center * S - patch.other.position
			other_velocity = patch.other.linear_velocity + Vector2(-other_arm.y, other_arm.x) * patch.other.angular_velocity
		owner_world.pending_contacts.append({"piece": self, "other": patch.other if patch.other is RigidBody2D else null, "collider": patch.other, "normal": patch.normal, "points": points, "point": center, "normal_impulse": patch.impulse, "relative_velocity": (velocity - other_velocity) / S, "friction": 0.7, "pair_key": patch.pair_key})
	var best := {}
	var static_best := {}
	var own_ready: bool = owner_world.elapsed - last_impact >= 0.15
	for key in patches:
		# Fracture consumes collisionStart; wear/support retain continuing manifolds above.
		if previous_contacts.has(key):
			continue
		var patch: Dictionary = patches[key]
		var contact := Vector2.ZERO
		for q in patch.points:
			contact += q / patch.points.size()
		var normal: Vector2 = patch.normal
		var arm: Vector2 = contact - state.transform.origin
		var own_v := previous_velocity + Vector2(-arm.y, arm.x) * previous_angular
		var other_v: Vector2 = patch.other_v
		var inverse: float = 1.0 / mass + pow(arm.cross(normal), 2) / inertia
		var other = patch.other
		if other is RigidBody2D:
			var other_arm: Vector2 = contact - other.position
			inverse += 1.0 / other.mass + pow(other_arm.cross(normal), 2) / other.inertia
			if other.get("previous_velocity") != null:
				other_v = other.previous_velocity + Vector2(-other_arm.y, other_arm.x) * other.previous_angular
		var speed := maxf(0.0, -(own_v - other_v).dot(normal)) / S
		if speed < 4 or inverse <= 0:
			continue
		var recipients := 2 if other == owner_world.static_body or other is RigidBody2D else 1
		var energy := 0.5 / (inverse * 0.002) * pow(minf(speed, 180) / 60.0, 2) / recipients
		var segments: Array = []
		var static_segments: Array = []
		for candidate_key in patches:
			var candidate: Dictionary = patches[candidate_key]
			if not previous_contacts.has(candidate_key) and absf(candidate.normal.dot(normal)) >= 0.7:
				var segment := {"a": candidate.points[0] / S, "b": candidate.points[-1] / S}
				segments.append(segment)
				if candidate.other == owner_world.static_body:
					static_segments.append(segment)
		var hit := {"piece": self, "source_piece": self, "source_normal": normal, "source_velocity": own_v / S, "other_velocity": other_v / S, "other": other if other is RigidBody2D else null, "collider": other, "point": contact / S, "speed": speed, "energy": energy, "normal": normal, "segments": segments.slice(0, 16), "downward": normal.y < -0.35 and own_v.y / S > 14}
		if own_ready and (best.is_empty() or energy > best.energy):
			best = hit
		if other == owner_world.static_body and (static_best.is_empty() or energy > static_best.energy):
			static_best = hit.duplicate()
			static_best.piece = null
			static_best.normal = -normal
			static_best.downward = false
			static_best.segments = static_segments.slice(0, 16)
	if not best.is_empty():
		best.chain_context = owner_world.chain_physics.prepare(best)
		owner_world.pending_impacts.append(best)
	if not static_best.is_empty():
		static_best.chain_context = owner_world.chain_physics.prepare(static_best)
		owner_world.pending_impacts.append(static_best)
	previous_contacts = contacts
	solve_bearing(state)
	limit_motion()
	previous_velocity = state.linear_velocity
	previous_angular = state.angular_velocity
