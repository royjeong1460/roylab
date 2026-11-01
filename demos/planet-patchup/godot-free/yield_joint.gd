extends RefCounted

# Angular constitutive law from arch/jointed-world.js; translation uses Godot's pin solver.
const S := 4.0
const FREQUENCY := 3.0
const DAMPING := 0.85
const CREEP := 0.06
const FATIGUE := 0.22
const BREAK_ANGLE := PI / 6.0

var upper
var lower
var cuts: Array = []
var section: Dictionary = {}
var id := 0
var phase := "yielding"
var pending := true
var damage := 0.0
var age := 0.0
var rest := 0.0
var initial_angle := 0.0
var utilization := 0.0
var constraint: PinJoint2D
var world: Node

func configure(owner_world: Node, seam: Dictionary, load_section: Dictionary, number: int) -> void:
	world = owner_world
	upper = seam.upper
	lower = seam.lower
	cuts = seam.cuts
	section = load_section.duplicate(true)
	id = number
	initial_angle = upper.rotation - lower.rotation
	utilization = section.utilization
	connect_joint()

func endpoint(piece, endpoint_ids: Array, side: float) -> Vector2:
	var point := Vector2.ZERO
	var count := 0
	for pixel_id in endpoint_ids:
		if piece.ids.has(pixel_id):
			point += piece.pixel_position(pixel_id)
			count += 1
	if count == 0:
		return Vector2(INF, INF)
	return point / count + Vector2(-sin(piece.rotation), cos(piece.rotation)) * side * 0.5

func connect_joint() -> bool:
	disconnect_joint()
	if not is_instance_valid(upper) or not is_instance_valid(lower):
		return false
	var upper_ids: Array = []
	var lower_ids: Array = []
	for cut in cuts:
		upper_ids.append(cut.id)
		lower_ids.append(cut.id + world.width)
	var a := endpoint(lower, lower_ids, -1.0)
	var b := endpoint(upper, upper_ids, 1.0)
	if not a.is_finite() or not b.is_finite():
		return false
	constraint = PinJoint2D.new()
	world.add_child(constraint)
	# A native pin has one common anchor; the source uses two material endpoints.
	constraint.global_position = world.to_global((a + b) * 0.5 * S)
	constraint.node_a = constraint.get_path_to(lower)
	constraint.node_b = constraint.get_path_to(upper)
	constraint.softness = 0.2
	constraint.disable_collision = false
	pending = false
	return true

func disconnect_joint() -> void:
	if is_instance_valid(constraint):
		constraint.node_a = NodePath()
		constraint.node_b = NodePath()
		constraint.queue_free()
	constraint = null

func load_ratio(supported: Dictionary) -> float:
	if not supported.has(lower):
		return 0.0
	var mass_sum: float = lower.mass + upper.mass
	var center: float = (lower.position.x * lower.mass + upper.position.x * upper.mass) / mass_sum / S
	var foot: float = lower.hinge.position.x / S if is_instance_valid(lower.hinge) else lower.position.x / S
	var lever := absf(center - foot)
	var ratio: float = float(upper.ids.size() + lower.ids.size()) / section.load
	var axial: float = section.axialUtilization * ratio * absf(cos(lower.rotation))
	var bending: float = maxf(0.0, section.utilization - section.axialUtilization) * ratio * lever / maxf(0.5, absf(section.signedLever))
	return axial + bending

func advance(dt: float, supported: Dictionary) -> String:
	if phase != "yielding" or pending or not is_instance_valid(lower) or not is_instance_valid(upper):
		return ""
	var angle: float = upper.rotation - lower.rotation - initial_angle
	var omega: float = upper.angular_velocity - lower.angular_velocity
	age += dt
	utilization = load_ratio(supported)
	var overload := maxf(0.0, utilization - 1.0)
	damage = minf(1.0, damage + dt * (FATIGUE * overload + 0.2 * maxf(0.0, (absf(angle) - 0.04) / 0.45)))
	if damage >= 1.0 or absf(angle) >= BREAK_ANGLE:
		return "load-fatigue" if damage >= 1.0 else "bend-limit"
	var creep := CREEP * overload * dt
	rest += clampf(angle - rest, -creep, creep)
	var inverse_inertia: float = 1.0 / lower.inertia + 1.0 / upper.inertia
	if inverse_inertia <= 0.0:
		return ""
	var effective_inertia := 1.0 / inverse_inertia
	# Source torque/inertia in ms² becomes angular acceleration in seconds².
	var spring := effective_inertia * FREQUENCY * FREQUENCY * (1.0 - 0.75 * damage)
	var damping := 2.0 * DAMPING * effective_inertia * FREQUENCY
	var torque: float = -spring * (angle - rest) - damping * omega
	# Bodies use a custom integrator; apply the source angular acceleration explicitly.
	lower.angular_velocity -= torque / lower.inertia * dt
	upper.angular_velocity += torque / upper.inertia * dt
	lower.sleeping = false
	upper.sleeping = false
	return ""

func event(kind: String, reason := "") -> Dictionary:
	var point: Vector2 = lower.position / S if is_instance_valid(lower) else Vector2.ZERO
	if is_instance_valid(constraint):
		point = world.to_local(constraint.global_position) / S
	var angle: float = upper.rotation - lower.rotation - initial_angle if is_instance_valid(upper) and is_instance_valid(lower) else 0.0
	return {"kind": kind, "x": point.x, "y": point.y, "time": world.elapsed, "joint": id, "reason": reason, "age": age, "angle": angle, "damage": damage, "utilization": utilization}

func release(reason: String) -> Dictionary:
	var result := event("joint-release", reason)
	disconnect_joint()
	phase = "separated"
	pending = false
	return result
