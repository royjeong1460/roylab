extends Node

signal settings_changed(value: Dictionary)
signal status_changed(value: String)

const SETTINGS_PATH := "user://free-web-audio-v1.json"
const DEFAULTS := {"music":true,"musicVolume":0.5,"effects":true,"effectsVolume":1.0,"haptics":true}
const SKILL_AUDIO := {
	"seismic-strike":"res://assets/audio/11-seismic-strike.wav",
	"gravity-engage":"res://assets/audio/12-gravity-engage.wav",
	"gravity-pressure-loop":"res://assets/audio/13-gravity-pressure-loop.wav",
	"gravity-release":"res://assets/audio/14-gravity-release.wav",
	"sonic-sweep-short":"res://assets/audio/15-sonic-sweep-short.wav",
	"sonic-sweep-medium":"res://assets/audio/15-sonic-sweep-medium.wav",
	"sonic-sweep-long":"res://assets/audio/15-sonic-sweep-long.wav",
	"battery-recharge":"res://assets/audio/16-battery-recharge.wav"
}
const TIMED_SKILLS := ["gravity-engage","gravity-pressure-loop","gravity-release","sonic-sweep-short","sonic-sweep-medium","sonic-sweep-long"]
const COLLECTION_AUDIO := {"collection-start":"ui-confirm","collection-tick":"debris-impact","collection-tier":"progress-success","collection-rise":"active-ready","collection-complete":"battery-recharge"}
const GAPS := {"ui-tap":0.055,"ui-confirm":0.16,"ui-unavailable":0.22,"blackhole-open":0.18,"blackhole-close":0.18,"active-ready":0.3,"active-deploy":0.4,"orbital-fall":0.18,"progress-success":0.8,"blast":0.09,"secondary-blast":0.09,"debris-impact":0.06,"pixel-collect":0.09,"collection-start":0.0,"collection-tick":0.05,"collection-tier":0.0,"collection-rise":0.0,"collection-complete":0.0}
const LEVELS := {"blackhole-loop":0.75,"active-ready":0.85,"orbital-fall":0.85}
const GAMEPLAY := ["blackhole-open","blackhole-loop","blackhole-close","active-ready","active-deploy","orbital-fall","blast","secondary-blast","debris-impact","pixel-collect","seismic-strike","gravity-engage","gravity-pressure-loop","gravity-release","sonic-sweep-short","sonic-sweep-medium","sonic-sweep-long","battery-recharge"]
var settings: Dictionary = DEFAULTS.duplicate()
var status := "waiting"
var catalog: RefCounted
var music: AudioStreamPlayer
var unlocked := false
var paused := false
var game_paused := false
var clock := 0.0
var collected := 0
var _voices := {}
var _next := {}
var _last := {}
var _streams := {}
var _mix := {}
var _wells := 0
var _soft_order: Array[String] = []
var _run_id := ""
var _run_ready := false
var _run_qualified := false
var _run_complete := false
var _timed_started := {}
var _collection_started := false
var _collection_tier := 0
var _collection_final_tick := false
var _collection_ratio := 0.0

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load_settings()

func setup(source_catalog: RefCounted) -> void:
	catalog = source_catalog
	if music == null:
		music = AudioStreamPlayer.new()
		music.process_mode = Node.PROCESS_MODE_ALWAYS
		add_child(music)
		music.finished.connect(func():
			if unlocked and settings.music and not paused:
				music.play())
	var path: String = catalog.asset_path("music")
	if not path.is_empty() and ResourceLoader.exists(path):
		music.stream = load(path)
		if music.stream is AudioStreamWAV:
			music.stream = music.stream.duplicate()
			music.stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
			music.stream.loop_begin = 0
			music.stream.loop_end = music.stream.get_length() * music.stream.mix_rate
	_sync()

func _load_settings() -> void:
	if not FileAccess.file_exists(SETTINGS_PATH):
		return
	var saved = JSON.parse_string(FileAccess.get_file_as_string(SETTINGS_PATH))
	if saved is Dictionary:
		for key in DEFAULTS:
			if key.ends_with("Volume"):
				if saved.get(key) is float or saved.get(key) is int:
					settings[key] = clampf(float(saved[key]),0,1) if is_finite(float(saved[key])) else DEFAULTS[key]
			elif saved.get(key) is bool:
				settings[key] = saved[key]
	_sync()

