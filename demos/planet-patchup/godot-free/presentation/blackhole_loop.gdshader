shader_type canvas_item;
render_mode unshaded;

void fragment() {
	// The sprite palette uses dark fill and lighter rim pixels.
	float brightness = max(COLOR.r, max(COLOR.g, COLOR.b));
	float rim = smoothstep(0.165, 0.27, brightness);
	COLOR.a *= mix(0.20, 0.80, rim);
}
