extends RigidBody2D

const S := 4.0
const BearingConstraint = preload("res://bearing_constraint.gd")
const BoundaryGuard = preload("res://boundary_guard.gd")
var ids: Array = []
var origin_center := Vector2.ZERO
var owner_world: Node
var last_impact := -10.0
var previous_velocity := Vector2.ZERO
var previous_angular := 0.0
var previous_contacts := {}
var hinge: Node2D
var bearing_solver := BearingConstraint.new()
var boundary_guard := BoundaryGuard.new()
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
var _native_contacts = ClassDB.instantiate("PPContactKernel")

func configure(world: Node, pixels: Array, parent_piece = null) -> void:
	owner_world = world
	ids = pixels.duplicate()
	var same_geometry: bool = parent_piece != null and ids == parent_piece.ids
	var geometry: Dictionary = {}
	if same_geometry:
		origin_center = parent_piece.origin_center
	else:
		geometry = world.native_pixels.body_geometry(ids, world._original_points)
		origin_center = geometry.center
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
		inertia = geometry.moment
		motion_radius = geometry.radius
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
	boundary_guard.setup(self, world, pixel_rects, origin_center, parent_piece.boundary_guard if same_geometry else null)

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
	if boundary_guard.constrain(state, self):
		# Contacts from the old escaped pose must not create a phantom impact.
		limit_motion()
		previous_velocity = state.linear_velocity
		previous_angular = state.angular_velocity
		return
	var contact_result: Dictionary = _native_contacts.sample(self, state, owner_world, previous_contacts, previous_velocity, previous_angular, last_impact)
	owner_world.pending_contacts.append_array(contact_result.pending)
	var best: Dictionary = contact_result.best
	var static_best: Dictionary = contact_result.static_best
	var contacts: Dictionary = contact_result.contacts
	if not best.is_empty():
		best.chain_context = owner_world.chain_physics.prepare(best)
		owner_world.pending_impacts.append(best)
	if not static_best.is_empty():
		static_best.chain_context = owner_world.chain_physics.prepare(static_best)
		owner_world.pending_impacts.append(static_best)
	previous_contacts = contacts
	solve_bearing(state)
	limit_motion()
	boundary_guard.constrain(state, self)
	previous_velocity = state.linear_velocity
	previous_angular = state.angular_velocity
