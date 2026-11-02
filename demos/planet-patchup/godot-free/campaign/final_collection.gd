extends RefCounted

# Actual grain IDs remain the ledger; a bounded sample is drawn by World.
var world
var active := false
var age := 0.0

func setup(source) -> void:
	world = source

func begin() -> void:
	active = true
	world.grain_physics.reset()

func step(center: Vector2, dt: float, remaining: float, target_remaining: float) -> void:
	age += dt
	var kept: Array = []
	var count := 0
	var samples: Array = []
	for grain in world.grains:
		if not grain.has("recovery_from"):
			grain.recovery_from = grain.p
			grain.recovery_birth = age
			var spread := float((int(grain.id) * 7919) % 1009) / 1009.0
			grain.recovery_delay = maxf(0.0, target_remaining - 1.0) * spread if age <= dt + 0.000001 else 0.12 * spread
			grain.recovery_life = minf(0.7, maxf(0.08, remaining - float(grain.recovery_delay)))
			grain.rest = false
		var t := clampf((age - float(grain.recovery_birth) - float(grain.recovery_delay)) / float(grain.recovery_life), 0.0, 1.0)
		if t >= 1.0:
			if not world.collected.has(grain.id):
				world.collected[grain.id] = true
				count += 1
				if samples.size() < 8:
					samples.append({"x": center.x, "y": center.y, "color": int(world.colors[grain.id])})
			continue
		grain.p = grain.recovery_from.lerp(center, t * t)
		grain.recovery_visibility = clampf((1.0 - t) * 4.0, 0.0, 1.0)
		kept.append(grain)
	world.grains = kept
	world.grain_roster_revision += 1
	if count > 0:
		world.events.append({"kind": "collect", "source": "final", "count": count, "x": center.x, "y": center.y, "samples": samples, "time": world.elapsed})
