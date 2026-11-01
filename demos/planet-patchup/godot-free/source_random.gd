extends RefCounted

# World.random's unsigned 32-bit LCG, shared by sand and paid Aftershock.
var seed := 301

func randf() -> float:
	seed = (seed * 1664525 + 1013904223) & 0xffffffff
	return float(seed) / 4294967296.0
