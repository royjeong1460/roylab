extends Node

var settings: Dictionary = {"haptics":true}
var cooldown := 0.0
var attack_cooldown := 0.0
var collected := 0
var collection_tier := 0

func setup(source_settings: Dictionary) -> void:
	settings=source_settings

func process_events(events: Array, dt: float, collected_total: int, active := true) -> void:
	var gained := collected_total>collected
	if collected_total<collected:
		collection_tier=0
	collected=collected_total
	var starting := false
	var tier := 0
	var attack := false
	for event in events:
		var kind: String = event.get("kind","")
		if kind=="collection-start":
			starting=true
		elif kind=="collection-tier":
			var candidate := int(event.get("tier",0))
			if candidate in [70,80,90,100]:
				tier=maxi(tier,candidate)
		elif kind=="collect":
			gained=true
		elif kind=="tool-blast" and event.get("phase","")=="blast" or kind=="tool-gravity" and event.get("phase","")=="start" or kind=="blast":
			attack=true
	var previous_tier := 0 if starting else collection_tier
	var milestone := tier>previous_tier
	collection_tier=maxi(tier,previous_tier)
	if not active or get_tree().paused or not settings.get("haptics",true):
		cooldown=0
		attack_cooldown=0
		return
	cooldown=maxf(0,cooldown-dt)
	attack_cooldown=maxf(0,attack_cooldown-dt)
	if milestone or starting:
		cooldown=0.35
		attack_cooldown=0.2
		if OS.get_name() in ["iOS","Android"]:
			var duration := {70:40,80:60,90:80,100:110}
			var strength := {70:0.45,80:0.6,90:0.75,100:1.0}
			Input.vibrate_handheld(int(duration.get(tier,25)),float(strength.get(tier,0.35)))
		return
	if attack and attack_cooldown>0 or not attack and (not gained or cooldown>0):
		return
	cooldown=0.2 if attack else 0.35
	if attack:
		attack_cooldown=0.2
	if OS.get_name() in ["iOS","Android"]:
		Input.vibrate_handheld(20 if attack else 10,0.6 if attack else 0.3)
