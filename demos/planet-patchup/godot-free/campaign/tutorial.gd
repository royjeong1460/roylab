extends RefCounted

const L10n = preload("res://app/localization.gd")

var stage := "aim"
var elapsed := 0.0
var pending := false
var target := Vector2.ZERO

func attack(point: Vector2, accepted: bool) -> void:
	if stage == "aim" and accepted:
		target = point
		pending = true
		elapsed = 0.0

func update(dt: float, _collected: int, has_debris: bool) -> void:
	elapsed += dt
	if stage == "aim" and pending:
		if has_debris:
			stage = "collapse"
			elapsed = 0.0
			pending = false
		elif elapsed > 1.5:
			pending = false
	elif stage == "collapse" and elapsed >= 2.5:
		stage = "collect"
		elapsed = 0.0
	elif stage == "collect" and elapsed >= 3.0:
		stage = "work"
		elapsed = 0.0

func skip() -> void:
	stage = "done"
	pending = false

func title() -> String:
	return L10n.text({"aim":"1 · Blast a column","collapse":"2 · Watch it collapse","collect":"3 · Use the remaining battery","work":"Keep breaking fragments"}.get(stage,""))

func copy(_touch := true) -> String:
	return L10n.text({
		"aim":"Tap the marked column and release without moving. Each blast uses battery.",
		"collapse":"Weak columns cannot carry the weight above.",
		"collect":"Loose scrap gathers automatically when the battery runs out.",
		"work":"Mint-colored scrap is ready to recover."
	}.get(stage,""))