func set_settings(value: Dictionary) -> void:
	for key in DEFAULTS:
		if not value.has(key):
			continue
		if key.ends_with("Volume"):
			if value[key] is float or value[key] is int:
				settings[key] = clampf(float(value[key]),0,1) if is_finite(float(value[key])) else DEFAULTS[key]
		elif value[key] is bool:
			settings[key] = value[key]
	var file := FileAccess.open(SETTINGS_PATH+".tmp",FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(settings))
		file.close()
		var error := DirAccess.rename_absolute(ProjectSettings.globalize_path(SETTINGS_PATH+".tmp"),ProjectSettings.globalize_path(SETTINGS_PATH))
		if error != OK:
			push_warning("Audio settings could not be saved: %s" % error)
	else:
		push_warning("Audio settings could not be saved: %s" % FileAccess.get_open_error())
	_sync()
	settings_changed.emit(settings.duplicate())

func set_setting(key: String, value: Variant) -> void:
	set_settings({key:value})

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch and event.pressed or event is InputEventMouseButton and event.pressed or event is InputEventKey and event.pressed:
		unlock()

func unlock() -> void:
	if unlocked:
		return
	unlocked = true
	_sync()

func set_paused(value: bool) -> void:
	paused = value
	_sync()

func set_game_paused(value: bool, preserve_collection := false) -> void:
	game_paused=value
	if game_paused:
		for key in GAMEPLAY:
			stop_effect(key)
		if not preserve_collection:
			_collection_final_tick=false
			for key in COLLECTION_AUDIO:
				stop_effect(key)
	elif _wells>0:
		play_effect("blackhole-loop",-1,1,true)

func _sync() -> void:
	if music == null:
		return
	music.volume_linear = 0.25*float(settings.musicVolume)
	var enabled: bool = settings.music and float(settings.musicVolume)>0
	if music.stream == null:
		status = "unavailable"
	elif not enabled or paused:
		if music.has_stream_playback() and not music.stream_paused:
			music.stream_paused = true
		status = "paused" if enabled else "off"
	elif not unlocked:
		status = "waiting"
	else:
		# Godot Web restarts a sample if it receives an unpause while already playing.
		if music.stream_paused:
			music.stream_paused = false
		elif not music.has_stream_playback():
			music.play()
		status = "playing"
	if paused or not settings.effects or float(settings.effectsVolume)<=0:
		stop_effects()
	for key in _voices:
		for voice in _voices[key]:
			voice.volume_linear = float(_mix.get(voice.get_instance_id(),0.2))*float(settings.effectsVolume)
	status_changed.emit(status)

func _process(dt: float) -> void:
	clock += maxf(0,dt)

func _stream(key: String, loop: bool) -> AudioStream:
	var stream_key := "blast" if key=="secondary-blast" else key
	var cache_key := stream_key+("-loop" if loop else "")
	if _streams.has(cache_key):
		return _streams[cache_key]
	if catalog == null:
		return null
	var source_key: String = COLLECTION_AUDIO.get(stream_key,stream_key)
	var path: String = SKILL_AUDIO.get(source_key,catalog.asset_path("audio-"+source_key))
	if path.is_empty() or not ResourceLoader.exists(path):
		return null
	var stream: AudioStream = load(path)
	if stream is AudioStreamWAV and loop:
		stream = stream.duplicate()
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = stream.get_length()*stream.mix_rate
	_streams[cache_key] = stream
	return stream

func _prepare_voices(key: String) -> void:
	if _voices.has(key): return
	_voices[key] = []
	var count := 6 if key == "pixel-collect" else 2 if key in ["blast","secondary-blast","debris-impact","collection-tick"] else 1
	for i in range(count):
		var player := AudioStreamPlayer.new()
		player.process_mode = Node.PROCESS_MODE_ALWAYS
		add_child(player)
		_voices[key].append(player)
	_next[key] = 0

func prepare_sortie() -> void:
	_collection_started=false
	_collection_tier=0
	_collection_final_tick=false
	_collection_ratio=0.0
	for key in COLLECTION_AUDIO:
		stop_effect(key)
	# Preload streams and voices without starting any sound.
	for key in ["blast","secondary-blast","debris-impact","pixel-collect"] + COLLECTION_AUDIO.keys():
		var stream := _stream(key,false)
		if stream == null: continue
		_prepare_voices(key)
		for voice in _voices[key]:
			voice.stream = stream

