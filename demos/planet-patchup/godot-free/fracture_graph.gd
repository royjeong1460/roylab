extends PPFractureGraph

# Keep the preload-based static helper available during GDScript compilation.
static func bond_key(a: int, b: int, count: int) -> int:
	return mini(a, b) * count + maxi(a, b)
