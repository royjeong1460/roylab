extends RefCounted

const GameSkin = preload("res://app/skin.gd")

const TOP := 54.0

static func controls_height(viewport_size: Vector2, _finishing := false) -> float:
	var preferred := 100.0 if GameSkin.bright() else 108.0 if viewport_size.y < 420.0 else 128.0
	return minf(preferred, maxf(0.0, viewport_size.y - TOP - 1.0))

static func play_area(safe_rect: Rect2, finishing := false) -> Rect2:
	return Rect2(safe_rect.position + Vector2(0, TOP), Vector2(safe_rect.size.x,
		maxf(1.0, safe_rect.size.y - TOP - controls_height(safe_rect.size,finishing))))