func play_effect(key: String, volume := -1.0, rate := 1.0, loop := false, from_position := 0.0) -> void:
	if not unlocked or paused or not settings.effects or float(settings.effectsVolume)<=0:
		return
	if game_paused and (key in GAMEPLAY or key in COLLECTION_AUDIO and not _collection_final_tick):
		return
	if loop and _playing(key):
		return
	if clock-float(_last.get(key,-INF))<float(GAPS.get(key,0.1)):
		return
	var stream := _stream(key,loop)
	if stream == null:
		return
	if not loop and from_position >= stream.get_length():
		return
	if key in ["ui-confirm","ui-unavailable"]:
		stop_effect("ui-tap")
	if key not in ["blast","secondary-blast","debris-impact","pixel-collect","collection-tick"]:
		_soft_order = _soft_order.filter(func(id):return id!=key and _playing(id))
		if _soft_order.size()>=6:
			stop_effect(_soft_order.pop_front())
		_soft_order.append(key)
	_last[key]=clock
	_prepare_voices(key)
	var index: int = _next[key]
	var player: AudioStreamPlayer = _voices[key][index]
	_next[key]=(index+1)%_voices[key].size()
	player.stop()
	player.stream=stream
	var mix_volume := volume if volume>=0 else 0.2*float(LEVELS.get(key,1.0))
	_mix[player.get_instance_id()]=mix_volume
	player.volume_linear=mix_volume*float(settings.effectsVolume)
	player.pitch_scale=rate
	player.play(fposmod(from_position,stream.get_length()) if loop else maxf(0,from_position))

func _playing(key: String) -> bool:
	for voice in _voices.get(key,[]):
		if voice.playing:
			return true
	return false

func stop_effect(key: String) -> void:
	for voice in _voices.get(key,[]):
		voice.stop()
	_timed_started.erase(key)

func stop_effects() -> void:
	for key in _voices:
		stop_effect(key)

func set_well_count(count: int) -> void:
	if paused or game_paused:
		_wells=count
		return
	if count>0:
		play_effect("blackhole-loop",-1,1,true)
	else:
		stop_effect("blackhole-loop")
		if _wells>0:
			play_effect("blackhole-close")
	_wells=count

func pause_campaign() -> void:
	for key in GAMEPLAY:
		stop_effect(key)

func leave_campaign() -> void:
	pause_campaign()
	_run_id=""
	_wells=0
	_timed_started.clear()
	_collection_final_tick=false

func _sync_skill_cue(key: String, offset: float, duration: float, volume := 0.2, loop := false) -> void:
	if offset < 0 or offset >= duration:
		stop_effect(key)
		return
	# Stops clear this marker; natural endings must not replay the cue's tail.
	if not _timed_started.has(key):
		play_effect(key,volume,1,loop,offset)
		if _playing(key):
			_timed_started[key]=true
	for voice in _voices.get(key,[]):
		_mix[voice.get_instance_id()]=volume
		voice.volume_linear=volume*float(settings.effectsVolume)

func _sync_skill_audio(current: Dictionary) -> void:
	var keep: Array[String] = []
	var age := float(current.get("age",0))
	if current.get("id","") == "gravity":
		keep.assign(["gravity-engage","gravity-pressure-loop","gravity-release"])
		var duration := float(current.duration)
		_sync_skill_cue("gravity-engage",age,0.44)
		_sync_skill_cue("gravity-pressure-loop",age-0.6,duration-0.6,0.2*float(current.pressure),true)
		_sync_skill_cue("gravity-release",age-(duration-0.5),0.41)
	elif current.get("id","") == "sonic":
		var level := int(current.level)
		var key := "sonic-sweep-long" if level >= 5 else "sonic-sweep-medium" if level >= 3 else "sonic-sweep-short"
		keep.append(key)
		_sync_skill_cue(key,age-0.4,float(current.sweep_duration))
	for key in TIMED_SKILLS:
		if key not in keep:
			stop_effect(key)

func sync_campaign(run: RefCounted) -> void:
	if run==null:
		leave_campaign()
		return
	if _run_id!=str(run.id):
		leave_campaign()
		_run_id=str(run.id)
		_run_ready=false
		_run_qualified=run.qualified()
		_run_complete=run.ratio()>=1.0
		_collection_started=false
		_collection_tier=0
		play_effect("ui-confirm")
	_collection_ratio=clampf(run.ratio(),0.0,1.0)
	_collection_final_tick=run.finish_ready and not run.paused
	if game_paused != (run.paused or run.finish_ready):
		set_game_paused(run.paused or run.finish_ready,_collection_final_tick)
	if run.paused or run.finish_ready:
		pause_campaign()
		return
	_sync_skill_audio(run.world.skill_physics.active)
	var skill: Dictionary=run.skill_state()
	var ready: bool = run.phase=="working" and skill.get("actives", []).any(func(entry): return entry.get("available", false))
	if not _run_ready and ready and not _playing("ui-confirm"):
		_run_ready=true
		play_effect("active-ready")
	if not run.world.final_collection and (run.qualified() and not _run_qualified or run.ratio()>=1.0 and not _run_complete):
		play_effect("progress-success")
	_run_qualified=run.qualified()
	_run_complete=run.ratio()>=1.0

