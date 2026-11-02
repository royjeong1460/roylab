extends RefCounted

# World.random's unsigned 32-bit LCG, shared by sand and paid Aftershock.
var seed := 301

func randf() -> float:
	seed = (seed * 1664525 + 1013904223) & 0xffffffff
	return float(seed) / 4294967296.0

# Affine LCG jump: the result is identical to count calls to randf().
var _jumps: Dictionary = {}

func _mul32(a: int, b: int) -> int:
	# 16-bit limbs keep intermediate products inside signed 64-bit range.
	return ((a & 65535) * (b & 65535) + ((((a >> 16) * (b & 65535) + (a & 65535) * (b >> 16)) & 65535) << 16)) & 0xffffffff

func advance(count: int) -> void:
	if count <= 0:
		return
	if not _jumps.has(count):
		if _jumps.size() >= 256:
			_jumps.clear()
		var multiplier := 1
		var offset := 0
		var a := 1664525
		var c := 1013904223
		var remaining := count
		while remaining > 0:
			if remaining & 1:
				multiplier = _mul32(multiplier, a)
				offset = (_mul32(offset, a) + c) & 0xffffffff
			c = _mul32(a + 1, c)
			a = _mul32(a, a)
			remaining >>= 1
		_jumps[count] = [multiplier, offset]
	var jump: Array = _jumps[count]
	seed = (_mul32(seed, int(jump[0]) & 0xffffffff) + int(jump[1])) & 0xffffffff
