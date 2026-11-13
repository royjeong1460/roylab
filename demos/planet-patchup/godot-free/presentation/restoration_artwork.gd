extends Control

var texture: Texture2D
var state := "locked"
var cover := false

func setup(source: Texture2D, status: String, crop := false) -> void:
	texture = source
	state = status
	cover = crop
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	clip_contents = true
	queue_redraw()

func _ready() -> void:
	resized.connect(queue_redraw)

func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO,size),Color("21343b") if state == "preview" else Color("192b32"))
	if texture == null or state == "locked":
		var font := get_theme_default_font()
		draw_string(font,Vector2(0,size.y/2.0+9),"?",HORIZONTAL_ALIGNMENT_CENTER,size.x,24,Color("8b9c9e"))
		return
	var dimensions := Vector2(texture.get_size())
	var factor := maxf(size.x/dimensions.x,size.y/dimensions.y) if cover else minf(size.x/dimensions.x,size.y/dimensions.y)
	var target := Rect2((size-dimensions*factor)/2.0,dimensions*factor)
	if state == "restored":
		draw_texture_rect(texture,target,false)
		return
	# A clear stepped fragment exposes about one quarter of the image, without blur.
	for normalized in [Rect2(0.39,0.16,0.26,0.68),Rect2(0.33,0.24,0.36,0.48),Rect2(0.31,0.33,0.34,0.44)]:
		var fragment := Rect2(normalized.position*size,normalized.size*size).intersection(target)
		if fragment.has_area():
			var source := Rect2((fragment.position-target.position)/factor,fragment.size/factor)
			draw_texture_rect_region(texture,fragment,source)