func finish_campaign(result: Dictionary) -> void:
	var success: bool=result.get("allClear",false) and not _run_complete or result.get("qualified",false) and not _run_qualified
	var announced := _collection_tier>=70
	leave_campaign()
	if not announced:
		play_effect("progress-success" if success else "ui-confirm")

func _process_collection_events(events: Array) -> bool:
	var starting := false
	var tier := _collection_tier
	for event in events:
		if event.get("kind","")=="collection-start" and not _collection_started:
			starting=true
		elif event.get("kind","")=="collection-tier":
			var candidate := int(event.get("tier",0))
			if candidate in [70,80,90,100]:
				tier=maxi(tier,candidate)
	if starting:
		_collection_started=true
		stop_effect("pixel-collect")
		if tier==0:
			play_effect("collection-start",0.1,1.15)
	if tier<=_collection_tier:
		return false
	var first_clear := _collection_tier<70
	_collection_tier=tier
	stop_effect("pixel-collect")
	for key in ["collection-start","collection-tick","collection-rise","collection-complete"]:
		stop_effect(key)
	# Let CLEAR resolve once; higher tiers add accents without restarting its fanfare.
	if first_clear:
		play_effect("collection-tier",0.3,1.0)
	if tier>=80:
		play_effect("collection-rise",0.17 if tier==80 else 0.23 if tier==90 else 0.28,1.08 if tier==80 else 1.28 if tier==90 else 1.5)
	if tier==100:
		play_effect("collection-complete",0.32,1.05)
	return true

func process_events(events: Array, _dt := 0.0, collected_total := -1, active := true) -> void:
	if not active or paused or game_paused and not _collection_final_tick:
		for key in GAMEPLAY:
			stop_effect(key)
		for key in COLLECTION_AUDIO:
			stop_effect(key)
		if collected_total>=0:
			collected=collected_total
		return
	var milestone := _process_collection_events(events)
	# The final physics tick may announce a tier after gameplay has frozen.
	if game_paused:
		if collected_total>=0:
			collected=collected_total
		return
	var gained := false
	var impact := {}
	var seismic_volume := 0.0
	for event in events:
		var kind: String = event.get("kind","")
		if (kind=="tool-blast" and event.get("phase","")=="blast" or kind=="blast") and event.get("audio",true):
			var follow_up: bool = kind=="blast" and event.get("vfx","") in ["aftershock","relay"]
			play_effect("secondary-blast" if follow_up else "blast",0.15 if follow_up else 0.25,randf_range(0.98,1.02))
		elif kind=="tool-gravity" and event.get("phase","")=="start":
			play_effect("blackhole-open")
		elif kind=="sound-active-deploy":
			if event.get("id","") != "gravity":
				play_effect("active-deploy")
		elif kind=="sound-seismic-strike":
			seismic_volume=maxf(seismic_volume,0.11 if event.get("followup",false) else 0.2)
		elif kind=="skill-recharge":
			play_effect("battery-recharge")
		elif kind=="sound-orbital-fall":
			play_effect("orbital-fall")
		elif kind=="sound-impact" and float(event.get("speed",0))>=8 and float(event.get("energy",0))>float(impact.get("energy",0)):
			impact=event
		elif kind=="collect":
			gained=true
	if seismic_volume > 0:
		play_effect("seismic-strike",seismic_volume)
	if not impact.is_empty():
		play_effect("debris-impact",0.035+minf(1,sqrt(float(impact.energy))/8)*0.085,randf_range(0.94,1.06))
	if collected_total>=0:
		gained=gained or collected_total>collected
		collected=collected_total
	var blasting := _playing("blast") or _playing("secondary-blast")
	var colliding := _playing("debris-impact")
	var celebrating := _playing("collection-tier")
	if gained and not milestone:
		if _collection_started:
			var gap := lerpf(0.16,0.05,_collection_ratio)
			if clock-float(_last.get("collection-tick",-INF))>=gap:
				var pitch := pow(2.0,float(floori(_collection_ratio*12.0)-3)/12.0)
				var volume := lerpf(0.055,0.11,_collection_ratio)+(0.015 if _collection_tier>=80 else 0.0)+(0.015 if _collection_tier>=90 else 0.0)
				play_effect("collection-tick",volume*(0.4 if celebrating else 1.0),pitch)
		elif not celebrating:
			play_effect("pixel-collect",0.04 if blasting else 0.09 if colliding else 0.15,randf_range(0.96,1.04))
	for voice in _voices.get("debris-impact",[]):
		voice.volume_linear=minf(float(_mix.get(voice.get_instance_id(),0)),0.04 if celebrating else 0.08 if blasting else 0.12)*float(settings.effectsVolume)
	for voice in _voices.get("pixel-collect",[]):
		voice.volume_linear=(0.04 if blasting else 0.09 if colliding else 0.15)*float(settings.effectsVolume)
